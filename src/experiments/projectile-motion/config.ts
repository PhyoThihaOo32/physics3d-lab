import type { PhysicsExperiment } from '../../types/experiment';
import { predictProjectile } from '../../physics/equations/projectile';
import { FIXED_TIME_STEP } from '../../physics/constants/world';

export interface ProjectileParameters {
  speed: number;
  angle: number;
  height: number;
  gravity: number;
  mass: number;
}
export const PROJECTILE = {
  radius: 0.18,
  groundThickness: 0.2,
  softCcdPrediction: 0.25,
  observationLimit: 60,
  zeroGravityDuration: 10,
  maxTrailPoints: 2400,
} as const;
export const DEFAULT_PROJECTILE: ProjectileParameters = {
  speed: 10,
  angle: 45,
  height: 1,
  gravity: 9.81,
  mass: 1,
};
export const PROJECTILE_LIMITS = {
  speed: { min: 0, max: 20, step: 0.1 },
  angle: { min: 0, max: 90, step: 1 },
  height: { min: 0, max: 10, step: 0.1 },
  gravity: { min: 0, max: 20, step: 0.01 },
  mass: { min: 0.1, max: 10, step: 0.1 },
} as const;
export function projectileParameterError(
  parameters: ProjectileParameters,
): string | null {
  for (const key of Object.keys(
    PROJECTILE_LIMITS,
  ) as (keyof ProjectileParameters)[]) {
    const value = parameters[key];
    const limits = PROJECTILE_LIMITS[key];
    if (!Number.isFinite(value) || value < limits.min || value > limits.max)
      return 'Enter finite values within the limits shown for each field.';
  }
  if (parameters.gravity > 0 && parameters.gravity < 1)
    return 'Use zero gravity, or a gravity magnitude from 1 to 20 m/s².';
  if (
    parameters.height === 0 &&
    (parameters.speed === 0 || parameters.angle === 0)
  )
    return 'A ground-level launch needs upward velocity. Set a positive height for a horizontal launch or a drop.';
  const duration = predictProjectile(parameters).flightTime;
  if (duration !== null && duration < 2 * FIXED_TIME_STEP)
    return 'Increase height or upward launch speed: this flight is shorter than two physics steps (0.017 s), so this lab cannot resolve it accurately.';
  return null;
}
export const projectileExperiment: PhysicsExperiment<ProjectileParameters> = {
  id: 'projectile-motion',
  title: 'Projectile motion',
  description:
    'One launch. Two independent components. Explore a projectile’s flight through a 3D laboratory.',
  learningObjectives: [
    'Resolve launch velocity into horizontal and vertical components.',
    'Compare simulated flight time, range, and maximum height with theory.',
  ],
  defaultParameters: DEFAULT_PROJECTILE,
  assumptions: [
    'Uniform gravity along −y; flight starts in the x–y plane (z = 0).',
    'Ideal vacuum: no drag, wind, spin lift, or propulsion after launch.',
    'Sphere radius 0.18 m; h is center height minus radius, so ground contact is h ≈ 0.',
    'Rigid-body contact; impact acceleration is not a material deformation model.',
  ],
};
