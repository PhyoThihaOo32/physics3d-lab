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
  robotCargoBlocks,
  robotInertia,
  robotOmega,
  setRobotLoad,
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
  const [targetLoad, setTargetLoad] = useState(0);
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
      const change =
        next.lastChange !== previous.lastChange ? next.lastChange : null;
      if (
        change ||
        Math.floor(next.time * 10) !== Math.floor(previous.time * 10)
      ) {
        const sample = { time: next.time, value: robotOmega(next) };
        setPoints((trace) => [
          ...trace.slice(-1800),
          ...(change
            ? [
                { time: change.time, value: change.before },
                { time: change.time, value: change.after },
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

  const change = targetLoad - reading.load;
  const cargo = robotCargoBlocks(reading.load);
  const latest = reading.lastChange;
  const omega = robotOmega(reading);
  const inertia = robotInertia(reading.load);
  const status = reading.transfer
    ? running
      ? reading.transfer.kind === 'add'
        ? 'Load falling'
        : 'Lifting load'
      : 'Transfer paused'
    : running
      ? omega
        ? 'Spinning'
        : 'At rest'
      : reading.time
        ? 'Paused'
        : 'Ready to spin';

  function reset() {
    trial.current = createRobotTrial();
    useSimulationStore.getState().reset();
    publish();
    setTargetLoad(0);
    setPoints(initialTrace());
  }
  function changeInitialSpin(spin: number) {
    if (trial.current.time !== 0 || useSimulationStore.getState().running)
      return;
    trial.current = createRobotTrial(spin);
    setPoints(initialTrace(spin));
    publish();
  }
  function applyLoad() {
    if (!useSimulationStore.getState().running) return;
    trial.current = setRobotLoad(trial.current, targetLoad);
    publish();
  }

  return (
    <div className="dancer-experiment robot-lab spin-demo">
      <div className="page-heading">
        <div>
          <h1>Spinning robot</h1>
          <p>
            Add or remove cargo and watch how the spin responds. Each block
            holds up to 5 kg.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel robot-controls spin-demo-controls"
          aria-label="Robot controls"
        >
          <h2>Backpack</h2>
          <label className="dancer-mode" htmlFor="robot-target-load">
            <span className="spin-range-label">
              Target load <output>{f(targetLoad, 1)} kg</output>
            </span>
            <input
              id="robot-target-load"
              className="spin-range"
              type="range"
              min="0"
              max={ROBOT.capacity}
              step="0.5"
              value={targetLoad}
              disabled={reading.transfer !== null}
              onChange={(event) => setTargetLoad(event.target.valueAsNumber)}
            />
          </label>
          {cargo.length > 0 && (
            <ol className="robot-cargo-list" aria-label="Mass per block">
              {cargo.map((block) => (
                <li key={block.index} data-testid="robot-cargo-weight">
                  {f(block.mass, 1)} kg
                </li>
              ))}
            </ol>
          )}
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
              Math.sin(reading.angle) * ROBOT.backpackRadius,
              1.32,
              Math.cos(reading.angle) * ROBOT.backpackRadius,
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
                onClick={applyLoad}
                disabled={!running || reading.transfer !== null || change === 0}
              >
                {change > 0
                  ? `Add ${f(change, 1)} kg`
                  : change < 0
                    ? `Remove ${f(-change, 1)} kg`
                    : 'Set load'}
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
              load={reading.load}
              transfer={reading.transfer}
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
            {f(latest.mass, 1)} kg {latest.kind === 'add' ? 'added' : 'removed'}{' '}
            · ωᵧ {f(latest.before, 3)} → {f(latest.after, 3)} rad/s
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
            Incoming cargo falls vertically with zero angular momentum about the
            spin axis. At the catch, inertia increases and the spin slows if the
            robot was already spinning.
          </p>
          <p>
            A vertical lift lets outgoing cargo keep its tangential speed at
            release. It takes its share of angular momentum, leaving the robot
            spinning at the same rate.
          </p>
          <p>
            Iᵧ = I₀ + mr² = {f(ROBOT.emptyInertia)} + {f(reading.load)} ×{' '}
            {f(ROBOT.backpackRadius)}² = {f(inertia, 3)} kg·m²
          </p>
          <p>
            ωᵧ = Lᵧ / Iᵧ = {f(reading.momentum, 3)} / {f(inertia, 3)} ={' '}
            {f(omega, 3)} rad/s
          </p>
        </div>
      </details>
    </div>
  );
}
