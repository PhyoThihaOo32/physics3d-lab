import { useCallback, useEffect, useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import {
  DEFAULT_GYRO,
  DEFAULT_LIFT,
  gimbalDimensions,
  type GyroMode,
  type GyroParameters,
  type LiftPulse,
} from '../../physics/equations/gimbalGyroscope';
import type { GyroReading } from '../../physics/rotation/gimbalGyroscope';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { GyroAxes } from './GyroHardware';
import { GyroPhysicsScene } from './GyroPhysicsScene';
import { GyroEquations, GyroReadouts } from './GyroReadouts';
import { GyroLayerControls, GyroLiftControls, GyroSetup } from './GyroSetup';
import { DEFAULT_GYRO_VECTORS } from './gyroViews';
import { RotationStage } from './RotationStage';
import { SpinDemoViewport } from './SpinDemoViewport';
import './gyroscope.css';

const LAB_MODES: {
  id: GyroMode;
  label: string;
  scene: string;
  prompt: string;
}[] = [
  {
    id: 'free',
    label: 'Free gyroscope',
    scene: 'Gimbal and rotor assembly',
    prompt: 'Rotate the frame and watch the axle in the lab frame.',
  },
  {
    id: 'torque',
    label: 'Applied torque',
    scene: 'Pivoted rotor with applied torque',
    prompt:
      'Apply the same lift with the rotor stopped, spinning, or reversed.',
  },
  {
    id: 'gravity',
    label: 'Gravity precession',
    scene: 'Gravity precession about a pivot',
    prompt: 'Change the spin or gravity and compare the axle’s turn rate.',
  },
];

function trialStatus(reading: GyroReading | null, running: boolean) {
  if (!reading) return 'Preparing';
  if (reading.pulseActive) return running ? 'Applying torque' : 'Lift paused';
  if (running) return reading.pulseResult ? 'Lift complete' : 'Running';
  return reading.time > 0 ? 'Paused' : 'Ready';
}

export function GyroscopeLab() {
  const [mode, setMode] = useState<GyroMode>('free');
  const [parameters, setParameters] = useState(DEFAULT_GYRO);
  const [reading, setReading] = useState<GyroReading | null>(null);
  const [second, setSecond] = useState<GyroReading | null>(null);
  const [run, setRun] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [rightHand, setRightHand] = useState(false);
  const [geometry, setGeometry] = useState(true);
  const [vectors, setVectors] = useState(DEFAULT_GYRO_VECTORS);
  const [frameTarget, setFrameTarget] = useState(0);
  const [lift, setLift] = useState(DEFAULT_LIFT);
  const [pulse, setPulse] = useState<LiftPulse | null>(null);
  const running = useSimulationStore((state) => state.running);
  const gravityMode = mode === 'gravity';
  const { height, outer, lever } = gimbalDimensions(parameters.radius, mode);
  const center = useMemo(() => [0, height * 0.7, 0] as const, [height]);
  const primaryParameters = useMemo(
    () => (comparing ? { ...parameters, spin: 5 } : parameters),
    [comparing, parameters],
  );
  const secondaryParameters = useMemo(
    () => ({ ...parameters, spin: 50 }),
    [parameters],
  );
  const configuration =
    LAB_MODES.find((option) => option.id === mode) ?? LAB_MODES[0];

  const report = useCallback((next: GyroReading) => {
    setReading(next);
    useSimulationStore.getState().reportTime(next.time);
  }, []);
  const reportSecond = useCallback((next: GyroReading) => {
    setSecond(next);
  }, []);
  useEffect(() => () => useSimulationStore.getState().reset(), []);

  function startNewTrial(
    nextMode: GyroMode,
    nextParameters: GyroParameters,
    compare: boolean,
  ) {
    const simulation = useSimulationStore.getState();
    simulation.setRunning(false);
    simulation.reportTime(0);
    setMode(nextMode);
    setParameters(nextParameters);
    setComparing(compare);
    setReading(null);
    setSecond(null);
    setFrameTarget(0);
    setPulse(null);
    setRun((previous) => previous + 1);
  }

  function restoreDefaults() {
    startNewTrial(mode, DEFAULT_GYRO, false);
    setLift(DEFAULT_LIFT);
    useSimulationStore.getState().setPlaybackSpeed(1);
  }

  function applyLift() {
    setPulse((previous) => ({ ...lift, id: (previous?.id ?? 0) + 1 }));
    useSimulationStore.getState().setRunning(true);
  }

  const ready = reading !== null && (!comparing || second !== null);
  const pulsePending = (sample: GyroReading | null) =>
    pulse !== null &&
    (!sample || sample.pulseActive || sample.pulseCount < pulse.id);
  const applying = pulsePending(reading) || (comparing && pulsePending(second));
  const views = [
    {
      title: comparing ? 'Slow rotor · 5 rad/s' : configuration.scene,
      reading,
      report,
      parameters: primaryParameters,
    },
    ...(comparing
      ? [
          {
            title: 'Fast rotor · 50 rad/s',
            reading: second,
            report: reportSecond,
            parameters: secondaryParameters,
          },
        ]
      : []),
  ];
  const appliedGravity = gravityMode ? parameters.gravity : 0;

  return (
    <div className="dancer-experiment spin-demo gyro-lab">
      <div className="page-heading">
        <div>
          <h1>3D Gyroscope and Angular Momentum Lab</h1>
          <p>
            {comparing
              ? 'Apply one lift and compare the axle change at 5 and 50 rad/s.'
              : configuration.prompt}
          </p>
        </div>
      </div>

      <div
        className="gyro-choices gyro-mode-row"
        role="group"
        aria-label="Gyroscope mode"
      >
        {LAB_MODES.map((option) => (
          <button
            key={option.id}
            className="secondary-button"
            aria-pressed={!comparing && mode === option.id}
            onClick={() => startNewTrial(option.id, parameters, false)}
          >
            {option.label}
          </button>
        ))}
        <button
          className="secondary-button"
          aria-pressed={comparing}
          onClick={() =>
            startNewTrial('torque', { ...parameters, friction: 0 }, true)
          }
        >
          Compare slow and fast
        </button>
      </div>

      <div className="workspace">
        <aside
          className="setup-panel spin-demo-controls gyro-setup"
          aria-label="Gyroscope controls"
        >
          <GyroSetup
            key={run}
            mode={mode}
            parameters={parameters}
            comparing={comparing}
            onApply={(next) => startNewTrial(mode, next, comparing)}
            onSpin={(spin) =>
              startNewTrial(mode, { ...parameters, spin }, false)
            }
            onGravity={(gravity) =>
              startNewTrial('gravity', { ...parameters, gravity }, false)
            }
          />
          {mode === 'free' && (
            <label className="gyro-lift-controls" htmlFor="gyro-frame">
              <span className="spin-range-label">
                Frame rotation{' '}
                <output>{f(reading?.frameAngle ?? null, 0)}°</output>
              </span>
              <input
                id="gyro-frame"
                className="spin-range"
                type="range"
                min="-75"
                max="75"
                step="1"
                value={frameTarget}
                onChange={(event) => setFrameTarget(Number(event.target.value))}
              />
            </label>
          )}
          {mode === 'torque' && (
            <GyroLiftControls
              lift={lift}
              onChange={setLift}
              disabled={applying}
            />
          )}
          <SimulationControls
            settingsOnly
            allowSpeed
            onReset={restoreDefaults}
          />
        </aside>

        <div
          className={
            comparing ? 'gyro-view-grid gyro-compare' : 'gyro-view-grid'
          }
        >
          {views.map((view, index) => (
            <section
              key={index}
              aria-label={comparing ? view.title : undefined}
              className="gyro-view"
            >
              {comparing && <h2>{view.title}</h2>}
              <SpinDemoViewport
                title={comparing ? `${view.title} scene` : view.title}
                status={trialStatus(view.reading, running)}
                center={center}
                frameWidth={
                  mode === 'free'
                    ? 2 * outer + 0.47
                    : parameters.radius * 2 + lever * 2 + 0.74
                }
                frameHeight={
                  height + (mode === 'free' ? outer : parameters.radius) + 0.34
                }
                initialView="Perspective"
                spinAxisView={{
                  center: view.reading?.rotorCenter ?? [0, height, 0],
                  direction: view.reading?.axis ?? [1, 0, 0],
                }}
                actions={
                  index === 0 ? (
                    <>
                      <SimulationRunButton
                        ready={ready}
                        startLabel="Start rotor"
                      />
                      {mode === 'torque' && (
                        <button
                          className="secondary-button"
                          disabled={!ready || applying}
                          onClick={applyLift}
                        >
                          Apply lift
                        </button>
                      )}
                      {!comparing && (
                        <button
                          className="secondary-button"
                          disabled={parameters.spin === 0}
                          onClick={() =>
                            startNewTrial(
                              mode,
                              { ...parameters, spin: -parameters.spin },
                              false,
                            )
                          }
                        >
                          Reverse spin
                        </button>
                      )}
                      <button
                        className="secondary-button"
                        aria-pressed={rightHand}
                        onClick={() => setRightHand((value) => !value)}
                      >
                        Right-hand rule
                      </button>
                    </>
                  ) : null
                }
              >
                {(vectorsVisible) => (
                  <>
                    <RotationStage />
                    <GyroPhysicsScene
                      key={`${run}-${index}`}
                      mode={mode}
                      parameters={view.parameters}
                      pulse={pulse}
                      frameTarget={(frameTarget * Math.PI) / 180}
                      report={view.report}
                      vectorsVisible={vectorsVisible}
                      vectorSettings={vectors}
                      rightHand={rightHand}
                    />
                    {geometry && <GyroAxes origin={[-0.67, 0.13, 0.54]} />}
                    {gravityMode &&
                      vectorsVisible &&
                      vectors.trail &&
                      view.reading &&
                      view.reading.axisTrail.length > 1 && (
                        <Line
                          points={view.reading.axisTrail}
                          color="#f2b6e8"
                          lineWidth={1.3}
                          transparent
                          opacity={0.72}
                        />
                      )}
                  </>
                )}
              </SpinDemoViewport>
              <GyroReadouts
                mode={mode}
                parameters={view.parameters}
                reading={view.reading}
                comparing={index === 1}
              />
            </section>
          ))}
          <p className="physics-caption gyro-applied">
            Applied setup · M {f(parameters.mass)} kg · R {f(parameters.radius)}{' '}
            m · g {f(appliedGravity)} m/s²
          </p>
        </div>
      </div>

      <GyroLayerControls
        mode={mode}
        vectors={vectors}
        onVectors={setVectors}
        geometry={geometry}
        onGeometry={setGeometry}
      />
      <GyroEquations
        mode={mode}
        parameters={primaryParameters}
        reading={reading}
        lift={lift}
      />
    </div>
  );
}
