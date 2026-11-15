import { useRef, useState } from 'react';
import type { Group } from 'three';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import { Measurement } from '../../components/measurements/Measurement';
import {
  TURNTABLE,
  advanceTurntableTrial,
  createTurntableTrial,
  measureTurntable,
  radialVector,
  type TurntableTrial,
} from '../../physics/equations/spinDemos';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { RotationStage } from './RotationStage';
import { SpinDemoViewport } from './SpinDemoViewport';
import { useRotationFrame } from './useRotationFrame';
import { useRotationTrial } from './useRotationTrial';

const DECK_TOP = 0.31;
const CAMERA_CENTER = [0, 0.67, 0] as const;
const PERSON_COLOR = '#83d5c1';
const PLATFORM_COLOR = '#f1b57b';
const MOMENTUM_SCALE = 0.0065;

function TurntableScene({
  getTrial,
  advance,
  publish,
  inertia,
  mass,
  trackRadius,
  walkDirection,
  vectorsVisible,
}: {
  getTrial: () => TurntableTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
  inertia: number;
  mass: number;
  trackRadius: number;
  walkDirection: 1 | -1;
  vectorsVisible: boolean;
}) {
  const disk = useRef<Group>(null);
  const deckThickness = 0.12 + 0.04 * Math.log2(inertia / 120);
  const walker = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const facing = useRef(Math.PI / 2);
  const previousTime = useRef(0);
  useRotationFrame(advance, publish, () => {
    const trial = getTrial();
    const direction =
      Math.abs(trial.relativeOmega) > 1e-6
        ? Math.sign(trial.relativeOmega)
        : walkDirection;
    const targetFacing = (direction * Math.PI) / 2;
    const elapsed = trial.time - previousTime.current;
    if (trial.time === 0) {
      facing.current = targetFacing;
    } else {
      const maxTurn = Math.max(0, elapsed) * 6;
      facing.current += Math.max(
        -maxTurn,
        Math.min(maxTurn, targetFacing - facing.current),
      );
    }
    previousTime.current = trial.time;
    if (disk.current) disk.current.rotation.y = trial.platformAngle;
    if (walker.current) {
      const [x, , z] = radialVector(trial.personAngle, trackRadius);
      walker.current.position.set(x, DECK_TOP, z);
      walker.current.rotation.y = trial.personAngle + facing.current;
    }
    const stride =
      Math.sin((trial.personAngle - trial.platformAngle) * 12) *
      Math.min(0.38, Math.abs(trial.relativeOmega) * 0.18);
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.7;
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.7;
  });
  return (
    <>
      <RotationStage />
      <mesh position={[0, 0.105, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.42, 0.22, 48]} />
        <meshStandardMaterial color="#515e65" metalness={0.3} />
      </mesh>
      <group ref={disk}>
        <mesh
          position={[0, DECK_TOP - deckThickness / 2, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[1.29, 1.29, deckThickness, 72]} />
          <meshStandardMaterial
            color="#40515e"
            metalness={0.24}
            roughness={0.5}
          />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, DECK_TOP + 0.003, 0]}
        >
          <ringGeometry args={[trackRadius - 0.007, trackRadius + 0.007, 80]} />
          <meshBasicMaterial color="#99aaad" />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <group key={index} rotation={[0, (index * Math.PI) / 4, 0]}>
            <mesh position={[0, DECK_TOP + 0.005, index === 0 ? 0.69 : 1.16]}>
              <boxGeometry
                args={index === 0 ? [0.042, 0.009, 1.15] : [0.025, 0.009, 0.18]}
              />
              <meshBasicMaterial
                color={index === 0 ? PLATFORM_COLOR : '#8899a1'}
              />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 1, 10]} />
        <meshBasicMaterial color="#a5b3bd" transparent opacity={0.55} />
      </mesh>
      <group
        ref={walker}
        position={[0, DECK_TOP, trackRadius]}
        scale={Math.cbrt(mass / TURNTABLE.personMass)}
      >
        <mesh position={[0, 0.59, 0]} scale={[1.12, 1, 0.72]} castShadow>
          <capsuleGeometry args={[0.125, 0.2, 8, 18]} />
          <meshStandardMaterial color={PERSON_COLOR} />
        </mesh>
        <mesh position={[0, 0.795, 0.012]}>
          <cylinderGeometry args={[0.044, 0.051, 0.1, 16]} />
          <meshStandardMaterial color="#c29d83" />
        </mesh>
        <mesh position={[0, 0.895, 0.017]} castShadow>
          <sphereGeometry args={[0.116, 18, 12]} />
          <meshStandardMaterial color="#c29d83" />
        </mesh>
        <mesh position={[0, 0.946, -0.015]}>
          <sphereGeometry
            args={[0.105, 18, 14, 0, 2 * Math.PI, 0, Math.PI * 0.64]}
          />
          <meshStandardMaterial color="#393234" />
        </mesh>
        <mesh position={[0, 0.9, 0.126]} scale={[0.77, 1, 1]}>
          <sphereGeometry args={[0.023, 12, 10]} />
          <meshStandardMaterial color="#c29d83" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <group
              ref={side === -1 ? leftLeg : rightLeg}
              position={[side * 0.069, 0.43, 0]}
            >
              <mesh position={[0, -0.193, 0]} castShadow>
                <capsuleGeometry args={[0.053, 0.295, 4, 10]} />
                <meshStandardMaterial color="#435465" />
              </mesh>
              <mesh position={[0, -0.4, 0.039]}>
                <boxGeometry args={[0.11, 0.057, 0.19]} />
                <meshStandardMaterial color="#dee4e8" />
              </mesh>
            </group>
            <group
              ref={side === -1 ? leftArm : rightArm}
              position={[side * 0.149, 0.666, 0]}
            >
              <mesh position={[0, -0.114, 0]} castShadow>
                <capsuleGeometry args={[0.037, 0.19, 4, 10]} />
                <meshStandardMaterial color="#c29d83" />
              </mesh>
              <mesh position={[0, -0.036, 0]} castShadow>
                <capsuleGeometry args={[0.047, 0.055, 5, 12]} />
                <meshStandardMaterial color={PERSON_COLOR} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
      <VectorArrow3D
        visible={vectorsVisible}
        origin={[0, DECK_TOP + 0.023, 0]}
        vector={() => radialVector(getTrial().personAngle, trackRadius)}
        label="r"
        unit="m"
        category="component"
        labelSize={0.24}
      />
      <VectorArrow3D
        visible={vectorsVisible}
        origin={() => {
          const [x, , z] = radialVector(getTrial().personAngle, trackRadius);
          return [x, DECK_TOP + 0.08, z];
        }}
        vector={() =>
          measureTurntable(getTrial(), inertia, mass, trackRadius).velocity
        }
        magnitudeScale={0.42}
        label="v"
        unit="m/s"
        category="velocity"
        labelSize={0.24}
      />
      <VectorArrow3D
        visible={vectorsVisible}
        origin={[-0.44, 1.22, 0]}
        vector={() => [
          0,
          measureTurntable(getTrial(), inertia, mass, trackRadius)
            .personMomentum,
          0,
        ]}
        magnitudeScale={MOMENTUM_SCALE}
        label="L person"
        unit="kg·m²/s"
        category="component"
        color={PERSON_COLOR}
        labelSize={0.4}
      />
      <VectorArrow3D
        visible={vectorsVisible}
        origin={[0.44, 1.22, 0]}
        vector={() => [
          0,
          measureTurntable(getTrial(), inertia, mass, trackRadius)
            .platformMomentum,
          0,
        ]}
        magnitudeScale={MOMENTUM_SCALE}
        label="L disk"
        unit="kg·m²/s"
        category="component"
        color={PLATFORM_COLOR}
        labelSize={0.4}
      />
    </>
  );
}

