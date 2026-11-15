import { SceneLabel } from '../../three/labels/SceneLabel';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import type { Vector3Tuple } from '../../types/vector';

import { rotorThickness } from '../../physics/equations/gimbalGyroscope';

export function GyroRotor({ radius }: { radius: number }) {
  const thickness = rotorThickness(radius);
  return (
    <group rotation={[0, 0, -Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, thickness, 64, 1]} />
        <meshStandardMaterial
          color="#536a78"
          metalness={0.48}
          roughness={0.38}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * thickness * 0.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 0.92, radius * 0.028, 10, 64]} />
            <meshStandardMaterial
              color="#b9c9ce"
              metalness={0.45}
              roughness={0.32}
            />
          </mesh>
          <mesh>
            <cylinderGeometry
              args={[radius * 0.18, radius * 0.18, thickness * 1.12, 24]}
            />
            <meshStandardMaterial
              color="#9eb7c2"
              metalness={0.38}
              roughness={0.38}
            />
          </mesh>
          <mesh position={[0, side * radius * 0.014, radius * 0.6]}>
            <boxGeometry
              args={[radius * 0.045, radius * 0.035, radius * 0.52]}
            />
            <meshBasicMaterial color="#c1e29e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function GyroAxle({
  length,
  radius,
}: {
  length: number;
  radius: number;
}) {
  return (
    <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
      <cylinderGeometry args={[radius, radius, length, 20]} />
      <meshStandardMaterial color="#a5b5bd" metalness={0.52} roughness={0.36} />
    </mesh>
  );
}

const RING_PLANES = {
  xy: [0, 0, 0],
  yz: [0, Math.PI / 2, 0],
  xz: [Math.PI / 2, 0, 0],
} as const;

export function GyroRing({
  radius,
  tube,
  color,
  plane,
  bearings,
}: {
  radius: number;
  tube: number;
  color: string;
  plane: keyof typeof RING_PLANES;
  bearings: 'x' | 'y' | 'z';
}) {
  return (
    <>
      <mesh rotation={RING_PLANES[plane]} castShadow receiveShadow>
        <torusGeometry args={[radius, tube, 12, 64]} />
        <meshStandardMaterial color={color} metalness={0.43} roughness={0.43} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            bearings === 'x' ? side * radius : 0,
            bearings === 'y' ? side * radius : 0,
            bearings === 'z' ? side * radius : 0,
          ]}
          castShadow
        >
          <sphereGeometry args={[tube * 1.7, 16, 12]} />
          <meshStandardMaterial
            color="#b9c3c5"
            metalness={0.52}
            roughness={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

export function GyroBase({ height }: { height: number }) {
  return (
    <>
      <mesh position={[0, 0.049, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.32, 0.096, 48]} />
        <meshStandardMaterial
          color="#4d616e"
          metalness={0.28}
          roughness={0.44}
        />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.034, 0.051, height - 0.08, 24]} />
        <meshStandardMaterial
          color="#586c79"
          metalness={0.43}
          roughness={0.43}
        />
      </mesh>
    </>
  );
}

export function GyroPivot({ radius = 0.059 }: { radius?: number }) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[radius, 20, 16]} />
      <meshStandardMaterial color="#d5ac7c" metalness={0.35} roughness={0.41} />
    </mesh>
  );
}

export function GyroPivotStand({
  height,
  offset,
}: {
  height: number;
  offset: number;
}) {
  return (
    <>
      <group position={[-offset, 0, 0]}>
        <GyroBase height={height} />
      </group>
      <group position={[-offset / 2, height, 0]}>
        <GyroAxle length={offset + 0.065} radius={0.028} />
      </group>
      <group position={[0, height, 0]}>
        <GyroPivot />
      </group>
    </>
  );
}

export function GyroAxes({ origin }: { origin: Vector3Tuple }) {
  return (
    <>
      <VectorArrow3D
        origin={origin}
        vector={[0.27, 0, 0]}
        label="+x"
        unit="m"
        category="component"
        color="#e69e94"
        labelSize={0.2}
      />
      <VectorArrow3D
        origin={origin}
        vector={[0, 0.27, 0]}
        label="+y"
        unit="m"
        category="component"
        color="#c1e29e"
        labelSize={0.2}
      />
      <VectorArrow3D
        origin={origin}
        vector={[0, 0, 0.27]}
        label="+z"
        unit="m"
        category="component"
        color="#8ac8eb"
        labelSize={0.2}
      />
      <SceneLabel
        text="XYZ"
        position={[origin[0], origin[1] - 0.13, origin[2]]}
        size={0.21}
      />
    </>
  );
}
import { Quaternion, Vector3 } from 'three';

const ARC_SWEEP = Math.PI * 1.35;

export function GyroSpinArc({
  radius,
  direction,
}: {
  radius: number;
  direction: 1 | -1;
}) {
  const angle = direction > 0 ? ARC_SWEEP : 0;
  const point = [
    0,
    radius * Math.sin(angle),
    -radius * Math.cos(angle),
  ] as const;
  const tangent = new Vector3(
    0,
    direction * Math.cos(angle),
    direction * Math.sin(angle),
  );
  const tip = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    tangent,
  );
  return (
    <>
      <mesh rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
        <torusGeometry args={[radius, 0.009, 8, 48, ARC_SWEEP]} />
        <meshBasicMaterial color="#e8c185" depthTest={false} />
      </mesh>
      <mesh position={point} quaternion={tip} renderOrder={4}>
        <coneGeometry args={[0.025, 0.064, 12]} />
        <meshBasicMaterial color="#e8c185" depthTest={false} />
      </mesh>
    </>
  );
}
