export const VECTOR_OPTIONS = {
  spin: 'Angular velocity ω',
  momentum: 'Angular momentum L',
  torque: 'Torque τ',
  force: 'Force F',
  lever: 'Lever arm r',
  impulse: 'Momentum change ΔL',
  precession: 'Precession Ωₚ',
  trail: 'Axis trail',
} as const;

export type GyroVector = keyof typeof VECTOR_OPTIONS;
export type GyroVectorSettings = Record<GyroVector, boolean>;

export const DEFAULT_GYRO_VECTORS: GyroVectorSettings = {
  spin: true,
  momentum: true,
  torque: true,
  force: true,
  lever: true,
  impulse: true,
  precession: true,
  trail: false,
};
