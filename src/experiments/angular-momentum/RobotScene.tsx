import { useRef } from 'react';
import type { Group } from 'three';
import { RoundedBox } from '@react-three/drei';
import {
  ROBOT,
  robotCargoBlocks,
  robotCargoHeight,
  robotTransferAngle,
  robotTransferPosition,
  type RobotTransfer,
  robotOmega,
  type RobotTrial,
} from '../../physics/equations/robotRotation';
import type { Vector3Tuple } from '../../types/vector';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { RotationStage } from './RotationStage';
import { useRotationFrame } from './useRotationFrame';

const ALLOY = '#a1b2be';
const JOINT = '#3b4b57';
const TRIM = '#75c9b9';
const PACK = '#a67b40';
const LOAD_COLORS = ['#f0ba73', '#7ed0c0', '#a3b5ea'];

function Plate({
  position,
  size,
  color,
  rounded = 0,
}: {
  position: Vector3Tuple;
  size: Vector3Tuple;
  color: string;
  rounded?: number;
}) {
  if (rounded > 0)
    return (
      <RoundedBox
        args={[...size]}
        position={position}
        radius={rounded}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.33} />
      </RoundedBox>
    );
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[...size]} />
      <meshStandardMaterial color={color} roughness={0.54} metalness={0.24} />
    </mesh>
  );
}

function RobotBody() {
  return (
    <>
      <Plate
        position={[0, 1.16, 0]}
        size={[0.62, 0.56, 0.37]}
        color={ALLOY}
        rounded={0.055}
      />
      <Plate position={[0, 0.81, 0]} size={[0.46, 0.19, 0.32]} color={JOINT} />
      <Plate position={[0, 1.49, 0]} size={[0.19, 0.16, 0.2]} color={JOINT} />
      <Plate
        position={[0, 1.68, 0]}
        size={[0.49, 0.3, 0.35]}
        color={ALLOY}
        rounded={0.05}
      />
      <Plate
        position={[0, 1.69, -0.183]}
        size={[0.4, 0.13, 0.025]}
        rounded={0.012}
        color={JOINT}
      />
      <Plate
        position={[0, 1.7, 0.18]}
        size={[0.36, 0.06, 0.025]}
        color={JOINT}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Plate
            position={[side * 0.11, 1.69, -0.199]}
            size={[0.105, 0.036, 0.012]}
            color={TRIM}
          />
          <Plate
            position={[side * 0.37, 1.32, 0]}
            size={[0.19, 0.19, 0.23]}
            color={JOINT}
          />
          <group
            position={[side * 0.46, 1.05, 0]}
            rotation={[0, 0, side * 0.1]}
          >
            <Plate
              position={[0, 0.12, 0]}
              size={[0.14, 0.25, 0.17]}
              color={ALLOY}
            />
            <Plate
              position={[0, -0.06, 0]}
              size={[0.12, 0.11, 0.13]}
              color={JOINT}
            />
            <Plate
              position={[0, -0.22, -0.02]}
              size={[0.15, 0.25, 0.19]}
              color={ALLOY}
            />
          </group>
          <Plate
            position={[side * 0.145, 0.57, 0]}
            size={[0.19, 0.34, 0.22]}
            color={ALLOY}
          />
          <Plate
            position={[side * 0.145, 0.33, 0]}
            size={[0.14, 0.15, 0.19]}
            color={JOINT}
          />
          <Plate
            position={[side * 0.145, 0.18, 0]}
            size={[0.19, 0.24, 0.23]}
            color={ALLOY}
          />
          <Plate
            position={[side * 0.145, 0.05, -0.053]}
            size={[0.24, 0.1, 0.35]}
            color={JOINT}
          />
          <Plate
            position={[side * 0.21, 1.12, 0.237]}
            size={[0.07, 0.4, 0.14]}
            color={JOINT}
          />
        </group>
      ))}
      <Plate
        position={[0, 1.16, -0.194]}
        size={[0.31, 0.17, 0.035]}
        color={JOINT}
        rounded={0.016}
      />
      <Plate
        position={[0, 1.16, -0.215]}
        size={[0.18, 0.025, 0.012]}
        color={TRIM}
      />
    </>
  );
}

