import { SimulationControls } from '../../components/controls/SimulationControls';
import { Measurement } from '../../components/measurements/Measurement';
import {
  GYROSCOPE,
  advanceGyroscope,
  createGyroscopeTrial,
  measureGyroscope,
} from '../../physics/equations/gyroscope';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { GyroscopeScene } from './GyroscopeScene';
import { SpinDemoViewport } from './SpinDemoViewport';
import { useRotationTrial } from './useRotationTrial';

const CAMERA_CENTER = [0, 0.98, 0] as const;
const SPIN_OPTIONS = [
  { name: 'Spinning', speed: GYROSCOPE.spinSpeed },
  { name: 'Stopped', speed: 0 },
  { name: 'Reverse spin', speed: -GYROSCOPE.spinSpeed },
];

export function GyroscopeLab() {
  const { reading, getTrial, advance, publish, update, reset } =
    useRotationTrial(createGyroscopeTrial, advanceGyroscope);
  const running = useSimulationStore((state) => state.running);
  const values = measureGyroscope(reading);
  const complete = reading.time === GYROSCOPE.duration;
  const status = complete
    ? 'Lift complete'
    : running
      ? 'Applying torque'
      : reading.time > 0
        ? 'Paused'
        : 'Ready';

  function step(elapsed: number) {
    advance(elapsed);
    if (getTrial().time === GYROSCOPE.duration)
      useSimulationStore.getState().setRunning(false);
  }

  function selectSpin(spinSpeed: number) {
    useSimulationStore.getState().setRunning(false);
    update(() => createGyroscopeTrial(spinSpeed));
  }

  function replay() {
    update(() => createGyroscopeTrial(reading.spinSpeed));
    useSimulationStore.getState().setRunning(true);
  }

  return (
    <div className="dancer-experiment spin-demo">
      <div className="page-heading">
        <div>
          <h1>Bicycle wheel gyroscope</h1>
          <p>
            Try lifting the axle with the wheel spinning, stopped, or spinning
            the other way.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls"
          aria-label="Gyroscope controls"
        >
          <h2>Initial spin</h2>
          <div
            className="walk-direction"
            role="group"
            aria-label="Initial wheel spin"
          >
            {SPIN_OPTIONS.map(({ name, speed }) => (
              <button
                key={name}
                className="secondary-button"
                aria-pressed={reading.spinSpeed === speed}
                onClick={() => selectSpin(speed)}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="physics-caption">
            {f(reading.spinSpeed, 0)} rad/s · Same lifting torque in each trial
          </p>
          <SimulationControls
            ready
            allowSpeed
            startLabel="Try lifting"
            complete={complete}
            onReset={reset}
            onReplay={replay}
          />
        </aside>
        <SpinDemoViewport
          title="Bicycle wheel responding to a lifting torque"
          status={status}
          center={CAMERA_CENTER}
          frameWidth={2.55}
          frameHeight={2.55}
          initialView="Perspective"
        >
          <GyroscopeScene
            getTrial={getTrial}
            advance={step}
            publish={publish}
          />
        </SpinDemoViewport>
      </div>
      <div className="turntable-readouts" aria-label="Gyroscope measurements">
        <div>
          <Measurement
            label="Axle tilt"
            value={f(values.rise, 1)}
            unit="°"
            testId="gyro-rise"
          />
          <p>Positive is up</p>
        </div>
        <div>
          <Measurement
            label="Sideways turn"
            value={f(values.swerve, 1)}
            unit="°"
            testId="gyro-swerve"
          />
          <p>Positive is right from the grip</p>
        </div>
        <div className="turntable-secondary">
          <Measurement
            label="Change in L"
            value={f(values.impulse)}
            unit="kg·m²/s"
            testId="gyro-impulse"
          />
          <p>Along the applied torque</p>
        </div>
      </div>
      <details className="physics-details">
        <summary>Why does it swerve?</summary>
        <div>
          <p>
            The lifting torque adds a sideways change ΔL to the wheel’s initial
            angular momentum. The rapidly spinning axle follows that change with
            a sideways swing. Reversing the spin reverses the sideways response.
          </p>
          <p>
            The model balances the wheel’s weight and applies the same
            one-second torque pulse about the fixed grip. The view freezes at
            the end of the pulse so you can compare the angles.
          </p>
        </div>
      </details>
    </div>
  );
}
