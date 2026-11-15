import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SimulationControls,
  SimulationRunButton,
} from '../../components/controls/SimulationControls';
import { TimeSeriesChart } from '../../components/graphs/TimeSeriesChart';
import { Measurement } from '../../components/measurements/Measurement';
import {
  ROBOT,
  advanceRobotTrial,
  createRobotTrial,
  releaseRobotLoad,
  robotInertia,
  robotOmega,
  setRobotRadius,
} from '../../physics/equations/robotRotation';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { RobotScene } from './RobotScene';
import { SpinDemoViewport } from './SpinDemoViewport';
import './robot.css';

const CENTER = [0, 1.31, 0] as const;
const initialTrace = (speed: number = ROBOT.initialOmega) => [
  { time: 0, value: speed },
];

export default function RobotLab() {
  const trial = useRef(createRobotTrial());
  const [reading, setReading] = useState(createRobotTrial);
  const [points, setPoints] = useState(initialTrace);
  const [mass, setMass] = useState('2');
  const [dropHeight, setDropHeight] = useState<number>(ROBOT.dropHeight);
  const running = useSimulationStore((state) => state.running);
  const getTrial = useCallback(() => trial.current, []);
  const publish = useCallback(() => {
    setReading(trial.current);
    useSimulationStore.getState().reportTime(trial.current.time);
  }, []);
  const advance = useCallback(
    (elapsed: number) => {
      const previous = trial.current;
      const next = advanceRobotTrial(previous, elapsed);
      trial.current = next;
      const caught =
        next.captures.length !== previous.captures.length
          ? next.captures.at(-1)
          : null;
      if (
        caught ||
        Math.floor(next.time * 10) !== Math.floor(previous.time * 10)
      ) {
        const sample = { time: next.time, value: robotOmega(next) };
        setPoints((trace) => [
          ...trace.slice(-1800),
          ...(caught
            ? [
                { time: caught.time, value: caught.before },
                { time: caught.time, value: caught.after },
              ]
            : []),
          sample,
        ]);
        publish();
      }
    },
    [publish],
  );
  useEffect(() => () => useSimulationStore.getState().reset(), []);

  const selectedMass = Number(mass);
  const remaining = ROBOT.capacity - reading.load;
  const valid =
    Number.isFinite(selectedMass) &&
    selectedMass >= ROBOT.minLoad &&
    selectedMass <= ROBOT.maxLoad;
  const enoughRoom = selectedMass <= remaining + 1e-9;
  const sliding = reading.radius !== reading.targetRadius;
  const latest = reading.captures.at(-1);
  const omega = robotOmega(reading);
  const inertia = robotInertia(reading.load, reading.radius);
  const status = running
    ? reading.drop
      ? 'Load falling'
      : sliding
        ? 'Moving backpack'
        : 'Spinning'
    : reading.time
      ? reading.drop
        ? 'Drop paused'
        : 'Paused'
      : 'Ready to spin';

  function reset() {
    trial.current = createRobotTrial();
    useSimulationStore.getState().reset();
    publish();
    setMass('2');
    setDropHeight(ROBOT.dropHeight);
    setPoints(initialTrace());
  }
  function changeRadius(radius: number) {
    trial.current = setRobotRadius(trial.current, radius);
    publish();
  }
  function changeInitialSpin(spin: number) {
    if (trial.current.time !== 0 || useSimulationStore.getState().running)
      return;
    const { radius, targetRadius } = trial.current;
    trial.current = { ...createRobotTrial(spin), radius, targetRadius };
    setPoints(initialTrace(spin));
    publish();
  }
  function dropLoad() {
    if (!useSimulationStore.getState().running) return;
    trial.current = releaseRobotLoad(trial.current, selectedMass, dropHeight);
    publish();
  }

  return (
    <div className="dancer-experiment robot-lab spin-demo">
      <div className="page-heading">
        <div>
          <h1>Spinning robot</h1>
          <p>
            Drop weights one at a time, then slide the loaded backpack to change
            the spin.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel robot-controls spin-demo-controls"
          aria-label="Robot controls"
        >
          <h2>Backpack</h2>
          <div className="parameter-field">
            <label htmlFor="robot-load-input">Load to drop</label>
            <div className="number-field">
              <input
                id="robot-load-input"
                type="number"
                min={ROBOT.minLoad}
                max={ROBOT.maxLoad}
                step="any"
                value={mass}
                onChange={(event) => setMass(event.target.value)}
                disabled={Boolean(reading.drop)}
                aria-describedby="robot-load-limit"
                aria-invalid={!valid}
              />
              <span>kg</span>
            </div>
            <small id="robot-load-limit">
              {ROBOT.minLoad}–{ROBOT.maxLoad} kg per drop · {ROBOT.capacity} kg
              capacity
            </small>
          </div>
          <label className="dancer-mode" htmlFor="robot-radius-slider">
            <span className="spin-range-label">
              Backpack radius <output>{f(reading.targetRadius)} m</output>
            </span>
            <input
              id="robot-radius-slider"
              className="spin-range"
              type="range"
              min={ROBOT.minRadius}
              max={ROBOT.maxRadius}
              step="0.01"
              value={reading.targetRadius}
              disabled={Boolean(reading.drop)}
              onChange={(event) => changeRadius(event.target.valueAsNumber)}
            />
          </label>
          <label className="dancer-mode" htmlFor="robot-drop-height">
            <span className="spin-range-label">
              Drop height <output>{f(dropHeight)} m</output>
            </span>
            <input
              id="robot-drop-height"
              className="spin-range"
              type="range"
              min="0.30"
              max="1.25"
              step="0.01"
              value={dropHeight}
              disabled={Boolean(reading.drop)}
              onChange={(event) => setDropHeight(event.target.valueAsNumber)}
            />
          </label>
          <label className="dancer-mode" htmlFor="robot-initial-spin">
            <span className="spin-range-label">
              Initial spin <output>{f(reading.initialOmega, 1)} rad/s</output>
            </span>
            <input
              id="robot-initial-spin"
              className="spin-range"
              type="range"
              min="-4"
              max="4"
              step="0.1"
              value={reading.initialOmega}
              disabled={running || reading.time > 0}
              onChange={(event) =>
                changeInitialSpin(event.target.valueAsNumber)
              }
            />
          </label>
          {reading.captures.length > 0 && (
            <details className="robot-cargo-list">
              <summary>
                Cargo · {reading.captures.length}{' '}
                {reading.captures.length === 1 ? 'weight' : 'weights'}
              </summary>
              <ol aria-label="Weights in the backpack">
                {reading.captures.map((capture, index) => (
                  <li key={index} data-testid="robot-cargo-weight">
                    {f(capture.mass)} kg
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p className="robot-drop-note" aria-live="polite">
            {!valid
              ? `Enter a load from ${ROBOT.minLoad} to ${ROBOT.maxLoad} kg.`
              : !enoughRoom
                ? `${f(remaining)} kg of space left.`
                : sliding
                  ? 'The backpack slides during the run.'
                  : ''}
          </p>
          <SimulationControls settingsOnly allowSpeed onReset={reset} />
        </aside>
        <SpinDemoViewport
          title="Robot experiment"
          status={status}
          center={CENTER}
          frameWidth={2.15}
          frameHeight={2.67}
          initialView="Perspective"
          spinAxisLabel="Backpack"
          spinAxisView={{
            center: [
              Math.sin(reading.angle) * reading.radius,
              1.32,
              Math.cos(reading.angle) * reading.radius,
            ],
            direction: [
              Math.sin(reading.angle) * 0.8,
              0.38,
              Math.cos(reading.angle) * 0.8,
            ],
          }}
          actions={
            <>
              <SimulationRunButton ready startLabel="Start spin" />
              <button
                className="secondary-button"
                onClick={dropLoad}
                disabled={
                  !running ||
                  Boolean(reading.drop) ||
                  sliding ||
                  !valid ||
                  !enoughRoom
                }
              >
                Drop load
              </button>
            </>
          }
        >
          {(vectors) => (
            <RobotScene
              getTrial={getTrial}
              advance={advance}
              publish={publish}
              vectors={vectors}
              captures={reading.captures}
              fallingMass={reading.drop?.mass ?? null}
            />
          )}
        </SpinDemoViewport>
      </div>
      <div
        className="measurements dancer-measurements robot-measurements"
        aria-label="Robot measurements"
      >
        <Measurement
          label="Backpack load"
          value={f(reading.load)}
          unit="kg"
          testId="robot-load"
        />
        <Measurement
          label="Load radius r"
          value={f(reading.radius)}
          unit="m"
          testId="robot-radius"
        />
        <Measurement
          label="Moment of inertia Iᵧ"
          value={f(inertia, 3)}
          unit="kg·m²"
          testId="robot-inertia"
        />
        <Measurement
          label="Angular velocity ωᵧ"
          value={f(omega, 3)}
          unit="rad/s"
          testId="robot-omega"
        />
        <Measurement
          label="Angular momentum Lᵧ"
          value={f(reading.momentum, 3)}
          unit="kg·m²/s"
          testId="robot-momentum"
        />
      </div>
      <section
        className="theory-panel robot-results"
        aria-labelledby="robot-results-title"
      >
        <h2 id="robot-results-title">Spin over time</h2>
        {latest && (
          <p className="robot-capture" data-testid="robot-capture">
            {f(latest.mass)} kg caught · ωᵧ {f(latest.before, 3)} →{' '}
            {f(latest.after, 3)} rad/s
          </p>
        )}
        <TimeSeriesChart
          title="Angular velocity ωᵧ"
          unit="rad/s"
          color="#c1e29e"
          points={points}
        />
      </section>
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>
            Pause and choose Backpack to inspect the stack at its current angle.
          </p>
          <p>
            Each weight falls vertically and sticks on contact. It arrives with
            zero angular momentum about the spin axis. The bearing and radial
            rail exert zero torque about that axis.
          </p>
          <p>
            Iᵧ = I₀ + mr² = {f(ROBOT.emptyInertia)} + {f(reading.load)} ×{' '}
            {f(reading.radius)}² = {f(inertia, 3)} kg·m²
          </p>
          <p>
            ωᵧ = Lᵧ / Iᵧ = {f(reading.momentum, 3)} / {f(inertia, 3)} ={' '}
            {f(omega, 3)} rad/s
          </p>
          <p>
            The model places each weight’s mass at the center of a lightweight
            carrier. The catch dissipates spin energy. Moving the loaded carrier
            can change spin energy as the rail does work.
          </p>
        </div>
      </details>
    </div>
  );
}
