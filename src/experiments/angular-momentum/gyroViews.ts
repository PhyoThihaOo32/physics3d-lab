export const VECTOR_OPTIONS = {
  spin: 'Axial spin ω',
  momentum: 'Spin angular momentum',
  pivotMomentum: 'Angular momentum about pivot',
  torque: 'Torque τ',
  force: 'Force F',
  lever: 'Lever arm r',
  impulse: 'Angular impulse diagram',
  precession: 'Precession Ωₚ',
  trail: 'Axis trail',
} as const;

export type GyroVector = keyof typeof VECTOR_OPTIONS;
export type GyroVectorSettings = Record<GyroVector, boolean>;

export const DEFAULT_GYRO_VECTORS: GyroVectorSettings = {
  spin: false,
  momentum: true,
  pivotMomentum: true,
  torque: true,
  force: true,
  lever: false,
  impulse: false,
  precession: true,
  trail: false,
};
