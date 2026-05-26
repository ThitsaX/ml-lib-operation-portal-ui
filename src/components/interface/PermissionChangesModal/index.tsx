import React from "react";
import {
    Badge,
    Box,
    Button,
    HStack,
    Icon,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from "@chakra-ui/react";
import { FiArrowRight } from "react-icons/fi";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    changesList: string[];
    actions: any[];
    originalActions: any[];
    isLoading: boolean;
    isSaving: boolean;
    closeChangesModal: () => void;
    saveChanges: () => void;
}

const PermissionChangesModal: React.FC<Props> = ({
    isOpen,
    onClose,
    changesList,
    actions,
    originalActions,
    isLoading,
    isSaving,
    closeChangesModal,
    saveChanges,
}) => {
    const renderStatusBadge = (isSelected?: boolean) => (
        <Badge
            colorScheme={isSelected ? "green" : "gray"}
            variant="subtle"
            borderRadius="full"
            px={2}
            py={0.5}
            fontSize="xs"
            textTransform="none"
        >
            {isSelected ? "Selected" : "Not selected"}
        </Badge>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
            <ModalOverlay />

            <ModalContent borderRadius="md">
                <ModalHeader>Permission Changes</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Text fontSize="sm" color="gray.600">
                            Review {changesList.length} permission change{changesList.length === 1 ? "" : "s"} before saving.
                        </Text>

                        <VStack align="stretch" spacing={2} maxH="260px" overflowY="auto" pr={1}>
                            {changesList.map((changeId, index) => {
                                const action = actions.find((a) => a.id === changeId);
                                const originalAction = originalActions.find((a) => a.id === changeId);
                                const isNowSelected = action?.selected;
                                const wasOriginallySelected = originalAction?.selected;

                                return (
                                    <Box
                                        key={changeId || index}
                                        border="1px solid"
                                        borderColor="gray.200"
                                        borderRadius="md"
                                        bg="gray.50"
                                        px={3}
                                        py={2}
                                    >
                                        <HStack justify="space-between" align="center" spacing={3}>
                                            <Text
                                                fontSize="sm"
                                                fontWeight="semibold"
                                                color="gray.800"
                                                noOfLines={2}
                                                title={action?.name || changeId}
                                            >
                                                {action?.name || changeId}
                                            </Text>

                                            <HStack spacing={2} flexShrink={0}>
                                                {renderStatusBadge(wasOriginallySelected)}
                                                <Icon as={FiArrowRight} color="gray.400" boxSize={4} />
                                                {renderStatusBadge(isNowSelected)}
                                            </HStack>
                                        </HStack>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </VStack>
                </ModalBody>

                <ModalFooter pt={4}>
                    <HStack spacing={3}>
                        <Button variant="outline" onClick={closeChangesModal} isLoading={isLoading}>
                            Discard Changes
                        </Button>

                        <Button colorScheme="blue" onClick={saveChanges} isLoading={isSaving} isDisabled={isSaving}>
                            Save Changes
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default PermissionChangesModal;
