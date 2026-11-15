import { useMemo, useRef } from 'react';
import { Vector3, type Group, type Mesh } from 'three';
import {
  WHEEL_FLIP,
  measureWheelFlip,
  wheelAxleDirection,
  type WheelFlipTrial,
} from '../../physics/equations/wheelFlip';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { BicycleWheel } from './BicycleWheel';
import { RotationStage } from './RotationStage';
import { useRotationFrame } from './useRotationFrame';

const WHEEL_HEIGHT = 1.41;
const DECK_TOP = 0.27;
const GRIP_DISTANCE = 0.39;
const ARM_SEGMENT_LENGTH = 0.38;
const SKIN = '#c69174';
const SHIRT = '#a75c5d';
const WHEEL_COLOR = '#83d5c1';
const SUPPORT_COLOR = '#f1b57b';

function TeacherBody() {
  return (
    <group position={[0, DECK_TOP, -0.52]}>
      <mesh position={[0, 1.04, 0]} castShadow scale={[1, 1, 0.67]}>
        <cylinderGeometry args={[0.217, 0.16, 0.46, 24]} />
        <meshStandardMaterial color={SHIRT} />
      </mesh>
      <mesh position={[0, 1.265, 0]} scale={[1, 0.42, 0.67]}>
        <sphereGeometry args={[0.215, 24, 16]} />
        <meshStandardMaterial color={SHIRT} />
      </mesh>
      <mesh position={[0, 0.79, 0]} scale={[1, 0.63, 0.71]}>
        <sphereGeometry args={[0.166, 24, 14]} />
        <meshStandardMaterial color="#43515d" />
      </mesh>
      <mesh position={[0, 1.39, 0]}>
        <cylinderGeometry args={[0.061, 0.073, 0.16, 16]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>
      <group position={[0, 1.53, 0.018]}>
        <mesh castShadow scale={[0.92, 1.17, 0.98]}>
          <sphereGeometry args={[0.128, 24, 20]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[0, 0.019, -0.02]} scale={[1, 1.1, 1.02]}>
          <sphereGeometry
            args={[0.126, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]}
          />
          <meshStandardMaterial color="#332929" />
        </mesh>
        <mesh position={[0, -0.01, 0.126]} scale={[0.78, 1, 1]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.114, -0.011, -0.013]}
              scale={[0.58, 1.15, 0.8]}
            >
              <sphereGeometry args={[0.027, 12, 10]} />
              <meshStandardMaterial color={SKIN} />
            </mesh>
            <mesh
              position={[side * 0.049, 0.014, 0.109]}
              scale={[1, 0.65, 0.6]}
            >
              <sphereGeometry args={[0.012, 12, 8]} />
              <meshStandardMaterial color="#3a302f" />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[0.113 * side, 0, 0]}
          rotation={[0, side * 0.18, -side * 0.045]}
        >
          <mesh position={[0, 0.421, 0]} castShadow scale={[1, 1, 0.85]}>
            <capsuleGeometry args={[0.086, 0.59, 8, 16]} />
            <meshStandardMaterial color="#43515d" />
          </mesh>
          <mesh
            position={[0.018 * side, 0.062, 0.055]}
            castShadow
            scale={[1, 0.56, 1.72]}
          >
            <sphereGeometry args={[0.1, 20, 14]} />
            <meshStandardMaterial color="#a88e71" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function moveSegment(
  mesh: Mesh | null,
  from: Vector3,
  to: Vector3,
  scratch: Vector3,
  up: Vector3,
) {
  if (!mesh) return;
  mesh.position.copy(from).lerp(to, 0.5);
  scratch.subVectors(to, from);
  mesh.scale.y = scratch.length() + 0.025;
  mesh.quaternion.setFromUnitVectors(up, scratch.normalize());
}

export function WheelFlipScene({
  getTrial,
  advance,
  publish,
  spinSpeed,
  vectorsVisible,
}: {
  getTrial: () => WheelFlipTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
  spinSpeed: number;
  vectorsVisible: boolean;
}) {
  const support = useRef<Group>(null);
  const axle = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const leftSleeve = useRef<Mesh>(null);
  const leftForearm = useRef<Mesh>(null);
  const rightSleeve = useRef<Mesh>(null);
  const rightForearm = useRef<Mesh>(null);
  const { shoulder, elbow, wrist, armAxis, scratch, up } = useMemo(
    () => ({
      shoulder: new Vector3(),
      elbow: new Vector3(),
      wrist: new Vector3(),
      armAxis: new Vector3(),
      scratch: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  );
  useRotationFrame(advance, publish, () => {
    const trial = getTrial();
    if (support.current) support.current.rotation.y = trial.supportAngle;
    if (axle.current) axle.current.rotation.z = trial.tilt;
    if (rotor.current) rotor.current.rotation.y = trial.time * spinSpeed;

    for (const side of [-1, 1] as const) {
      shoulder.set(side * 0.178, 1.53, -0.51);
      wrist.set(
        side * GRIP_DISTANCE * Math.sin(trial.tilt),
        WHEEL_HEIGHT - side * GRIP_DISTANCE * Math.cos(trial.tilt),
        0,
      );
      armAxis.subVectors(wrist, shoulder);
      const reach = armAxis.length();
      armAxis.divideScalar(reach);
      scratch.set(side * 0.65, -1, 0);
      scratch.addScaledVector(armAxis, -scratch.dot(armAxis)).normalize();
      // Keep both arm segments the same length as the hand follows the axle.
      const bend = Math.sqrt(
        Math.max(0, ARM_SEGMENT_LENGTH ** 2 - (reach / 2) ** 2),
      );
      elbow.copy(shoulder).lerp(wrist, 0.5).addScaledVector(scratch, bend);
      moveSegment(
        side === -1 ? leftSleeve.current : rightSleeve.current,
        shoulder,
        elbow,
        scratch,
        up,
      );
      moveSegment(
        side === -1 ? leftForearm.current : rightForearm.current,
        elbow,
        wrist,
        scratch,
        up,
      );
    }
  });

  return (
    <>
      <RotationStage />
      <mesh position={[0, 0.075, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.45, 0.15, 48]} />
        <meshStandardMaterial color="#526272" metalness={0.34} />
      </mesh>
      <mesh position={[0, 0.004, 1.135]}>
        <boxGeometry args={[0.035, 0.008, 0.113]} />
        <meshBasicMaterial color="#8597a1" />
      </mesh>
      <group ref={support}>
        <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.08, 0.12, 72]} />
          <meshStandardMaterial
            color="#425866"
            metalness={0.23}
            roughness={0.55}
          />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, DECK_TOP + 0.002, 0]}
        >
          <ringGeometry args={[0.952, 0.96, 80]} />
          <meshBasicMaterial color="#9ba9ad" />
        </mesh>
        <mesh position={[0, DECK_TOP + 0.004, 0.66]}>
          <boxGeometry args={[0.034, 0.009, 0.56]} />
          <meshBasicMaterial color={SUPPORT_COLOR} />
        </mesh>
        {[1, 2, 3].map((index) => (
          <group key={index} rotation={[0, (index * Math.PI) / 2, 0]}>
            <mesh position={[0, DECK_TOP + 0.004, 0.91]}>
              <boxGeometry args={[0.02, 0.008, 0.082]} />
              <meshBasicMaterial color="#9ba9ad" />
            </mesh>
          </group>
        ))}
        <TeacherBody />
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh ref={side === -1 ? leftSleeve : rightSleeve} castShadow>
              <cylinderGeometry args={[0.048, 0.061, 1, 16]} />
              <meshStandardMaterial color={SHIRT} />
            </mesh>
            <mesh ref={side === -1 ? leftForearm : rightForearm} castShadow>
              <cylinderGeometry args={[0.034, 0.046, 1, 16]} />
              <meshStandardMaterial color={SKIN} />
            </mesh>
          </group>
        ))}
        <group ref={axle} position={[0, WHEEL_HEIGHT, 0]}>
          <mesh>
            <cylinderGeometry args={[0.021, 0.021, 0.93, 16]} />
            <meshStandardMaterial color="#6c777e" metalness={0.38} />
          </mesh>
          {[-GRIP_DISTANCE, GRIP_DISTANCE].map((offset) => (
            <mesh
              key={offset}
              position={[0, offset, 0]}
              castShadow
              scale={[0.87, 1.34, 1.04]}
            >
              <sphereGeometry args={[0.049, 16, 12]} />
              <meshStandardMaterial color={SKIN} />
            </mesh>
          ))}
          <group ref={rotor}>
            <BicycleWheel />
          </group>
        </group>
      </group>
      <VectorArrow3D
        visible={vectorsVisible}
        origin={() => {
          const [x, y, z] = wheelAxleDirection(getTrial());
          return [x * 0.47, WHEEL_HEIGHT + y * 0.47, z * 0.47];
        }}
        vector={() => {
          const [x, y, z] = wheelAxleDirection(getTrial());
          const momentum = WHEEL_FLIP.spinInertia * spinSpeed;
          return [x * momentum, y * momentum, z * momentum];
        }}
        magnitudeScale={0.145}
        label="Spin L"
        unit="kg·m²/s"
        category="component"
        color={WHEEL_COLOR}
        labelSize={0.36}
      />
      <VectorArrow3D
        visible={vectorsVisible}
        origin={[0.72, 0.38, 0.36]}
        vector={() => [
          0,
          measureWheelFlip(getTrial(), spinSpeed).supportMomentum,
          0,
        ]}
        magnitudeScale={0.145}
        label="Base L"
        unit="kg·m²/s"
        category="component"
        color={SUPPORT_COLOR}
        labelSize={0.36}
      />
    </>
  );
}