function direction(value: number) {
  return value > 1e-6 ? '↑ Up' : value < -1e-6 ? '↓ Down' : 'No direction';
}

export default function TurntableLab() {
  const [walkDirection, setWalkDirection] = useState<1 | -1>(1);
  const [speed, setSpeed] = useState<number>(TURNTABLE.defaultSpeed);
  const [mass, setMass] = useState<number>(TURNTABLE.personMass);
  const [trackRadius, setTrackRadius] = useState<number>(TURNTABLE.radius);
  const [inertia, setInertia] = useState<number>(TURNTABLE.defaultInertia);
  const { reading, getTrial, advance, publish, reset } = useRotationTrial(
    createTurntableTrial,
    (trial, elapsed) =>
      advanceTurntableTrial(
        trial,
        elapsed,
        walkDirection * speed,
        inertia,
        mass,
        trackRadius,
      ),
  );
  const running = useSimulationStore((state) => state.running);
  const setupLocked = running || reading.time > 0;
  const values = measureTurntable(reading, inertia, mass, trackRadius);
  function resetTrial() {
    reset();
    setWalkDirection(1);
    setSpeed(TURNTABLE.defaultSpeed);
    setInertia(TURNTABLE.defaultInertia);
    setMass(TURNTABLE.personMass);
    setTrackRadius(TURNTABLE.radius);
  }
  return (
    <div className="dancer-experiment spin-demo">
      <div className="page-heading">
        <div>
          <h1>Person on a turntable</h1>
          <p>
            Walk around the rim. Reverse direction and watch both angular
            momentum arrows flip.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls"
          aria-label="Turntable controls"
        >
          <h2>Walking controls</h2>
          <div
            className="walk-direction"
            role="group"
            aria-label="Walking direction"
          >
            <button
              className="secondary-button"
              aria-pressed={walkDirection === 1}
              onClick={() => setWalkDirection(1)}
            >
              Counterclockwise
            </button>
            <button
              className="secondary-button"
              aria-pressed={walkDirection === -1}
              onClick={() => setWalkDirection(-1)}
            >
              Clockwise
            </button>
          </div>
          <label className="spin-range-label" htmlFor="walk-speed">
            Walking speed <output>{f(speed, 1)} m/s</output>
          </label>
          <input
            id="walk-speed"
            className="spin-range"
            type="range"
            min="0"
            max="2.4"
            step="0.1"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <p className="physics-caption">
            Relative to the platform · now{' '}
            {f(Math.abs(reading.relativeOmega) * trackRadius, 1)} m/s
          </p>
          <label className="dancer-mode" htmlFor="turntable-mass">
            <span className="spin-range-label">
              Walker mass <output>{f(mass, 0)} kg</output>
            </span>
            <input
              id="turntable-mass"
              type="range"
              className="spin-range"
              min="35"
              max="100"
              step="1"
              value={mass}
              disabled={setupLocked}
              onChange={(event) => setMass(event.target.valueAsNumber)}
            />
          </label>
          <label className="dancer-mode" htmlFor="turntable-radius">
            <span className="spin-range-label">
              Walking radius <output>{f(trackRadius)} m</output>
            </span>
            <input
              id="turntable-radius"
              type="range"
              className="spin-range"
              min="0.5"
              max="1.08"
              step="0.01"
              value={trackRadius}
              disabled={setupLocked}
              onChange={(event) => setTrackRadius(event.target.valueAsNumber)}
            />
          </label>
          <label className="dancer-mode">
            Platform inertia (kg·m²)
            <select
              value={inertia}
              disabled={setupLocked}
              onChange={(event) => setInertia(Number(event.target.value))}
            >
              <option value="60">60 · Light</option>
              <option value="120">120 · Medium</option>
              <option value="240">240 · Heavy</option>
            </select>
          </label>
          <SimulationControls onReset={resetTrial} allowSpeed settingsOnly />
        </aside>
        <SpinDemoViewport
          title="Counter-rotating person and platform"
          status={running ? 'Running' : reading.time ? 'Paused' : 'At rest'}
          center={CAMERA_CENTER}
          frameHeight={2.65}
          frameWidth={2.85}
          initialView="Perspective"
          actions={<SimulationRunButton ready startLabel="Start walking" />}
        >
          {(vectorsVisible) => (
            <TurntableScene
              getTrial={getTrial}
              advance={advance}
              publish={publish}
              inertia={inertia}
              mass={mass}
              trackRadius={trackRadius}
              walkDirection={walkDirection}
              vectorsVisible={vectorsVisible}
            />
          )}
        </SpinDemoViewport>
      </div>
      <div
        className="turntable-readouts"
        aria-label="Turntable angular momentum"
      >
        <div className="turntable-primary">
          <Measurement
            label="Person Lᵧ"
            value={f(values.personMomentum)}
            unit="kg·m²/s"
            testId="person-momentum"
          />
          <p data-testid="person-direction">
            {direction(values.personMomentum)}
          </p>
          <p>
            ωᵧ{' '}
            <output data-testid="person-omega">{f(values.personOmega)}</output>{' '}
            rad/s
          </p>
        </div>
        <div className="turntable-secondary">
          <Measurement
            label="Platform Lᵧ"
            value={f(values.platformMomentum)}
            unit="kg·m²/s"
            testId="platform-momentum"
          />
          <p data-testid="platform-direction">
            {direction(values.platformMomentum)}
          </p>
          <p>
            ωᵧ{' '}
            <output data-testid="platform-omega">
              {f(values.platformOmega)}
            </output>{' '}
            rad/s
          </p>
        </div>
        <div>
          <Measurement
            label="Total Lᵧ"
            value={f(values.totalMomentum)}
            unit="kg·m²/s"
            testId="turntable-total"
          />
          <p>Person + platform</p>
        </div>
      </div>
      <p className="physics-caption turntable-rule">
        Right-hand rule: Viewed from above, counterclockwise points up (+y).
      </p>
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>
            Curl right-hand fingers from r toward the lab-frame velocity v. The
            thumb points along r × mv.
          </p>
          <p>
            The person is modeled as a {f(mass, 0)} kg point mass on a{' '}
            {f(trackRadius)} m track. Foot traction transfers angular momentum
            between the person and the platform. With an ideal bearing, their
            angular momenta sum to zero.
          </p>
        </div>
      </details>
    </div>
  );
}
