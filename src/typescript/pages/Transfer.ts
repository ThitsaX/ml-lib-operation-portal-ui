// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
export type TransferType = 'inbound' | 'outbound' | string;

export type Ranges =
  | 'today'
  | 'oneDay'
  | 'twoDay'
  | 'oneWeek'
  | 'oneMonth'
  | 'oneYear'
  | 'custom';

export type DateRange = {
  [key in Ranges]: {
    from: string;
    to: string;
  };
};
