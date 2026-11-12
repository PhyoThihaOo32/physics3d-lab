import {
  addVectors,
  crossProduct,
  normalizeVector,
  scaleVector,
  subtractVectors,
  vectorMagnitude,
} from '../../physics/vectors/vectorMath';
import { SceneLabel } from '../../three/labels/SceneLabel';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { DoubleSide } from 'three';
import type { Vector3Tuple } from '../../types/vector';
import { MODES, type VectorCalculation } from './model';

const ORIGIN: Vector3Tuple = [0, 0, 0];
const COLORS = {
  a: '#c1e29e',
  b: '#8bcaf4',
  result: '#efbc88',
  cross: '#eab2fb',
  angle: '#f0dc99',
  projectionAB: '#e8d092',
  projectionBA: '#e1a6d2',
};
const AXIS_COLORS = ['#df948e', '#a9d899', '#88bde0'];

function Segments({
  points,
  color,
  opacity = 1,
}: {
  points: readonly Vector3Tuple[];
  color: string;
  opacity?: number;
}) {
  const positions = new Float32Array(points.flat());
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function Arrow({
  start = ORIGIN,
  vector,
  label,
  color,
  labelSize = 0.53,
}: {
  start?: Vector3Tuple;
  vector: Vector3Tuple;
  label: string;
  color: string;
  labelSize?: number;
}) {
  if (vectorMagnitude(vector) <= 1e-6) return null;
  return (
    <VectorArrow3D
      origin={start}
      vector={vector}
      label={label}
      unit=""
      category="component"
      color={color}
      labelSize={labelSize}
    />
  );
}

function Axes() {
  return (
    <>
      <gridHelper
        args={[10, 10, '#384957', '#283946']}
        position={[0, -0.01, 0]}
      />
      {AXIS_COLORS.map((color, axis) => {
        const end: [number, number, number] = [0, 0, 0];
        end[axis] = 4.65;
        return (
          <group key={axis}>
            <Segments
              points={[scaleVector(end, -1), end]}
              color={color}
              opacity={0.55}
            />
            <SceneLabel
              text={['+x', '+y', '+z'][axis]}
              position={end}
              size={0.52}
            />
          </group>
        );
      })}
      <mesh>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color="#c9d3df" />
      </mesh>
    </>
  );
}

function DashedSegment({
  start,
  end,
  color,
}: {
  start: Vector3Tuple;
  end: Vector3Tuple;
  color: string;
}) {
  const offset = subtractVectors(end, start);
  const points = Array.from({ length: 9 }, (_, i) => [
    addVectors(start, scaleVector(offset, i / 9)),
    addVectors(start, scaleVector(offset, (i + 0.54) / 9)),
  ]).flat();
  return <Segments points={points} color={color} opacity={0.85} />;
}

function Projection({
  source,
  foot,
  label,
  color,
}: {
  source: Vector3Tuple;
  foot: Vector3Tuple | null;
  label: string;
  color: string;
}) {
  if (!foot || vectorMagnitude(source) <= 1e-6) return null;
  return (
    <>
      <DashedSegment start={source} end={foot} color={color} />
      <Arrow vector={foot} label={label} color={color} labelSize={0.6} />
      <mesh position={foot}>
        <sphereGeometry args={[0.056, 10, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

function AngleArc({
  a,
  b,
  theta,
  showDirection,
}: {
  a: Vector3Tuple;
  b: Vector3Tuple;
  theta: number | null;
  showDirection: boolean;
}) {
  const u = normalizeVector(a);
  const v = normalizeVector(b);
  if (!u || !v || theta === null || theta < 0.005) return null;
  const normal = normalizeVector(crossProduct(u, v));
  if (!normal) return null;
  const tangent = crossProduct(normal, u);
  const radius = Math.min(vectorMagnitude(a), vectorMagnitude(b), 3) * 0.43;
  if (radius < 0.04) return null;
  const pointAt = (angle: number, r = radius) =>
    addVectors(
      scaleVector(u, r * Math.cos(angle)),
      scaleVector(tangent, r * Math.sin(angle)),
    );
  const points = Array.from({ length: 32 }, (_, i) => [
    pointAt((theta * i) / 32),
    pointAt((theta * (i + 1)) / 32),
  ]).flat();
  const tip = pointAt(theta);
  const label = pointAt(theta / 2, radius + 0.21);
  return (
    <>
      <Segments points={points} color={COLORS.angle} />
      {showDirection && (
        <Segments
          points={[
            pointAt(Math.max(0, theta - 0.18), radius * 0.87),
            tip,
            tip,
            pointAt(Math.max(0, theta - 0.18), radius * 1.13),
          ]}
          color={COLORS.angle}
        />
      )}
      <SceneLabel text="θ" position={[...label]} size={0.43} />
    </>
  );
}

function Parallelogram({
  a,
  b,
  projectedB,
}: {
  a: Vector3Tuple;
  b: Vector3Tuple;
  projectedB: Vector3Tuple;
}) {
  const sum = addVectors(a, b);
  const heightFoot = addVectors(a, projectedB);
  const heightLabel = scaleVector(addVectors(sum, heightFoot), 0.5);
  const positions = new Float32Array([
    ...ORIGIN,
    ...a,
    ...sum,
    ...ORIGIN,
    ...sum,
    ...b,
  ]);
  return (
    <>
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <meshBasicMaterial
          color={COLORS.cross}
          side={DoubleSide}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Segments points={[a, sum, sum, b]} color={COLORS.cross} opacity={0.7} />
      <DashedSegment start={sum} end={heightFoot} color={COLORS.angle} />
      {vectorMagnitude(subtractVectors(sum, heightFoot)) > 0.25 && (
        <SceneLabel text="h" position={[...heightLabel]} size={0.44} />
      )}
    </>
  );
}

export function VectorScene({
  values,
  operandScale,
  normalScale,
}: {
  values: VectorCalculation | null;
  operandScale: number;
  normalScale: number;
}) {
  if (!values) return <Axes />;
  const { mode, result } = values;
  const a = scaleVector(values.a, operandScale);
  const b = mode === 'scale' ? ORIGIN : scaleVector(values.b, operandScale);
  const label = MODES[mode].equation;
  return (
    <>
      <Axes />
      {mode === 'cross' && values.area > 0 && values.projectionBA && (
        <Parallelogram
          a={a}
          b={b}
          projectedB={scaleVector(values.projectionBA, operandScale)}
        />
      )}
      <Arrow vector={a} label="A" color={COLORS.a} />
      {mode !== 'scale' && <Arrow vector={b} label="B" color={COLORS.b} />}
      {mode === 'add' && (
        <Segments
          points={[a, addVectors(a, b), b, addVectors(a, b)]}
          color={COLORS.result}
          opacity={0.65}
        />
      )}
      {mode === 'subtract' && (
        <DashedSegment start={b} end={a} color={COLORS.result} />
      )}
      {mode === 'dot' && (
        <>
          <Projection
            source={a}
            foot={
              values.projectionAB &&
              scaleVector(values.projectionAB, operandScale)
            }
            label="proj A"
            color={COLORS.projectionAB}
          />
          <Projection
            source={b}
            foot={
              values.projectionBA &&
              scaleVector(values.projectionBA, operandScale)
            }
            label="proj B"
            color={COLORS.projectionBA}
          />
        </>
      )}
      {mode !== 'dot' && (
        <Arrow
          vector={scaleVector(
            result,
            mode === 'cross' ? normalScale : operandScale,
          )}
          label={label}
          color={mode === 'cross' ? COLORS.cross : COLORS.result}
          labelSize={0.74}
        />
      )}
      {(mode === 'dot' || mode === 'cross') && (
        <AngleArc
          a={a}
          b={b}
          theta={values.theta}
          showDirection={mode === 'cross'}
        />
      )}
    </>
  );
}
