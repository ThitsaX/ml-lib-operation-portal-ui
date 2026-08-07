// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  Badge,
  Box,
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useToast
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { allTimezones, type ITimezoneOption, useTimezoneSelect } from 'react-timezone-select';
import { Column, CellProps, usePagination, useSortBy, useTable } from 'react-table';
import { FaRegEdit } from 'react-icons/fa';
import { FiSlash } from 'react-icons/fi';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import {
  RevenueCard,
  RevenuePageShell,
  RevenueSearchInput,
  RevenueConfirmDialog,
  RevenueTableContainer,
  RevenueToolbar
} from '@pages/RevenueSharing/components';
import { formatEpochToTZ } from '@helpers/dateHelper';
import { getErrorMessage } from '@helpers/errors';
import { hasActionPermission } from '@helpers/permissions';
import { useGetRevenueConfigList, useGetRevenuePartyList } from '@hooks/services/revenue-sharing';
import { createRevenueApprovalRequest } from '@services/revenue-sharing';
import { type RootState } from '@store';
import { PaginationControls } from '@components/interface';
import { type OptionType } from '@components/interface/CustomSelect';
import RevenueConfigRuleModal, { type RevenueTimezoneOption } from './RevenueConfigRuleModal';
import {
  type IApiErrorResponse,
  type IRevenueConfig,
  type IRevenueConfigFormValues,
  type IRevenueParty,
  type IRevenueSplitPercentages,
  RevenuePartyTypeEnum,
  type RevenueConfigRequestedAction
} from '@typescript/services';

const EMPTY_PERCENTAGES: IRevenueSplitPercentages = {
  GOL: '',
  MINISTRY: '',
  '3PP': '',
  SENDING_DFSP: ''
};

const EMPTY_FORM: IRevenueConfigFormValues = {
  taxCodeId: '',
  taxCodeDescription: '',
  responsibleMinistryCode: '',
  thirdPartyProviderCode: '',
  category: 'DOMESTIC',
  effectiveDate: '',
  effectiveTimezone: 'GMT+00:00',
  percentages: EMPTY_PERCENTAGES
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  CURRENT: { bg: 'green.50', color: 'green.700' },
  FUTURE: { bg: 'purple.100', color: 'purple.700' },
  INACTIVE: { bg: 'gray.100', color: 'gray.700' }
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  DOMESTIC: { bg: 'purple.100', color: 'purple.700' },
  CUSTOMS: { bg: 'orange.100', color: 'orange.700' },
  CROSS_BORDER: { bg: 'blue.50', color: 'blue.700' }
};

const CATEGORY_OPTIONS: OptionType[] = [
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'CUSTOMS', label: 'Customs' }
];


const getOffsetForZone = (timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit'
  });
  const offsetText = formatter.formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value ?? '';
  const match = offsetText.replace('GMT', '').replace('UTC', '').match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  const sign = match?.[1] ?? '+';
  const hours = String(Number(match?.[2] ?? '0')).padStart(2, '0');
  const minutes = String(match?.[3] ?? '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
};

const stripLeadingGMT = (label: string) => label.replace(/^\(GMT[+\-?]\d{1,2}:\d{2}\)\s*/i, '');

const normalizeTimezoneOffset = (timezone?: string) => {
  const value = timezone || 'GMT+00:00';
  if (value.startsWith('GMT')) return value;
  if (value.startsWith('UTC')) return `GMT${value.replace('UTC', '')}`;
  if (/^[+-]\d{2}:\d{2}$/.test(value)) return `GMT${value}`;

  try {
    return `GMT${getOffsetForZone(value)}`;
  } catch {
    return 'GMT+00:00';
  }
};

const getRevenuePartyCode = (party: IRevenueParty) => party.partyCode || '';

const getRevenuePartyName = (party: IRevenueParty) => party.partyName || '';

const getRevenuePartyType = (party: IRevenueParty) => party.partyType || '';

const isActiveRevenueParty = (party: IRevenueParty) => party.isActive === true;

