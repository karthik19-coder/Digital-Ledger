export type NavigationDirection = 'forward' | 'backward' | 'replace' | 'unknown';
export type NavigationType = 'internal' | 'external' | 'deep-link';
export type BackBehavior = 'navigate-back' | 'fallback' | 'close-modal';

export interface ModalState {
  isOpen: boolean;
  modalId: string;
}

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  direction: NavigationDirection;
  isInternalEntry: boolean;
  historyLength: number;
}
