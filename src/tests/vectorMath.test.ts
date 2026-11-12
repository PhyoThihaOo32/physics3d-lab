import { describe, expect, it } from 'vitest';
import {
  addVectors,
  angleBetweenVectors,
  crossProduct,
  dotProduct,
  normalizeVector,
  projectVector,
  scaleVector,
  subtractVectors,
  vectorMagnitude,
} from '../physics/vectors/vectorMath';
import type { Vector3Tuple } from '../types/vector';

const x: Vector3Tuple = [1, 0, 0];
const y: Vector3Tuple = [0, 1, 0];
const zero: Vector3Tuple = [0, 0, 0];

describe('shared vector mathematics', () => {
  it.each<[Vector3Tuple, number]>([
    [x, 1],
    [y, 0],
    [[-1, 0, 0], -1],
  ])('computes x · %j as %s', (b, expected) => {
    expect(dotProduct(x, b)).toBe(expected);
  });

  it('uses the right-hand rule and reverses the normal when operands are swapped', () => {
    expect(crossProduct(x, y)).toEqual([0, 0, 1]);
    expect(crossProduct(y, x)).toEqual([0, 0, -1]);
    expect(crossProduct(x, [2, 0, 0])).toEqual(zero);
    expect(vectorMagnitude(crossProduct(x, [-2, 0, 0]))).toBe(0);
  });

  it('gives maximum area for perpendicular inputs and a perpendicular normal in 3D', () => {
    const a: Vector3Tuple = [2, -3, 6];
    const b: Vector3Tuple = [3, 2, 0];
    const perpendicular = crossProduct(a, b);
    expect(vectorMagnitude(perpendicular)).toBeCloseTo(
      vectorMagnitude(a) * vectorMagnitude(b),
      12,
    );
    const c: Vector3Tuple = [4, 3, -2];
    const normal = crossProduct(a, c);
    expect(dotProduct(a, normal)).toBe(0);
    expect(dotProduct(c, normal)).toBe(0);
    const theta = angleBetweenVectors(a, c)!;
    expect(vectorMagnitude(normal)).toBeCloseTo(
      vectorMagnitude(a) * vectorMagnitude(c) * Math.sin(theta),
      12,
    );
    expect(dotProduct(a, c)).toBeCloseTo(
      vectorMagnitude(a) * vectorMagnitude(c) * Math.cos(theta),
      12,
    );
  });

  it('adds, subtracts, and scales signed components', () => {
    const a: Vector3Tuple = [-2, 4, 1];
    const b: Vector3Tuple = [3, -1, 2];
    expect(addVectors(a, b)).toEqual([1, 3, 3]);
    expect(subtractVectors(a, b)).toEqual([-5, 5, -1]);
    expect(scaleVector(b, -2)).toEqual([-6, 2, -4]);
  });

  it('projects onto the signed axis and leaves a perpendicular residual', () => {
    const a: Vector3Tuple = [-4, -2, 3];
    const axis: Vector3Tuple = [2, 2, 0];
    const projection = projectVector(a, axis)!;
    expect(projection[0]).toBeCloseTo(-3, 12);
    expect(projection[1]).toBeCloseTo(-3, 12);
    expect(projection[2]).toBeCloseTo(0, 12);
    expect(dotProduct(subtractVectors(a, projection), axis)).toBeCloseTo(0, 12);
    expect(projectVector(zero, axis)).toEqual(zero);
    expect(projectVector(a, zero)).toBeNull();
  });

  it('distinguishes parallel, perpendicular, opposite, and undefined angles', () => {
    expect(angleBetweenVectors(x, x)).toBe(0);
    expect(angleBetweenVectors(x, y)).toBe(Math.PI / 2);
    expect(angleBetweenVectors(x, [-1, 0, 0])).toBe(Math.PI);
    expect(angleBetweenVectors(x, zero)).toBeNull();
    expect(normalizeVector(zero)).toBeNull();
    expect(dotProduct(zero, x)).toBe(0);
    expect(crossProduct(zero, x)).toEqual(zero);
  });

  it('preserves tiny nonzero angles and normalizes finite extreme magnitudes', () => {
    expect(angleBetweenVectors(x, [1, 1e-12, 0])).toBeCloseTo(1e-12, 16);
    for (const size of [Number.MIN_VALUE, Number.MAX_VALUE]) {
      const direction = normalizeVector([size, size, 0])!;
      expect(vectorMagnitude(direction)).toBeCloseTo(1, 12);
      expect(direction[0]).toBeCloseTo(Math.SQRT1_2, 12);
    }
  });
});
