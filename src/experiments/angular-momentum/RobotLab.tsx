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
  robotOmega,
  robotTrialInertia,
  setRobotLoad,
} from '../../physics/equations/robotRotation';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { RobotScene } from './RobotScene';
import { SpinDemoViewport } from './SpinDemoViewport';
import './robot.css';

const CENTER = [0, 1.31, 0] as const;
const DEFAULT_TRANSFER_MASS = 1;
const initialTrace = (speed: number = ROBOT.initialOmega) => [
  { time: 0, value: speed },
];

export default function RobotLab() {
  const trial = useRef(createRobotTrial());
  const [reading, setReading] = useState(createRobotTrial);
  const [points, setPoints] = useState(initialTrace);
  const [transferMass, setTransferMass] = useState(DEFAULT_TRANSFER_MASS);
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
                ...(change.kind === 'add'
                  ? [{ time: change.time, value: change.before }]
                  : []),
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

  const addMass = Math.min(transferMass, ROBOT.capacity - reading.load);
  const removeMass = Math.min(transferMass, reading.load);
  const canTransfer = running && reading.transfer === null;
  const setupLocked = running || reading.time > 0;
  const cargo = robotCargoBlocks(
    reading.transfer?.kind === 'remove' ? reading.transfer.to : reading.load,
  );
  const latest = reading.lastChange;
  const omega = robotOmega(reading);
  const inertia = robotTrialInertia(reading);
  const status = reading.transfer
    ? running
      ? reading.transfer.kind === 'add'
        ? 'Load falling'
        : 'Removing load'
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
    setTransferMass(DEFAULT_TRANSFER_MASS);
    setPoints(initialTrace());
  }
  function setTrialSetup(spin: number, bearingFriction: boolean) {
    if (trial.current.time !== 0 || useSimulationStore.getState().running)
      return;
    trial.current = createRobotTrial(spin, bearingFriction);
    setPoints(initialTrace(spin));
    publish();
  }
  function moveLoad(delta: number) {
    if (!useSimulationStore.getState().running) return;
    trial.current = setRobotLoad(trial.current, trial.current.load + delta);
    publish();
  }

  return (
    <div className="dancer-experiment robot-lab spin-demo">
      <div className="page-heading">
        <div>
          <h1>Spinning robot</h1>
          <p>Add or remove cargo and watch how the spin responds.</p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel robot-controls spin-demo-controls"
          aria-label="Robot controls"
        >
          <h2>Backpack</h2>
          <label className="dancer-mode" htmlFor="robot-transfer-mass">
            <span className="spin-range-label">
              Mass per transfer <output>{transferMass} kg</output>
            </span>
            <input
              id="robot-transfer-mass"
              className="spin-range"
              type="range"
              min="0.5"
              max={ROBOT.capacity}
              step="0.5"
              value={transferMass}
              disabled={reading.transfer !== null}
              onChange={(event) => setTransferMass(event.target.valueAsNumber)}
            />
          </label>
          <div className="robot-load-actions">
            <button
              className="secondary-button"
              disabled={!canTransfer || addMass === 0}
              onClick={() => moveLoad(addMass)}
            >
              Add {addMass || transferMass} kg
            </button>
            <button
              className="secondary-button"
              disabled={!canTransfer || removeMass === 0}
              onClick={() => moveLoad(-removeMass)}
            >
              Remove {removeMass || transferMass} kg
            </button>
          </div>
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
              disabled={setupLocked}
              onChange={(event) =>
                setTrialSetup(
                  event.target.valueAsNumber,
                  reading.bearingFriction,
                )
              }
            />
          </label>
          <label className="robot-bearing">
            <input
              type="checkbox"
              checked={reading.bearingFriction}
              disabled={setupLocked}
              onChange={(event) =>
                setTrialSetup(reading.initialOmega, event.target.checked)
              }
            />
            Bearing friction
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
          actions={<SimulationRunButton ready startLabel="Start spin" />}
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
          label="Cargo mass"
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
            Each full block is 5 kg. Incoming cargo falls vertically and slows
            the robot as it joins the spin.
          </p>
          <p>
            A lift on the robot moves cargo to the axis before release. As
            inertia falls, the robot speeds up on an ideal bearing.
          </p>
          <p>
            Even a full backpack keeps turning on an ideal bearing. With
            friction on, heavier loads increase the resisting torque and the
            robot can come to rest.
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
