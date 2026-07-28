// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { Box, HStack, Switch, Text, VStack } from '@chakra-ui/react';
import ActionRow from './ActionRow';
import StatusPill from './StatusPill';

interface SchemeGateCardProps {
  isEnabled: boolean;
  isSaving: boolean;
  isFetching: boolean;
  onToggle: (nextValue: boolean) => void;
}

const SchemeGateCard = ({
  isEnabled,
  isSaving,
  isFetching,
  onToggle
}: SchemeGateCardProps) => {
  const schemeStatus = isEnabled ? 'ON' : 'OFF';

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      rounded="lg"
      p={4}
      boxShadow="sm">
      <VStack align="stretch" spacing={4} w="full">
        <HStack justify="space-between" align="center" w="full">
          <Box>
            <Text
              fontSize="xl"
              fontWeight="bold"
              lineHeight="1.2"
              color="gray.800">
              Scheme gate
            </Text>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Top-level switch for the NDC chain.
            </Text>
          </Box>
          <StatusPill colorScheme={isEnabled ? 'teal' : 'gray'}>
            {schemeStatus}
          </StatusPill>
        </HStack>

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
              Scheme-level enable
            </Text>
            <Text color="gray.600" fontSize="sm" mt={2}>
              Turning this off means the system stops before DFSP checks and
              threshold evaluation.
            </Text>
          </Box>
          <Switch
            colorScheme="green"
            size="lg"
            isChecked={isEnabled}
            isDisabled={isSaving || isFetching}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </HStack>

        <ActionRow
          title="If scheme is off"
          description="No DFSP query, no threshold query, no outbox record, no notification."
          status="Stop"
          colorScheme="red"
        />
        <ActionRow
          title="If scheme is on"
          description="Continue to DFSP-level enablement and only then evaluate the threshold."
          status="Continue"
          colorScheme="green"
        />
      </VStack>
    </Box>
  );
};

export default SchemeGateCard;
