import type { Vector3Tuple } from '../../types/vector';
import { crossProduct } from '../vectors/vectorMath';

export const GYRO_STEP = 1 / 480;

export const DEFAULT_GYRO = {
  mass: 2,
  radius: 0.3,
  spin: 40,
  gravity: 9.81,
  friction: 0,
};

export type GyroParameters = typeof DEFAULT_GYRO;
export type GyroMode = 'free' | 'torque' | 'gravity';

export const DEFAULT_LIFT = { force: 2.5, lever: 0.4, angle: 90 };
export type LiftSettings = typeof DEFAULT_LIFT;
export interface LiftPulse extends LiftSettings {
  id: number;
}

export function liftVectors({ force, lever, angle }: LiftSettings) {
  const radians = (angle * Math.PI) / 180;
  const r: Vector3Tuple = [lever, 0, 0];
  const F: Vector3Tuple = [
    force * Math.cos(radians),
    force * Math.sin(radians),
    0,
  ];
  return { r, F, torque: torqueVector(r, F) };
}

export const rotorThickness = (radius: number) => radius * 0.22;

export const momentOfInertiaSolidDisk = (mass: number, radius: number) =>
  0.5 * mass * radius ** 2;

export const spinAngularMomentum = (inertia: number, spin: number) =>
  inertia * spin;

export const rotationalKineticEnergy = (inertia: number, spin: number) =>
  0.5 * inertia * spin ** 2;

export const torqueVector = (lever: Vector3Tuple, force: Vector3Tuple) =>
  crossProduct(lever, force);

export function steadyPrecessionRate(torque: number, angularMomentum: number) {
  return Math.abs(angularMomentum) > 1e-8
    ? Math.abs(torque / angularMomentum)
    : null;
}

export function gimbalDimensions(radius: number, mode: GyroMode = 'free') {
  const inner = radius + 0.08;
  const middle = inner + 0.09;
  const outer = middle + 0.1;
  const lever = mode === 'torque' ? radius + 0.18 : radius * 0.55 + 0.1;
  const height = Math.max(1.2, radius + lever + 0.19);
  return { inner, middle, outer, height, lever };
}

export function rotorMoments({ mass, radius }: GyroParameters, mode: GyroMode) {
  return {
    axial: momentOfInertiaSolidDisk(mass, radius),
    transverse:
      (mass / 12) * (3 * radius ** 2 + rotorThickness(radius) ** 2) +
      (mode === 'free' ? 0 : mass * gimbalDimensions(radius, mode).lever ** 2),
  };
}

export function gyroscopeTimeStep(parameters: GyroParameters, mode: GyroMode) {
  if (mode === 'free') return GYRO_STEP;
  const { axial, transverse } = rotorMoments(parameters, mode);
  // A small disk on a long lever has a strongly anisotropic pivot tensor.
  const substeps =
    transverse / axial > 8 || (mode === 'torque' && transverse < 0.08) ? 8 : 2;
  return GYRO_STEP / substeps;
}
