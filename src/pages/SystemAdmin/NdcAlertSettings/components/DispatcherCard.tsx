// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import {
  Badge,
  Box,
  HStack,
  Table,
  TableContainer,
  Tbody,
  Text,
  Thead,
  Tr,
  VStack
} from '@chakra-ui/react';
import { Cell, HeaderCell } from '@components/interface/Table';
import StatusPill from './StatusPill';

interface DispatcherEvent {
  time: string;
  component: string;
  status: string;
  detail: string;
}

interface DispatcherCardProps {
  events: DispatcherEvent[];
  borderColor: string;
  headerBg: string;
}

const DispatcherCard = ({
  events,
  borderColor,
  headerBg
}: DispatcherCardProps) => (
  <Box
    bg="white"
    border="1px solid"
    borderColor="gray.200"
    rounded="lg"
    p={4}
    w="full"
    boxShadow="sm">
    <VStack align="stretch" spacing={4} w="full">
      <HStack justify="space-between" align="center" w="full">
        <Box>
          <Text
            fontSize="xl"
            fontWeight="bold"
            lineHeight="1.2"
            color="gray.800">
            Dispatcher
          </Text>
          <Text color="gray.600" fontSize="sm" mt={1}>
            Runs immediately when outbox events exist. No configuration controls
            are exposed.
          </Text>
        </Box>
        <StatusPill colorScheme="gray">Read only</StatusPill>
      </HStack>

      <Box
        p={4}
        bg="teal.50"
        border="1px solid"
        borderColor="teal.100"
        rounded="lg">
        <Text fontSize="sm" color="teal.800" lineHeight="1.7">
          The dispatcher is intentionally shown as a separate operational block
          so developers understand that it remains immediate and is not part of
          the configurable scheduler interval.
        </Text>
      </Box>

      <TableContainer
        border={`1px solid ${borderColor}`}
        borderRadius="sm"
        overflow="hidden"
        w="full">
        <Table variant="unstyled">
          <Thead bg={headerBg}>
            <Tr>
              <HeaderCell borderColor={borderColor}>Time</HeaderCell>
              <HeaderCell borderColor={borderColor}>Component</HeaderCell>
              <HeaderCell borderColor={borderColor}>Status</HeaderCell>
              <HeaderCell borderColor={borderColor}>Detail</HeaderCell>
            </Tr>
          </Thead>
          <Tbody>
            {events.length === 0 ? (
              <Tr>
                <Cell borderColor={borderColor} colSpan={4}>
                  <Text color="gray.500" fontSize="sm" textAlign="center">
                    No dispatcher data available yet.
                  </Text>
                </Cell>
              </Tr>
            ) : (
              events.map((event) => (
                <Tr key={`${event.time}-${event.component}-${event.detail}`}>
                  <Cell borderColor={borderColor}>{event.time}</Cell>
                  <Cell borderColor={borderColor} fontWeight="semibold">
                    {event.component}
                  </Cell>
                  <Cell borderColor={borderColor}>
                    <Badge
                      colorScheme="green"
                      borderRadius="full"
                      px={3}
                      py={1}
                      textTransform="none">
                      {event.status}
                    </Badge>
                  </Cell>
                  <Cell borderColor={borderColor}>{event.detail}</Cell>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </VStack>
  </Box>
);

export default DispatcherCard;
