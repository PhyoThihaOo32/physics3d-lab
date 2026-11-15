import { useRef } from 'react';
import type { Group } from 'three';
import {
  GYROSCOPE,
  createGyroscopeTrial,
  measureGyroscope,
  type GyroscopeTrial,
} from '../../physics/equations/gyroscope';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { BicycleWheel } from './BicycleWheel';
import { RotationStage } from './RotationStage';
import { useRotationFrame } from './useRotationFrame';

const PIVOT = [0.15, 1.05, 0.46] as const;
const DIAGRAM_ORIGIN = [0.25, 1.75, 0.65] as const;
const MOMENTUM_SCALE = 0.3;
const INITIAL_ORIENTATION = createGyroscopeTrial().orientation;

export function GyroscopeScene({
  getTrial,
  advance,
  publish,
}: {
  getTrial: () => GyroscopeTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
}) {
  const axle = useRef<Group>(null);
  const guide = useRef<Group>(null);
  const vectors = useRef(measureGyroscope(getTrial()));
  useRotationFrame(advance, publish, () => {
    const trial = getTrial();
    axle.current?.quaternion.copy(trial.orientation);
    if (guide.current) guide.current.visible = trial.time > 0;
    vectors.current = measureGyroscope(trial);
  });

  return (
    <>
      <RotationStage />
      <group position={PIVOT}>
        <mesh position={[0, -1.013, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.27, 0.074, 40]} />
          <meshStandardMaterial
            color="#4a6070"
            metalness={0.35}
            roughness={0.52}
          />
        </mesh>
        <mesh position={[0, -0.51, 0]} castShadow>
          <cylinderGeometry args={[0.043, 0.068, 1, 24]} />
          <meshStandardMaterial color="#5e7180" metalness={0.42} />
        </mesh>
        <mesh castShadow>
          <sphereGeometry args={[0.083, 24, 18]} />
          <meshStandardMaterial
            color="#d0a475"
            metalness={0.45}
            roughness={0.5}
          />
        </mesh>
        <group ref={guide} quaternion={INITIAL_ORIENTATION} visible={false}>
          <mesh position={[0, GYROSCOPE.axleLength / 2, 0]}>
            <cylinderGeometry args={[0.009, 0.009, GYROSCOPE.axleLength, 8]} />
            <meshBasicMaterial
              color="#9aafbd"
              opacity={0.4}
              transparent
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, GYROSCOPE.axleLength, 0]}>
            <sphereGeometry args={[0.025, 12, 8]} />
            <meshBasicMaterial
              color="#9aafbd"
              opacity={0.5}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
        <group ref={axle}>
          <mesh position={[0, 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.023, 0.029, 0.78, 20]} />
            <meshStandardMaterial
              color="#9baeb8"
              metalness={0.46}
              roughness={0.42}
            />
          </mesh>
          <mesh position={[0, 0.19, 0]} castShadow>
            <cylinderGeometry args={[0.044, 0.047, 0.19, 20]} />
            <meshStandardMaterial color="#383f45" roughness={0.88} />
          </mesh>
          <group position={[0, GYROSCOPE.axleLength, 0]}>
            <BicycleWheel />
          </group>
        </group>
      </group>
      <VectorArrow3D
        origin={DIAGRAM_ORIGIN}
        vector={() => vectors.current.initialMomentum}
        label="L₀"
        unit="kg·m²/s"
        category="component"
        color="#9aafbd"
        labelSize={0.24}
        labelOffset={[-0.08, 0.035, 0]}
        magnitudeScale={MOMENTUM_SCALE}
      />
      <VectorArrow3D
        origin={() => {
          const [x, y, z] = vectors.current.initialMomentum;
          return [
            DIAGRAM_ORIGIN[0] + MOMENTUM_SCALE * x,
            DIAGRAM_ORIGIN[1] + MOMENTUM_SCALE * y,
            DIAGRAM_ORIGIN[2] + MOMENTUM_SCALE * z,
          ];
        }}
        vector={() => vectors.current.deltaMomentum}
        label="ΔL"
        unit="kg·m²/s"
        category="component"
        color="#f1b57b"
        labelSize={0.24}
        labelOffset={[0.1, 0.06, 0]}
        magnitudeScale={MOMENTUM_SCALE}
      />
      <VectorArrow3D
        origin={DIAGRAM_ORIGIN}
        vector={() =>
          getTrial().spinSpeed !== 0 && vectors.current.impulse > 0.12
            ? vectors.current.momentum
            : [0, 0, 0]
        }
        label="L"
        unit="kg·m²/s"
        category="component"
        color="#83d5c1"
        labelSize={0.24}
        labelOffset={[0.06, 0.21, 0]}
        magnitudeScale={MOMENTUM_SCALE}
      />
      <VectorArrow3D
        origin={PIVOT}
        vector={() => vectors.current.torque}
        label="τ"
        unit="N·m"
        category="component"
        color="#f1b57b"
        labelSize={0.25}
        magnitudeScale={0.26}
      />
    </>
  );
}
