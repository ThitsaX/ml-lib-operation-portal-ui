// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useColorModeValue,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { CustomSelect } from '@components/interface';
import { HeaderCell, Cell } from '@components/interface/Table';
import { getErrorMessage } from '@helpers/errors';
import { NdcThresholdHelper } from '@helpers/form';
import { useGetParticipantCurrencyListByDfspId } from '@hooks/services/participant';
import {
  createNdcDfspConfiguration,
  createNdcThresholdDetail,
  getNdcDfspConfiguration,
  getNdcThresholdDetails,
  modifyNdcDfspConfiguration,
  modifyNdcThresholdDetail,
  removeNdcThresholdDetail
} from '@services/ndc-configurations';
import {
  type IApiErrorResponse,
  type INdcDfspConfiguration,
  type INdcThresholdDetail
} from '@typescript/services';

interface NdcThresholdSettingsProps {
  dfspId?: string;
}

type ThresholdForm = {
  id?: string;
  currency: string;
  visualConfig: string | number;
  ndcConfig: string | number;
  status?: boolean;
};

const defaultThresholdForm: ThresholdForm = {
  currency: '',
  visualConfig: '',
  ndcConfig: '',
  status: true
};

const getConfigId = (config?: INdcDfspConfiguration | null) => {
  if (!config?.thresholdConfigurationId) return '';
  return String(config.thresholdConfigurationId);
};

