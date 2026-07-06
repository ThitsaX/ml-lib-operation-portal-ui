// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 ThitsaWorks
import { memo, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { HStack, Text, Tooltip, Box, Link, Button, Divider, useDisclosure, VStack } from '@chakra-ui/react';
import { useGetUserState } from '@store/hooks';
import { menuIds } from '../../../configs/menu-ids';
import { FiDatabase, FiPlus, FiShield } from 'react-icons/fi';
import AddNewModal from './AddNewModal';

export interface SideBarItemProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to: string;
  menuId: string;
  collapsed?: boolean;
  isHeader?: boolean;
  isSubItem?: boolean;
  isButton?: boolean;
  isSubAccordion?: boolean;
  subItems?: SideBarItemProps[];
}

const SideBarItem = (props: SideBarItemProps) => {
  const { label, icon, menuId, collapsed = false, to, isHeader, isSubItem, isButton, isSubAccordion, subItems } = props;
  const { data } = useGetUserState();
  const [menuList, setMenuList] = useState<number[]>([]);
  const [isSubAccordionOpen, setIsSubAccordionOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (data?.accessMenuList) {
      setMenuList(data.accessMenuList);
    }
  }, [data]);

  const checkMenuIds = () => {
    const id = menuIds[menuId];
    return menuList?.includes(id);
  };

  if (!checkMenuIds()) return null;

  if (isHeader) {
    return (
      <HStack spacing={2} align="center" px={4} py={2}>
        <Box fontSize="lg"><FiDatabase /></Box>
        <Text fontSize="xs" fontWeight="semibold" color="gray.700">
          {label}
        </Text>
      </HStack>
    );
  }

  if (isSubItem) {
    return (
      <Text
        fontSize="xs"
        color="gray.600"
        cursor="pointer"
        _hover={{ color: "blue.600" }}
        px={4}
        py={1}
        pl={10}
        onClick={() => console.log(`Clicked: ${label}`)}
      >
        {label}
      </Text>
    );
  }

  if (isSubAccordion) {
    return (
      <Box>
        <HStack
          spacing={2}
          align="center"
          px={4}
          py={2}
          cursor="pointer"
          onClick={() => setIsSubAccordionOpen(!isSubAccordionOpen)}
          _hover={{ bg: "gray.100" }}
          borderRadius="md"
        >
          <Box fontSize="lg" color="blue.500"><FiShield /></Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700">{label}</Text>
          <ChevronDownIcon
            boxSize="1.25em"
            color="currentColor"
            ml="auto"
            transform={isSubAccordionOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 0.16s ease"
            aria-hidden
            flexShrink={0}
          />
        </HStack>

        {isSubAccordionOpen && !collapsed && (
          <VStack align="stretch" spacing={1} pl={8} pr={2} py={2}>
            {subItems?.map((subItem) => (
              <SideBarItem
                key={subItem.id}
                {...subItem}
                collapsed={collapsed}
              />
            ))}
          </VStack>
        )}
      </Box>
    );
  }

  if (isButton) {
    return (
      <>
        <Divider my={2} />
        <Button
          size="xs"
          leftIcon={<FiPlus />}
          colorScheme="blue"
          variant="outline"
          w="calc(100% - 16px)"
          mx={2}
          onClick={onOpen}
        >
          {label}
        </Button>
        <AddNewModal isOpen={isOpen} onClose={onClose} />
      </>
    );
  }

  return (
    <Tooltip label={collapsed ? label : ''} placement="right" hasArrow>
      <Link
        as={NavLink}
        to={to}
        display="inline-flex"
        alignItems="center"
        justifyContent={collapsed ? 'center' : 'flex-start'}
        marginRight={4}
        px={collapsed ? 2 : 4}
        mr={4}
        py="2"
        w="100%"
        borderRadius="md"
        textDecoration="none"
        color="gray.700"
        rounded="lg"
        alignSelf="stretch"
        fontWeight="medium"
        transition="all 0.15s ease"
        _hover={{
          bgColor: 'gray.100',
          color: 'gray.900',
          transform: 'translateX(2px)'
        }}
        _activeLink={{
          bgColor: 'primary',
          color: 'white !important',
          fontWeight: 'semibold',
          '& *': {
            color: 'white !important'
          }
        }}
        sx={{
          '&.active': {
            bgColor: 'primary',
            color: 'white',
            fontWeight: 'semibold',
            '& *': {
              color: 'white'
            }
          }
        }}
      >
        <HStack spacing={collapsed ? 0 : 2}>
          {icon && <Box fontSize="lg">{icon}</Box>}
          {!collapsed && <Text fontSize="sm">{label}</Text>}
        </HStack>
      </Link>
    </Tooltip>
  );
};

export default memo(SideBarItem);
