// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { CustomSelect } from '@components/interface';
import { OptionType } from '@components/interface/CustomSelect';
import { PreventableButton } from '@components/interface/PreventableButton';
import { CustomDateTimePicker } from '@components/interface/CustomDateTimePicker';
import { useLoadingContext } from '@contexts/hooks';
import { FeeSummaryReportHelper } from '@helpers/form';
import { REPORT_NOT_FOUND_ERROR } from '@helpers';
import { getErrorMessage } from '@helpers/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReportDownloadState } from '@hooks/useReportDownloadState';
import { useGetParticipantList } from '@hooks/services/participant';
import { generateFeeSummaryReport } from '@services/report';
import { RootState } from '@store';
import { useGetUserState } from '@store/hooks';
import { IFeeSummaryReport } from '@typescript/form/report';
import { IApiErrorResponse } from '@typescript/services';
import { showDataNotFound } from '@utils';
import { isEmpty } from 'lodash-es';
import moment from 'moment-timezone';
import { memo, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { ITimezoneOption } from 'react-timezone-select';

const feeSummaryReportHelper = new FeeSummaryReportHelper();

const statusLabel: Record<string, string> = {
  PENDING: 'Queuing report...',
  RUNNING: 'Generating report...',
  READY: 'Downloading...',
};

const FeeSummaryReport = () => {
  const { start, complete } = useLoadingContext();
  const toast = useToast();
  const { t } = useTranslation();
  const user = useGetUserState();
  const { data: participantList } = useGetParticipantList();
  const selectedTimezone = useSelector<RootState, ITimezoneOption>(s => s.app.selectedTimezone);

  const selectedTZString = useMemo(
    () => selectedTimezone.value,
    [selectedTimezone]
  );

  const isHubUser =
    typeof user.data?.participantName === 'string' &&
    user.data.participantName.toLowerCase() === 'hub';

  const currentParticipantLabel = useMemo(() => {
    const name = user.data?.participantName || '';
    const description = user.data?.description || '';
    return description ? `${name} (${description})` : name;
  }, [user.data?.description, user.data?.participantName]);

  const participantOptions = useMemo<OptionType[]>(() => {
    if (!isHubUser) {
      return [{
        value: user.data?.participantName || '',
        label: currentParticipantLabel,
      }];
    }

    const dfspOptions = (participantList ?? [])
      .filter(participant => participant.participantName?.toLowerCase() !== 'hub')
      .map((participant): OptionType => ({
        value: participant.participantName,
        label: participant.description
          ? `${participant.participantName} (${participant.description})`
          : participant.participantName,
      }));

    return [{ value: 'ALL', label: 'ALL' }, ...dfspOptions];
  }, [currentParticipantLabel, isHubUser, participantList, user.data?.participantName]);

  const {
    downloadStatus,
    isDownloading,
    readyFile,
    failedMessage,
    startPolling,
    consumeDownload,
    clearDownloadState,
  } = useReportDownloadState(
    'FeeSummaryReport',
    () => {},
    () => {}
  );

  const {
    control,
    trigger,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<IFeeSummaryReport>({
    resolver: zodResolver(feeSummaryReportHelper.schema),
    defaultValues: {
      startDate: moment().tz(selectedTZString).startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      endDate: moment().tz(selectedTZString).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      fspId: isHubUser ? 'ALL' : user.data?.participantName || '',
      timezoneOffset: '',
      fileType: 'xlsx',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    setValue('startDate', moment().tz(selectedTZString).startOf('day').format('YYYY-MM-DDTHH:mm:ss'));
    setValue('endDate', moment().tz(selectedTZString).endOf('day').format('YYYY-MM-DDTHH:mm:ss'));
  }, [selectedTimezone, selectedTZString, setValue]);

  useEffect(() => {
    setValue('fspId', isHubUser ? 'ALL' : user.data?.participantName || '');
  }, [isHubUser, setValue, user.data?.participantName]);

  const onDownloadClick = async () => {
    if (!isValid) {
      toast({
        position: 'top',
        description: 'Please fill required fields before downloading.',
        status: 'warning',
        isClosable: true,
        duration: 2000,
      });
      return;
    }

    if (isDownloading) return;

    start();

    const formData = getValues();
    const fileType = formData.fileType;
    const startDate = moment.tz(formData.startDate, selectedTimezone?.value)
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const endDate = moment.tz(formData.endDate, selectedTimezone?.value)
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const timezoneOffset = selectedTimezone?.offset === 0
      ? '0000'
      : moment().tz(selectedTimezone?.value).format('ZZ').replace('+', '');

    try {
      const res = await generateFeeSummaryReport(user, {
        startDate,
        endDate,
        fspId: isHubUser ? formData.fspId : user.data?.participantName || '',
        fileType,
        timezoneOffset,
      });

      const requestId = res?.requestId ?? res?.reqId ?? res?.reportRequestId;

      if (typeof requestId === 'string' && requestId.length > 0) {
        startPolling(requestId, fileType);
      } else {
        toast({
          position: 'top',
          description: 'No request ID returned from server',
          status: 'error',
          isClosable: true,
          duration: 3000,
        });
      }
    } catch (error: any) {
      if (error.error_code === REPORT_NOT_FOUND_ERROR) {
        showDataNotFound(toast);
      } else {
        toast({
          position: 'top',
          description: getErrorMessage(error as IApiErrorResponse) || 'Failed to request report',
          status: 'error',
          isClosable: true,
          duration: 3000,
        });
      }
    } finally {
      complete();
    }
  };

  return (
    <VStack align="flex-start" h="full" p="3" mt={10} w="full">
      <Heading fontSize="2xl" fontWeight="bold" mb={6}>
        {t('ui.fee_summary_report')}
      </Heading>

      <Stack borderWidth="1px" borderRadius="lg" p={4} spacing={6} w="full">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} w="full">
          <FormControl isInvalid={!isEmpty(errors.fspId)}>
            <FormLabel>{t('ui.dfsp_name')}</FormLabel>
            <Controller
              control={control}
              name="fspId"
              render={({ field }) => {
                const selectedOption = participantOptions.find(option => option.value === field.value) ?? null;
                return (
                  <CustomSelect
                    isClearable={false}
                    options={participantOptions}
                    value={selectedOption}
                    onChange={(selected: OptionType | null) => field.onChange(selected?.value || '')}
                    placeholder={t('ui.select_dfsp')}
                  />
                );
              }}
            />
            <FormErrorMessage>{errors.fspId?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!isEmpty(errors.startDate)} pb="1">
            <FormLabel>{t('ui.start_date')}</FormLabel>
            <Controller
              control={control}
              name="startDate"
              render={({ field: { value, onChange, onBlur } }) => (
                <CustomDateTimePicker
                  value={value}
                  onChange={(e) => {
                    onChange(e);
                    trigger('endDate');
                  }}
                  onBlur={onBlur}
                />
              )}
            />
            <FormErrorMessage>{errors.startDate?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!isEmpty(errors.endDate)} pb="1">
            <FormLabel>{t('ui.end_date')}</FormLabel>
            <Controller
              control={control}
              name="endDate"
              render={({ field: { value, onChange, onBlur } }) => (
                <CustomDateTimePicker
                  value={value}
                  onChange={(e) => {
                    onChange(e);
                    trigger('startDate');
                  }}
                  onBlur={onBlur}
                />
              )}
            />
            <FormErrorMessage>{errors.endDate?.message}</FormErrorMessage>
          </FormControl>

          <FormControl w="100%" mt={8}>
            <Controller
              control={control}
              name="fileType"
              render={({ field }) => (
                <CustomSelect
                  options={[
                    { value: 'xlsx', label: 'XLSX' },
                    { value: 'pdf', label: 'PDF' },
                  ]}
                  value={field.value ? { value: field.value, label: field.value.toUpperCase() } : null}
                  onChange={(selected: OptionType | null) => field.onChange(selected?.value || '')}
                  placeholder={t('ui.choose_format')}
                />
              )}
            />
          </FormControl>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} w="full">
          <Box />
          <Box />
          <Box />
          <FormControl
            w="100%"
            display="flex"
            justifyContent={{ base: 'stretch', md: 'flex-end' }}
            alignItems="flex-end"
          >
            <Button
              flex={{ base: '1', md: '0 0 50%' }}
              colorScheme="blue"
              isDisabled={!isValid || isDownloading}
              isLoading={isDownloading}
              loadingText="Download"
              onClick={onDownloadClick}
              w={{ base: '100%', sm: 'auto' }}
            >
              {t('ui.download')}
            </Button>
          </FormControl>
        </SimpleGrid>
      </Stack>

      {isDownloading && (
        <HStack
          w="full"
          bg="blue.50"
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="md"
          px={4}
          py={3}
          spacing={3}
        >
          <Spinner size="sm" color="blue.500" flexShrink={0} />
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="blue.700">
              {statusLabel[downloadStatus] ?? 'Processing...'}
            </Text>
            <Text fontSize="xs" color="blue.500">
              You can leave this page. Your report will be available here once it is ready.
            </Text>
          </Box>
        </HStack>
      )}

      {readyFile && (
        <HStack
          w="full"
          bg="green.50"
          borderWidth="1px"
          borderColor="green.200"
          borderRadius="md"
          px={4}
          py={3}
          spacing={3}
          justify="space-between"
        >
          <HStack spacing={3} overflow="hidden">
            <CheckCircleIcon color="green.500" boxSize={5} flexShrink={0} />
            <Box overflow="hidden">
              <Text fontSize="sm" fontWeight="semibold" color="green.700">
                Report ready
              </Text>
              <Text fontSize="xs" color="green.600" noOfLines={1} title={readyFile.fileName}>
                {readyFile.fileName} - Link expires in 24 hours
              </Text>
            </Box>
          </HStack>
          <PreventableButton
            size="sm"
            colorScheme="green"
            flexShrink={0}
            onClick={consumeDownload}
          >
            Click to Download
          </PreventableButton>
        </HStack>
      )}

      {downloadStatus === 'FAILED' && failedMessage && (
        <HStack
          w="full"
          bg="red.50"
          borderWidth="1px"
          borderColor="red.200"
          borderRadius="md"
          px={4}
          py={3}
          spacing={3}
          justify="space-between"
        >
          <HStack spacing={3} overflow="hidden">
            <WarningIcon color="red.500" boxSize={5} flexShrink={0} />
            <Box overflow="hidden">
              <Text fontSize="sm" fontWeight="semibold" color="red.700">
                Report generation failed
              </Text>
              <Text fontSize="xs" color="red.600" noOfLines={2} title={failedMessage}>
                {failedMessage}
              </Text>
            </Box>
          </HStack>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            flexShrink={0}
            onClick={clearDownloadState}
          >
            OK
          </Button>
        </HStack>
      )}
    </VStack>
  );
};

export default memo(FeeSummaryReport);
