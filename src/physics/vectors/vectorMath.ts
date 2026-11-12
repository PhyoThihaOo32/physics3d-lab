import type { Vector3Tuple } from '../../types/vector';
export const vectorMagnitude = (v: Vector3Tuple) => Math.hypot(...v);

export const addVectors = (a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];

export const subtractVectors = (
  a: Vector3Tuple,
  b: Vector3Tuple,
): Vector3Tuple => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const scaleVector = (v: Vector3Tuple, scale: number): Vector3Tuple => [
  v[0] * scale,
  v[1] * scale,
  v[2] * scale,
];

/** A zero vector has no direction. Rescale first to handle very large and small inputs. */
export function normalizeVector(v: Vector3Tuple): Vector3Tuple | null {
  const scale = Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
  if (!scale || !Number.isFinite(scale)) return null;
  const scaled: Vector3Tuple = [v[0] / scale, v[1] / scale, v[2] / scale];
  return scaleVector(scaled, 1 / vectorMagnitude(scaled));
}

export const dotProduct = (a: Vector3Tuple, b: Vector3Tuple) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const crossProduct = (
  a: Vector3Tuple,
  b: Vector3Tuple,
): Vector3Tuple => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The unsigned angle in radians, or null if either direction is undefined. */
export function angleBetweenVectors(a: Vector3Tuple, b: Vector3Tuple) {
  const u = normalizeVector(a);
  const v = normalizeVector(b);
  return u && v
    ? Math.atan2(vectorMagnitude(crossProduct(u, v)), dotProduct(u, v))
    : null;
}

/** Vector projection of a onto b. A zero target has no projection axis. */
export function projectVector(
  a: Vector3Tuple,
  b: Vector3Tuple,
): Vector3Tuple | null {
  const axis = normalizeVector(b);
  return axis ? scaleVector(axis, dotProduct(a, axis)) : null;
}

export const interpolateVector = (
  a: Vector3Tuple,
  b: Vector3Tuple,
  fraction: number,
): Vector3Tuple => [
  a[0] + (b[0] - a[0]) * fraction,
  a[1] + (b[1] - a[1]) * fraction,
  a[2] + (b[2] - a[2]) * fraction,
];
