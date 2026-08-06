// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  HStack,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  TableContainer,
  Text,
  VStack,
  type BoxProps,
  type TableContainerProps
} from '@chakra-ui/react';
import { type ReactNode, useRef } from 'react';
import { TbSearch } from 'react-icons/tb';

export const RevenuePageShell = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) => (
  <VStack align="flex-start" w="full" minH="full" p="3" spacing={5} mt={10}>
    <Heading fontSize="2xl" fontWeight="bold" lineHeight="1.25">
      {title}
    </Heading>
    {children}
  </VStack>
);

export const RevenueCard = ({
  title,
  description,
  children,
  ...props
}: {
  title: string;
  description?: string;
  children: ReactNode;
} & BoxProps) => (
  <Box
    w="full"
    bg="white"
    py={{ base: 4, md: 6 }}
    px={0}
    rounded="lg"
    borderWidth="0"
    boxShadow="none"
    {...props}
  >
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading fontSize="lg" fontWeight="bold" mb={1} lineHeight="1.35">
          {title}
        </Heading>
        {description ? (
          <Text color="gray.600" fontSize="sm" lineHeight="1.6">
            {description}
          </Text>
        ) : null}
      </Box>
      {children}
    </VStack>
  </Box>
);

export const RevenueToolbar = ({
  children,
  action
}: {
  children?: ReactNode;
  action?: ReactNode;
}) => (
  <HStack
    w="full"
    justify="space-between"
    align={{ base: 'stretch', md: 'center' }}
    flexDirection={{ base: 'column', md: 'row' }}
    spacing={3}
  >
    <Box>{children}</Box>
    {action}
  </HStack>
);

export const RevenueSearchInput = ({
  value,
  placeholder,
  onChange
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) => (
  <Box w={{ base: 'full', md: '320px' }}>
    <InputGroup>
      <InputLeftElement pointerEvents="none">
        <TbSearch color="gray.400" />
      </InputLeftElement>
      <Input
        value={value}
        placeholder={placeholder}
        variant="flushed"
        focusBorderColor="blue.400"
        onChange={(event) => onChange(event.target.value)}
      />
    </InputGroup>
  </Box>
);

export const RevenueTableContainer = ({ children, ...props }: TableContainerProps) => (
  <TableContainer
    w="full"
    borderWidth="1px"
    borderColor="gray.100"
    rounded="lg"
    overflowX="auto"
    {...props}
  >
    {children}
  </TableContainer>
);

export const RevenueSectionLabel = ({ children }: { children: ReactNode }) => (
  <Text
    mt={2}
    mb={-1}
    color="gray.500"
    fontSize="xs"
    fontWeight="bold"
    letterSpacing="widest"
    textTransform="uppercase"
  >
    {children}
  </Text>
);

interface RevenueConfirmDialogDetail {
  label: ReactNode;
  value: ReactNode;
}

export const RevenueConfirmDialog = ({
  isOpen,
  title,
  message,
  details = [],
  confirmText,
  cancelText,
  confirmColorScheme = 'blue',
  isLoading = false,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: ReactNode;
  message: ReactNode;
  details?: RevenueConfirmDialogDetail[];
  confirmText: ReactNode;
  cancelText: ReactNode;
  confirmColorScheme?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onCancel}
      isCentered
    >
      <AlertDialogOverlay bg="blackAlpha.500">
        <AlertDialogContent rounded="xl" boxShadow="2xl">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="gray.800" pb={2}>
            {title}
          </AlertDialogHeader>
          <AlertDialogBody color="gray.700" pt={2}>
            <VStack align="stretch" spacing={4}>
              <Text>{message}</Text>
              {details.length ? (
                <Box bg="gray.50" border="1px solid" borderColor="gray.100" rounded="lg" px={4} py={3}>
                  <VStack align="stretch" spacing={2}>
                    {details.map((detail, index) => (
                      <HStack key={index} justify="space-between" align="flex-start" spacing={4}>
                        <Text color="gray.500" fontSize="sm">{detail.label}</Text>
                        <Text color="gray.800" fontSize="sm" fontWeight="semibold" textAlign="right">
                          {detail.value}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              ) : null}
            </VStack>
          </AlertDialogBody>
          <AlertDialogFooter pt={4}>
            <Button ref={cancelRef} variant="ghost" onClick={onCancel} isDisabled={isLoading}>
              {cancelText}
            </Button>
            <Button colorScheme={confirmColorScheme} onClick={onConfirm} isLoading={isLoading} ml={3}>
              {confirmText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
