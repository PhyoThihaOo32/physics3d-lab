import { create } from 'zustand';
import { DEFAULT_PARAMETERS } from '../experiments/free-fall/config';
import {
  DropMeasurements,
  type DropSnapshot,
} from '../physics/measurements/dropMeasurements';
import { FIXED_TIME_STEP } from '../physics/constants/world';
interface FreeFallState {
  ready: boolean;
  snapshot: DropSnapshot;
  report: (snapshot: DropSnapshot) => void;
  markReady: () => void;
  clear: (initialHeight?: number) => void;
}
/** Published UI snapshots only. Rapier owns physical state. */
export const useFreeFallStore = create<FreeFallState>((set) => ({
  ready: false,
  snapshot: new DropMeasurements(
    DEFAULT_PARAMETERS.initialHeight,
    FIXED_TIME_STEP,
  ).snapshot,
  report: (snapshot) => set({ snapshot }),
  markReady: () => set({ ready: true }),
  clear: (height = DEFAULT_PARAMETERS.initialHeight) =>
    set({
      ready: false,
      snapshot: new DropMeasurements(height, FIXED_TIME_STEP).snapshot,
    }),
}));