function Backpack() {
  return (
    <group>
      <Plate
        position={[0, ROBOT.cargoFloor - 0.06, 0]}
        size={[0.51, 0.12, 0.39]}
        color={PACK}
      />
      <Plate
        position={[0, 1.3, -0.184]}
        size={[0.51, 0.46, 0.053]}
        color={PACK}
      />
      {[-1, 1].map((side) => (
        <Plate
          key={side}
          position={[side * 0.229, 1.3, 0]}
          size={[0.053, 0.46, 0.39]}
          color={PACK}
        />
      ))}
      <Plate
        position={[0, 1.12, 0.18]}
        size={[0.51, 0.075, 0.05]}
        color={PACK}
      />
      <Plate
        position={[0, 1.12, 0.209]}
        size={[0.25, 0.034, 0.015]}
        color={TRIM}
      />
    </group>
  );
}

function Weight({
  mass,
  index,
  height = 0,
}: {
  mass: number;
  index: number;
  height?: number;
}) {
  const thickness = mass * ROBOT.cargoThickness;
  const color = LOAD_COLORS[index % LOAD_COLORS.length];
  return (
    <group position={[0, height, 0]}>
      <Plate
        position={[0, 0, 0]}
        size={[0.355, thickness, 0.275]}
        color={color}
        rounded={Math.min(0.014, thickness * 0.25)}
      />
      <Plate
        position={[0.092, 0, 0.139]}
        size={[0.069, thickness * 0.35, 0.007]}
        color="#334654"
      />
    </group>
  );
}

export function RobotScene({
  getTrial,
  advance,
  publish,
  vectors,
  load,
  transfer,
}: {
  getTrial: () => RobotTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
  vectors: boolean;
  load: number;
  transfer: RobotTransfer | null;
}) {
  const pivot = useRef<Group>(null);
  const moving = useRef<Group>(null);
  const cargo = robotCargoBlocks(
    transfer?.kind === 'remove' ? transfer.to : load,
  );
  const traveling = transfer
    ? robotCargoBlocks(
        Math.max(transfer.from, transfer.to),
        Math.min(transfer.from, transfer.to),
      )
    : [];
  const transferCenter = transfer
    ? robotCargoHeight((transfer.from + transfer.to) / 2)
    : 0;

  useRotationFrame(advance, publish, () => {
    const { angle, transfer, time } = getTrial();
    if (pivot.current) pivot.current.rotation.y = angle;
    if (moving.current) {
      moving.current.visible = transfer !== null;
      if (transfer) {
        moving.current.position.set(...robotTransferPosition(transfer, time));
        moving.current.rotation.y = robotTransferAngle(transfer, time);
      }
    }
  });

  return (
    <>
      <RotationStage />
      <group ref={pivot}>
        <RobotBody />
        <group position={[0, 0, ROBOT.backpackRadius]}>
          <Backpack />
          {cargo.map((block) => (
            <Weight
              key={block.index}
              index={block.index}
              mass={block.mass}
              height={block.center}
            />
          ))}
        </group>
      </group>
      <group ref={moving} visible={false}>
        {traveling.map((block) => (
          <Weight
            key={block.index}
            index={block.index}
            mass={block.mass}
            height={block.center - transferCenter}
          />
        ))}
      </group>
      {vectors && (
        <>
          <VectorArrow3D
            origin={[0.66, 1.45, 0]}
            vector={() => [0, robotOmega(getTrial()), 0]}
            magnitudeScale={0.23}
            label="ω"
            unit="rad/s"
            category="velocity"
            labelSize={0.32}
          />
          <VectorArrow3D
            origin={[-0.66, 1.45, 0]}
            vector={() => [0, getTrial().momentum, 0]}
            magnitudeScale={0.23}
            label="Lᵧ"
            unit="kg·m²/s"
            category="component"
            color="#deb9ef"
            labelSize={0.32}
          />
        </>
      )}
    </>
  );
}
