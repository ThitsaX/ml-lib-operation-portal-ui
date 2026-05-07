import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState, ReactNode } from 'react';
import { getReportDownloadStatus, getReportDownloadUrlCloud } from '@services/report';
import { useGetUserState } from '@store/hooks';
import moment from 'moment';
import { IApiErrorResponse } from '@typescript/services';
import { REPORT_DOWNLOAD_CONFIG } from '@configs/report-download';

export type DownloadStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

export interface ReadyFile {
  url: string;
  fileName: string;
}

interface PersistedDownloadState {
  requestId: string;
  status: Exclude<DownloadStatus, 'IDLE'>;
  fileType: string;
  startedAt: number; // epoch ms — used for 15min job TTL
  fileUrl?: string;
  fileName?: string;
  urlFetchedAt?: number; // epoch ms — used for 24-h URL expiry check
  failedMessage?: string;
}

interface ReportDownloadState {
  downloadStatus: DownloadStatus;
  readyFile: ReadyFile | null;
  failedMessage: string | null;
}

interface ReportDownloadContextValue {
  getReportState: (reportName: string) => ReportDownloadState;
  startPolling: (reportName: string, requestId: string, fileType: string) => void;
  consumeDownload: (reportName: string) => void;
  clearDownloadState: (reportName: string) => void;
}

const STORAGE_KEY_PREFIX = 'report_download:';

//  Polling runs max 15 minutes
const DEFAULT_JOB_TTL_MS = REPORT_DOWNLOAD_CONFIG.JOB_TTL_MS;

// ⏱ S3 URL valid for 24 hours
const DEFAULT_READY_TTL_MS = REPORT_DOWNLOAD_CONFIG.READY_TTL_MS;

// ⏱ Poll every 30 seconds (fixed interval)
const DEFAULT_POLL_INTERVAL_MS = REPORT_DOWNLOAD_CONFIG.POLL_INTERVAL_MS;

const ReportDownloadContext = createContext<ReportDownloadContextValue | null>(null);

export const useReportDownloadContext = () => {
  const context = useContext(ReportDownloadContext);
  if (!context) {
    throw new Error('useReportDownloadContext must be used within ReportDownloadProvider');
  }
  return context;
};

// Pure helper - safe to call outside React render
function computeInitialState(storageKey: string, jobTtlMs: number, readyTtlMs: number): {
  status: DownloadStatus;
  readyFile: ReadyFile | null;
} {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { status: 'IDLE', readyFile: null };

    const stored: PersistedDownloadState = JSON.parse(raw);

    if (stored.status === 'READY' && stored.fileUrl && stored.fileName) {
      const readySince = stored.urlFetchedAt ?? stored.startedAt;
      if (Date.now() - readySince <= readyTtlMs) {
        return {
          status: 'READY',
          readyFile: { url: stored.fileUrl, fileName: stored.fileName },
        };
      }
      localStorage.removeItem(storageKey);
      return { status: 'IDLE', readyFile: null };
    }

    if (stored.status === 'PENDING' || stored.status === 'RUNNING') {
      if (Date.now() - stored.startedAt > jobTtlMs) {
        localStorage.removeItem(storageKey);
        return { status: 'IDLE', readyFile: null };
      }
    }

    if (stored.status === 'FAILED') {
      return { status: 'FAILED', readyFile: null };
    }

    return { status: stored.status as DownloadStatus, readyFile: null };
  } catch {
    return { status: 'IDLE', readyFile: null };
  }
}

interface ReportDownloadProviderProps {
  children: ReactNode;
  onDownloadReady?: (reportName: string, fileName: string) => void;
  onError?: (reportName: string, error: IApiErrorResponse) => void;
}

