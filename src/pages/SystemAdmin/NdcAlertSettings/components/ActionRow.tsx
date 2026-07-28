// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { Box, HStack, Text } from '@chakra-ui/react';
import StatusPill from './StatusPill';

interface ActionRowProps {
  title: string;
  description: string;
  status: string;
  colorScheme: string;
}

const ActionRow = ({
  title,
  description,
  status,
  colorScheme
}: ActionRowProps) => (
  <HStack
    justify="space-between"
    align="center"
    spacing={4}
    w="full"
    p={4}
    border="1px solid"
    borderColor="gray.200"
    borderRadius="lg">
    <Box>
      <Text fontSize="md" fontWeight="bold" color="gray.800">
        {title}
      </Text>
      <Text color="gray.600" fontSize="sm" mt={2}>
        {description}
      </Text>
    </Box>
    <StatusPill colorScheme={colorScheme}>{status}</StatusPill>
  </HStack>
);

export default ActionRow;
