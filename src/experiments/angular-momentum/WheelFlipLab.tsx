import { useState } from 'react';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import { Measurement } from '../../components/measurements/Measurement';
import {
  WHEEL_FLIP,
  DEFAULT_WHEEL_SETUP,
  advanceWheelFlip,
  createWheelFlipTrial,
  measureWheelFlip,
  startWheelFlip,
} from '../../physics/equations/wheelFlip';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { SpinDemoViewport } from './SpinDemoViewport';
import { WheelFlipScene } from './WheelFlipScene';
import { useRotationTrial } from './useRotationTrial';

const CAMERA_CENTER = [0, 1.16, 0] as const;

export default function WheelFlipLab() {
  const [spinSpeed, setSpinSpeed] = useState<number>(
    WHEEL_FLIP.defaultSpinSpeed,
  );
  const [setup, setSetup] = useState(DEFAULT_WHEEL_SETUP);
  const { reading, getTrial, advance, publish, update, reset } =
    useRotationTrial(createWheelFlipTrial, (trial, elapsed) =>
      advanceWheelFlip(trial, elapsed, spinSpeed, setup),
    );
  const running = useSimulationStore((state) => state.running);
  const values = measureWheelFlip(reading, spinSpeed, setup);
  const flipped = reading.tilt === Math.PI;
  const status = reading.motion
    ? running
      ? 'Flipping'
      : 'Flip paused'
    : spinSpeed === 0
      ? 'Wheel stopped'
      : flipped === spinSpeed > 0
        ? 'Wheel spin points down'
        : 'Wheel spin points up';

  function resetTrial() {
    reset();
    setSpinSpeed(WHEEL_FLIP.defaultSpinSpeed);
    setSetup(DEFAULT_WHEEL_SETUP);
  }

  return (
    <div className="dancer-experiment spin-demo">
      <div className="page-heading">
        <div>
          <h1>Spinning bicycle wheel</h1>
          <p>
            Flip the wheel 180° and watch the teacher and platform start
            turning.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls"
          aria-label="Bicycle wheel controls"
        >
          <h2>Wheel controls</h2>
          <label className="spin-range-label" htmlFor="wheel-spin-speed">
            Initial wheel spin <output>{f(spinSpeed, 0)} rad/s</output>
          </label>
          <input
            className="spin-range"
            id="wheel-spin-speed"
            type="range"
            min="-28"
            max="28"
            step="1"
            value={spinSpeed}
            disabled={running || reading.time > 0}
            onChange={(event) => setSpinSpeed(Number(event.target.value))}
          />
          {(
            [
              {
                key: 'rimInertia',
                label: 'Wheel rim inertia',
                min: 0.08,
                max: 0.32,
                step: 0.01,
                digits: 2,
              },
              {
                key: 'supportInertia',
                label: 'Teacher + platform inertia',
                min: 3,
                max: 12,
                step: 0.5,
                digits: 1,
              },
            ] as const
          ).map(({ key, label, min, max, step, digits }) => (
            <label className="dancer-mode" key={key} htmlFor={`wheel-${key}`}>
              <span className="spin-range-label">
                {label} <output>{f(setup[key], digits)} kg·m²</output>
              </span>
              <input
                id={`wheel-${key}`}
                type="range"
                className="spin-range"
                min={min}
                max={max}
                step={step}
                value={setup[key]}
                disabled={running || reading.time > 0}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  setSetup((previous) => ({ ...previous, [key]: value }));
                }}
              />
            </label>
          ))}
          <SimulationControls onReset={resetTrial} allowSpeed settingsOnly />
        </aside>
        <SpinDemoViewport
          title="Teacher flipping a spinning wheel on a turntable"
          status={status}
          center={CAMERA_CENTER}
          frameWidth={2.45}
          frameHeight={2.95}
          initialView="Perspective"
          actions={
            <>
              <SimulationRunButton ready startLabel="Start wheel" />
              <button
                className="secondary-button"
                disabled={!running || reading.motion !== null}
                onClick={() => update(startWheelFlip)}
              >
                {flipped ? 'Flip back' : 'Flip wheel'}
              </button>
            </>
          }
        >
          {(vectorsVisible) => (
            <WheelFlipScene
              getTrial={getTrial}
              advance={advance}
              publish={publish}
              spinSpeed={spinSpeed}
              setup={setup}
              vectorsVisible={vectorsVisible}
            />
          )}
        </SpinDemoViewport>
      </div>
      <div
        className="turntable-readouts"
        aria-label="Vertical angular momentum"
      >
        <div className="turntable-primary">
          <Measurement
            label="Wheel Lᵧ"
            value={f(values.wheelMomentum)}
            unit="kg·m²/s"
            testId="wheel-momentum"
          />
          <p>
            Axle tilt{' '}
            <output data-testid="wheel-tilt">
              {f((reading.tilt * 180) / Math.PI, 0)}°
            </output>
          </p>
        </div>
        <div className="turntable-secondary">
          <Measurement
            label="Teacher + platform Lᵧ"
            value={f(values.supportMomentum)}
            unit="kg·m²/s"
            testId="wheel-support-momentum"
          />
          <p>
            ωᵧ{' '}
            <output data-testid="wheel-support-omega">
              {f(values.supportOmega)}
            </output>{' '}
            rad/s
          </p>
        </div>
        <div>
          <Measurement
            label="Total Lᵧ"
            value={f(values.totalMomentum)}
            unit="kg·m²/s"
            testId="wheel-total"
          />
          <p>Constant through the flip</p>
        </div>
      </div>
      <p className="physics-caption turntable-rule">
        {values.supportOmega > 1e-6
          ? 'Platform turning counterclockwise from above.'
          : values.supportOmega < -1e-6
            ? 'Platform turning clockwise from above.'
            : 'Platform at rest.'}
      </p>
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>
            The bearing exerts no torque around the vertical axis, so total Lᵧ
            stays constant. As the wheel tilts, the teacher and platform gain
            the vertical angular momentum the wheel loses. Flipping back brings
            the platform to rest.
          </p>
          <p>
            The green arrow shows angular momentum from spin about the axle. The
            wheel’s Lᵧ reading also includes motion carried by the turning
            platform. The wheel spins at a fixed speed relative to its axle, and
            the teacher and platform have a combined inertia set before the
            trial. The wheel is modeled as a thin hoop.
          </p>
        </div>
      </details>
    </div>
  );
}
