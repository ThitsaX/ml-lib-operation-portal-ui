// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
export interface INdcSchemeConfiguration {
  thresholdConfigurationId: string | number;
  thresholdScopeType: 'SCHEME' | string;
  dfspId: string | null;
  thresholdEnabled: boolean;
  ndcConfigurationStatus: 'ACTIVE' | 'INACTIVE' | string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface IModifyNdcSchemeConfigurationRequest {
  thresholdEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface IModifyNdcSchemeConfigurationResponse {
  thresholdConfigurationId: string;
  modified: boolean;
}

export interface ISchedulerConfigId {
  id: string | number;
  entityId?: string | number;
}

export interface INdcWorkerConfiguration {
  schedulerConfigId: string | number | ISchedulerConfigId;
  name: string;
  jobName: string;
  cronExpression?: string;
  description: string;
  zoneId: string;
  active: boolean;
  runEvery?: string;
}

export interface INdcWorkerConfigurationResponse {
  config: INdcWorkerConfiguration;
}

export interface IModifyNdcWorkerConfigurationRequest {
  name: string;
  jobName: string;
  description: string;
  runEvery: string;
  zoneId: string;
  active: boolean;
}

export interface IModifyNdcWorkerConfigurationResponse {
  updated: boolean;
}

export interface INdcDfspConfiguration extends INdcSchemeConfiguration {
  thresholdScopeType: 'DFSP' | string;
  dfspId: string;
  createBy?: string | null;
}

export interface ICreateNdcDfspConfigurationRequest {
  scopeType: 'DFSP';
  dfspId: string;
  thresholdEnabled: boolean;
}

export interface ICreateNdcDfspConfigurationResponse {
  thresholdConfigurationId: string | number;
}

export interface INdcThresholdDetail {
  id: string | number;
  thresholdConfigurationId: string | number;
  currency: string;
  visualConfig: number;
  ndcConfig: number;
  status: boolean;
}

export interface INdcThresholdDetailsResponse {
  thresholdDetails: INdcThresholdDetail[];
}

export interface ICreateNdcThresholdDetailRequest {
  thresholdConfigurationId: string | number;
  currency: string;
  visualConfig: number;
  ndcConfig: number;
}

export interface ICreateNdcThresholdDetailResponse {
  thresholdDetailId: string | number;
}

export interface IModifyNdcThresholdDetailRequest {
  currency: string;
  visualConfig: number;
  ndcConfig: number;
  status: boolean;
}

export interface IModifyNdcThresholdDetailResponse {
  thresholdDetailId: string | number;
  modified?: boolean;
}

export interface IRemoveNdcThresholdDetailResponse {
  thresholdDetailId: string | number;
  removed: boolean;
}


