import { create } from 'zustand';
import {
  DEFAULT_PROJECTILE,
  PROJECTILE,
  type ProjectileParameters,
} from '../experiments/projectile-motion/config';
import { launchVelocity } from '../physics/equations/projectile';
import {
  ProjectileMeasurements,
  type ProjectileSnapshot,
} from '../physics/measurements/projectileMeasurements';
import { FIXED_TIME_STEP } from '../physics/constants/world';
export function newProjectileMeasurements(parameters: ProjectileParameters) {
  return new ProjectileMeasurements(
    parameters.height,
    launchVelocity(parameters),
    FIXED_TIME_STEP,
    PROJECTILE.maxTrailPoints,
    parameters.gravity === 0
      ? PROJECTILE.zeroGravityDuration
      : PROJECTILE.observationLimit,
  );
}
interface ProjectileState {
  ready: boolean;
  snapshot: ProjectileSnapshot;
  markReady: () => void;
  report: (snapshot: ProjectileSnapshot) => void;
  clear: (parameters?: ProjectileParameters) => void;
}
export const useProjectileStore = create<ProjectileState>((set) => ({
  ready: false,
  snapshot: newProjectileMeasurements(DEFAULT_PROJECTILE).snapshot,
  markReady: () => set({ ready: true }),
  report: (snapshot) => set({ snapshot }),
  clear: (parameters = DEFAULT_PROJECTILE) =>
    set({
      ready: false,
      snapshot: newProjectileMeasurements(parameters).snapshot,
    }),
}));
