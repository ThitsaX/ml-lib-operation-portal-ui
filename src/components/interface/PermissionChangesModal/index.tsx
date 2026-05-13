import React from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    VStack,
    Text,
    HStack,
    Button,
} from "@chakra-ui/react";

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
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
            <ModalOverlay />

            <ModalContent>
                <ModalHeader>Permission Changes</ModalHeader>

                <ModalBody>
                    <VStack align="flex-start" spacing={4}>
                        <Text fontSize="sm" color="gray.600">
                            You have made {changesList.length} changes to permissions:
                        </Text>

                        <VStack align="flex-start" spacing={2} maxH="200" overflowY="auto">
                            {changesList.map((changeId, index) => {
                                const action = actions.find((a) => a.id === changeId);
                                const originalAction = originalActions.find(
                                    (a) => a.id === changeId
                                );

                                const isNowSelected = action?.selected;
                                const wasOriginallySelected = originalAction?.selected;

                                return (
                                    <Text key={index} fontSize="sm" color="gray.700">
                                        • {action?.name || changeId}:{" "}
                                        {wasOriginallySelected ? "Selected" : "Not Selected"} →{" "}
                                        {isNowSelected ? "Selected" : "Not Selected"}
                                    </Text>
                                );
                            })}
                        </VStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing={3}>
                        <Button
                            variant="outline"
                            onClick={closeChangesModal}
                            isLoading={isLoading}
                        >
                            Discard Changes
                        </Button>

                        <Button
                            colorScheme="blue"
                            onClick={saveChanges}
                            isLoading={isSaving}
                            isDisabled={isSaving}
                        >
                            Save Changes
                        </Button>
                    </HStack>
                </ModalFooter>

                <ModalCloseButton />
            </ModalContent>
        </Modal>
    );
};

export default PermissionChangesModal;