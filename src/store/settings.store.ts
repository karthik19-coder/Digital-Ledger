import { create } from 'zustand';

interface SettingsState {
  ready: boolean;
}

export const useSettingsStore = create<SettingsState>(() => ({
  ready: true,
}));