const isResponsibleMinistry = (party: IRevenueParty) =>
  getRevenuePartyType(party) === RevenuePartyTypeEnum.RESPONSIBLE_MINISTRY;

const isThirdParty = (party: IRevenueParty) =>
  getRevenuePartyType(party) === RevenuePartyTypeEnum.THIRD_PARTY;

const normalizeDateTime = (value?: string) => {
  if (!value) return '';
  const dateTime = value.replace('T', ' ').slice(0, 19);
  return dateTime.length === 16 ? `${dateTime}:00` : dateTime;
};

const toDateTimeInputValue = (value?: string) => {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
};

const getCurrentDateTimeInputValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return '-';
  if (typeof value === 'string') return value.replace('T', ' ').replace('Z', '').slice(0, 19);
  const timestamp = value < 10000000000 ? value * 1000 : value;
  return new Date(timestamp).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
};

const toPercentageNumber = (value?: number | string) => Number(value || 0);

const getPercentageTotal = (percentages: IRevenueSplitPercentages) =>
  toPercentageNumber(percentages.GOL) +
  toPercentageNumber(percentages.MINISTRY) +
  toPercentageNumber(percentages['3PP']) +
  toPercentageNumber(percentages.SENDING_DFSP);

const getConfigPercentages = (config: IRevenueConfig): IRevenueSplitPercentages => ({
  GOL: Number(config.golPercentage),
  MINISTRY: Number(config.ministryPercentage),
  '3PP': Number(config.thirdPartyPercentage),
  SENDING_DFSP: Number(config.sendingDfspPercentage)
});

const getRevenueConfigLastUpdated = (config: IRevenueConfig) => config.updatedAt || null;

const getRevenueConfigModifiedBy = (config: IRevenueConfig) => config.createdBy || '';

const getRevenueConfigEffectiveDate = (config: IRevenueConfig) => config.effectiveDate;

const getRevenueConfigEffectiveTimezone = (config: IRevenueConfig) => config.effectiveTimezone;

const RevenueSplitBar = ({ percentages }: { percentages: IRevenueSplitPercentages }) => {
  const total = Math.max(getPercentageTotal(percentages), 1);
  const segments = [
    { key: 'GOL', value: percentages.GOL, color: 'purple.400' },
    { key: 'MINISTRY', value: percentages.MINISTRY, color: 'green.500' },
    { key: '3PP', value: percentages['3PP'], color: 'blue.500' },
    { key: 'SENDING_DFSP', value: percentages.SENDING_DFSP, color: 'orange.400' }
  ];

  return (
    <HStack spacing={0} w="full" h="10px" rounded="full" overflow="hidden" bg="gray.100">
      {segments.map((segment) => (
        <Box
          key={segment.key}
          h="full"
          bg={segment.color}
          w={String(Math.max((toPercentageNumber(segment.value) / total) * 100, segment.value ? 2 : 0)) + '%'}
        />
      ))}
    </HStack>
  );
};

const createPayload = (
  requestedAction: RevenueConfigRequestedAction,
  values: IRevenueConfigFormValues
) => ({
  requestedAction,
  ...(values.revenueConfigId ? { revenueConfigId: values.revenueConfigId } : {}),
  taxCodeId: values.taxCodeId,
  taxCodeDescription: values.taxCodeDescription,
  responsibleMinistryCode: values.responsibleMinistryCode,
  thirdPartyProviderCode: values.thirdPartyProviderCode,
  category: values.category,
  effectiveDate: normalizeDateTime(values.effectiveDate),
  effectiveTimezone: normalizeTimezoneOffset(values.effectiveTimezone),
  percentages: {
    GOL: toPercentageNumber(values.percentages.GOL),
    MINISTRY: toPercentageNumber(values.percentages.MINISTRY),
    '3PP': toPercentageNumber(values.percentages['3PP']),
    SENDING_DFSP: toPercentageNumber(values.percentages.SENDING_DFSP)
  }
});

