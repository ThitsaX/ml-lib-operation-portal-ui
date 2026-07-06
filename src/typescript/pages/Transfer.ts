// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 ThitsaWorks
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
