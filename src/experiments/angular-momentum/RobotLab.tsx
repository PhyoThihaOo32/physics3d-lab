import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';
import { SimulationControls } from '../../components/controls/SimulationControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { TimeSeriesChart } from '../../components/graphs/TimeSeriesChart';
import { Measurement } from '../../components/measurements/Measurement';
import {
  ROBOT,
  advanceRobotTrial,
  createRobotTrial,
  releaseRobotLoad,
  robotInertia,
  robotOmega,
} from '../../physics/equations/robotRotation';
import { formatNumber as f } from '../../physics/units/format';
import { useSimulationStore } from '../../store/simulationStore';
import { LabCanvas } from '../../three/scene/LabCanvas';
import { RobotScene } from './RobotScene';

const CENTER = [0, 1.14, 0] as const;

export function RobotLab() {
  const trial = useRef(createRobotTrial());
  const [reading, setReading] = useState(createRobotTrial);
  const [mass, setMass] = useState('2');
  const [vectors, setVectors] = useState(true);
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
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
      if (
        previous.drop !== next.drop ||
        Math.floor(next.time * 10) !== Math.floor(previous.time * 10)
      )
        publish();
    },
    [publish],
  );
  useEffect(
    () => () => {
      trial.current = createRobotTrial();
      useSimulationStore.getState().reset();
    },
    [],
  );

  const selectedMass = Number(mass);
  const remaining = ROBOT.capacity - reading.load;
  const valid =
    Number.isFinite(selectedMass) &&
    selectedMass >= ROBOT.minLoad &&
    selectedMass <= ROBOT.maxLoad;
  const enoughRoom = selectedMass <= remaining;
  const latest = reading.captures.at(-1);
  const omega = robotOmega(reading);
  const inertia = robotInertia(reading.load);
  const points = [
    { time: 0, value: ROBOT.initialOmega },
    ...reading.captures.flatMap((capture) => [
      { time: capture.time, value: capture.before },
      { time: capture.time, value: capture.after },
    ]),
    { time: reading.time, value: omega },
  ];

  function setCamera(preset: CameraPreset) {
    setView((previous) => ({ preset, revision: previous.revision + 1 }));
  }
  function reset() {
    trial.current = createRobotTrial();
    useSimulationStore.getState().reset();
    publish();
    setMass('2');
    setVectors(true);
    setCamera('Perspective');
  }
  function dropLoad() {
    if (!useSimulationStore.getState().running) return;
    trial.current = releaseRobotLoad(trial.current, selectedMass);
    publish();
  }

  return (
    <div className="dancer-experiment robot-lab">
      <div className="page-heading">
        <div>
          <h1>Spinning robot</h1>
          <p>
            Start the spin, then drop a weight into the backpack. Watch ω change
            at the catch.
          </p>
        </div>
      </div>
      <div className="workspace">
        <aside
          className="setup-panel robot-controls"
          aria-labelledby="robot-controls-title"
        >
          <h2 id="robot-controls-title">Backpack</h2>
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
          <button
            className="secondary-button"
            onClick={dropLoad}
            disabled={!running || !!reading.drop || !valid || !enoughRoom}
          >
            Drop load
          </button>
          <p className="robot-drop-note" aria-live="polite">
            {!valid
              ? `Enter a load from ${ROBOT.minLoad} to ${ROBOT.maxLoad} kg.`
              : !enoughRoom && !reading.drop
                ? `${f(remaining)} kg of space left.`
                : ''}
          </p>
          <SimulationControls
            ready
            onReset={reset}
            startLabel="Start spin"
            allowSpeed
          />
        </aside>
        <section className="scene-panel" aria-label="Robot experiment">
          <div className="scene-toolbar">
            <div className="dancer-status" role="status">
              <span className="status-dot" />
              {running
                ? reading.drop
                  ? 'Load falling'
                  : 'Spinning'
                : reading.time
                  ? 'Paused'
                  : 'Ready to spin'}
            </div>
            <label className="axes-toggle">
              <input
                type="checkbox"
                checked={vectors}
                onChange={(event) => setVectors(event.target.checked)}
              />
              ω and L vectors
            </label>
          </div>
          <div
            className="viewport dancer-viewport"
            data-testid="robot-viewport"
          >
            <LabCanvas
              view={view}
              frameHeight={2.65}
              frameWidth={1.85}
              center={CENTER}
              minFrameDistance={4.5}
              minOrbitDistance={1.8}
              sceneExtent={5}
              label="Robot catching weights in a backpack on a fixed spin axis"
            >
              <RobotScene
                getTrial={getTrial}
                advance={advance}
                publish={publish}
                vectors={vectors}
              />
            </LabCanvas>
            <CameraControls view={view} onChange={setCamera} />
            <ViewportHint />
            <div className="coordinate-note">0.5 m grid</div>
          </div>
        </section>
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
            The load falls straight down and sticks when the backpack reaches
            it. The ideal bearing supplies no torque about the spin axis, so the
            incoming load adds inertia and carries zero angular momentum about
            that axis.
          </p>
          <p>
            Iᵧ = I₀ + mr² = {f(ROBOT.emptyInertia)} + {f(reading.load)} ×{' '}
            {f(ROBOT.backpackRadius)}² = {f(inertia, 3)} kg·m²
          </p>
          <p>
            ωᵧ = Lᵧ / Iᵧ = {f(reading.momentum, 3)} / {f(inertia, 3)} ={' '}
            {f(omega, 3)} rad/s
          </p>
          <p>
            m is the total cargo mass, modeled at a fixed radius r. Spin energy
            decreases during the inelastic catch.
          </p>
        </div>
      </details>
    </div>
  );
}
