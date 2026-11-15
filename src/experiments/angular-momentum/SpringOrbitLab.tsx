import { useRef } from 'react';
import { Curve, Vector3, type Group } from 'three';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import { Measurement } from '../../components/measurements/Measurement';
import {
  advanceSpring,
  createSpringTrial,
  measureSpring,
  updateSpring,
  type SpringSettings,
  type SpringTrial,
} from '../../physics/equations/springOrbit';
import { formatNumber as f } from '../../physics/units/format';
import { vectorMagnitude } from '../../physics/vectors/vectorMath';
import { useSimulationStore } from '../../store/simulationStore';
import { VectorArrow3D } from '../../three/vectors/VectorArrow3D';
import { SpinDemoViewport } from './SpinDemoViewport';
import { useRotationFrame } from './useRotationFrame';
import { useRotationTrial } from './useRotationTrial';

const PLANE = 0.16;
const CENTER = [0, 0.2, 0] as const;

class SpringHelix extends Curve<Vector3> {
  constructor() {
    super();
  }

  getPoint(t: number, target = new Vector3()) {
    const phase = 2 * Math.PI * 12 * t;
    const fade = Math.min(1, t * 12, (1 - t) * 12);
    return target.set(
      0.05 * Math.cos(phase) * fade,
      0.05 * Math.sin(phase) * fade,
      t,
    );
  }
}
const helix = new SpringHelix();

function SpringScene({
  getTrial,
  advance,
  publish,
  vectors,
  settings,
}: {
  getTrial: () => SpringTrial;
  advance: (elapsed: number) => void;
  publish: () => void;
  vectors: boolean;
  settings: SpringSettings;
}) {
  const puck = useRef<Group>(null);
  const anchor = useRef<Group>(null);
  useRotationFrame(advance, publish, () => {
    const { x, z } = getTrial();
    puck.current?.position.set(x, PLANE, z);
    if (anchor.current) {
      anchor.current.rotation.y = Math.atan2(x, z);
      anchor.current.scale.z = Math.hypot(x, z);
    }
  });
  const puckRadius = 0.09 * Math.cbrt(settings.mass);
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#15242d" roughness={0.8} />
      </mesh>
      <gridHelper
        position={[0, 0.104, 0]}
        args={[12, 24, '#344b57', '#233640']}
      />
      <mesh position={[0, 0.052, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.45, 1.51, 0.1, 72]} />
        <meshStandardMaterial
          color="#354858"
          metalness={0.26}
          roughness={0.5}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.106, 0]}>
        <ringGeometry
          args={[settings.restLength - 0.006, settings.restLength + 0.006, 80]}
        />
        <meshBasicMaterial color="#84a7b6" />
      </mesh>
      <mesh position={[0, 0.142, 0]} castShadow>
        <cylinderGeometry args={[0.061, 0.086, 0.081, 24]} />
        <meshStandardMaterial color="#96a9b5" metalness={0.5} />
      </mesh>
      <group ref={anchor} position={[0, PLANE, 0]} scale={[1, 1, 0.95]}>
        <mesh castShadow>
          <tubeGeometry args={[helix, 144, 0.012, 8, false]} />
          <meshStandardMaterial
            color="#e9b982"
            metalness={0.45}
            roughness={0.4}
          />
        </mesh>
      </group>
      <group ref={puck} position={[0, PLANE, 0.95]}>
        <mesh castShadow>
          <cylinderGeometry args={[puckRadius * 0.91, puckRadius, 0.116, 32]} />
          <meshStandardMaterial
            color="#7bcdbd"
            metalness={0.36}
            roughness={0.43}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.062, 0]}>
          <ringGeometry args={[puckRadius * 0.55, puckRadius * 0.65, 32]} />
          <meshBasicMaterial color="#deeee8" />
        </mesh>
      </group>
      <VectorArrow3D
        visible={vectors}
        origin={() => [getTrial().x, PLANE + 0.075, getTrial().z]}
        vector={() => measureSpring(getTrial()).force}
        magnitudeScale={0.055}
        label="F"
        unit="N"
        category="acceleration"
        labelSize={0.22}
      />
    </>
  );
}

