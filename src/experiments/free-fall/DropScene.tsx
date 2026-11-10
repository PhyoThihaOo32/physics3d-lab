import { useEffect, useRef } from 'react';
import {
  CuboidCollider,
  RigidBody,
  useAfterPhysicsStep,
  type RapierRigidBody,
  type RapierCollider,
} from '@react-three/rapier';
import { Edges } from '@react-three/drei';
import { SimulationPhysics } from '../../physics/engine/SimulationPhysics';
import { FIXED_TIME_STEP } from '../../physics/constants/world';
import { hasGroundContactImpulse } from '../../physics/engine/contacts';
import { DropMeasurements } from '../../physics/measurements/dropMeasurements';
import { useFreeFallStore } from '../../store/freeFallStore';
import { useSimulationStore } from '../../store/simulationStore';
import { DROP, type DropParameters } from './config';
function Bodies({ parameters }: { parameters: DropParameters }) {
  const body = useRef<RapierRigidBody>(null);
  const ground = useRef<RapierCollider>(null);
  const measurements = useRef(
    new DropMeasurements(parameters.initialHeight, FIXED_TIME_STEP),
  );
  const running = useSimulationStore((state) => state.running);
  function publish() {
    const snapshot = measurements.current.snapshot;
    useFreeFallStore.getState().report(snapshot);
    useSimulationStore.getState().reportTime(snapshot.time);
  }
  useEffect(() => {
    useFreeFallStore.getState().markReady();
  }, []);
  // Flush the exact step on pause, including between regular 10 Hz readouts.
  useEffect(() => {
    if (!running) publish();
  }, [running]);
  useAfterPhysicsStep((world) => {
    if (!body.current || !ground.current) return;
    const contacted = hasGroundContactImpulse(
      world,
      body.current,
      ground.current,
    );
    const wasContacted =
      measurements.current.snapshot.firstContactTime !== null;
    measurements.current.sample(
      body.current.translation().y,
      body.current.linvel().y,
      contacted,
    );
    if (
      measurements.current.clock.stepCount % 12 === 0 ||
      (!wasContacted && contacted)
    )
      publish();
  });
  return (
    <>
      <RigidBody
        ref={body}
        position={[0, parameters.initialHeight, 0]}
        colliders={false}
        ccd
        softCcdPrediction={DROP.softCcdPrediction}
        restitution={DROP.restitution}
        friction={DROP.friction}
      >
        <CuboidCollider
          args={[DROP.cubeSize / 2, DROP.cubeSize / 2, DROP.cubeSize / 2]}
          mass={parameters.mass}
        />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[DROP.cubeSize, DROP.cubeSize, DROP.cubeSize]} />
          <meshStandardMaterial
            color="#c1e29e"
            roughness={0.42}
            metalness={0.12}
          />
          <Edges color="#e6f5d2" threshold={15} />
        </mesh>
      </RigidBody>
      <RigidBody
        type="fixed"
        position={[0, -DROP.groundHalfThickness, 0]}
        colliders={false}
      >
        <CuboidCollider
          ref={ground}
          friction={DROP.groundFriction}
          restitution={DROP.groundRestitution}
          args={[
            DROP.groundHalfWidth,
            DROP.groundHalfThickness,
            DROP.groundHalfWidth,
          ]}
        />
        <mesh receiveShadow>
          <boxGeometry args={[12, 0.2, 12]} />
          <meshStandardMaterial color="#222e39" roughness={0.95} />
          <Edges color="#3c4b58" />
        </mesh>
      </RigidBody>
      <gridHelper
        args={[12, 12, '#485762', '#33424f']}
        position={[0, 0.003, 0]}
      />
    </>
  );
}
export function DropScene({ parameters }: { parameters: DropParameters }) {
  return (
    <SimulationPhysics gravity={[0, -parameters.gravity, 0]}>
      <Bodies parameters={parameters} />
    </SimulationPhysics>
  );
}
