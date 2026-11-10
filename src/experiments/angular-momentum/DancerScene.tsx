import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier';
import { Group, Mesh, DoubleSide } from 'three';
import { SimulationPhysics } from '../../physics/engine/SimulationPhysics';
import {
  DANCER,
  DancerDynamics,
  type DancerParameters,
  type DancerSnapshot,
} from '../../physics/rotation/dancer';
import { useDancerStore } from '../../store/dancerStore';
import { useSimulationStore } from '../../store/simulationStore';
import { SceneLabel } from '../../three/labels/SceneLabel';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { DancerArm, DancerHand, DancerTorso } from './DancerSculpture';

function Articulation({
  parameters,
  vectors,
}: {
  parameters: DancerParameters;
  vectors: boolean;
}) {
  const { world } = useRapier();
  const model = useRef<DancerDynamics | null>(null);
  const liveSnapshot = useRef<DancerSnapshot | null>(null);
  const torso = useRef<Group>(null);
  const arms = useRef<(Group | null)[]>([]);
  const radius = useRef<Mesh>(null);
  const running = useSimulationStore((s) => s.running);
  useEffect(() => {
    const dynamics = new DancerDynamics(world, parameters);
    model.current = dynamics;
    useDancerStore.getState().report(dynamics.measure(), true);
    useDancerStore.getState().markReady();
    return () => {
      model.current = null;
      dynamics.dispose();
    };
  }, [world, parameters]);
  useEffect(() => {
    if (!running && model.current) {
      const s = model.current.measure();
      useDancerStore.getState().report(s, true);
      useSimulationStore.getState().reportTime(s.time);
    }
  }, [running]);
  useBeforePhysicsStep(() =>
    model.current?.beforeStep(useDancerStore.getState().target),
  );
  useAfterPhysicsStep(() => {
    const d = model.current;
    if (!d) return;
    d.advanceStep();
    if (d.stepCount % 48 === 0 || d.time >= DANCER.duration) {
      useDancerStore.getState().report(d.measure(), true);
      useSimulationStore.getState().reportTime(d.time);
    }
    if (d.time >= DANCER.duration)
      useSimulationStore.getState().setRunning(false);
  });
  useFrame(() => {
    const d = model.current;
    if (!d) return;
    if (torso.current) {
      torso.current.position.copy(d.torso.translation());
      torso.current.quaternion.copy(d.torso.rotation());
    }
    d.arms.forEach((body, i) => {
      const group = arms.current[i];
      if (group) {
        group.position.copy(body.translation());
        group.quaternion.copy(body.rotation());
      }
    });
    liveSnapshot.current = d.measure();
    if (radius.current)
      radius.current.scale.setScalar(liveSnapshot.current.radius);
  }, -0.5);
  return (
    <>
      <group ref={torso}>
        <DancerTorso />
      </group>
      <DancerArm
        side={1}
        getBodies={() => model.current?.arms}
        getTorso={() => model.current?.torso}
      />
      <DancerArm
        side={-1}
        getBodies={() => model.current?.arms}
        getTorso={() => model.current?.torso}
      />
      {[1, 3].map((i) => (
        <group
          key={i}
          ref={(g) => {
            arms.current[i] = g;
          }}
        >
          <DancerHand side={i === 1 ? 1 : -1} />
        </group>
      ))}
      <mesh
        ref={radius}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
      >
        <ringGeometry args={[0.985, 1, 96]} />
        <meshBasicMaterial
          color="#c1e29e"
          transparent
          opacity={0.7}
          side={DoubleSide}
        />
      </mesh>
      {vectors && (
        <>
          <VectorArrow3D
            origin={[0.55, 1.5, 0]}
            vector={() => [0, model.current?.torso.angvel().y ?? 0, 0]}
            magnitudeScale={0.09}
            label="ω"
            unit="rad/s"
            category="velocity"
            labelSize={0.32}
          />
          <VectorArrow3D
            origin={[-0.55, 1.5, 0]}
            vector={() => [0, liveSnapshot.current?.momentum ?? 0, 0]}
            magnitudeScale={0.09}
            label="Lᵧ"
            unit="kg·m²/s"
            color="#deb9ef"
            category="component"
            labelSize={0.32}
          />
        </>
      )}
    </>
  );
}
export function DancerScene({
  parameters,
  vectors,
}: {
  parameters: DancerParameters;
  vectors: boolean;
}) {
  return (
    <>
      <directionalLight position={[2, 2.5, -3]} intensity={1} color="#c7dce9" />
      <SimulationPhysics
        gravity={[0, -9.81, 0]}
        timeStep={DANCER.timeStep}
        solverIterations={24}
      >
        <Articulation parameters={parameters} vectors={vectors} />
      </SimulationPhysics>
      <mesh position={[0, -0.065, 0]} receiveShadow>
        <cylinderGeometry args={[1.25, 1.3, 0.12, 80]} />
        <meshStandardMaterial
          color="#283139"
          roughness={0.48}
          metalness={0.35}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.13, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#15242d" />
      </mesh>
      <gridHelper
        args={[10, 20, '#344b57', '#233640']}
        position={[0, -0.125, 0]}
      />
      <mesh position={[0, 1.075, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 2.15, 8]} />
        <meshBasicMaterial color="#a7b9c4" transparent opacity={0.4} />
      </mesh>
      <SceneLabel text="+y" position={[0, 2.2, 0]} size={0.25} />
    </>
  );
}
