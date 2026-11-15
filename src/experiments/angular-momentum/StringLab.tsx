import { useRef, useState } from 'react';
import { Shape, Path, type Group } from 'three';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import { Measurement } from '../../components/measurements/Measurement';
import {
  STRING,
  advanceStringTrial,
  createStringTrial,
  measureString,
  predictStringSpeed,
  radialVector,
  startStringPull,
  tangentVector,
  type StringTrial,
} from '../../physics/equations/spinDemos';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { SpinDemoViewport } from './SpinDemoViewport';
import { useRotationFrame } from './useRotationFrame';
import { useRotationTrial } from './useRotationTrial';

const TABLE_TOP = 0.9;
const STRING_HEIGHT = TABLE_TOP + 0.036;
const CAMERA_CENTER = [0, 0.67, 0] as const;
const HALF_TABLE = 1.12;
const table = new Shape()
  .moveTo(-HALF_TABLE, -HALF_TABLE)
  .lineTo(HALF_TABLE, -HALF_TABLE)
  .lineTo(HALF_TABLE, HALF_TABLE)
  .lineTo(-HALF_TABLE, HALF_TABLE)
  .lineTo(-HALF_TABLE, -HALF_TABLE);
const hole = new Path().absarc(0, 0, 0.064, 0, 2 * Math.PI, true);
table.holes.push(hole);
const tableDepth = { depth: 0.1, bevelEnabled: false, curveSegments: 24 };

function StringScene({
  getTrial,
  advance,
  publish,
  targetRadius,
  vectorsVisible,
  puckMass,
}: {
  getTrial: () => StringTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
  targetRadius: number | null;
  vectorsVisible: boolean;
  puckMass: number;
}) {
  const pivot = useRef<Group>(null);
  const puck = useRef<Group>(null);
  const topString = useRef<Group>(null);
  const hangingString = useRef<Group>(null);
  const grip = useRef<Group>(null);
  useRotationFrame(advance, publish, () => {
    const { angle, radius } = getTrial();
    if (pivot.current) pivot.current.rotation.y = angle;
    if (puck.current) puck.current.position.z = radius;
    if (topString.current) topString.current.scale.z = radius;
    const hangingLength = 0.25 + (STRING.initialRadius - radius);
    if (hangingString.current) hangingString.current.scale.y = hangingLength;
    if (grip.current) grip.current.position.y = STRING_HEIGHT - hangingLength;
  });
  return (
    <>
      <gridHelper args={[10, 20, '#344b57', '#233640']} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TABLE_TOP - tableDepth.depth, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[table, tableDepth]} />
        <meshStandardMaterial color="#52636a" roughness={0.78} />
      </mesh>
      {[-0.98, 0.98].flatMap((x) =>
        [-0.98, 0.98].map((z) => (
          <mesh key={`${x},${z}`} position={[x, 0.4, z]} castShadow>
            <boxGeometry args={[0.11, 0.8, 0.11]} />
            <meshStandardMaterial color="#35434b" />
          </mesh>
        )),
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TABLE_TOP + 0.004, 0]}
      >
        <ringGeometry args={[0.064, 0.087, 48]} />
        <meshBasicMaterial color="#d4dbe0" />
      </mesh>
      {(targetRadius === null
        ? [STRING.initialRadius]
        : [STRING.initialRadius, targetRadius]
      ).map((radius) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, TABLE_TOP + 0.003, 0]}
        >
          <ringGeometry args={[radius - 0.005, radius + 0.005, 80]} />
          <meshBasicMaterial
            color={radius === targetRadius ? '#f1b57b' : '#81939b'}
            transparent
            opacity={radius === targetRadius ? 0.9 : 0.65}
          />
        </mesh>
      ))}
      <group ref={pivot} position={[0, STRING_HEIGHT, 0]}>
        <group ref={topString} scale={[1, 1, STRING.initialRadius]}>
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 1, 12]} />
            <meshBasicMaterial color="#ecdfb4" />
          </mesh>
        </group>
        <group
          ref={puck}
          position={[0, 0.005, STRING.initialRadius]}
          scale={[Math.cbrt(puckMass), 1, Math.cbrt(puckMass)]}
        >
          <mesh castShadow>
            <cylinderGeometry args={[0.092, 0.101, 0.076, 32]} />
            <meshStandardMaterial
              color="#d58961"
              metalness={0.19}
              roughness={0.43}
            />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.056, 0.056, 0.006, 32]} />
            <meshBasicMaterial color="#f4cc9a" />
          </mesh>
        </group>
      </group>
      <group ref={hangingString} position={[0, STRING_HEIGHT, 0]}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 1, 12]} />
          <meshBasicMaterial color="#ecdfb4" />
        </mesh>
      </group>
      <group ref={grip}>
        <mesh castShadow>
          <cylinderGeometry args={[0.043, 0.048, 0.07, 16]} />
          <meshStandardMaterial color="#c29652" />
        </mesh>
      </group>
      <VectorArrow3D
        visible={vectorsVisible}
        origin={() => {
          const [x, , z] = radialVector(getTrial().angle, getTrial().radius);
          return [x, STRING_HEIGHT + 0.06, z];
        }}
        vector={() =>
          tangentVector(
            getTrial().angle,
            measureString(getTrial()).tangentialSpeed,
          )
        }
        magnitudeScale={0.12}
        label="vₜ"
        unit="m/s"
        category="velocity"
        labelSize={0.23}
      />
      <VectorArrow3D
        visible={vectorsVisible}
        origin={() => {
          const [x, , z] = radialVector(getTrial().angle, getTrial().radius);
          return [x, STRING_HEIGHT + 0.11, z];
        }}
        vector={() => {
          const trial = getTrial();
          const { tension } = measureString(trial);
          return radialVector(
            trial.angle,
            (-0.55 * tension) / (25 + Math.abs(tension)),
          );
        }}
        label="T"
        unit="N"
        category="acceleration"
        labelSize={0.23}
      />
    </>
  );
}

