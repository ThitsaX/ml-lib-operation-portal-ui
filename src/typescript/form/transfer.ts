// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 ThitsaWorks
export interface ITransferValues {
  fromDate: string
  toDate: string
  transferId?: string
  payerFspId?: string
  payeeFspId?: string
  payerIdentifierTypeId?: string
  payeeIdentifierTypeId?: string
  payerIdentifierValue?: string
  payeeIdentifierValue?: string
  currencyId?: string
  transferStateId?: string
  timezone?: string
  pageIndex: number
  pageSize: number
}
