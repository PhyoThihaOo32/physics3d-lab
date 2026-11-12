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
} from '../../physics/vectors/vectorMath';
import type { Vector3Tuple } from '../../types/vector';

export type VectorMode = 'components' | 'combine' | 'dot' | 'cross' | 'compare';
export type DraftVector = [string, string, string];
export type VectorPair = readonly [Vector3Tuple, Vector3Tuple];
export const COMPONENT_LIMIT = 1000;
export const AXES = ['x', 'y', 'z'] as const;
export const MODES: readonly { id: VectorMode; label: string }[] = [
  { id: 'components', label: 'Components' },
  { id: 'combine', label: 'Add / subtract' },
  { id: 'dot', label: 'Dot product' },
  { id: 'cross', label: 'Cross product' },
  { id: 'compare', label: 'Compare' },
];
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

interface Application {
  title: string;
  mode: 'dot' | 'cross';
  symbols: readonly [string, string];
  units: readonly [string, string];
  output: string;
  outputUnit: string;
  equation: string;
  instruction: string;
  vectors: VectorPair;
}

export const APPLICATIONS = {
  work: {
    title: 'Work',
    mode: 'dot',
    symbols: ['F', 'd'],
    units: ['N', 'm'],
    output: 'W',
    outputUnit: 'J',
    equation: 'W = F · d',
    instruction:
      'Work is the component of a constant force along the displacement multiplied by the distance moved. Try reversing the displacement.',
    vectors: [
      [3, 2, 0],
      [2, 0, 0],
    ],
  },
  power: {
    title: 'Power',
    mode: 'dot',
    symbols: ['F', 'v'],
    units: ['N', 'm/s'],
    output: 'P',
    outputUnit: 'W',
    equation: 'P = F · v',
    instruction:
      'Instantaneous power measures how quickly a force transfers energy. Try a force perpendicular to the velocity.',
    vectors: [
      [3, 2, 0],
      [2, 0, 0],
    ],
  },
  torque: {
    title: 'Torque',
    mode: 'cross',
    symbols: ['r', 'F'],
    units: ['m', 'N'],
    output: 'τ',
    outputUnit: 'N·m',
    equation: 'τ = r × F',
    instruction:
      'r points from the pivot to the point where the force acts. F is drawn at the origin here to compare directions. Align F with r to see why a force aimed through the pivot produces zero torque.',
    vectors: [
      [2, 0, 0],
      [0, 3, 0],
    ],
  },
  particle: {
    title: 'Particle angular momentum',
    mode: 'cross',
    symbols: ['r', 'v'],
    units: ['m', 'm/s'],
    output: 'L',
    outputUnit: 'kg·m²/s',
    equation: 'L = r × p,  p = mv',
    instruction:
      'r is position relative to the origin. Change the mass or velocity to see how momentum p changes the magnitude of L. Try purely radial motion.',
    vectors: [
      [2, 0, 0],
      [0, 1, 1],
    ],
  },
} as const satisfies Record<string, Application>;
export type ApplicationId = keyof typeof APPLICATIONS;

export function parseVector(draft: DraftVector): Vector3Tuple | null {
  const vector = draft.map(Number) as [number, number, number];
  return draft.every(
    (entry, i) =>
      entry.trim() &&
      Number.isFinite(vector[i]) &&
      Math.abs(vector[i]) <= COMPONENT_LIMIT,
  )
    ? vector
    : null;
}

export const draftVector = (v: Vector3Tuple): DraftVector => [
  String(v[0]),
  String(v[1]),
  String(v[2]),
];

export function analyzeVectors(a: Vector3Tuple, b: Vector3Tuple) {
  const cross = crossProduct(a, b);
  return {
    a,
    b,
    lengthA: vectorMagnitude(a),
    lengthB: vectorMagnitude(b),
    directionA: normalizeVector(a),
    directionB: normalizeVector(b),
    sum: addVectors(a, b),
    difference: subtractVectors(a, b),
    theta: angleBetweenVectors(a, b),
    dot: dotProduct(a, b),
    cross,
    area: vectorMagnitude(cross),
    projectionAB: projectVector(a, b),
    projectionBA: projectVector(b, a),
  };
}

export const particleMomentum = (velocity: Vector3Tuple, mass: number) =>
  scaleVector(velocity, mass);
export type VectorAnalysis = ReturnType<typeof analyzeVectors>;

export function numberText(value: number) {
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute < 0.001 || absolute >= 1e6) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
}
export const tupleText = (v: Vector3Tuple) =>
  `⟨${v.map(numberText).join(', ')}⟩`;
