import {
    Box,
    VStack,
    HStack,
    Text,
    Switch
} from "@chakra-ui/react";


interface PermissionCardProps {
    action: {
        id: string;
        name: string;
        category?: string;
        selected: boolean;
        mandatory: boolean;
    };
    onToggle: (actionId: string) => void;
}

const PermissionCard = ({
    action,
    onToggle,
}: PermissionCardProps) => {
    return (
        <Box
            w="full"
            h="full"
            bg="white"
            p={{ base: 3, md: 4 }}
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            _hover={{
                bg: "gray.50",
                borderColor: "blue.300",
            }}
            transition="background-color 0.16s ease, border-color 0.16s ease"
        >
            <HStack
                justify="space-between"
                align="center"
                spacing={3}
                h="full"
            >
                <VStack
                    align="flex-start"
                    spacing={2}
                    flex={1}
                    overflow="hidden"
                >
                    <Text
                        fontWeight="semibold"
                        color="gray.800"
                        fontSize={{ base: "xs", md: "sm" }}
                        noOfLines={2}
                        lineHeight="short"
                        wordBreak="break-word"
                        title={action.name}
                    >
                        {action.name}
                    </Text>
                </VStack>

                <Switch
                    size="md"
                    colorScheme="green"
                    isChecked={action.selected}
                    onChange={() => onToggle(action.id)}
                    isDisabled={action.mandatory}
                    aria-label={`Toggle ${action.name}`}
                />
            </HStack>
        </Box>
    );
};

export default PermissionCard;