const fromConfig = (config: IRevenueConfig): IRevenueConfigFormValues => ({
  revenueConfigId: config.revenueConfigId,
  taxCodeId: config.taxCodeId,
  taxCodeDescription: config.taxCodeDescription,
  responsibleMinistryCode: config.responsibleMinistryCode,
  thirdPartyProviderCode: config.thirdPartyProviderCode || '',
  category: config.category,
  effectiveDate: toDateTimeInputValue(config.effectiveDate),
  effectiveTimezone: normalizeTimezoneOffset(config.effectiveTimezone),
  percentages: getConfigPercentages(config)
});

const RevenueConfig = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedTimezone = useSelector<RootState, ITimezoneOption>((state) => state.app.selectedTimezone);
  const selectedTZString = selectedTimezone.value;
  const { options: timezoneSelectOptions } = useTimezoneSelect({
    labelStyle: 'original',
    timezones: allTimezones
  });
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [modalInitialValues, setModalInitialValues] = useState<IRevenueConfigFormValues>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IRevenueConfig | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetRevenueConfigList({
    refetchOnWindowFocus: false
  });
  const { data: revenueParties } = useGetRevenuePartyList({
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (isError) {
      toast({
        position: 'top',
        description:
          getErrorMessage(error as IApiErrorResponse) ||
          t('ui.failed_to_fetch_revenue_configs'),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  }, [error, isError, t, toast]);

  const configs = useMemo(() => data || [], [data]);
  const responsibleMinistries = useMemo(
    () => (revenueParties || []).filter((party) => isActiveRevenueParty(party) && isResponsibleMinistry(party)),
    [revenueParties]
  );
  
  const thirdPartyProviders = useMemo(
    () => (revenueParties || []).filter((party) => isActiveRevenueParty(party) && isThirdParty(party)),
    [revenueParties]
  );

  const responsibleMinistryOptions = useMemo<OptionType[]>(() => {
    const options = responsibleMinistries.map((party) => ({
      value: getRevenuePartyCode(party),
      label: getRevenuePartyName(party)
    }));

    if (modalInitialValues.responsibleMinistryCode && !options.some((option) => option.value === modalInitialValues.responsibleMinistryCode)) {
      options.push({ value: modalInitialValues.responsibleMinistryCode, label: modalInitialValues.responsibleMinistryCode });
    }

    return options;
  }, [modalInitialValues.responsibleMinistryCode, responsibleMinistries]);

  const thirdPartyProviderOptions = useMemo<OptionType[]>(() => {
    const options = thirdPartyProviders.map((party) => ({
      value: getRevenuePartyCode(party),
      label: getRevenuePartyName(party)
    }));

    if (modalInitialValues.thirdPartyProviderCode && !options.some((option) => option.value === modalInitialValues.thirdPartyProviderCode)) {
      options.push({ value: modalInitialValues.thirdPartyProviderCode, label: modalInitialValues.thirdPartyProviderCode });
    }

    return [{ value: '', label: 'None' }, ...options];
  }, [modalInitialValues.thirdPartyProviderCode, thirdPartyProviders]);

  const timezoneOptions = useMemo<RevenueTimezoneOption[]>(
    () => timezoneSelectOptions.map((option) => {
      const timezone = String(option.value);
      const offset = getOffsetForZone(timezone);
      return {
        value: timezone,
        label: `(GMT${offset}) ${stripLeadingGMT(String(option.label))}`,
        offset: `GMT${offset}`
      };
    }),
    [timezoneSelectOptions]
  );

  const filteredConfigs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return configs;

    return configs.filter((config) =>
      [
        config.taxCodeId,
        config.taxCodeDescription,
        config.category,
        config.responsibleMinistryName,
        config.responsibleMinistryCode,
        config.thirdPartyProviderName,
        config.thirdPartyProviderCode,
        config.status,
        getRevenueConfigModifiedBy(config),
        getRevenueConfigLastUpdated(config)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [configs, search]);

  const closeModal = () => {
    setIsOpen(false);
    setIsEdit(false);
    setModalInitialValues(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setModalInitialValues({
      ...EMPTY_FORM,
      effectiveDate: getCurrentDateTimeInputValue(),
      effectiveTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    });
    setIsOpen(true);
  };

  const openEditModal = (config: IRevenueConfig) => {
    setIsEdit(true);
    setModalInitialValues(fromConfig(config));
    setIsOpen(true);
  };

  const submitApprovalRequest = async (requestedAction: RevenueConfigRequestedAction, values: IRevenueConfigFormValues) => {
    setIsSaving(true);
    try {
      await createRevenueApprovalRequest(createPayload(requestedAction, values));
      toast({
        position: 'top',
        description: t('ui.revenue_config_approval_request_submitted'),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      closeModal();
      await refetch();
    } catch (error) {
      toast({
        position: 'top',
        description:
          getErrorMessage(error as IApiErrorResponse) ||
          t('ui.failed_to_submit_revenue_config_approval_request'),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (config: IRevenueConfig) => {
    setDeleteTarget(config);
  };

  const closeDeleteDialog = () => {
    if (isSaving) return;
    setDeleteTarget(null);
  };

  const deleteConfig = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    try {
      await createRevenueApprovalRequest(createPayload('DELETE_REVENUE_CONFIG', fromConfig(deleteTarget)));
      toast({
        position: 'top',
        description: t('ui.revenue_config_delete_request_submitted'),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      toast({
        position: 'top',
        description:
          getErrorMessage(error as IApiErrorResponse) ||
          t('ui.failed_to_submit_revenue_config_approval_request'),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo<Column<IRevenueConfig>[]>(() => [
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">#</Text>,
      id: 'rowNumber',
      accessor: (_row, index) => index + 1,
      Cell: ({ value }: CellProps<IRevenueConfig, number>) => value
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.tax_code')}</Text>,
      accessor: 'taxCodeId',
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => <Text color="gray.700">{value || '-'}</Text>
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.description')}</Text>,
      accessor: 'taxCodeDescription',
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => <Text color="gray.700" textAlign="left">{value || '-'}</Text>
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.category')}</Text>,
      accessor: 'category',
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => {
        const style = CATEGORY_STYLE[value] || CATEGORY_STYLE.DOMESTIC;
        return <Badge bg={style.bg} color={style.color} rounded="full" px={3} py={1} textTransform="capitalize">{value || '-'}</Badge>;
      }
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.ministry')}</Text>,
      id: 'ministry',
      accessor: (config) => config.responsibleMinistryName,
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => value || '-'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.third_party_provider_short')}</Text>,
      id: 'thirdPartyProvider',
      accessor: (config) => config.thirdPartyProviderName,
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => value || '-'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.revenue_split')}</Text>,
      id: 'revenueSplit',
      disableSortBy: true,
      Cell: ({ row }: CellProps<IRevenueConfig>) => <RevenueSplitBar percentages={getConfigPercentages(row.original)} />
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.gol_percent')}</Text>,
      accessor: (config) => getConfigPercentages(config).GOL,
      id: 'golPercent',
      Cell: ({ value }: CellProps<IRevenueConfig, number | string>) => String(value) + '%'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.ministry_percent')}</Text>,
      accessor: (config) => getConfigPercentages(config).MINISTRY,
      id: 'ministryPercent',
      Cell: ({ value }: CellProps<IRevenueConfig, number | string>) => String(value) + '%'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.third_party_percent')}</Text>,
      accessor: (config) => getConfigPercentages(config)['3PP'],
      id: 'thirdPartyPercent',
      Cell: ({ value }: CellProps<IRevenueConfig, number | string>) => String(value) + '%'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.dfsp_percent')}</Text>,
      accessor: (config) => getConfigPercentages(config).SENDING_DFSP,
      id: 'dfspPercent',
      Cell: ({ value }: CellProps<IRevenueConfig, number | string>) => String(value) + '%'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.last_updated')}</Text>,
      id: 'lastUpdatedDate',
      accessor: (config) => formatEpochToTZ(getRevenueConfigLastUpdated(config) || '', selectedTZString),
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => value || '-'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.modified_by')}</Text>,
      id: 'modifiedBy',
      accessor: (config) => getRevenueConfigModifiedBy(config),
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => value || '-'
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.effective_date')}</Text>,
      id: 'effectiveDate',
      width: 260,
      accessor: (config) => `${formatDateTime(getRevenueConfigEffectiveDate(config))} ${getRevenueConfigEffectiveTimezone(config) || ''}`.trim(),
      Cell: ({ value }: CellProps<IRevenueConfig, string>) => (
        <Text w="full" whiteSpace="nowrap" textAlign="center">{value || '-'}</Text>
      )
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.status')}</Text>,
      accessor: 'status',
      Cell: ({ value }: CellProps<IRevenueConfig, string | undefined>) => {
        const normalized = value || 'CURRENT';
        const style = STATUS_STYLE[normalized] || STATUS_STYLE.CURRENT;
        return <Badge bg={style.bg} color={style.color} rounded="full" px={3} py={1} textTransform="capitalize">{normalized.toLowerCase()}</Badge>;
      }
    },
    {
      Header: () => <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">{t('ui.action')}</Text>,
      id: 'action',
      disableSortBy: true,
      Cell: ({ row }: CellProps<IRevenueConfig>) => {
        const isInactive = String(row.original.status || '').toUpperCase() === 'INACTIVE';
        const isActionDisabled = !hasActionPermission("CreateRevenueApprovalRequest") || isInactive;

        return (
          <HStack justify="center" spacing={2}>
            <Tooltip label={t('ui.edit')} placement="top">
              <IconButton
                aria-label={t('ui.edit')}
                icon={<FaRegEdit />}
                size="sm"
                variant="ghost"
                onClick={() => openEditModal(row.original)}
                isDisabled={isActionDisabled}
              />
            </Tooltip>
            <Tooltip label={t('ui.delete')} placement="top">
              <IconButton
                aria-label={t('ui.delete')}
                icon={<FiSlash />}
                size="sm"
                variant="ghost"
                onClick={() => openDeleteDialog(row.original)}
                isDisabled={isActionDisabled || isSaving}
              />
            </Tooltip>
          </HStack>
        );
      }
    }
  ], [isSaving, selectedTZString, t]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
    nextPage,
    previousPage,
    state: { pageIndex }
  } = useTable(
    {
      columns,
      data: filteredConfigs,
      autoResetSortBy: false,
      initialState: {
        pageSize: 10
      }
    },
    useSortBy,
    usePagination
  );

  const isTableLoading = isLoading || isFetching;

  const numericColumnIds = ['golPercent', 'ministryPercent', 'thirdPartyPercent', 'dfspPercent'];

  const getColumnTextAlign = (columnId: string) => (
    numericColumnIds.includes(columnId) ? 'right' : 'center'
  );

  const getColumnHeaderJustify = (columnId: string) => (
    numericColumnIds.includes(columnId) ? 'flex-end' : 'center'
  );

  return (
    <RevenuePageShell title={t('ui.revenue_config')}>
      <RevenueCard
        title={t('ui.active_revenue_rules')}
        description={t('ui.active_revenue_rules_description')}
      >
        <RevenueToolbar
          action={
            hasActionPermission("CreateRevenueApprovalRequest") ? (
              <Button colorScheme="blue" onClick={openCreateModal}>{t('ui.add_rule')}</Button>
            ) : null
          }
        >
          <RevenueSearchInput
            value={search}
            placeholder={t('ui.search_service')}
            onChange={setSearch}
          />
        </RevenueToolbar>

        <RevenueTableContainer>
            <Table variant="simple" {...getTableProps()}>
              <Thead bg="gray.100">
                {headerGroups.map((headerGroup) => {
                  const headerGroupProps = headerGroup.getHeaderGroupProps();
                  const { key: headerGroupKey, ...headerGroupRest } = headerGroupProps;
                  return (
                    <Tr key={headerGroupKey} {...headerGroupRest}>
                      {headerGroup.headers.map((column) => {
                        const headerProps = column.getHeaderProps(column.disableSortBy ? undefined : column.getSortByToggleProps());
                        const { key: headerKey, ...headerRest } = headerProps;
                        return (
                          <Th key={headerKey} px={3} textAlign={getColumnTextAlign(column.id)} textTransform="none" borderColor="gray.100" w={column.width} {...headerRest}>
                            <HStack align="center" justify={getColumnHeaderJustify(column.id)} spacing="1">
                              {column.render('Header')}
                              {column.disableSortBy ? null : (
                                <VStack display="inline-flex" align="center" spacing={0}>
                                  <Icon as={IoChevronUp} color={!column.isSorted ? 'gray.400' : !column.isSortedDesc ? 'gray.700' : 'gray.400'} />
                                  <Icon as={IoChevronDown} color={!column.isSorted ? 'gray.400' : column.isSortedDesc ? 'gray.700' : 'gray.400'} />
                                </VStack>
                              )}
                            </HStack>
                          </Th>
                        );
                      })}
                    </Tr>
                  );
                })}
              </Thead>
              <Tbody {...getTableBodyProps()}>
                {isTableLoading ? (
                  <Tr>
                    <Td colSpan={columns.length} py={12}>
                      <Center>
                        <VStack spacing={3}>
                          <Spinner color="blue.500" />
                          <Text color="gray.600" fontSize="sm">{t('ui.loading_revenue_configs')}</Text>
                        </VStack>
                      </Center>
                    </Td>
                  </Tr>
                ) : page.length === 0 ? (
                  <Tr>
                    <Td colSpan={columns.length} py={10} textAlign="center" color="gray.600">{t('ui.no_revenue_configs_found')}</Td>
                  </Tr>
                ) : (
                  page.map((row) => {
                    prepareRow(row);
                    const rowProps = row.getRowProps();
                    const { key: rowKey, ...rowRest } = rowProps;
                    return (
                      <Tr key={rowKey} fontSize="sm" _hover={{ bg: 'muted.50' }} {...rowRest}>
                        {row.cells.map((cell) => {
                          const cellProps = cell.getCellProps();
                          const { key: cellKey, ...cellRest } = cellProps;
                          return <Td key={cellKey} py={2} px={3} textAlign={getColumnTextAlign(cell.column.id)} borderColor="gray.100" {...cellRest}>{cell.render('Cell')}</Td>;
                        })}
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
            <PaginationControls
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              currentPageIndex={pageIndex}
              totalPages={pageOptions.length || 1}
              pageNumber={String(pageIndex + 1)}
              isLoading={isTableLoading}
              onGotoPage={gotoPage}
              onPreviousPage={previousPage}
              onNextPage={nextPage}
              onPageValidation={(value) => {
                if (!value) {
                  gotoPage(0);
                  return;
                }

                const pageValue = Number(value);
                if (Number.isNaN(pageValue)) return;

                gotoPage(Math.min(Math.max(pageValue, 1), pageOptions.length || 1) - 1);
              }}
            />
        </RevenueTableContainer>
      </RevenueCard>

      <RevenueConfigRuleModal
        isOpen={isOpen}
        isEdit={isEdit}
        initialValues={modalInitialValues}
        categoryOptions={CATEGORY_OPTIONS}
        responsibleMinistryOptions={responsibleMinistryOptions}
        thirdPartyProviderOptions={thirdPartyProviderOptions}
        timezoneOptions={timezoneOptions}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={submitApprovalRequest}
      />

      <RevenueConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={t('ui.delete')}
        message={t('ui.confirm_delete_revenue_config')}
        details={[
          { label: t('ui.tax_code'), value: deleteTarget?.taxCodeId || '-' },
          { label: t('ui.description'), value: deleteTarget?.taxCodeDescription || '-' }
        ]}
        confirmText={t('ui.delete')}
        cancelText={t('ui.cancel')}
        confirmColorScheme="red"
        isLoading={isSaving}
        onConfirm={deleteConfig}
        onCancel={closeDeleteDialog}
      />
    </RevenuePageShell>
  );
};

export default RevenueConfig;
