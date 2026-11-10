import { create } from 'zustand';
interface SimulationState {
  running: boolean;
  elapsed: number;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  setRunning: (running: boolean) => void;
  reportTime: (elapsed: number) => void;
  reset: () => void;
}
export const useSimulationStore = create<SimulationState>((set) => ({
  running: false,
  elapsed: 0,
  playbackSpeed: 1,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setRunning: (running) => set({ running }),
  reportTime: (elapsed) => set({ elapsed }),
  reset: () => set({ running: false, elapsed: 0, playbackSpeed: 1 }),
}));
