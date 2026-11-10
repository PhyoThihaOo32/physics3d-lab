import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  type RapierRigidBody,
  type RapierCollider,
} from '@react-three/rapier';
import { Billboard } from '@react-three/drei';
import type { Group } from 'three';
import { SimulationPhysics } from '../../physics/engine/SimulationPhysics';
import { hasGroundContactImpulse } from '../../physics/engine/contacts';
import {
  launchVelocity,
  projectileAtTime,
} from '../../physics/equations/projectile';
import { useSimulationStore } from '../../store/simulationStore';
import {
  newProjectileMeasurements,
  useProjectileStore,
} from '../../store/projectileStore';
import { useAfterPhysicsStep } from '@react-three/rapier';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { SceneLabel } from '../../three/labels/SceneLabel';
import {
  MeasuredTrajectory,
  PredictedTrajectory,
} from '../../three/trails/Trajectory3D';
import { PROJECTILE, type ProjectileParameters } from './config';
import { projectileView } from './viewModel';
import type { Vector3Tuple } from '../../types/vector';

export interface ProjectileLayers {
  velocity: boolean;
  components: boolean;
  gravity: boolean;
  prediction: boolean;
  trail: boolean;
}
function ProjectileBodies({
  parameters,
  layers,
}: {
  parameters: ProjectileParameters;
  layers: ProjectileLayers;
}) {
  const body = useRef<RapierRigidBody>(null);
  const ground = useRef<RapierCollider>(null);
  const apexMarker = useRef<Group>(null);
  const landingMarker = useRef<Group>(null);
  const measurements = useRef(newProjectileMeasurements(parameters));
  const running = useSimulationStore((state) => state.running);
  const landed = useProjectileStore((state) => state.snapshot.landing !== null);
  const launch = useMemo(
    () => [...launchVelocity(parameters)] as [number, number, number],
    [parameters],
  );
  const view = useMemo(() => projectileView(parameters), [parameters]);
  const prediction = useMemo(
    () =>
      Array.from({ length: 121 }, (_, index) => {
        const point = projectileAtTime(
          parameters,
          (view.duration * index) / 120,
        ).position;
        return [
          point[0],
          point[1] + PROJECTILE.radius,
          point[2],
        ] as Vector3Tuple;
      }),
    [parameters, view.duration],
  );
  function publish() {
    const snapshot = measurements.current.snapshot;
    useProjectileStore.getState().report(snapshot);
    useSimulationStore.getState().reportTime(snapshot.time);
  }
  useEffect(() => {
    useProjectileStore.getState().markReady();
  }, []);
  useEffect(() => {
    if (!running) publish();
  }, [running]);
  useAfterPhysicsStep((world) => {
    if (!body.current || !ground.current) return;
    const p = body.current.translation();
    const v = body.current.linvel();
    const s = measurements.current.sample(
      [p.x, p.y - PROJECTILE.radius, p.z],
      [v.x, v.y, v.z],
      hasGroundContactImpulse(world, body.current, ground.current),
    );
    if (s.landing || s.limitReached) {
      useSimulationStore.getState().setRunning(false);
      publish();
    } else if (measurements.current.clock.stepCount % 12 === 0) publish();
  });
  useFrame(() => {
    const s = measurements.current.snapshot;
    if (apexMarker.current) {
      apexMarker.current.visible = !!s.apex;
      if (s.apex)
        apexMarker.current.position.set(
          s.apex.position[0],
          s.apex.position[1] + PROJECTILE.radius,
          s.apex.position[2],
        );
    }
    if (landingMarker.current) {
      landingMarker.current.visible = !!s.landing;
      if (s.landing)
        landingMarker.current.position.set(
          s.position[0],
          PROJECTILE.radius,
          s.position[2],
        );
    }
  });
  const origin = (): Vector3Tuple => {
    const p = body.current?.translation();
    return p ? [p.x, p.y, p.z] : [0, parameters.height + PROJECTILE.radius, 0];
  };
  const velocity = (): Vector3Tuple => {
    const v = body.current?.linvel();
    return v ? [v.x, v.y, v.z] : launch;
  };
  const markerRadius = Math.max(PROJECTILE.radius * 1.25, view.extent / 180);
  return (
    <>
      <RigidBody
        ref={body}
        position={[0, parameters.height + PROJECTILE.radius, 0]}
        linearVelocity={launch}
        colliders={false}
        ccd
        softCcdPrediction={PROJECTILE.softCcdPrediction}
        linearDamping={0}
        angularDamping={0}
      >
        <BallCollider
          args={[PROJECTILE.radius]}
          mass={parameters.mass}
          friction={0}
          restitution={0}
        />
        <mesh castShadow>
          <sphereGeometry args={[PROJECTILE.radius, 24, 16]} />
          <meshStandardMaterial
            color="#c1e29e"
            metalness={0.15}
            roughness={0.35}
          />
        </mesh>
        <Billboard>
          <mesh>
            <ringGeometry args={[markerRadius * 0.8, markerRadius, 32]} />
            <meshBasicMaterial
              color="#d5edb9"
              transparent
              opacity={0.6}
              depthTest={false}
            />
          </mesh>
        </Billboard>
      </RigidBody>
      <RigidBody
        type="fixed"
        position={[view.groundCenterX, -PROJECTILE.groundThickness / 2, 0]}
        colliders={false}
      >
        <CuboidCollider
          ref={ground}
          args={[
            view.groundSize / 2,
            PROJECTILE.groundThickness / 2,
            view.groundSize / 2,
          ]}
          friction={0}
          restitution={0}
        />
        <mesh receiveShadow>
          <boxGeometry
            args={[
              view.groundSize,
              PROJECTILE.groundThickness,
              view.groundSize,
            ]}
          />
          <meshStandardMaterial color="#222e39" roughness={0.95} />
        </mesh>
      </RigidBody>
      <gridHelper
        args={[
          view.groundSize,
          Math.ceil(view.groundSize / view.gridSpacing),
          '#485762',
          '#33424f',
        ]}
        position={[view.groundCenterX, 0.003, 0]}
      />
      <SceneLabel
        text="Launch"
        position={[
          0,
          parameters.height + PROJECTILE.radius + view.labelSize,
          0,
        ]}
        size={view.labelSize}
      />
      <group ref={apexMarker} visible={false}>
        <mesh>
          <sphereGeometry args={[view.labelSize * 0.09, 12, 8]} />
          <meshBasicMaterial color="#ecc49b" />
        </mesh>
        <SceneLabel
          text="Apex"
          position={[0, view.labelSize * 0.7, 0]}
          size={view.labelSize}
        />
      </group>
      <group ref={landingMarker} visible={false}>
        <SceneLabel
          text="Landing"
          position={[0, view.labelSize, 0]}
          size={view.labelSize}
        />
      </group>
      {layers.prediction && <PredictedTrajectory points={prediction} />}
      {layers.trail && (
        <MeasuredTrajectory
          readPoints={() => measurements.current.trail}
          readVersion={() => measurements.current.trailVersion}
          capacity={PROJECTILE.maxTrailPoints}
          yOffset={PROJECTILE.radius}
        />
      )}
      <VectorArrow3D
        origin={origin}
        vector={velocity}
        label="v"
        unit="m/s"
        category="velocity"
        magnitudeScale={view.vectorScale}
        visible={layers.velocity && !landed}
        labelSize={view.labelSize}
      />
      <VectorArrow3D
        origin={origin}
        vector={() => [velocity()[0], 0, 0]}
        label="vₓ"
        unit="m/s"
        category="component"
        magnitudeScale={view.vectorScale}
        visible={layers.components && !landed}
        labelSize={view.labelSize}
      />
      <VectorArrow3D
        origin={origin}
        vector={() => [0, velocity()[1], 0]}
        label="vᵧ"
        unit="m/s"
        color="#b7a5e4"
        category="component"
        magnitudeScale={view.vectorScale}
        visible={layers.components && !landed}
        labelSize={view.labelSize}
      />
      <VectorArrow3D
        origin={origin}
        vector={[0, -parameters.gravity, 0]}
        label="g"
        unit="m/s²"
        category="acceleration"
        magnitudeScale={view.gravityScale}
        visible={layers.gravity}
        labelSize={view.labelSize}
      />
    </>
  );
}
export function ProjectileScene(props: {
  parameters: ProjectileParameters;
  layers: ProjectileLayers;
}) {
  return (
    <SimulationPhysics gravity={[0, -props.parameters.gravity, 0]}>
      <ProjectileBodies {...props} />
    </SimulationPhysics>
  );
}
