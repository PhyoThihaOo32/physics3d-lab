import type { Vector3Tuple } from '../../types/vector';

export const DEFAULT_SPRING = { mass: 1, restLength: 0.6, stiffness: 12 };
export type SpringSettings = typeof DEFAULT_SPRING;
const START_RADIUS = 0.95;
const MAX_STEP = 1 / 300;

export interface SpringTrial {
  time: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  settings: SpringSettings;
  work: number;
}

export function createSpringTrial(
  settings: SpringSettings = DEFAULT_SPRING,
): SpringTrial {
  const vx = Math.sqrt(
    (settings.stiffness * START_RADIUS * (START_RADIUS - settings.restLength)) /
      settings.mass,
  );
  return { time: 0, x: 0, z: START_RADIUS, vx, vz: 0, settings, work: 0 };
}

const potential = (radius: number, settings: SpringSettings) =>
  0.5 * settings.stiffness * (radius - settings.restLength) ** 2;

export function updateSpring(
  trial: SpringTrial,
  settings: SpringSettings,
): SpringTrial {
  if (trial.time === 0) return createSpringTrial(settings);
  const radius = Math.hypot(trial.x, trial.z);
  const adjusted = { ...settings, mass: trial.settings.mass };
  return {
    ...trial,
    settings: adjusted,
    work:
      trial.work +
      potential(radius, adjusted) -
      potential(radius, trial.settings),
  };
}

function accelerationScale(
  x: number,
  z: number,
  { restLength, mass, stiffness }: SpringSettings,
) {
  const radius = Math.hypot(x, z);
  return radius > 1e-9
    ? (-stiffness * (radius - restLength)) / (radius * mass)
    : 0;
}

/** Kick–drift–kick with central forces preserves axial angular momentum. */
export function advanceSpring(
  trial: SpringTrial,
  elapsed: number,
): SpringTrial {
  let { x, z, vx, vz } = trial;
  const { settings } = trial;
  const substeps = Math.max(1, Math.ceil(elapsed / MAX_STEP));
  const step = elapsed / substeps;
  for (let index = 0; index < substeps; index++) {
    const first = (accelerationScale(x, z, settings) * step) / 2;
    vx += x * first;
    vz += z * first;
    x += vx * step;
    z += vz * step;
    const last = (accelerationScale(x, z, settings) * step) / 2;
    vx += x * last;
    vz += z * last;
  }
  return { ...trial, time: trial.time + elapsed, x, z, vx, vz };
}

export function measureSpring({ x, z, vx, vz, settings, work }: SpringTrial) {
  const radius = Math.hypot(x, z);
  const momentum = settings.mass * (z * vx - x * vz);
  const scale = accelerationScale(x, z, settings) * settings.mass;
  const force: Vector3Tuple = [x * scale, 0, z * scale];
  const energy =
    0.5 * settings.mass * (vx ** 2 + vz ** 2) + potential(radius, settings);
  return { radius, momentum, force, energy, adjustedEnergy: energy - work };
}
