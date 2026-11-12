import {
  addVectors,
  angleBetweenVectors,
  crossProduct,
  dotProduct,
  projectVector,
  scaleVector,
  subtractVectors,
  vectorMagnitude,
} from '../../physics/vectors/vectorMath';
import type { Vector3Tuple } from '../../types/vector';

export type VectorMode = 'add' | 'subtract' | 'scale' | 'cross' | 'dot';
export type DraftVector = [string, string, string];
export type VectorPair = readonly [Vector3Tuple, Vector3Tuple];
export const COMPONENT_LIMIT = 1000;
export const AXES = ['x', 'y', 'z'] as const;
export const MODES = {
  add: { label: 'Add', equation: 'A + B' },
  subtract: { label: 'Subtract', equation: 'A − B' },
  scale: { label: 'Scale', equation: 'kA' },
  cross: { label: 'Cross', equation: 'A × B' },
  dot: { label: 'Dot', equation: 'A · B' },
} as const satisfies Record<VectorMode, { label: string; equation: string }>;
export const PRESETS: readonly { label: string; vectors: VectorPair }[] = [
  {
    label: '3D example',
    vectors: [
      [3, 0, 0],
      [1, 2, 1],
    ],
  },
  {
    label: 'Parallel',
    vectors: [
      [2, 0, 0],
      [3, 0, 0],
    ],
  },
  {
    label: 'Perpendicular',
    vectors: [
      [2, 0, 0],
      [0, 2, 0],
    ],
  },
  {
    label: 'Opposite',
    vectors: [
      [2, 0, 0],
      [-2, 0, 0],
    ],
  },
  {
    label: 'Zero vector',
    vectors: [
      [2, 0, 0],
      [0, 0, 0],
    ],
  },
];

export function parseComponent(draft: string): number | null {
  const value = Number(draft);
  return draft.trim() &&
    Number.isFinite(value) &&
    Math.abs(value) <= COMPONENT_LIMIT
    ? value
    : null;
}

export function parseVector(draft: DraftVector): Vector3Tuple | null {
  const x = parseComponent(draft[0]);
  const y = parseComponent(draft[1]);
  const z = parseComponent(draft[2]);
  return x === null || y === null || z === null ? null : [x, y, z];
}

export const draftVector = (v: Vector3Tuple): DraftVector => [
  String(v[0]),
  String(v[1]),
  String(v[2]),
];

export function calculateVectorOperation(
  mode: VectorMode,
  a: Vector3Tuple,
  b: Vector3Tuple,
  scalar: number,
) {
  switch (mode) {
    case 'add':
      return { mode, a, b, result: addVectors(a, b) };
    case 'subtract':
      return { mode, a, b, result: subtractVectors(a, b) };
    case 'scale':
      return { mode, a, scalar, result: scaleVector(a, scalar) };
    case 'cross': {
      const result = crossProduct(a, b);
      return {
        mode,
        a,
        b,
        result,
        area: vectorMagnitude(result),
        theta: angleBetweenVectors(a, b),
        projectionBA: projectVector(b, a),
      };
    }
    case 'dot':
      return {
        mode,
        a,
        b,
        result: dotProduct(a, b),
        theta: angleBetweenVectors(a, b),
        projectionAB: projectVector(a, b),
        projectionBA: projectVector(b, a),
      };
  }
}

export type VectorCalculation = ReturnType<typeof calculateVectorOperation>;

export function numberText(value: number) {
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute < 0.001 || absolute >= 1e6) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
}
export const tupleText = (v: Vector3Tuple) =>
  `⟨${v.map(numberText).join(', ')}⟩`;
