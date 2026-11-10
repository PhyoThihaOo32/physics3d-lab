import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, MeshStandardMaterial, type BufferGeometry } from 'three';
import type { RigidBody } from '@dimforge/rapier3d-compat';
import { DANCER } from '../../physics/equations/angularMomentum';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  armSculpture,
  bodyGeometry,
  bodiceGeometry,
  hairGeometry,
  headGeometry,
  limbGeometry,
  tutuGeometry,
} from './dancerGeometry';

const IVORY = '#e9dfca';
function SculptureMesh({
  geometry,
  color = IVORY,
  roughness = 0.43,
}: {
  geometry: BufferGeometry;
  color?: string;
  roughness?: number;
}) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0.025}
        side={DoubleSide}
      />
    </mesh>
  );
}
function Ellipsoid({
  position,
  scale,
  color = IVORY,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={color} roughness={0.43} />
    </mesh>
  );
}
export function DancerTorso() {
  const g = useMemo(
    () => ({
      body: bodyGeometry(),
      bodice: bodiceGeometry(),
      head: headGeometry(),
      hair: hairGeometry(),
      skirts: [tutuGeometry(0), tutuGeometry(1), tutuGeometry(2)],
      ribbons: [
        limbGeometry(
          [
            [-0.019, -0.86, 0.018],
            [0, -0.85, 0.035],
            [0.019, -0.86, 0.018],
            [0, -0.87, -0.002],
            [-0.019, -0.86, 0.018],
          ],
          [0.003, 0.003, 0.003, 0.003, 0.003],
          [0.002, 0.002, 0.002, 0.002, 0.002],
          32,
        ),
        limbGeometry(
          [
            [-0.042, -0.83, -0.061],
            [-0.023, -0.82, -0.043],
            [-0.004, -0.83, -0.061],
            [-0.023, -0.84, -0.08],
            [-0.042, -0.83, -0.061],
          ],
          [0.003, 0.003, 0.003, 0.003, 0.003],
          [0.002, 0.002, 0.002, 0.002, 0.002],
          32,
        ),
      ],
      // A straight supporting pointe leg and a softly lifted, turned-out trailing foot.
      support: limbGeometry(
        [
          [-0.045, -0.09, 0.018],
          [-0.025, -0.28, 0.023],
          [-0.008, -0.49, 0.025],
          [0, -0.66, 0.022],
          [0, -0.83, 0.016],
          [0, -0.9, 0.015],
        ],
        [0.054, 0.049, 0.03, 0.037, 0.02, 0.017],
        [0.048, 0.045, 0.027, 0.033, 0.018, 0.016],
      ),
      crossing: limbGeometry(
        [
          [0.065, -0.09, -0.025],
          [0.08, -0.27, -0.038],
          [0.075, -0.48, -0.055],
          [0.035, -0.67, -0.065],
          [-0.014, -0.81, -0.066],
          [-0.025, -0.86, -0.058],
        ],
        [0.052, 0.048, 0.029, 0.033, 0.019, 0.016],
        [0.046, 0.043, 0.026, 0.03, 0.018, 0.015],
      ),
      leftShoe: limbGeometry(
        [
          [0, -0.87, 0.015],
          [0, -0.92, 0.024],
          [0, -0.975, 0.04],
          [0, -0.998, 0.043],
        ],
        [0.018, 0.024, 0.021, 0.015],
        [0.017, 0.022, 0.019, 0.009],
        36,
      ),
      rightShoe: limbGeometry(
        [
          [-0.021, -0.84, -0.06],
          [-0.029, -0.885, -0.041],
          [-0.042, -0.927, -0.015],
          [-0.045, -0.944, -0.006],
        ],
        [0.017, 0.023, 0.02, 0.012],
        [0.016, 0.02, 0.017, 0.009],
        36,
      ),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const value of Object.values(g)) {
        if (Array.isArray(value)) value.forEach((item) => item.dispose());
        else value.dispose();
      }
    },
    [g],
  );
  return (
    <>
      <SculptureMesh geometry={g.body} />
      <SculptureMesh geometry={g.bodice} color="#ded0b5" roughness={0.36} />
      <group rotation={[-0.1, -0.2, -0.045]} position={[0, 0.53, 0]}>
        <group position={[0, -0.53, 0]}>
          <SculptureMesh geometry={g.head} />
          <SculptureMesh geometry={g.hair} color="#d3c5a9" />
          <Ellipsoid
            position={[0, 0.719, -0.092]}
            scale={[0.048, 0.046, 0.039]}
            color="#d3c5a9"
          />
          <Ellipsoid
            position={[-0.079, 0.641, -0.009]}
            scale={[0.01, 0.02, 0.012]}
          />
          <Ellipsoid
            position={[0.079, 0.641, -0.009]}
            scale={[0.01, 0.02, 0.012]}
          />
        </group>
      </group>
      {g.skirts.map((geometry, i) => (
        <SculptureMesh
          key={i}
          geometry={geometry}
          color={i === 0 ? '#eee2c9' : '#d9caad'}
          roughness={0.52}
        />
      ))}
      <SculptureMesh geometry={g.support} />
      <SculptureMesh geometry={g.crossing} />
      <SculptureMesh geometry={g.leftShoe} color="#d4bc9b" roughness={0.36} />
      <SculptureMesh geometry={g.rightShoe} color="#d4bc9b" roughness={0.36} />
      {g.ribbons.map((geometry, i) => (
        <SculptureMesh
          key={i}
          geometry={geometry}
          color="#d4bc9b"
          roughness={0.4}
        />
      ))}
    </>
  );
}

