// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { Badge } from '@chakra-ui/react';
import { type ReactNode } from 'react';

interface StatusPillProps {
  children: ReactNode;
  colorScheme: string;
}

const StatusPill = ({ children, colorScheme }: StatusPillProps) => (
  <Badge
    colorScheme={colorScheme}
    borderRadius="full"
    px={4}
    py={2}
    textTransform="none"
    fontSize="sm">
    {children}
  </Badge>
);

export default StatusPill;
