import { useRef, useCallback } from 'react';

interface UseClickPreventionOptions {
  debounceMs?: number;
}

interface UseClickPreventionReturn {
  isPrevented: boolean;
  preventClick: <T extends (...args: any[]) => any>(fn: T) => T;
}

export const useClickPrevention = ({
  debounceMs = 1000
}: UseClickPreventionOptions = {}): UseClickPreventionReturn => {
  const isPreventedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preventClick = useCallback(<T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: Parameters<T>) => {
      if (isPreventedRef.current) return;
      
      isPreventedRef.current = true;
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Execute the function
      const result = fn(...args);
      
      // Reset prevention after debounce
      timeoutRef.current = setTimeout(() => {
        isPreventedRef.current = false;
        timeoutRef.current = null;
      }, debounceMs);
      
      return result;
    }) as T;
  }, [debounceMs]);

  return {
    isPrevented: isPreventedRef.current,
    preventClick
  };
};
