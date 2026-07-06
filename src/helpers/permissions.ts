// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 ThitsaWorks
import { store } from '@store';
import { type ActionId } from '../configs/action-ids';

export const hasActionPermission = (allowedActionId: ActionId): boolean => {
  const {
    user: { data },
  } = store.getState();

  const actionList: string[] = data?.accessActionList ?? [];
  return actionList.includes(allowedActionId);
};