const CONTROLS = [
  {
    key: 'mass',
    label: 'Puck mass',
    unit: 'kg',
    min: 0.5,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'restLength',
    label: 'Spring rest length',
    unit: 'm',
    min: 0.35,
    max: 0.85,
    step: 0.01,
  },
  {
    key: 'stiffness',
    label: 'Spring stiffness',
    unit: 'N/m',
    min: 6,
    max: 22,
    step: 1,
  },
] as const;

export default function SpringOrbitLab() {
  const { reading, getTrial, advance, publish, update, reset } =
    useRotationTrial(createSpringTrial, advanceSpring);
  const running = useSimulationStore((state) => state.running);
  const values = measureSpring(reading);
  const trajectory = reading.settings;
  return (
    <div className="dancer-experiment spin-demo">
      <div className="page-heading">
        <div>
          <h1>Mass on a spring</h1>
          <p>
            Change the spring’s rest length and watch the orbit expand or
            contract.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls"
          aria-label="Spring controls"
        >
          <h2>Spring setup</h2>
          {CONTROLS.map(({ key, label, min, max, step, unit }) => (
            <label className="dancer-mode" key={key} htmlFor={`spring-${key}`}>
              <span className="spin-range-label">
                {label}{' '}
                <output>
                  {f(trajectory[key])} {unit}
                </output>
              </span>
              <input
                id={`spring-${key}`}
                className="spin-range"
                type="range"
                min={min}
                max={max}
                step={step}
                value={trajectory[key]}
                disabled={key === 'mass' && (running || reading.time > 0)}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  update((trial) =>
                    updateSpring(
                      trial,
                      { ...trial.settings, [key]: value },
                      !useSimulationStore.getState().running,
                    ),
                  );
                }}
              />
            </label>
          ))}
          <SimulationControls settingsOnly allowSpeed onReset={reset} />
        </aside>
        <SpinDemoViewport
          title="Orbiter attached to a spring"
          status={running ? 'Orbiting' : reading.time ? 'Paused' : 'Ready'}
          center={CENTER}
          frameWidth={3.35}
          frameHeight={1.85}
          initialView="Top"
          actions={<SimulationRunButton ready startLabel="Start orbit" />}
        >
          {(vectors) => (
            <SpringScene
              getTrial={getTrial}
              advance={advance}
              publish={publish}
              vectors={vectors}
              settings={trajectory}
            />
          )}
        </SpinDemoViewport>
      </div>
      <div className="turntable-readouts" aria-label="Spring measurements">
        <div>
          <Measurement
            label="Spring length"
            value={f(values.radius)}
            unit="m"
            testId="spring-length"
          />
          <p>Rest length {f(trajectory.restLength)} m</p>
        </div>
        <div>
          <Measurement
            label="Spring force"
            value={f(vectorMagnitude(values.force))}
            unit="N"
            testId="spring-force"
          />
          <p>
            {Math.abs(values.radius - trajectory.restLength) < 0.005
              ? 'Near rest length'
              : values.radius > trajectory.restLength
                ? 'Pulling inward'
                : 'Pushing outward'}
          </p>
        </div>
        <div>
          <Measurement
            label="Angular momentum Lᵧ"
            value={f(values.momentum, 3)}
            unit="kg·m²/s"
            testId="spring-momentum"
          />
          <p>Mechanical energy {f(values.energy)} J</p>
        </div>
      </div>
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>
            The ideal spring can pull or push. Its force is radial, so the
            torque about the anchor is zero. The blue ring marks its unstretched
            length.
          </p>
          <p>
            Fᵣ = −k(r − ℓ₀). Changing rest length or stiffness during a run
            changes spring energy by doing work. With both settings fixed,
            kinetic plus spring energy stays nearly constant.
          </p>
        </div>
      </details>
    </div>
  );
}