const NdcThresholdSettings = ({ dfspId }: NdcThresholdSettingsProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const borderColor = useColorModeValue('gray', 'gray.600');
  const headerBg = useColorModeValue('gray.200', 'gray.500');
  const { data: currencyList } = useGetParticipantCurrencyListByDfspId(
    dfspId ?? ''
  );
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const ndcThresholdHelper = new NdcThresholdHelper();

  const [thresholdForm, setThresholdForm] =
    useState<ThresholdForm>(defaultThresholdForm);
  const [deleteItem, setDeleteItem] = useState<INdcThresholdDetail | null>(
    null
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [isDeletingThreshold, setIsDeletingThreshold] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid }
  } = useForm<ThresholdForm>({
    defaultValues: thresholdForm,
    resolver: zodResolver(ndcThresholdHelper.schema),
    mode: 'onChange'
  });

  const configQuery = useQuery<INdcDfspConfiguration, IApiErrorResponse>({
    queryKey: ['getNdcDfspConfiguration', dfspId],
    queryFn: () => getNdcDfspConfiguration(dfspId as string),
    enabled: Boolean(dfspId),
    retry: false,
    refetchOnWindowFocus: false
  });

  const thresholdConfigurationId = getConfigId(configQuery.data);

  const thresholdsQuery = useQuery<INdcThresholdDetail[], IApiErrorResponse>({
    queryKey: ['getNdcThresholdDetails'],
    queryFn: getNdcThresholdDetails,
    enabled: Boolean(dfspId),
    refetchOnWindowFocus: false
  });

  const enabled = Boolean(configQuery.data?.thresholdEnabled);
  const thresholds = thresholdsQuery.data ?? [];

  const currencyOptions = useMemo(
    () =>
      currencyList?.map((item) => ({
        value: item.currency,
        label: item.currency
      })) ?? [],
    [currencyList]
  );

  useEffect(() => {
    if (isOpen) {
      reset(thresholdForm);
    }
  }, [isOpen, reset, thresholdForm]);

  const showError = (error: unknown, fallback: string) => {
    toast({
      position: 'top',
      status: 'error',
      description: getErrorMessage(error as IApiErrorResponse) || fallback,
      duration: 3000,
      isClosable: true
    });
  };

  const ensureConfiguration = async (nextEnabled = false) => {
    if (thresholdConfigurationId) return thresholdConfigurationId;
    if (!dfspId) throw new Error('DFSP id is required.');

    const created = await createNdcDfspConfiguration({
      scopeType: 'DFSP',
      dfspId,
      thresholdEnabled: nextEnabled
    });
    await configQuery.refetch();
    return String(created.thresholdConfigurationId);
  };

  const toggleConfiguration = async (nextEnabled: boolean) => {
    setIsSavingConfig(true);
    try {
      const id = await ensureConfiguration(nextEnabled);
      await modifyNdcDfspConfiguration(id, {
        thresholdEnabled: nextEnabled,
        status: 'ACTIVE'
      });
      toast({
        title: t('ui.success'),
        position: 'top',
        description: nextEnabled
          ? 'NDC threshold notifications enabled.'
          : 'NDC threshold notifications disabled.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      await configQuery.refetch();
      await thresholdsQuery.refetch();
    } catch (error) {
      showError(error, 'Failed to update NDC threshold notification setting.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const openAddModal = () => {
    setThresholdForm(defaultThresholdForm);
    onOpen();
  };

  const openEditModal = (item: INdcThresholdDetail) => {
    setThresholdForm({
      id: String(item.id),
      currency: item.currency,
      visualConfig: String(item.visualConfig),
      ndcConfig: String(item.ndcConfig),
      status: item.status
    });
    onOpen();
  };

  const saveThreshold = async (values: ThresholdForm) => {
    setIsSavingThreshold(true);
    try {
      const visualConfig = Number(values.visualConfig);
      const ndcConfig = Number(values.ndcConfig);

      if (values.id) {
        await modifyNdcThresholdDetail(values.id, {
          currency: values.currency,
          visualConfig,
          ndcConfig,
          status: values.status ?? true
        });
      } else {
        if (!thresholdConfigurationId) {
          toast({
            position: 'top',
            status: 'warning',
            description: 'DFSP NDC configuration id was not found.',
            duration: 3000,
            isClosable: true
          });
          return;
        }

        await createNdcThresholdDetail({
          thresholdConfigurationId,
          currency: values.currency,
          visualConfig,
          ndcConfig
        });
      }

      toast({
        title: t('ui.success'),
        position: 'top',
        description: values.id
          ? 'Currency threshold updated.'
          : 'Currency threshold added.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      await thresholdsQuery.refetch();
      onClose();
    } catch (error) {
      showError(error, 'Failed to save currency threshold.');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem?.id) return;

    setIsDeletingThreshold(true);
    try {
      await removeNdcThresholdDetail(String(deleteItem.id));
      toast({
        title: t('ui.success'),
        position: 'top',
        description: `${deleteItem.currency} threshold removed.`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      await thresholdsQuery.refetch();
      setDeleteItem(null);
    } catch (error) {
      showError(error, 'Failed to remove currency threshold.');
    } finally {
      setIsDeletingThreshold(false);
    }
  };

  return (
    <VStack align="stretch" spacing={6} w="full">
      <Box
        width="100%"
        p={4}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        rounded="md">
        <VStack align="flex-start" spacing={4} w="full">
          <HStack justify="space-between" align="center" w="full">
            <Box>
              <Text fontSize="lg" fontWeight="bold" lineHeight="1.2">
                NDC Threshold Notification Setting
              </Text>
              <Text color="gray.600" fontSize="sm" mt={1}>
                Top-level switch for NDC threshold display and notifications.
              </Text>
            </Box>
            <HStack spacing={3}>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={enabled ? 'green.600' : 'gray.500'}>
                {enabled ? t('ui.active') : t('ui.inactive')}
              </Text>
              <Switch
                colorScheme="green"
                isChecked={enabled}
                isDisabled={isSavingConfig || configQuery.isLoading || !dfspId}
                onChange={(event) => toggleConfiguration(event.target.checked)}
              />
            </HStack>
          </HStack>

          {configQuery.isLoading ? (
            <HStack color="gray.600">
              <Spinner size="sm" />
              <Text fontSize="sm">Loading DFSP configuration...</Text>
            </HStack>
          ) : configQuery.isError ? (
            <Box
              p={3}
              bg="orange.50"
              border="1px solid"
              borderColor="orange.200"
              rounded="md"
              w="full">
              <Text fontSize="sm" color="orange.800">
                No active DFSP NDC configuration was loaded for {dfspId}. Use
                the switch or Add threshold to create it.
              </Text>
            </Box>
          ) : null}

          <VStack align="stretch" spacing={0} w="full">
            <HStack
              justify="space-between"
              py={3}
              borderTop="1px solid"
              borderColor="gray.200">
              <Box>
                <Text fontWeight="semibold">If setting is off</Text>
                <Text color="gray.600" fontSize="sm" mt={1}>
                  No threshold lookup, no outbox record, and no notification is
                  sent.
                </Text>
              </Box>
              <Badge
                colorScheme="red"
                borderRadius="full"
                px={4}
                py={2}
                textTransform="none"
                fontSize="sm">
                Stop
              </Badge>
            </HStack>
            <HStack
              justify="space-between"
              py={3}
              borderTop="1px solid"
              borderColor="gray.200">
              <Box>
                <Text fontWeight="semibold">If setting is on</Text>
                <Text color="gray.600" fontSize="sm" mt={1}>
                  Evaluate each currency threshold and send notifications on
                  breach.
                </Text>
              </Box>
              <Badge
                colorScheme="green"
                borderRadius="full"
                px={4}
                py={2}
                textTransform="none"
                fontSize="sm">
                Continue
              </Badge>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      <Box
        width="100%"
        p={4}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        rounded="md"
        mb={6}>
        <VStack align="flex-start" spacing={4} w="full">
          <HStack justify="space-between" align="center" w="full">
            <Box>
              <Text fontSize="lg" fontWeight="bold" lineHeight="1.2">
                NDC Thresholds
              </Text>
              <Text color="gray.600" fontSize="sm" mt={1}>
                Set the visual alert and notification alert level for each
                currency.
              </Text>
            </Box>
            <Button
              colorScheme="blue"
              size="md"
              onClick={openAddModal}
              isDisabled={!dfspId}>
              {t('ui.add')}
            </Button>
          </HStack>

          <TableContainer
            border={`1px solid ${borderColor}`}
            borderRadius="sm"
            w="full">
            <Table variant="unstyled">
              <Thead bg={headerBg}>
                <Tr>
                  <HeaderCell borderColor={borderColor}>
                    {t('ui.currency')}
                  </HeaderCell>
                  <HeaderCell borderColor={borderColor}>
                    Visual Alert
                  </HeaderCell>
                  <HeaderCell borderColor={borderColor}>
                    Notification Alert
                  </HeaderCell>
                  <HeaderCell borderColor={borderColor}>Status</HeaderCell>
                  <HeaderCell borderColor={borderColor}>
                    {t('ui.action')}
                  </HeaderCell>
                </Tr>
              </Thead>
              <Tbody>
                {thresholdsQuery.isLoading && (
                  <Tr>
                    <Cell borderColor={borderColor} colSpan={5}>
                      <HStack justify="center">
                        <Spinner size="sm" />
                        <Text>Loading thresholds...</Text>
                      </HStack>
                    </Cell>
                  </Tr>
                )}
                {!thresholdsQuery.isLoading && thresholds.length === 0 && (
                  <Tr>
                    <Cell borderColor={borderColor} colSpan={5}>
                      No currency thresholds yet. Use Add to create one.
                    </Cell>
                  </Tr>
                )}
                {thresholds.map((item) => (
                  <Tr key={String(item.id)}>
                    <Cell borderColor={borderColor} fontWeight="semibold">
                      {item.currency}
                    </Cell>
                    <Cell borderColor={borderColor}>{item.visualConfig}%</Cell>
                    <Cell borderColor={borderColor}>{item.ndcConfig}%</Cell>
                    <Cell borderColor={borderColor}>
                      <Badge
                        colorScheme={item.status ? 'green' : 'gray'}
                        borderRadius="full"
                        px={3}
                        py={1}
                        textTransform="none">
                        {item.status ? t('ui.active') : t('ui.inactive')}
                      </Badge>
                    </Cell>
                    <Td border={`1px solid ${borderColor}`} px={4} py={2}>
                      <HStack spacing={3} justify="center">
                        <Tooltip
                          label="Edit threshold"
                          bg="white"
                          color="black">
                          <IconButton
                            aria-label={t('ui.edit')}
                            icon={<FiEdit2 />}
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(item)}
                          />
                        </Tooltip>
                        <Tooltip
                          label="Delete threshold"
                          bg="white"
                          color="black">
                          <IconButton
                            aria-label={t('ui.delete')}
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteItem(item)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                {thresholdForm.id
                  ? 'Edit Currency Threshold'
                  : 'Add Currency Threshold'}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isInvalid={Boolean(errors.currency)} isRequired>
                    <FormLabel>{t('ui.currency')}</FormLabel>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          options={currencyOptions}
                          value={
                            field.value
                              ? {
                                  value: String(field.value),
                                  label: String(field.value)
                                }
                              : null
                          }
                          onChange={(selectedOption) =>
                            field.onChange(selectedOption?.value ?? '')
                          }
                          placeholder={t('ui.select_currency')}
                        />
                      )}
                    />
                    <FormErrorMessage>
                      {errors.currency?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl
                    isInvalid={Boolean(errors.visualConfig)}
                    isRequired>
                    <FormLabel>Visual alert (%)</FormLabel>
                    <Controller
                      name="visualConfig"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      )}
                    />
                    <FormErrorMessage>
                      {errors.visualConfig?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={Boolean(errors.ndcConfig)} isRequired>
                    <FormLabel>Notification alert (%)</FormLabel>
                    <Controller
                      name="ndcConfig"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      )}
                    />
                    <FormErrorMessage>
                      {errors.ndcConfig?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl>
                    <HStack justify="space-between" w="full">
                      <Box>
                        <FormLabel mb={1}>Status</FormLabel>
                        <Text color="gray.600" fontSize="sm">
                          Enable or disable this currency threshold.
                        </Text>
                      </Box>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <HStack spacing={3}>
                            <Text
                              color={field.value ? 'green.600' : 'gray.500'}
                              fontSize="sm"
                              fontWeight="semibold">
                              {field.value ? t('ui.active') : t('ui.inactive')}
                            </Text>
                            <Switch
                              colorScheme="green"
                              isChecked={Boolean(field.value)}
                              onChange={(event) =>
                                field.onChange(event.target.checked)
                              }
                            />
                          </HStack>
                        )}
                      />
                    </HStack>
                  </FormControl>
                </VStack>
              </ModalBody>
              <ModalFooter display="flex" gap={3}>
                <Button variant="ghost" onClick={onClose}>
                  {t('ui.cancel')}
                </Button>
                <Button
                  colorScheme="blue"
                  mr={3}
                  onClick={handleSubmit(saveThreshold)}
                  isDisabled={!isDirty || !isValid}
                  isLoading={isSavingThreshold}
                  loadingText={t('ui.saving')}>
                  {t('ui.save')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <AlertDialog
            isOpen={Boolean(deleteItem)}
            leastDestructiveRef={cancelDeleteRef}
            onClose={() => setDeleteItem(null)}>
            <AlertDialogOverlay>
              <AlertDialogContent>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  Delete Currency Threshold
                </AlertDialogHeader>
                <AlertDialogBody>
                  Are you sure you want to delete the{' '}
                  <Text as="span" fontWeight="bold">
                    {deleteItem?.currency ?? ''}
                  </Text>{' '}
                  threshold?
                </AlertDialogBody>
                <AlertDialogFooter>
                  <Button
                    ref={cancelDeleteRef}
                    onClick={() => setDeleteItem(null)}>
                    {t('ui.cancel')}
                  </Button>
                  <Button
                    colorScheme="blue"
                    ml={3}
                    isLoading={isDeletingThreshold}
                    onClick={confirmDelete}>
                    {t('ui.delete')}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </VStack>
      </Box>
    </VStack>
  );
};

export default NdcThresholdSettings;
