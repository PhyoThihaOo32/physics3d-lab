import type { Vector3Tuple } from '../../types/vector';
export const vectorMagnitude = (v: Vector3Tuple) => Math.hypot(...v);
export const interpolateVector = (
  a: Vector3Tuple,
  b: Vector3Tuple,
  fraction: number,
): Vector3Tuple => [
  a[0] + (b[0] - a[0]) * fraction,
  a[1] + (b[1] - a[1]) * fraction,
  a[2] + (b[2] - a[2]) * fraction,
];
