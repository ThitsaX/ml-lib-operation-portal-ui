// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
export interface INdcThresholdForm {
  id?: string;
  currency: string;
  visualConfig: string | number;
  ndcConfig: string | number;
  status?: boolean;
}