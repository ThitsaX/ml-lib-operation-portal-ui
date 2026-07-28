// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { Box, Text } from '@chakra-ui/react';

interface InfoCardProps {
  title: string;
  value: string;
  helper: string;
}

const InfoCard = ({ title, value, helper }: InfoCardProps) => (
  <Box
    w="full"
    bg="white"
    p={4}
    borderRadius="lg"
    border="1px solid"
    borderColor="gray.200"
    boxShadow="sm">
    <Text
      fontSize="xs"
      fontWeight="bold"
      color="gray.500"
      textTransform="uppercase"
      letterSpacing="0.08em">
      {title}
    </Text>
    <Text
      mt={2}
      fontSize={{ base: '2xl', md: '3xl' }}
      fontWeight="extrabold"
      color="gray.800"
      lineHeight="1">
      {value}
    </Text>
    <Text mt={3} fontSize="sm" color="gray.600">
      {helper}
    </Text>
  </Box>
);

export default InfoCard;