export function DancerArm({
  side,
  getBodies,
  getTorso,
}: {
  side: number;
  getBodies: () => readonly RigidBody[] | undefined;
  getTorso: () => RigidBody | undefined;
}) {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: IVORY,
        roughness: 0.43,
        metalness: 0.025,
        side: DoubleSide,
      }),
    [],
  );
  const sculpture = useMemo(
    () => armSculpture(side, material),
    [side, material],
  );
  useEffect(
    () => () => {
      sculpture.dispose();
      material.dispose();
    },
    [sculpture, material],
  );
  useFrame(() => {
    const bodies = getBodies();
    const torso = getTorso();
    if (!bodies || !torso) return;
    sculpture.root.position.copy(torso.translation());
    sculpture.root.quaternion.copy(torso.rotation());
    const index = side > 0 ? 0 : 2;
    sculpture.upper.position.copy(bodies[index].translation());
    sculpture.upper.quaternion.copy(bodies[index].rotation());
    sculpture.fore.position.copy(bodies[index + 1].translation());
    sculpture.fore.quaternion.copy(bodies[index + 1].rotation());
  });
  return <primitive object={sculpture.mesh} />;
}

export function DancerHand({ side }: { side: number }) {
  const g = useMemo(() => {
    const end = DANCER.foreLength / 2;
    const palm = limbGeometry(
      [
        [side * (end - 0.087), 0, 0],
        [side * (end - 0.059), -0.004, 0],
        [side * (end - 0.035), -0.011, 0],
      ],
      [0.014, 0.018, 0.015],
      [0.011, 0.01, 0.007],
      24,
    );
    const fingers = [0, 1, 2, 3].map((i) => {
      const z = (i - 1.5) * 0.008;
      const length = [0.027, 0.035, 0.032, 0.024][i];
      return limbGeometry(
        [
          [side * (end - 0.04), -0.01, z],
          [side * (end - 0.025), -0.016 - 0.001 * i, z * 1.2],
          [side * (end - 0.035 + length), 0.001 - 0.001 * i, z * 1.4],
        ],
        [0.004, 0.0035, 0.0015],
        [0.0035, 0.003, 0.0015],
        18,
      );
    });
    const thumb = limbGeometry(
      [
        [side * (end - 0.065), -0.002, 0.011],
        [side * (end - 0.05), -0.008, 0.022],
        [side * (end - 0.033), -0.016, 0.024],
      ],
      [0.005, 0.004, 0.002],
      [0.004, 0.0035, 0.002],
      18,
    );
    const parts = [palm, ...fingers, thumb];
    const hand = mergeGeometries(parts);
    parts.forEach((geometry) => geometry.dispose());
    return hand;
  }, [side]);
  useEffect(() => () => g.dispose(), [g]);
  return <SculptureMesh geometry={g} />;
}
