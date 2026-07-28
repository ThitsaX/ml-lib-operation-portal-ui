// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
// PaginationControls.tsx

import {
  Flex,
  HStack,
  Text,
  Box,
  Divider,
  IconButton,
  Input,
} from '@chakra-ui/react';

import {
  TfiAngleDoubleLeft,
  TfiAngleDoubleRight,
  TfiAngleLeft,
  TfiAngleRight,
} from 'react-icons/tfi';

interface PaginationControlsProps {
  canPreviousPage: boolean;
  canNextPage: boolean;
  currentPageIndex: number;
  totalPages: number;
  pageNumber: string;
  isLoading: boolean;
  onGotoPage: (pageIndex: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageValidation: (value: string) => void;
}

const PaginationControls = ({
  canPreviousPage,
  canNextPage,
  currentPageIndex,
  totalPages,
  pageNumber,
  isLoading,
  onGotoPage,
  onPreviousPage,
  onNextPage,
  onPageValidation,
}: PaginationControlsProps) => {
  return (
    <Flex
      justify="space-between"
      align="center"
      wrap={{ base: 'wrap', md: 'nowrap' }}
      gap={{ base: 4, md: 2 }}
      w="full"
      px={4}
      py={3}
      bg="gray.50"
      borderTopWidth="1px"
    >
      <HStack flex={2}>
        <IconButton
          aria-label="Skip to start"
          variant="ghost"
          icon={<TfiAngleDoubleLeft />}
          isDisabled={!canPreviousPage}
          onClick={() => onGotoPage(0)}
        />

        <IconButton
          aria-label="Go previous"
          variant="ghost"
          icon={<TfiAngleLeft />}
          isDisabled={!canPreviousPage}
          onClick={onPreviousPage}
        />

        <IconButton
          aria-label="Go next"
          variant="ghost"
          icon={<TfiAngleRight />}
          isDisabled={!canNextPage}
          onClick={onNextPage}
        />

        <IconButton
          aria-label="Skip to end"
          variant="ghost"
          icon={<TfiAngleDoubleRight />}
          isDisabled={!canNextPage}
          onClick={() => onGotoPage(totalPages - 1)}
        />
      </HStack>

      <Text>
        Page{' '}
        <strong>
          {currentPageIndex + 1} of {totalPages}
        </strong>
      </Text>

      <Box h="6">
        <Divider orientation="vertical" />
      </Box>

      <HStack>
        <Text>Go to page</Text>

        <Input
          value={pageNumber ? Number(pageNumber) : ''}
          textAlign="center"
          w="14"
          type="number"
          min={1}
          max={totalPages}
          isDisabled={isLoading}
          onChange={(e) => onPageValidation(e.target.value)}
        />
      </HStack>
    </Flex>
  );
};

export default PaginationControls;