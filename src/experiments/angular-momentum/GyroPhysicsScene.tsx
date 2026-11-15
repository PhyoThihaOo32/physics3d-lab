import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier';
import { Vector3, type Group } from 'three';
import {
  gyroscopeTimeStep,
  gimbalDimensions,
  type GyroParameters,
  type GyroMode,
  type LiftPulse,
} from '../../physics/equations/gimbalGyroscope';
import { SimulationPhysics } from '../../physics/engine/SimulationPhysics';
import {
  GimbalGyroscope,
  type GyroReading,
} from '../../physics/rotation/gimbalGyroscope';
import { useSimulationStore } from '../../store/simulationStore';
import {
  addVectors,
  scaleVector,
  vectorMagnitude,
} from '../../physics/vectors/vectorMath';
import type { Vector3Tuple } from '../../types/vector';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import type { GyroVectorSettings } from './gyroViews';
import {
  GyroAxle,
  GyroBearingLinks,
  GyroBase,
  GyroPivotStand,
  GyroRing,
  GyroRotor,
  GyroSpinArc,
} from './GyroHardware';

const GRAVITY: [number, number, number] = [0, 0, 0];
const SPIN_AXIS = new Vector3(1, 0, 0);

interface Props {
  parameters: GyroParameters;
  report: (reading: GyroReading) => void;
  vectorsVisible: boolean;
  vectorSettings: GyroVectorSettings;
  rightHand: boolean;
  frameTarget: number;
  mode: GyroMode;
  pulse: LiftPulse | null;
}

