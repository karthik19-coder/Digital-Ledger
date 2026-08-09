import { create } from 'zustand';

interface AppState {
  isUnlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isUnlocked: false,
  setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
}));
