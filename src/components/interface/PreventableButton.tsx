import React from 'react';
import { Button, ButtonProps } from '@chakra-ui/react';
import { useClickPrevention } from '@hooks/useClickPrevention';

interface PreventableButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void | Promise<void>;
  debounceMs?: number;
}

export const PreventableButton: React.FC<PreventableButtonProps> = ({
  onClick,
  debounceMs = 1000,
  children,
  isDisabled,
  ...buttonProps
}) => {
  const { preventClick } = useClickPrevention({ debounceMs });
  
  const handleClick = preventClick(onClick);
  
  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      isDisabled={isDisabled}
      // Visual feedback when click is prevented
      opacity={isDisabled ? 0.6 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      transition="all 0.2s ease-in-out"
      _hover={{
        opacity: isDisabled ? 0.6 : 0.8,
        transform: isDisabled ? 'none' : 'translateY(-1px)'
      }}
      _active={{
        transform: isDisabled ? 'none' : 'translateY(0)'
      }}
    >
      {children}
    </Button>
  );
};
