import { createContext, useContext } from 'react';

export type AssistantContextValue = {
  page: string;
  mode: 'Live' | 'Demo';
  navigate: (page: string) => void;
};

export const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function useAssistantContext() {
  const value = useContext(AssistantContext);
  if (!value) {
    throw new Error('AssistantContext is unavailable.');
  }
  return value;
}
