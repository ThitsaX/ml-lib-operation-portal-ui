import { useQuery } from '@tanstack/react-query';
import type { IParticipantUserRole } from '@typescript/services/participant';
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

  // Transform roles to SideBarItemProps format
  const roleItems = roles?.map((role: IParticipantUserRole) => ({
    id: role.roleId,
    label: role.name,
    to: `/system-admin/${role.roleId}`,
    menuId: 'system_admin', // Using parent menuId for all role items
  })) || [];

  // Add design section items
  const designSectionItems = [
    {
      id: 'add-new-data',
      label: 'Add New',
      to: '#',
      menuId: 'system_admin',
      isButton: true,
    },
  ];

  // Combine role items with design section items
  const systemAdminItems = [...roleItems, ...designSectionItems];

  return {
    roles,
    isLoading,
    systemAdminItems,
  };
};

export const useGetActionListByRole = (
  roleId: string,
  options?: UseQueryOptions<IAction[], IApiErrorResponse>
) =>
  useQuery<IAction[], IApiErrorResponse>({
    queryKey: ['getActionListByRole', roleId],
    queryFn: ({ queryKey }) => getActionListByRole(queryKey[1] as string),
    ...options
  });
