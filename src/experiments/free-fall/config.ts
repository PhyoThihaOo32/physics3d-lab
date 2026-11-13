import type { PhysicsExperiment } from '../../types/experiment';

export const DROP = {
  mass: 1,
  cubeSize: 1,
  initialHeight: 4.5,
  gravity: 9.81,
  restitution: 0.25,
  friction: 0.7,
  groundFriction: 0.5,
  groundRestitution: 0,
  softCcdPrediction: 0.25,
  groundHalfWidth: 6,
  groundHalfThickness: 0.1,
} as const;

export interface DropParameters {
  mass: number;
  initialHeight: number;
  gravity: number;
}
export const DEFAULT_PARAMETERS: DropParameters = {
  mass: DROP.mass,
  initialHeight: DROP.initialHeight,
  gravity: DROP.gravity,
};
export const PARAMETER_LIMITS = {
  mass: { min: 0.1, max: 10, step: 0.1 },
  initialHeight: { min: 1, max: 10, step: 0.1 },
  gravity: { min: 0, max: 20, step: 0.01 },
} as const;
export function validDropParameters(parameters: DropParameters): boolean {
  return (Object.keys(PARAMETER_LIMITS) as (keyof DropParameters)[]).every(
    (key) =>
      Number.isFinite(parameters[key]) &&
      parameters[key] >= PARAMETER_LIMITS[key].min &&
      parameters[key] <= PARAMETER_LIMITS[key].max,
  );
}

export const freeFallExperiment: PhysicsExperiment<typeof DROP> = {
  id: 'free-fall',
  title: 'Free fall',
  description:
    'Change the conditions, run a trial, and compare simulated motion with the equations of free fall.',
  learningObjectives: [
    'Observe acceleration under gravity.',
    'Inspect a rigid-body collision from any angle.',
  ],
  defaultParameters: DROP,
  assumptions: [
    'Uniform, adjustable gravity along −y; Earth approximation 9.81 m/s².',
    'No air resistance; cube released from rest.',
    'A fixed, level ground surface at y = 0 m.',
    'Cube restitution 0.25; cube friction 0.70.',
  ],
};
