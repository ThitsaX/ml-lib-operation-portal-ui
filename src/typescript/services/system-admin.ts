// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 ThitsaWorks
export interface ICreateRoleRequest {
  name: string
  isDfsp: boolean
}

export interface IModifyRoleGrantListRequest {
  roleId: string
  actionIdList: string[]
}

export interface IAction {
  actionId: {
    id: string;
    entityId: string;
  };
  actionName: string;
  selected: boolean;
  mandatory: boolean;
}

export interface IActionOptionListResponse {
  actionOptionList: IAction[];
}
