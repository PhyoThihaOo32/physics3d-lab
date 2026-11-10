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
} from '../../physics/rotation/dancer';
import { useDancerStore } from '../../store/dancerStore';
import { useSimulationStore } from '../../store/simulationStore';
import { SceneLabel } from '../../three/labels/SceneLabel';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';

function Sphere({
  position,
  scale,
  color = '#c9917d',
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}
function Torso() {
  return (
    <>
      <Sphere
        position={[0, 0.19, 0]}
        scale={[0.17, 0.28, 0.105]}
        color="#83b6bc"
      />
      <Sphere
        position={[0, -0.05, 0]}
        scale={[0.155, 0.13, 0.11]}
        color="#6f98b2"
      />
      <Sphere position={[0, 0.49, 0]} scale={[0.055, 0.09, 0.055]} />
      <Sphere position={[0, 0.65, 0]} scale={[0.105, 0.135, 0.095]} />
      <Sphere
        position={[0, 0.73, -0.06]}
        scale={[0.108, 0.085, 0.075]}
        color="#3d2931"
      />
      <Sphere
        position={[0, 0.81, -0.08]}
        scale={[0.06, 0.055, 0.055]}
        color="#3d2931"
      />
      <Sphere position={[0, 0.64, 0.091]} scale={[0.018, 0.022, 0.025]} />
      <Sphere
        position={[-0.037, 0.68, 0.083]}
        scale={[0.011, 0.008, 0.009]}
        color="#283039"
      />
      <Sphere
        position={[0.037, 0.68, 0.083]}
        scale={[0.011, 0.008, 0.009]}
        color="#283039"
      />
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.12, 0.34, 0.18, 40, 1, true]} />
        <meshStandardMaterial
          color="#9fbfd5"
          side={DoubleSide}
          roughness={0.65}
        />
      </mesh>
      <Sphere
        position={[-0.045, -0.48, 0]}
        scale={[0.042, 0.38, 0.045]}
        color="#d9ac9d"
      />
      <Sphere
        position={[0.045, -0.48, 0]}
        scale={[0.042, 0.38, 0.045]}
        color="#d9ac9d"
      />
      <Sphere
        position={[-0.045, -0.925, 0.02]}
        scale={[0.042, 0.08, 0.06]}
        color="#e6bdb7"
      />
      <Sphere
        position={[0.045, -0.925, 0.02]}
        scale={[0.042, 0.08, 0.06]}
        color="#e6bdb7"
      />
      <Sphere position={[0.18, 0.42, 0]} scale={[0.05, 0.05, 0.05]} />
      <Sphere position={[-0.18, 0.42, 0]} scale={[0.05, 0.05, 0.05]} />
      <mesh position={[0, 0.12, 0.11]}>
        <sphereGeometry args={[0.02, 12, 8]} />
        <meshStandardMaterial
          color="#edfcb7"
          emissive="#a3b269"
          emissiveIntensity={0.4}
        />
      </mesh>
    </>
  );
}
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
        <Torso />
      </group>
      {[0, 1, 2, 3].map((i) => {
        const length = i % 2 === 0 ? DANCER.upperLength : DANCER.foreLength;
        const side = i < 2 ? 1 : -1;
        return (
          <group
            key={i}
            ref={(g) => {
              arms.current[i] = g;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.035, length - 0.07, 6, 16]} />
              <meshStandardMaterial color="#cf9c88" roughness={0.7} />
            </mesh>
            <Sphere
              position={[(side * length) / 2, 0, 0]}
              scale={i % 2 ? [0.035, 0.032, 0.025] : [0.037, 0.037, 0.037]}
            />
          </group>
        );
      })}
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
            origin={[0.45, 1.75, 0]}
            vector={() => [0, model.current?.torso.angvel().y ?? 0, 0]}
            magnitudeScale={0.12}
            label="ω"
            unit="rad/s"
            category="velocity"
            labelSize={0.32}
          />
          <VectorArrow3D
            origin={[-0.45, 1.75, 0]}
            vector={() => [0, model.current?.measure().momentum ?? 0, 0]}
            magnitudeScale={0.12}
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
          color="#293d49"
          roughness={0.7}
          metalness={0.25}
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
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 2.6, 8]} />
        <meshBasicMaterial color="#a7b9c4" transparent opacity={0.4} />
      </mesh>
      <SceneLabel text="+y" position={[0, 2.65, 0]} size={0.25} />
    </>
  );
}
