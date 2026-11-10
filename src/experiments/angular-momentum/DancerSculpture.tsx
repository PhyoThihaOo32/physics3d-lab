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
  facePoint,
  limbGeometry,
  tutuGeometry,
} from './dancerGeometry';

const SKIN = '#efcec2';
function SculptureMesh({
  geometry,
  color = SKIN,
  roughness = 0.43,
}: {
  geometry: BufferGeometry;
  color?: string;
  roughness?: number;
}) {
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0.025}
        side={DoubleSide}
        vertexColors={!!geometry.getAttribute('color')}
      />
    </mesh>
  );
}
function Ellipsoid({
  position,
  scale,
  color = SKIN,
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
      skirts: [tutuGeometry(0)],
      eyelids: [-1, 1].map((side) =>
        limbGeometry(
          [-0.013, -0.007, 0, 0.007, 0.013].map((dx, i) =>
            facePoint(
              side * 0.03 + dx,
              [0.644, 0.641, 0.64, 0.641, 0.644][i],
              0.0012,
            ),
          ),
          [0.0005, 0.0009, 0.001, 0.0009, 0.0003],
          [0.0005, 0.0008, 0.0008, 0.0008, 0.0003],
          24,
        ),
      ),
      brows: [-1, 1].map((side) =>
        limbGeometry(
          [-0.013, -0.006, 0.003, 0.013].map((dx, i) =>
            facePoint(
              side * 0.03 + dx,
              [0.661, 0.665, 0.666, 0.663][i],
              0.0015,
            ),
          ),
          [0.0004, 0.0011, 0.0012, 0.0004],
          [0.0004, 0.0008, 0.0008, 0.0004],
          20,
        ),
      ),
      lips: limbGeometry(
        [-0.014, -0.006, 0, 0.006, 0.014].map((x, i) =>
          facePoint(x, [0.573, 0.575, 0.573, 0.575, 0.573][i], 0.0014),
        ),
        [0.0003, 0.0011, 0.0009, 0.0011, 0.0003],
        [0.0003, 0.0007, 0.0007, 0.0007, 0.0003],
        24,
      ),
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
      <SculptureMesh geometry={g.bodice} color="#f1d8cc" roughness={0.36} />
      <group
        rotation={[-0.38, 1.05, -0.035]}
        scale={0.9}
        position={[0, 0.53, 0]}
      >
        <group position={[0, -0.53, 0]}>
          <SculptureMesh geometry={g.head} color="#ffffff" />
          {g.eyelids.map((geometry, i) => (
            <SculptureMesh
              key={i}
              geometry={geometry}
              color="#926b62"
              roughness={0.65}
            />
          ))}
          {g.brows.map((geometry, i) => (
            <SculptureMesh
              key={i}
              geometry={geometry}
              color="#b58d7c"
              roughness={0.7}
            />
          ))}
          <SculptureMesh geometry={g.lips} color="#be8980" roughness={0.55} />
          <SculptureMesh geometry={g.hair} color="#d6afa1" />
          <Ellipsoid
            position={[0, 0.704, -0.079]}
            scale={[0.04, 0.04, 0.033]}
            color="#d6afa1"
          />
          <Ellipsoid
            position={[-0.066, 0.627, -0.002]}
            scale={[0.008, 0.016, 0.009]}
          />
          <Ellipsoid
            position={[0.066, 0.627, -0.002]}
            scale={[0.008, 0.016, 0.009]}
          />
        </group>
      </group>
      {g.skirts.map((geometry, i) => (
        <SculptureMesh
          key={i}
          geometry={geometry}
          color={i === 0 ? '#fff6e9' : '#e8e1d4'}
          roughness={0.64}
        />
      ))}
      <SculptureMesh geometry={g.support} />
      <SculptureMesh geometry={g.crossing} />
      <SculptureMesh geometry={g.leftShoe} color="#e5c0b4" roughness={0.36} />
      <SculptureMesh geometry={g.rightShoe} color="#e5c0b4" roughness={0.36} />
      {g.ribbons.map((geometry, i) => (
        <SculptureMesh
          key={i}
          geometry={geometry}
          color="#e5c0b4"
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
        color: SKIN,
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