export const ReportDownloadProvider: React.FC<ReportDownloadProviderProps> = ({
  children,
  onDownloadReady,
  onError,
}) => {
  const user = useGetUserState();
  const userId = user?.data?.userId as string | undefined;

  // Global state for all reports
  const [reportStates, setReportStates] = useState<Map<string, ReportDownloadState>>(new Map());

  // Refs to avoid re-renders
  const userRef = useRef(user);
  const abortRefsRef = useRef<Map<string, { aborted: boolean }>>(new Map());
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const onDownloadReadyRef = useRef(onDownloadReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    onDownloadReadyRef.current = onDownloadReady;
  }, [onDownloadReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const getStorageKey = useCallback((reportName: string): string => {
    if (typeof userId !== 'string' || userId.length === 0) return '';
    return `${STORAGE_KEY_PREFIX}${userId}:${reportName}`;
  }, [userId]);

  const readStorage = useCallback((storageKey: string): PersistedDownloadState | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as PersistedDownloadState) : null;
    } catch {
      return null;
    }
  }, []);

  const writeStorage = useCallback((storageKey: string, patch: Partial<PersistedDownloadState>) => {
    if (!storageKey) return;
    const existing = readStorage(storageKey);
    if (!existing) return;
    localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...patch }));
  }, [readStorage]);

  const setStorage = useCallback((storageKey: string, state: PersistedDownloadState) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, []);

  const clearStorage = useCallback((storageKey: string) => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
  }, []);

  const updateReportState = useCallback((reportName: string, patch: Partial<ReportDownloadState>) => {
    setReportStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(reportName) || { downloadStatus: 'IDLE', readyFile: null, failedMessage: null };
      newMap.set(reportName, { ...current, ...patch });
      return newMap;
    });
  }, []);

  const waitForVisible = useCallback((abort: { aborted: boolean }) => {
    return new Promise<void>((resolve) => {
      if (!document.hidden || abort.aborted) { resolve(); return; }
      const handler = () => {
        if (!document.hidden || abort.aborted) {
          document.removeEventListener('visibilitychange', handler);
          resolve();
        }
      };
      document.addEventListener('visibilitychange', handler);
    });
  }, []);

  const toApiError = useCallback((description: string, default_error_message = '', error_code = ''): IApiErrorResponse => ({
    description,
    default_error_message,
    error_code
  }), []);

  const formatReportName = (reportName: string): string => {
    if (!reportName) return '';
    return reportName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .trim();
  };

  const handleFailedStatus = useCallback(async (reportName: string, requestId: string, fileType: string, statusRes: any, storageKey: string) => {
    const fallbackMessage = 'Something went wrong while generating your report. Please try again.';
    let message = fallbackMessage;
    let failedToast = toApiError(fallbackMessage);
    try {
      const urlRes = await getReportDownloadUrlCloud(userRef.current as any, { requestId });
      message = urlRes?.message || urlRes?.default_error_message || urlRes?.description || message;
      failedToast = toApiError(message, urlRes?.default_error_message || '', urlRes?.error_code || '');
    } catch (err: any) {
      message = err?.default_error_message || err?.description || err?.error_code || message;
      failedToast = toApiError(formatReportName(reportName) + ` generation failed.`);
    }

    const existing = readStorage(storageKey);
    if (existing) {
      writeStorage(storageKey, { ...existing, status: 'FAILED', failedMessage: message });
    } else {
      setStorage(storageKey, { requestId, fileType, status: 'FAILED', startedAt: Date.now(), failedMessage: message });
    }

    updateReportState(reportName, { downloadStatus: 'FAILED', readyFile: null, failedMessage: message });
    if (onErrorRef.current) {
      onErrorRef.current(reportName, failedToast);
    }
  }, [readStorage, writeStorage, setStorage, updateReportState, toApiError]);

  const handleReadyStatus = useCallback(async (reportName: string, requestId: string, fileType: string, abort: { aborted: boolean }, storageKey: string) => {
    let urlRes: any;
    try {
      urlRes = await getReportDownloadUrlCloud(userRef.current as any, { requestId });
    } catch (err: any) {
      if (abort.aborted) return;
      clearStorage(storageKey);
      updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
      if (onErrorRef.current) {
        onErrorRef.current(reportName, toApiError(err?.description, err?.default_error_message || '', err?.error_code || ''));
      }
      return;
    }

    if (abort.aborted) return;

    const url: string = urlRes?.fileUrl ?? '';
    if (!url) {
      clearStorage(storageKey);
      updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
      if (onErrorRef.current) {
        onErrorRef.current(reportName, toApiError('Download URL was empty'));
      }
      return;
    }

    const keyBasedName = typeof urlRes?.fileKey === 'string' && urlRes.fileKey.length > 0
      ? urlRes.fileKey.split('/').pop()
      : null;
    const fileName = keyBasedName || `${reportName}-${moment().format('DDMMMYYYY')}.${fileType}`;

    writeStorage(storageKey, { status: 'READY', fileUrl: url, fileName, urlFetchedAt: Date.now() });

    const file: ReadyFile = { url, fileName };
    updateReportState(reportName, { downloadStatus: 'READY', readyFile: file, failedMessage: null });

    if (onDownloadReadyRef.current) {
      onDownloadReadyRef.current(reportName, fileName);
    }
  }, [clearStorage, updateReportState, writeStorage, toApiError]);

  const runPollLoop = useCallback(async (reportName: string, requestId: string, fileType: string, abort: { aborted: boolean }, storageKey: string) => {
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    let attempt = 0;

    const startTime = readStorage(storageKey)?.startedAt ?? Date.now();
    while (!abort.aborted) {
      if (Date.now() - startTime > DEFAULT_JOB_TTL_MS) {
        clearStorage(storageKey);
        updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
        if (onErrorRef.current) {
          onErrorRef.current(reportName, toApiError('Report is taking too long. Please try again.'));
        }
        return;
      }

      const currentStored = readStorage(storageKey);
      if (currentStored?.status === 'READY') {
        return;
      }

      let statusRes: any;
      try {
        statusRes = await getReportDownloadStatus(userRef.current as any, requestId);
      } catch (err: any) {
        if (abort.aborted) return;
        clearStorage(storageKey);
        updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
        if (onErrorRef.current) {
          onErrorRef.current(reportName, toApiError(err?.description, err?.default_error_message || '', err?.error_code || ''));
        }
        return;
      }

      if (abort.aborted) return;

      const rawStatus = String(statusRes?.status ?? '').toUpperCase();

      if (rawStatus === '' || rawStatus === 'PENDING') {
        updateReportState(reportName, { downloadStatus: 'PENDING' });
        writeStorage(storageKey, { status: 'PENDING' });
        await delay(DEFAULT_POLL_INTERVAL_MS);
        attempt++;
        await waitForVisible(abort);
        continue;
      }

      if (rawStatus === 'RUNNING') {
        updateReportState(reportName, { downloadStatus: 'RUNNING' });
        writeStorage(storageKey, { status: 'RUNNING' });
        await delay(DEFAULT_POLL_INTERVAL_MS);
        attempt++;
        await waitForVisible(abort);
        continue;
      }

      if (rawStatus === 'FAILED') {
        await handleFailedStatus(reportName, requestId, fileType, statusRes, storageKey);
        return;
      }

      if (rawStatus === 'READY') {
        await handleReadyStatus(reportName, requestId, fileType, abort, storageKey);
        return;
      }

      clearStorage(storageKey);
      updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
      if (onErrorRef.current) {
        onErrorRef.current(reportName, toApiError(`Unexpected report status: "${rawStatus || '(empty)'}"`));
      }
      return;
    }
  }, [readStorage, clearStorage, writeStorage, updateReportState, waitForVisible, toApiError, handleFailedStatus, handleReadyStatus]);

  // Global effect to handle user login/logout and resume polling
  useEffect(() => {
    const currentUserId = userId;

    // Handle logout - clear all previous user's state
    if (prevUserIdRef.current && !currentUserId) {
      abortRefsRef.current.forEach((abort, reportName) => {
        abort.aborted = true;
      });
      abortRefsRef.current.clear();
      setReportStates(new Map());
      prevUserIdRef.current = undefined;
      return;
    }

    // Handle login - initialize and resume polling
    if (currentUserId && prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;

      // Stop any existing polling
      abortRefsRef.current.forEach((abort) => {
        abort.aborted = true;
      });
      abortRefsRef.current.clear();

      // Wait for user context to be ready
      if (!userRef.current || !userRef.current.data?.userId) {
        return;
      }

      // Check localStorage for any pending downloads and resume polling
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX) && key.includes(`:${currentUserId}:`)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const stored: PersistedDownloadState = JSON.parse(raw);
              if (stored.status === 'PENDING' || stored.status === 'RUNNING') {
                const reportName = key.split(':').pop() || '';
                if (reportName && stored.requestId && stored.fileType) {
                  const abort = { aborted: false };
                  abortRefsRef.current.set(reportName, abort);

                  const initial = computeInitialState(key, DEFAULT_JOB_TTL_MS, DEFAULT_READY_TTL_MS);
                  const stateUpdate = {
                    downloadStatus: initial.status,
                    readyFile: initial.readyFile,
                    failedMessage: null
                  };
                  updateReportState(reportName, stateUpdate);

                  void runPollLoop(reportName, stored.requestId, stored.fileType, abort, key);
                }
              } else if (stored.status === 'READY') {
                const reportName = key.split(':').pop() || '';
                if (reportName) {
                  const initial = computeInitialState(key, DEFAULT_JOB_TTL_MS, DEFAULT_READY_TTL_MS);
                  const stateUpdate = {
                    downloadStatus: initial.status,
                    readyFile: initial.readyFile,
                    failedMessage: null
                  };
                  updateReportState(reportName, stateUpdate);
                }
              } else if (stored.status === 'FAILED') {
                const reportName = key.split(':').pop() || '';
                if (reportName) {
                  updateReportState(reportName, {
                    downloadStatus: 'FAILED',
                    readyFile: null,
                    failedMessage: stored.failedMessage || 'Something went wrong while generating your report. Please try again.'
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error restoring download state:', err);
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      abortRefsRef.current.forEach((abort) => {
        abort.aborted = true;
      });
    };
  }, [userId, updateReportState, runPollLoop]);

  const startPolling = useCallback((reportName: string, requestId: string, fileType: string) => {
    const storageKey = getStorageKey(reportName);
    if (!storageKey) {
      return;
    }

    // Stop existing polling for this report
    const existingAbort = abortRefsRef.current.get(reportName);
    if (existingAbort) {
      existingAbort.aborted = true;
    }

    const abort = { aborted: false };
    abortRefsRef.current.set(reportName, abort);

    const state: PersistedDownloadState = {
      requestId,
      fileType,
      status: 'PENDING',
      startedAt: Date.now(),
    };
    setStorage(storageKey, state);
    updateReportState(reportName, { downloadStatus: 'PENDING', readyFile: null, failedMessage: null });
    void runPollLoop(reportName, requestId, fileType, abort, storageKey);
  }, [getStorageKey, setStorage, updateReportState, runPollLoop]);

  const consumeDownload = useCallback((reportName: string) => {
    const storageKey = getStorageKey(reportName);
    if (!storageKey) return;

    const state = reportStates.get(reportName);
    if (!state?.readyFile) return;

    const triggerDownload = (blob: Blob, fileName: string) => {
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 0);
    };

    const downloadBlob = async (url: string) => {
      const resp = await fetch(url);
      if (resp.status === 403) {
        const error = new Error('LINK_EXPIRED');
        (error as any).code = 'LINK_EXPIRED';
        throw error;
      }
      if (!resp.ok) {
        throw new Error('DOWNLOAD_FAILED');
      }
      return resp.blob();
    };

    downloadBlob(state.readyFile.url)
      .then(blob => {
        triggerDownload(blob, state.readyFile!.fileName);
        clearStorage(storageKey);
        updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
      })
      .catch(err => {
        if ((err as any)?.code === 'LINK_EXPIRED') {
          if (onErrorRef.current) {
            onErrorRef.current(reportName, {
              description: 'The download link has expired. Please generate the report again.',
              default_error_message: '',
              error_code: 'LINK_EXPIRED',
            });
          }
        } else {
          if (onErrorRef.current) {
            onErrorRef.current(reportName, {
              description: (err as any)?.description,
              default_error_message: (err as any)?.default_error_message,
              error_code: (err as any)?.code,
            });
          }
        }
        clearStorage(storageKey);
        updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
      });
  }, [getStorageKey, reportStates, clearStorage, updateReportState]);

  const clearDownloadState = useCallback((reportName: string) => {
    const storageKey = getStorageKey(reportName);
    if (!storageKey) return;

    const abort = abortRefsRef.current.get(reportName);
    if (abort) {
      abort.aborted = true;
      abortRefsRef.current.delete(reportName);
    }

    clearStorage(storageKey);
    updateReportState(reportName, { downloadStatus: 'IDLE', readyFile: null, failedMessage: null });
  }, [getStorageKey, clearStorage, updateReportState]);

  const getReportState = useCallback((reportName: string): ReportDownloadState => {
    const storageKey = getStorageKey(reportName);
    if (!storageKey) {
      return { downloadStatus: 'IDLE', readyFile: null, failedMessage: null };
    }

    const state = reportStates.get(reportName);
    if (state) {
      return state;
    }

    // Otherwise compute from localStorage
    const initial = computeInitialState(storageKey, DEFAULT_JOB_TTL_MS, DEFAULT_READY_TTL_MS);
    const newState = {
      downloadStatus: initial.status,
      readyFile: initial.readyFile,
      failedMessage: null
    };
    
    // Use setTimeout to defer state update until after render phase
    setTimeout(() => {
      updateReportState(reportName, newState);
    }, 0);
    
    return newState;
  }, [reportStates, updateReportState]);

  const contextValue: ReportDownloadContextValue = useMemo(() => ({
    getReportState,
    startPolling,
    consumeDownload,
    clearDownloadState,
  }), [getReportState, startPolling, consumeDownload, clearDownloadState]);

  return (
    <ReportDownloadContext.Provider value={contextValue}>
      {children}
    </ReportDownloadContext.Provider>
  );
};
