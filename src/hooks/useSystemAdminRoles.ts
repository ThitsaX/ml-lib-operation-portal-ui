// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { useQuery } from '@tanstack/react-query';
import { useGetRoleList } from './services';
import { UseQueryOptions } from '@tanstack/react-query';
import { IAction, IApiErrorResponse } from '@typescript/services';
import { getActionListByRole } from '@services/participant';
import { useGetUserState } from '@store/hooks';
import { menuIds } from '@configs/menu-ids';


export const useSystemAdminRoles = () => {
  const { auth, data } = useGetUserState();
  const hasAuth = Boolean(auth?.accessKey && auth?.secretKey);
  const accessMenuList = data?.accessMenuList as number[] | undefined;
  const canAccessSystemAdmin = accessMenuList?.includes(menuIds.system_admin) ?? false;

  // Custom query to get roles for hub participant
  const { data: roles, isLoading } = useGetRoleList({
    enabled: hasAuth && canAccessSystemAdmin,
  });

  return {
    roles,
    isLoading,
  };
};

export const useGetActionListByRole = (
  roleId: string,
  options?: UseQueryOptions<IAction[], IApiErrorResponse>
) =>
  useQuery<IAction[], IApiErrorResponse>({
    queryKey: ['getActionListByRole', roleId],
    queryFn: ({ queryKey }) => getActionListByRole(queryKey[1] as string),
    enabled: Boolean(roleId),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    keepPreviousData: false,
    ...options
  });
