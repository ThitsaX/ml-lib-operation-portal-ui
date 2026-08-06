// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Text,
  VStack
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import CustomSelect, { type OptionType } from '@components/interface/CustomSelect';
import { RevenueSectionLabel } from '@pages/RevenueSharing/components';
import { RevenueConfigHelper } from '@helpers/form';
import {
  type IRevenueConfigFormValues,
  type IRevenueSplitPercentages,
  type RevenueConfigRequestedAction
} from '@typescript/services';

export type RevenueTimezoneOption = OptionType & { offset: string };

interface RevenueConfigRuleModalProps {
  isOpen: boolean;
  isEdit: boolean;
  initialValues: IRevenueConfigFormValues;
  categoryOptions: OptionType[];
  responsibleMinistryOptions: OptionType[];
  thirdPartyProviderOptions: OptionType[];
  timezoneOptions: RevenueTimezoneOption[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (requestedAction: RevenueConfigRequestedAction, values: IRevenueConfigFormValues) => void;
}

const revenueConfigSchema = new RevenueConfigHelper();

const toPercentageNumber = (value?: number | string) => Number(value || 0);

const getPercentageTotal = (percentages: IRevenueSplitPercentages) =>
  toPercentageNumber(percentages.GOL) +
  toPercentageNumber(percentages.MINISTRY) +
  toPercentageNumber(percentages['3PP']) +
  toPercentageNumber(percentages.SENDING_DFSP);

const normalizePercentageInput = (value: string) => {
  const sanitizedValue = value.replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = sanitizedValue.split('.');

  if (decimalParts.length === 0) return integerPart;

  return integerPart + '.' + decimalParts.join('');
};

const RevenueConfigRuleModal = ({
  isOpen,
  isEdit,
  initialValues,
  categoryOptions,
  responsibleMinistryOptions,
  thirdPartyProviderOptions,
  timezoneOptions,
  isSaving,
  onClose,
  onSubmit
}: RevenueConfigRuleModalProps) => {
  const { t } = useTranslation();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid }
  } = useForm<IRevenueConfigFormValues>({
    resolver: zodResolver(revenueConfigSchema.schema),
    defaultValues: initialValues,
    mode: 'onChange'
  });

  useEffect(() => {
    if (isOpen) reset(initialValues);
  }, [initialValues, isOpen, reset]);

  const percentages = watch('percentages');
  const percentageErrors = {
    GOL: revenueConfigSchema.validatePercentage(percentages.GOL, t('ui.gol_gra_percent')),
    MINISTRY: revenueConfigSchema.validatePercentage(percentages.MINISTRY, t('ui.responsible_ministry_percent')),
    '3PP': revenueConfigSchema.validatePercentage(percentages['3PP'], t('ui.third_party_percent')),
    SENDING_DFSP: revenueConfigSchema.validatePercentage(percentages.SENDING_DFSP, t('ui.sending_dfsp_percent'))
  };
  const hasPercentageErrors = Object.values(percentageErrors).some(Boolean);
  const percentageTotal = getPercentageTotal(percentages);
  const isRevenueSplitTotalValid = revenueConfigSchema.isPercentageTotalValid(percentageTotal);
  const selectedTimezone = watch('effectiveTimezone');
  const selectedTimezoneOption = timezoneOptions.find((option) => option.value === selectedTimezone) ||
    timezoneOptions.find((option) => option.offset === selectedTimezone) ||
    null;

  const handleFormSubmit = (values: IRevenueConfigFormValues) => {
    onSubmit(isEdit ? 'UPDATE_REVENUE_CONFIG' : 'CREATE_REVENUE_CONFIG', {
      ...values,
      taxCodeId: values.taxCodeId || initialValues.taxCodeId,
      revenueConfigId: initialValues.revenueConfigId
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.500" />
      <ModalContent
        as="form"
        noValidate
        onSubmit={handleSubmit(handleFormSubmit)}
        w={{ base: 'calc(100vw - 32px)', md: '720px' }}
        maxW="720px"
        rounded="xl"
        boxShadow="2xl"
      >
        <ModalHeader pb={3}>{isEdit ? t('ui.edit_rule') : t('ui.add_rule')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody py={5} maxH="calc(100vh - 220px)" overflowY="auto" pr={5}>
          <VStack spacing={4} align="stretch">
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <FormControl isRequired isInvalid={Boolean(errors.taxCodeId)}>
                <FormLabel fontSize="sm">{t('ui.tax_code_id')}</FormLabel>
                <Input
                  placeholder="e.g. 071"
                  isDisabled={isEdit}
                  {...register('taxCodeId')}
                />
                <FormErrorMessage>{errors.taxCodeId?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isRequired isInvalid={Boolean(errors.category)}>
                <FormLabel fontSize="sm">{t('ui.category')}</FormLabel>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <CustomSelect
                      options={categoryOptions}
                      value={categoryOptions.find((option) => option.value === field.value) || null}
                      onChange={(selected: OptionType | null) => field.onChange(String(selected?.value || ''))}
                    />
                  )}
                />
                <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
              </FormControl>
            </Grid>

            <FormControl isRequired isInvalid={Boolean(errors.taxCodeDescription)}>
              <FormLabel fontSize="sm">{t('ui.tax_code_description_label')}</FormLabel>
              <Input
                placeholder="e.g. Passport Application Fee"
                {...register('taxCodeDescription')}
              />
              <FormErrorMessage>{errors.taxCodeDescription?.message}</FormErrorMessage>
            </FormControl>

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <FormControl isRequired isInvalid={Boolean(errors.responsibleMinistryCode)}>
                <FormLabel fontSize="sm">{t('ui.responsible_ministry')}</FormLabel>
                <Controller
                  control={control}
                  name="responsibleMinistryCode"
                  render={({ field }) => (
                    <CustomSelect
                      options={responsibleMinistryOptions}
                      value={responsibleMinistryOptions.find((option) => option.value === field.value) || null}
                      onChange={(selected: OptionType | null) => field.onChange(String(selected?.value || ''))}
                      placeholder={t('ui.select_responsible_ministry')}
                    />
                  )}
                />
                <FormErrorMessage>{errors.responsibleMinistryCode?.message}</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{t('ui.third_party_provider')}</FormLabel>
                <Controller
                  control={control}
                  name="thirdPartyProviderCode"
                  render={({ field }) => (
                    <CustomSelect
                      options={thirdPartyProviderOptions}
                      value={thirdPartyProviderOptions.find((option) => option.value === field.value) || thirdPartyProviderOptions[0]}
                      onChange={(selected: OptionType | null) => field.onChange(String(selected?.value || ''))}
                    />
                  )}
                />
              </FormControl>
            </Grid>

            <RevenueSectionLabel>{t('ui.revenue_split_configuration')}</RevenueSectionLabel>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <FormControl isInvalid={Boolean(percentageErrors.GOL || errors.percentages?.GOL)}>
                <FormLabel fontSize="sm">{t('ui.gol_gra_percent')}</FormLabel>
                <Controller
                  control={control}
                  name="percentages.GOL"
                  render={({ field }) => (
                    <NumberInput min={0} max={100} step={0.01} value={field.value} onChange={(value) => field.onChange(normalizePercentageInput(value))}>
                      <NumberInputField placeholder="e.g. 55.00" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{percentageErrors.GOL || errors.percentages?.GOL?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(percentageErrors.MINISTRY || errors.percentages?.MINISTRY)}>
                <FormLabel fontSize="sm">{t('ui.responsible_ministry_percent')}</FormLabel>
                <Controller
                  control={control}
                  name="percentages.MINISTRY"
                  render={({ field }) => (
                    <NumberInput min={0} max={100} step={0.01} value={field.value} onChange={(value) => field.onChange(normalizePercentageInput(value))}>
                      <NumberInputField placeholder="e.g. 5.00" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{percentageErrors.MINISTRY || errors.percentages?.MINISTRY?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(percentageErrors['3PP'] || errors.percentages?.['3PP'])}>
                <FormLabel fontSize="sm">{t('ui.third_party_percent')}</FormLabel>
                <Controller
                  control={control}
                  name="percentages.3PP"
                  render={({ field }) => (
                    <NumberInput min={0} max={100} step={0.01} value={field.value} onChange={(value) => field.onChange(normalizePercentageInput(value))}>
                      <NumberInputField placeholder="e.g. 35.00" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{percentageErrors['3PP'] || errors.percentages?.['3PP']?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(percentageErrors.SENDING_DFSP || errors.percentages?.SENDING_DFSP)}>
                <FormLabel fontSize="sm">{t('ui.sending_dfsp_percent')}</FormLabel>
                <Controller
                  control={control}
                  name="percentages.SENDING_DFSP"
                  render={({ field }) => (
                    <NumberInput min={0} max={100} step={0.01} value={field.value} onChange={(value) => field.onChange(normalizePercentageInput(value))}>
                      <NumberInputField placeholder="e.g. 5.00" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{percentageErrors.SENDING_DFSP || errors.percentages?.SENDING_DFSP?.message}</FormErrorMessage>
              </FormControl>
            </Grid>
            <Box
              px={4}
              py={3}
              rounded="md"
              bg={isRevenueSplitTotalValid ? 'green.50' : 'orange.50'}
              color={isRevenueSplitTotalValid ? 'green.700' : 'orange.700'}
              fontSize="sm"
              fontWeight="bold"
            >
              {isRevenueSplitTotalValid
                ? t('ui.revenue_split_total_valid', { total: percentageTotal.toFixed(0) })
                : t('ui.revenue_split_total_invalid', { total: percentageTotal.toFixed(2) })}
            </Box>

            <RevenueSectionLabel>{t('ui.effective_date_section')}</RevenueSectionLabel>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <FormControl isRequired isInvalid={Boolean(errors.effectiveDate)}>
                <FormLabel fontSize="sm">{t('ui.effective_date_time')}</FormLabel>
                <Input type="datetime-local" {...register('effectiveDate')} />
                <FormErrorMessage>{errors.effectiveDate?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isRequired isInvalid={Boolean(errors.effectiveTimezone)}>
                <FormLabel fontSize="sm">{t('ui.timezone')}</FormLabel>
                <Controller
                  control={control}
                  name="effectiveTimezone"
                  render={({ field }) => (
                    <CustomSelect
                      options={timezoneOptions}
                      value={selectedTimezoneOption}
                      onChange={(selected: OptionType | null) => field.onChange(String(selected?.value || ''))}
                      maxMenuHeight={300}
                      menuPlacement="top"
                    />
                  )}
                />
                <FormErrorMessage>{errors.effectiveTimezone?.message}</FormErrorMessage>
              </FormControl>
            </Grid>

            <Text color="gray.600" fontSize="sm" lineHeight="1.6">
              {t('ui.revenue_config_effective_date_note')}
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" mr={3} onClick={onClose}>{t('ui.cancel')}</Button>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSaving}
            isDisabled={!isValid || hasPercentageErrors || !isRevenueSplitTotalValid || isSaving}
          >
            {t('ui.save_rule')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RevenueConfigRuleModal;