// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  getNdcSchemeConfiguration,
  getNdcWorkerConfigurationByJobName
} from '@services/ndc-configurations';
import {
  type IApiErrorResponse,
  type INdcSchemeConfiguration,
  type INdcWorkerConfiguration
} from '@typescript/services';

type NdcQueryOptions<TData> = Omit<
  UseQueryOptions<TData, IApiErrorResponse, TData>,
  'queryKey' | 'queryFn'
>;

export const useGetNdcSchemeConfiguration = (
  options?: NdcQueryOptions<INdcSchemeConfiguration>
) =>
  useQuery<INdcSchemeConfiguration, IApiErrorResponse, INdcSchemeConfiguration>(
    {
      queryKey: ['getNdcSchemeConfiguration'],
      queryFn: getNdcSchemeConfiguration,
      ...options
    }
  );

export const useGetNdcWorkerConfigurationByJobName = (
  options?: NdcQueryOptions<INdcWorkerConfiguration>
) =>
  useQuery<INdcWorkerConfiguration, IApiErrorResponse, INdcWorkerConfiguration>(
    {
      queryKey: ['getNdcWorkerConfigurationByJobName'],
      queryFn: () => getNdcWorkerConfigurationByJobName(),
      ...options
    }
  );