export default function StringLab() {
  const { reading, getTrial, advance, publish, update, reset } =
    useRotationTrial(createStringTrial, advanceStringTrial);
  const [target, setTarget] = useState(String(STRING.exampleTarget));
  const running = useSimulationStore((state) => state.running);
  const radius = Number(target);
  const canPull =
    Number.isFinite(radius) &&
    radius >= STRING.minRadius &&
    radius < reading.radius;
  const values = measureString(reading);
  const status = running
    ? reading.pull
      ? 'Pulling string'
      : 'Circling'
    : reading.time
      ? reading.pull
        ? 'Pull paused'
        : 'Paused'
      : 'Ready to spin';
  function resetTrial() {
    reset();
    setTarget(String(STRING.exampleTarget));
  }
  return (
    <div className="dancer-experiment spin-demo">
      <div className="page-heading">
        <div>
          <h1>Mass on a string</h1>
          <p>
            Start the puck, then pull the string to see how radius changes its
            speed.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls"
          aria-label="String controls"
        >
          <h2>String</h2>
          <div className="parameter-field">
            <label htmlFor="string-target">Target radius</label>
            <div className="number-field">
              <input
                id="string-target"
                type="number"
                min={STRING.minRadius}
                max={STRING.initialRadius}
                step="0.01"
                value={target}
                aria-describedby="string-target-hint"
                onChange={(event) => setTarget(event.target.value)}
                disabled={!!reading.pull}
              />
              <span>m</span>
            </div>
            <small id="string-target-hint">
              {canPull
                ? `Expected vₜ at target ${f(predictStringSpeed(radius, reading.initialSpeed))} m/s`
                : Math.abs(radius - reading.radius) < 1e-8
                  ? 'At target. Enter a smaller radius to pull again.'
                  : `Enter ${f(STRING.minRadius)} m or more, below the current radius.`}
            </small>
          </div>
          <label className="dancer-mode">
            <span className="spin-range-label">
              Puck mass <output>{f(reading.mass)} kg</output>
            </span>
            <input
              className="spin-range"
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={reading.mass}
              disabled={running || reading.time > 0}
              onChange={(event) => {
                const mass = event.target.valueAsNumber;
                update((trial) => createStringTrial(mass, trial.initialSpeed));
              }}
            />
          </label>
          <label className="dancer-mode">
            <span className="spin-range-label">
              Launch speed <output>{f(reading.initialSpeed, 1)} m/s</output>
            </span>
            <input
              className="spin-range"
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              value={reading.initialSpeed}
              disabled={running || reading.time > 0}
              onChange={(event) => {
                const speed = event.target.valueAsNumber;
                update((trial) => createStringTrial(trial.mass, speed));
              }}
            />
          </label>
          <SimulationControls onReset={resetTrial} allowSpeed settingsOnly />
        </aside>
        <SpinDemoViewport
          title="Puck on a frictionless tabletop"
          status={status}
          center={CAMERA_CENTER}
          frameHeight={1.6}
          frameWidth={2.55}
          initialView="Top"
          actions={
            <>
              <SimulationRunButton ready startLabel="Start spin" />
              <button
                className="secondary-button"
                disabled={!running || !!reading.pull || !canPull}
                onClick={() =>
                  update((previous) => startStringPull(previous, radius))
                }
              >
                Pull string
              </button>
            </>
          }
        >
          {(vectorsVisible) => (
            <StringScene
              getTrial={getTrial}
              advance={advance}
              publish={publish}
              vectorsVisible={vectorsVisible}
              puckMass={reading.mass}
              targetRadius={
                radius >= STRING.minRadius && radius < STRING.initialRadius
                  ? radius
                  : null
              }
            />
          )}
        </SpinDemoViewport>
      </div>
      <div
        className="measurements dancer-measurements robot-measurements"
        aria-label="String measurements"
      >
        <Measurement
          label="Radius r"
          value={f(reading.radius)}
          unit="m"
          testId="string-radius"
        />
        <Measurement
          label="Tangential speed vₜ"
          value={f(values.tangentialSpeed)}
          unit="m/s"
          testId="string-speed"
        />
        <Measurement
          label="Angular velocity ωᵧ"
          value={f(values.omega)}
          unit="rad/s"
          testId="string-omega"
        />
        <Measurement
          label="Angular momentum Lᵧ"
          value={f(values.momentum, 3)}
          unit="kg·m²/s"
          testId="string-momentum"
        />
        <Measurement
          label="String tension T"
          value={f(values.tension)}
          unit="N"
          testId="string-tension"
        />
      </div>
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>Use Front view to see the string below the table.</p>
          <p>
            Tension points toward the hole, so its torque about the hole is
            zero. For this puck, Lᵧ = mr vₜ = {f(values.momentum)} kg·m²/s.
          </p>
          <p>
            T = m(rω² − r̈). The string does work as it shortens. Kinetic energy
            is {f(values.energy)} J and includes radial motion during the pull.
          </p>
        </div>
      </details>
    </div>
  );
}
