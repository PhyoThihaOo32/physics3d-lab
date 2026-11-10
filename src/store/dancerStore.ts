import { create } from 'zustand';
import {
  DEFAULT_DANCER,
  dancerInertia,
  type DancerParameters,
  type DancerSnapshot,
} from '../physics/equations/angularMomentum';
export function initialDancerSnapshot(p: DancerParameters): DancerSnapshot {
  const inertia = dancerInertia(1);
  const momentum = inertia * p.initialOmega;
  const energy = 0.5 * inertia * p.initialOmega ** 2;
  return {
    time: 0,
    extension: 1,
    radius: 0.76,
    inertia,
    omega: p.initialOmega,
    momentum,
    initialMomentum: momentum,
    impulse: 0,
    torque: 0,
    energy,
    initialEnergy: energy,
    residual: 0,
    balanceError: 0,
  };
}
interface DancerState {
  ready: boolean;
  target: number;
  snapshot: DancerSnapshot;
  history: DancerSnapshot[];
  records: DancerSnapshot[];
  setTarget: (target: number) => void;
  report: (snapshot: DancerSnapshot, append?: boolean) => void;
  markReady: () => void;
  record: () => void;
  clear: (parameters?: DancerParameters) => void;
}
export const useDancerStore = create<DancerState>((set) => ({
  ready: false,
  target: 1,
  snapshot: initialDancerSnapshot(DEFAULT_DANCER),
  history: [],
  records: [],
  setTarget: (target) => set({ target: Math.max(0, Math.min(1, target)) }),
  markReady: () => set({ ready: true }),
  report: (snapshot, append = false) =>
    set((s) => ({
      snapshot,
      history:
        append && s.history.at(-1)?.time !== snapshot.time
          ? [...s.history, snapshot]
          : s.history,
    })),
  record: () =>
    set((s) => ({ records: [...s.records, { ...s.snapshot }].slice(-8) })),
  clear: (p = DEFAULT_DANCER) =>
    set({
      ready: false,
      target: 1,
      snapshot: initialDancerSnapshot(p),
      history: [],
      records: [],
    }),
}));
