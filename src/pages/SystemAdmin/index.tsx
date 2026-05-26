import React, { useState, useEffect, useMemo } from "react";
import {
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Flex,
  Box,
  useToast,
  useDisclosure,
  Heading,
  Spinner,
  Center,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { FiAlertCircle, FiChevronDown, FiPlus, FiSearch } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { modifyRoleGrantList } from '@services/participant';
import { useSystemAdminRoles, useGetActionListByRole } from '@hooks/useSystemAdminRoles';
import { useNavigate, useParams } from 'react-router-dom';
import { type IApiErrorResponse } from '@typescript/services';
import type { IParticipantUserRole } from '@typescript/services/participant';
import { getErrorMessage } from '@helpers/errors';
import { useTranslation } from 'react-i18next';
import { PermissionCard, PaginationControls, PermissionChangesModal } from "@components/interface";
import AddNewModal from '@components/interface/SideBar/AddNewModal';

type PermissionAction = {
  id: string;
  name: string;
  category: string;
  selected: boolean;
  mandatory: boolean;
};

const getActionCategory = (action: any) => (
  action.category
  ?? 'Uncategorized'
);

const RolePermissionPage = () => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<PermissionAction[]>([]);
  const [originalActions, setOriginalActions] = useState<PermissionAction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [changesList, setChangesList] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState<string>('1');
  const [isSaving, setIsSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAddRoleOpen,
    onOpen: onAddRoleOpen,
    onClose: onAddRoleClose,
  } = useDisclosure();

  const toast = useToast();
  const navigate = useNavigate();
  const { roleId: urlRoleId } = useParams<{ roleId: string }>();

  const itemsPerPage = 36;

  // Use the existing hook for role management
  const { roles, isLoading: isRolesLoading } = useSystemAdminRoles();

  // Find the current role name from hook's role list
  const currentRole = roles?.find((role: IParticipantUserRole) => role.roleId === urlRoleId);
  const currentRoleName = currentRole?.name || 'System Admin';
  const fallbackRoleId = roles?.[0]?.roleId;
  const hasRoles = Boolean(roles?.length);
  const isInvalidRoleId = Boolean(urlRoleId && roles && !currentRole);

  // Fetch actions based on selected role
  const { data: roleActions, isLoading, isFetching, isError: isActionsError, error: actionsError } = useGetActionListByRole(urlRoleId ?? '', {
    enabled: Boolean(urlRoleId && currentRole),
  });
  const isActionsLoading = isLoading || isFetching;

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const resetPermissionState = () => {
    setActions([]);
    setOriginalActions([]);
    setChangesList([]);
    setSearchTerm('');
    setSelectedCategory('All');
    setCurrentPageIndex(0);
    setPageNumber('1');
  };

  useEffect(() => {
    resetPermissionState();
  }, [urlRoleId]);

  // Update actions when roleActions data is fetched
  useEffect(() => {
    if (!isActionsLoading && !isActionsError && roleActions && Array.isArray(roleActions)) {
      const formattedActions = roleActions.map((action: any) => ({
        id: String(action.actionId.id),
        name: action.actionName,
        category: getActionCategory(action),
        selected: action.selected,
        mandatory: action.mandatory
      }));
      setActions(formattedActions);
      setOriginalActions(formattedActions);
      // Reset pagination to page 1 when new role data loads
      setCurrentPageIndex(0);
      setPageNumber('1');
      setSelectedCategory('All');
    }
  }, [isActionsError, isActionsLoading, roleActions]);

  useEffect(() => {
    if (isActionsError) {
      resetPermissionState();
    }
  }, [isActionsError]);

  // Filter actions based on search term
  const filteredData = useMemo(() => {
    return actions.filter(action => {
      const matchesSearch = !searchTerm || action.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || action.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [actions, searchTerm, selectedCategory]);

  const categoryOptions = useMemo(() => {
    const sortedCategories = Array.from(new Set(actions.map((action) => action.category).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));

    return ['All', ...sortedCategories];
  }, [actions]);

  const paginatedData = isActionsLoading || isActionsError ? [] : filteredData;

  // Reset pagination when loading state changes to true
  useEffect(() => {
    if (isActionsLoading) {
      setCurrentPageIndex(0);
      setPageNumber('1');
    }
  }, [isActionsLoading]);

  // Reset pagination when search results change and current page is out of bounds
  useEffect(() => {
    const newTotalPages = Math.ceil(paginatedData.length / itemsPerPage);
    if (currentPageIndex >= newTotalPages && newTotalPages > 0) {
      setCurrentPageIndex(0);
      setPageNumber('1');
    }
  }, [paginatedData, currentPageIndex]);

  // Simple pagination for grid layout
  const totalPages = Math.max(1, Math.ceil(paginatedData.length / itemsPerPage));
  const startIndex = currentPageIndex * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = paginatedData.slice(startIndex, endIndex);
  const canPreviousPage = !isActionsLoading && currentPageIndex > 0;
  const canNextPage = !isActionsLoading && currentPageIndex < totalPages - 1;

  useEffect(() => {
    setPageNumber(String(currentPageIndex + 1));
  }, [currentPageIndex]);

  const handleGotoPage = (pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
  };

  const handleRoleChange = (roleId: string) => {
    if (roleId === urlRoleId) {
      return;
    }

    resetPermissionState();
    navigate(`/system-admin/${roleId}`);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPageIndex(0);
    setPageNumber('1');
  };

  const handleNextPage = () => {
    const nextPageIndex = currentPageIndex + 1;
    if (nextPageIndex < totalPages) {
      setCurrentPageIndex(nextPageIndex);
    }
  };

  const handlePreviousPage = () => {
    const prevPageIndex = currentPageIndex - 1;
    if (prevPageIndex >= 0) {
      setCurrentPageIndex(prevPageIndex);
    }
  };

  const handlePageValidation = (value: string) => {
    const pageNum = Number(value);
    if (pageNum > totalPages) {
      setPageNumber(String(currentPageIndex + 1));
    } else if (value.startsWith('0')) {
      setPageNumber('');
    } else {
      setPageNumber(value);
      handleGotoPage(pageNum - 1);
    }
  }

  const discardChanges = () => {
    setActions(originalActions);
    setChangesList([]);
    toast({
      title: "Changes Discarded",
      position: `top`,
      description: "All permission changes have been reverted",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const closeChangesModal = () => {
    // Reset changes to original state
    setActions(originalActions);
    setChangesList([]);
    onClose();
  };

  const saveChanges = async () => {
    if (!urlRoleId) {
      toast({
        title: "Error",
        description: "No role selected. Please select a role first.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    // Prevent multiple clicks
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    const selectedActionIds = actions.filter(action => action.selected).map(action => action.id);

    try {
      await modifyRoleGrantList({ roleId: urlRoleId, actionIdList: selectedActionIds });

      toast({
        title: "Changes Saved",
        position: `top`,
        description: `New permissions have been added`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Reset changes state and close modal only on success
      setOriginalActions(actions);
      setChangesList([]);
      onClose();
    } catch (error: any) {
      const err = error as IApiErrorResponse;
      toast({
        title: "Error",
        description: getErrorMessage(error),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAction = (actionId: string) => {
    setActions((prev) => {
      const updated = prev.map((a: any) =>
        a.id === actionId ? { ...a, selected: !a.selected } : a
      );

      // Update changesList to only include unique changed items
      setChangesList((changesPrev) => {
        const newChangesList = [...changesPrev];
        const existingIndex = newChangesList.indexOf(actionId);

        if (existingIndex === -1) {
          // Add to changes if not already there
          newChangesList.push(actionId);
        } else {
          // Remove from changes if it was already there (toggling back to original state)
          const originalAction = originalActions.find(a => a.id === actionId);
          const currentAction = updated.find(a => a.id === actionId);

          // Only remove if the current state matches the original state
          if (originalAction && currentAction && originalAction.selected === currentAction.selected) {
            newChangesList.splice(existingIndex, 1);
          }
        }

        return newChangesList;
      });

      return updated;
    });
  };

  const enabledCount = actions.filter((a) => a.selected).length;

  useEffect(() => {
    if (isRolesLoading || !hasRoles || !fallbackRoleId) {
      return;
    }

    if (!urlRoleId || isInvalidRoleId) {
      navigate(`/system-admin/${fallbackRoleId}`, { replace: true });
    }
  }, [fallbackRoleId, hasRoles, isInvalidRoleId, isRolesLoading, navigate, urlRoleId]);

  if (isRolesLoading || (hasRoles && (!urlRoleId || isInvalidRoleId))) {
    return (
      <Center flex={1} minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600" fontSize="sm">Loading role permissions...</Text>
        </VStack>
      </Center>
    );
  }

  if (!hasRoles) {
    return (
      <Center flex={1} minH="400px" px={4}>
        <VStack spacing={3} textAlign="center">
          <Icon as={FiAlertCircle} boxSize={8} color="gray.400" />
          <Heading fontSize="lg">No roles available</Heading>
          <Text color="gray.600" fontSize="sm">
            Role permissions will appear here after roles are configured.
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Flex justify="center" flexDirection="column" flex={1} p="2">
      <VStack align="flex-start" w="full" h="full" py="2" px="1" mt={9}>
        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={3}
          w="full"
          mb={5}
        >
          <HStack spacing={3} align="baseline">
            <Heading fontSize="2xl" fontWeight="bold">{currentRoleName}</Heading>
            {!isActionsLoading && !isActionsError && (
              <Text fontSize="sm" color="gray.600">
                {enabledCount}/{actions.length} actions
              </Text>
            )}
          </HStack>

          <Menu placement="bottom-end">
            {({ onClose: closeRoleMenu }) => (
              <>
                <MenuButton
                  as={Button}
                  rightIcon={<FiChevronDown />}
                  w={{ base: "full", md: "220px" }}
                  h="38px"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius="4px"
                  color="gray.700"
                  fontSize="14px"
                  fontWeight="400"
                  justifyContent="space-between"
                  px={3}
                  isDisabled={isRolesLoading}
                  _hover={{ borderColor: "gray.400" }}
                  _active={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                >
                  Change role
                </MenuButton>

                <MenuList w="220px" minW="220px" p={0} overflow="hidden" zIndex={20}>
                  <Box maxH="220px" overflowY="auto" py={1}>
                    {roles?.map((role: IParticipantUserRole) => {
                      const isSelected = role.roleId === urlRoleId;

                      return (
                        <MenuItem
                          key={role.roleId}
                          onClick={() => handleRoleChange(role.roleId)}
                          bg={isSelected ? "blue.50" : "white"}
                          color={isSelected ? "blue.700" : "gray.700"}
                          fontSize="14px"
                          fontWeight={isSelected ? "600" : "400"}
                          minH="36px"
                          _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                        >
                          {role.name}
                        </MenuItem>
                      );
                    })}
                  </Box>

                  <Box borderTop="1px solid" borderColor="gray.200" bg="white" py={1}>
                    <MenuItem
                      icon={<FiPlus />}
                      color="blue.600"
                      fontSize="14px"
                      fontWeight="600"
                      minH="38px"
                      onClick={() => {
                        closeRoleMenu();
                        window.setTimeout(onAddRoleOpen, 0);
                      }}
                      _hover={{ bg: "blue.50" }}
                    >
                      Add new role
                    </MenuItem>
                  </Box>
                </MenuList>
              </>
            )}
          </Menu>
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          wrap={{ base: "wrap", md: "nowrap" }}
          gap={4}
          w="full"
          mb={4}
        >
          <InputGroup maxW={{ base: "100%", md: "400px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search permissions by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="flushed"
              focusBorderColor="blue.400"
            />
          </InputGroup>
          <HStack
            spacing={3}
            wrap={{ base: "wrap", md: "nowrap" }}
            justify={{ base: "flex-start", md: "flex-end" }}
          >
            <Button
              onClick={discardChanges}
              isDisabled={changesList.length === 0}
            >
              {t('ui.discard_changes')}
            </Button>

            <Button
              color="white"
              bg="primary"
              _hover={{
                bg: 'primary',
                opacity: 0.4
              }}
              onClick={onOpen}
              isDisabled={changesList.length === 0}
            >
              {t('ui.save_all_changes')}
            </Button>
          </HStack>
        </Flex>

        {!isActionsLoading && !isActionsError && categoryOptions.length > 1 && (
          <Flex gap={2} mb={6} w="full" wrap="wrap">
            {categoryOptions.map((category) => {
              const isSelected = selectedCategory === category;
              const label = category === 'All' ? 'All actions' : category;

              return (
                <Button
                  key={category}
                  size="sm"
                  variant={isSelected ? "solid" : "outline"}
                  bg={isSelected ? "primary" : "white"}
                  color={isSelected ? "white" : "gray.700"}
                  borderColor={isSelected ? "primary" : "gray.200"}
                  fontWeight="600"
                  h="36px"
                  flexShrink={0}
                  onClick={() => handleCategoryChange(category)}
                  _hover={{
                    bg: isSelected ? "primary" : "gray.50",
                    borderColor: isSelected ? "primary" : "gray.300",
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Flex>
        )}

        {/* Actions Grid */}
        {isActionsLoading ? (
          <Flex
            justify="center"
            align="center"
            h="400px"
            w="full"
            bg="white"
            borderRadius="lg"
          >
            <VStack spacing={4} align="center">
              <Spinner size="xl" color="blue.500" />
              <Text color="gray.600" fontSize="sm">Loading permissions...</Text>
            </VStack>
          </Flex>
        ) : isActionsError ? (
          <Center
            minH="320px"
            w="full"
            bg="white"
            borderRadius="lg"
          >
            <VStack spacing={3} align="center" textAlign="center" px={4}>
              <Icon as={FiAlertCircle} boxSize={8} color="red.400" />
              <Text color="gray.800" fontWeight="semibold">
                Could not load role permissions
              </Text>
              <Text color="gray.600" fontSize="sm">
                {actionsError ? getErrorMessage(actionsError) : 'Please try changing role again.'}
              </Text>
            </VStack>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 1, md: 2, lg: 4 }} spacing={3} w="full">
            {currentPageData.map((action) => (
              <PermissionCard key={action.id} action={action} onToggle={toggleAction} />
            ))}
          </SimpleGrid>
        )}

        {/* Pagination Controls */}

        {!isActionsError && (
          <PaginationControls
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            currentPageIndex={currentPageIndex}
            totalPages={totalPages}
            pageNumber={pageNumber}
            isLoading={isActionsLoading}
            onGotoPage={handleGotoPage}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onPageValidation={handlePageValidation}
          />
        )}

        {/* Changes Modal */}

        <PermissionChangesModal
          isOpen={isOpen}
          onClose={onClose}
          changesList={changesList}
          actions={actions}
          originalActions={originalActions}
          isLoading={isLoading}
          isSaving={isSaving}
          closeChangesModal={closeChangesModal}
          saveChanges={saveChanges}
        />

        <AddNewModal
          isOpen={isAddRoleOpen}
          onClose={onAddRoleClose}
        />
      </VStack>
    </Flex>
  );
};

export default RolePermissionPage;
