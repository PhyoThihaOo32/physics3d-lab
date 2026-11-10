import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier';
import { Group, Mesh, DoubleSide, Vector2 } from 'three';
import { SimulationPhysics } from '../../physics/engine/SimulationPhysics';
import {
  DANCER,
  DancerDynamics,
  type DancerParameters,
} from '../../physics/rotation/dancer';
import { useDancerStore } from '../../store/dancerStore';
import { useSimulationStore } from '../../store/simulationStore';
import { SceneLabel } from '../../three/labels/SceneLabel';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { DancerArm, DancerHand, DancerTorso } from './DancerSculpture';

const PLINTH = [
  new Vector2(0, -0.06),
  new Vector2(0.486, -0.06),
  new Vector2(0.499, -0.053),
  new Vector2(0.503, -0.041),
  new Vector2(0.503, -0.019),
  new Vector2(0.496, -0.008),
  new Vector2(0.484, -0.005),
  new Vector2(0, -0.005),
];
function Articulation({
  parameters,
  vectors,
}: {
  parameters: DancerParameters;
  vectors: boolean;
}) {
  const { world } = useRapier();
  const model = useRef<DancerDynamics | null>(null);
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
    const s = model.current?.afterStep();
    if (!s) return;
    if (
      Math.round(s.time / DANCER.timeStep) % 48 === 0 ||
      s.time >= DANCER.duration
    ) {
      useDancerStore.getState().report(s, true);
      useSimulationStore.getState().reportTime(s.time);
    }
    if (s.time >= DANCER.duration)
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
    if (radius.current) radius.current.scale.setScalar(d.measure().radius);
  });
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
        visible={vectors}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.054, 0]}
      >
        <ringGeometry args={[0.985, 1, 96]} />
        <meshBasicMaterial
          color="#7c8c72"
          transparent
          opacity={0.7}
          depthTest={false}
          depthWrite={false}
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
            color="#5d795c"
            labelSize={0.32}
          />
          <VectorArrow3D
            origin={[-0.55, 1.5, 0]}
            vector={() => [0, model.current?.measure().momentum ?? 0, 0]}
            magnitudeScale={0.09}
            label="Lᵧ"
            unit="kg·m²/s"
            color="#956c82"
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
      <directionalLight
        position={[2.5, 3, -2]}
        intensity={0.8}
        color="#fff7ee"
      />
      <SimulationPhysics
        gravity={[0, -9.81, 0]}
        timeStep={DANCER.timeStep}
        solverIterations={24}
      >
        <Articulation parameters={parameters} vectors={vectors} />
      </SimulationPhysics>
      <mesh receiveShadow>
        <latheGeometry
          args={[PLINTH.map((p) => new Vector2(p.x * 0.78, p.y)), 96]}
        />
        <meshStandardMaterial color="#ceb2a3" roughness={0.62} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.062, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <shadowMaterial
          color="#7c6b60"
          opacity={0.2}
          transparent
          depthWrite={false}
        />
      </mesh>
      {vectors && (
        <gridHelper
          args={[10, 20, '#b7ac9d', '#c8beb1']}
          position={[0, -0.0605, 0]}
        />
      )}
      {vectors && (
        <group>
          <mesh position={[0, 1.075, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 2.15, 8]} />
            <meshBasicMaterial color="#968e81" transparent opacity={0.3} />
          </mesh>
          <SceneLabel text="+y" position={[0, 2.2, 0]} size={0.25} />
        </group>
      )}
    </>
  );
}