function RotorSimulation({
  parameters,
  report,
  vectorsVisible,
  vectorSettings,
  rightHand,
  frameTarget,
  mode,
  pulse,
}: Props) {
  const { world } = useRapier();
  const invalidate = useThree((state) => state.invalidate);
  const model = useRef<GimbalGyroscope | null>(null);
  const rotor = useRef<Group>(null);
  const outer = useRef<Group>(null);
  const middle = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const dimensions = gimbalDimensions(parameters.radius, mode);
  const diagramOrigin: Vector3Tuple = [-0.25, dimensions.height + 0.57, 0.16];
  function diagramVector(
    part: 'initialMomentum' | 'impulse' | 'result',
  ): Vector3Tuple {
    const s = live.current;
    if (!s?.pulseCount) return [0, 0, 0];
    const sum = addVectors(s.initialMomentum, s.impulse);
    const scale =
      0.85 /
      Math.max(
        1,
        vectorMagnitude(s.initialMomentum),
        vectorMagnitude(s.impulse),
        vectorMagnitude(sum),
      );
    return scaleVector(part === 'result' ? sum : s[part], scale);
  }
  const live = useRef<GyroReading | null>(null);
  const forwardArc = useRef<Group>(null);
  const reverseArc = useRef<Group>(null);
  const axis = useRef(new Vector3());
  const steps = useRef(0);
  useEffect(() => {
    const dynamics = new GimbalGyroscope(world, parameters, mode);
    model.current = dynamics;
    steps.current = 0;
    report(dynamics.measure(mode === 'gravity'));
    const unsubscribe = useSimulationStore.subscribe((state, previous) => {
      if (!state.running && previous.running)
        report(dynamics.measure(mode === 'gravity'));
    });
    invalidate();
    return () => {
      unsubscribe();
      model.current = null;
      dynamics.dispose();
    };
  }, [world, parameters, mode, report, invalidate]);
  useBeforePhysicsStep(() => model.current?.beforeStep(frameTarget, pulse));
  useAfterPhysicsStep(() => {
    const dynamics = model.current;
    if (!dynamics) return;
    dynamics.afterStep();
    if (++steps.current % Math.round(0.1 / dynamics.timeStep) === 0)
      report(dynamics.measure(mode === 'gravity'));
  });
  useFrame(() => {
    if (!model.current || !rotor.current) return;
    const reading = model.current.measure();
    rotor.current.position.set(...reading.rotorCenter);
    rotor.current.quaternion.copy(model.current.rotor.rotation());
    outer.current?.quaternion.copy(model.current.outer.rotation());
    if (model.current.middle)
      middle.current?.quaternion.copy(model.current.middle.rotation());
    if (model.current.inner)
      inner.current?.quaternion.copy(model.current.inner.rotation());
    live.current = reading;
    axis.current.set(...reading.axis);
    if (forwardArc.current) {
      forwardArc.current.position.copy(rotor.current.position);
      forwardArc.current.quaternion.setFromUnitVectors(SPIN_AXIS, axis.current);
      forwardArc.current.visible = reading.spin > 1e-5;
    }
    if (reverseArc.current) {
      reverseArc.current.position.copy(rotor.current.position);
      reverseArc.current.quaternion.setFromUnitVectors(SPIN_AXIS, axis.current);
      reverseArc.current.visible = reading.spin < -1e-5;
    }
  }, -0.5);
  return (
    <>
      {mode === 'free' ? (
        <>
          <GyroBase height={dimensions.height - dimensions.outer} />
          <group ref={outer} position={[0, dimensions.height, 0]}>
            <GyroRing
              radius={dimensions.outer}
              tube={0.031}
              color="#79909d"
              plane="xy"
              bearings="y"
            />
            <GyroBearingLinks
              from={dimensions.outer}
              to={dimensions.middle}
              axis="y"
            />
          </group>
          <group ref={middle} position={[0, dimensions.height, 0]}>
            <GyroRing
              radius={dimensions.middle}
              tube={0.022}
              color="#c29969"
              plane="yz"
              bearings="z"
            />
            <GyroBearingLinks
              from={dimensions.middle}
              to={dimensions.inner}
              axis="z"
            />
          </group>
          <group ref={inner} position={[0, dimensions.height, 0]}>
            <GyroRing
              radius={dimensions.inner}
              tube={0.019}
              color="#76b3aa"
              plane="xz"
              bearings="x"
            />
            <GyroAxle length={dimensions.inner * 2 + 0.05} radius={0.021} />
          </group>
        </>
      ) : (
        <GyroPivotStand
          height={dimensions.height}
          offset={dimensions.lever + parameters.radius + 0.22}
          overhead={mode === 'gravity' ? parameters.radius + 0.18 : 0}
        />
      )}
      <group ref={rotor}>
        <GyroRotor radius={parameters.radius} mass={parameters.mass} />
        {mode !== 'free' && (
          <group position={[-dimensions.lever / 2, 0, 0]}>
            <GyroAxle length={dimensions.lever + 0.07} radius={0.019} />
          </group>
        )}
      </group>
      {rightHand && (
        <>
          <group ref={forwardArc} visible={false}>
            <GyroSpinArc radius={parameters.radius * 1.22} direction={1} />
          </group>
          <group ref={reverseArc} visible={false}>
            <GyroSpinArc radius={parameters.radius * 1.22} direction={-1} />
          </group>
        </>
      )}
      <VectorArrow3D
        visible={(vectorsVisible && vectorSettings.momentum) || rightHand}
        origin={() => live.current?.rotorCenter ?? [0, 0, 0]}
        vector={() => {
          const s = live.current;
          return s
            ? scaleVector(
                s.axis,
                s.spinMomentum / (2.4 + Math.abs(s.spinMomentum)),
              )
            : [0, 0, 0];
        }}
        label="Lspin"
        unit="kg·m²/s"
        category="component"
        color="#8ac8eb"
        labelSize={0.22}
      />
      <VectorArrow3D
        visible={(vectorsVisible && vectorSettings.spin) || rightHand}
        origin={() => {
          const [x, y, z] = live.current?.rotorCenter ?? [0, 0, 0];
          return [x, y + 0.06, z];
        }}
        vector={() => {
          const s = live.current;
          return s
            ? scaleVector(s.axis, (0.65 * s.spin) / (55 + Math.abs(s.spin)))
            : [0, 0, 0];
        }}
        label="ωspin"
        unit="rad/s"
        category="velocity"
        labelSize={0.2}
      />
      {mode !== 'free' && (
        <VectorArrow3D
          visible={vectorsVisible && vectorSettings.pivotMomentum}
          origin={[0, dimensions.height, 0]}
          vector={() => {
            const momentum =
              live.current?.totalMomentum ?? ([0, 0, 0] as const);
            return scaleVector(
              momentum,
              0.9 / (2.4 + vectorMagnitude(momentum)),
            );
          }}
          label="Lpivot"
          unit="kg·m²/s"
          category="component"
          color="#cdb5ea"
          labelSize={0.2}
          labelOffset={[0, 0.24, 0]}
        />
      )}
      {mode === 'torque' && (
        <>
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.impulse}
            origin={diagramOrigin}
            vector={() => diagramVector('initialMomentum')}
            label="L₀"
            unit="kg·m²/s"
            category="component"
            color="#aab8c4"
            labelSize={0.2}
            labelOffset={[0.04, -0.08, 0]}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.impulse}
            origin={() =>
              addVectors(diagramOrigin, diagramVector('initialMomentum'))
            }
            vector={() => diagramVector('impulse')}
            label="ΔL"
            unit="kg·m²/s"
            category="component"
            color="#f0ba79"
            labelSize={0.2}
            labelOffset={[0.07, 0, 0]}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.impulse}
            origin={diagramOrigin}
            vector={() =>
              live.current &&
              vectorMagnitude(live.current.initialMomentum) > 1e-6 &&
              vectorMagnitude(live.current.impulse) > 0.06
                ? diagramVector('result')
                : [0, 0, 0]
            }
            label="L₀+ΔL"
            unit="kg·m²/s"
            category="component"
            color="#83d5c1"
            labelSize={0.24}
            labelOffset={[0.1, 0.13, 0]}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.lever}
            origin={[0, dimensions.height, 0]}
            vector={() =>
              live.current?.pulseActive ? live.current.lever : [0, 0, 0]
            }
            label="r"
            unit="m"
            category="component"
            labelSize={0.19}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.force}
            origin={() => [live.current?.lever[0] ?? 0, dimensions.height, 0]}
            vector={() =>
              live.current?.pulseActive ? live.current.force : [0, 0, 0]
            }
            magnitudeScale={0.14}
            label="F"
            unit="N"
            category="acceleration"
            labelSize={0.19}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.torque}
            origin={[0, dimensions.height, 0]}
            vector={() => live.current?.torque ?? [0, 0, 0]}
            magnitudeScale={0.23}
            label="τ"
            unit="N·m"
            category="component"
            color="#e8c185"
            labelSize={0.23}
          />
        </>
      )}
      {mode === 'gravity' && (
        <>
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.precession}
            origin={[-0.15, dimensions.height, 0.12]}
            vector={() => [0, live.current?.precession ?? 0, 0]}
            magnitudeScale={0.22}
            label="Ωₚ"
            unit="rad/s"
            category="velocity"
            color="#f2b6e8"
            labelSize={0.2}
          />

          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.lever}
            origin={[0, dimensions.height, 0]}
            vector={() => live.current?.gravityLever ?? [0, 0, 0]}
            label="r"
            unit="m"
            category="component"
            labelSize={0.2}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.force}
            origin={() => live.current?.rotorCenter ?? [0, 0, 0]}
            vector={() => {
              const force = live.current?.gravityForce ?? ([0, 0, 0] as const);
              return scaleVector(force, 0.7 / (12 + vectorMagnitude(force)));
            }}
            label="mg"
            unit="N"
            category="acceleration"
            labelSize={0.2}
          />
          <VectorArrow3D
            visible={vectorsVisible && vectorSettings.torque}
            origin={[0, dimensions.height, 0]}
            vector={() => {
              const torque = live.current?.torque ?? ([0, 0, 0] as const);
              return scaleVector(torque, 0.65 / (3 + vectorMagnitude(torque)));
            }}
            label="τ"
            unit="N·m"
            category="component"
            color="#e8c185"
            labelSize={0.2}
          />
        </>
      )}
    </>
  );
}

export function GyroPhysicsScene(props: Props) {
  return (
    <SimulationPhysics
      gravity={
        props.mode === 'gravity' ? [0, -props.parameters.gravity, 0] : GRAVITY
      }
      timeStep={gyroscopeTimeStep(props.parameters, props.mode)}
      solverIterations={24}
    >
      <RotorSimulation {...props} />
    </SimulationPhysics>
  );
}
