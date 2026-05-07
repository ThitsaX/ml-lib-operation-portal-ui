import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReportDownloadContext } from '@contexts/ReportDownloadContext';
import { IApiErrorResponse } from '@typescript/services';

export type DownloadStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

export interface ReadyFile {
  url: string;
  fileName: string;
}

export interface UseReportDownloadStateOptions {
  jobTtlMs?: number;
  readyTtlMs?: number;
  pollIntervalMs?: number;
}

interface UseReportDownloadStateReturn {
  downloadStatus: DownloadStatus;
  isDownloading: boolean;
  readyFile: ReadyFile | null;
  failedMessage: string | null;
  startPolling: (requestId: string, fileType: string) => void;
  consumeDownload: () => void;
  clearDownloadState: () => void;
}

export function useReportDownloadState(
  reportName: string,
  onDownloadReady: (fileName: string) => void,
  onError: (message: IApiErrorResponse) => void,
  options?: UseReportDownloadStateOptions
): UseReportDownloadStateReturn {
  const context = useReportDownloadContext();
  
  // Get state from global context
  const globalState = context.getReportState(reportName);
  
  // Local state to trigger re-renders when global state changes
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>(globalState.downloadStatus);
  const [readyFile, setReadyFile] = useState<ReadyFile | null>(globalState.readyFile);
  const [failedMessage, setFailedMessage] = useState<string | null>(globalState.failedMessage);

  // Sync local state with global state
  useEffect(() => {
    // Batch state updates to prevent render-phase updates
    const { downloadStatus: newDownloadStatus, readyFile: newReadyFile, failedMessage: newFailedMessage } = globalState;
    
    setDownloadStatus(newDownloadStatus);
    setReadyFile(newReadyFile);
    setFailedMessage(newFailedMessage);
  }, [globalState]);

  // Callbacks that delegate to global context
  const startPolling = useCallback((requestId: string, fileType: string) => {
    context.startPolling(reportName, requestId, fileType);
  }, [context, reportName]);

  const consumeDownload = useCallback(() => {
    context.consumeDownload(reportName);
  }, [context, reportName]);

  const clearDownloadState = useCallback(() => {
    context.clearDownloadState(reportName);
  }, [context, reportName]);

  const isDownloading = downloadStatus === 'PENDING' || downloadStatus === 'RUNNING';

  return { downloadStatus, isDownloading, readyFile, failedMessage, startPolling, consumeDownload, clearDownloadState };
}

