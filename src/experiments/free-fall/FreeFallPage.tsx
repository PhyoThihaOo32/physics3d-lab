import { ViewportHint } from '../../components/controls/ViewportHint';
import { useEffect, useState } from 'react';
import { LabCanvas } from '../../three/scene/LabCanvas';
import { WorldAxes } from '../../three/helpers/WorldAxes';
import { PhysicsDetails } from '../../components/panels/PhysicsDetails';
import { DropScene } from './DropScene';
import { ParameterPanel } from './ParameterPanel';
import { DropReadouts, LiveMeasurements } from './DropReadouts';
import {
  DEFAULT_PARAMETERS,
  freeFallExperiment,
  type DropParameters,
} from './config';
import { useFreeFallStore } from '../../store/freeFallStore';
import { useSimulationStore } from '../../store/simulationStore';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';

export default function FreeFallPage() {
  const [run, setRun] = useState(0);
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
  const [axes, setAxes] = useState(true);
  const ready = useFreeFallStore((state) => state.ready);
  const sample = useFreeFallStore((state) => state.snapshot);
  const running = useSimulationStore((state) => state.running);
  const contacted = sample.firstContactTime !== null;
  const settled =
    contacted &&
    Math.abs(sample.verticalVelocity) < 0.05 &&
    Math.abs(sample.height - 0.5) < 0.02;
  const status = !ready
    ? 'Loading physics'
    : !running
      ? sample.time === 0
        ? 'Ready to release'
        : 'Paused'
      : settled
        ? 'At rest'
        : contacted
          ? 'After contact'
          : parameters.gravity === 0
            ? 'Zero gravity'
            : 'Free fall';
  function setCamera(preset: CameraPreset) {
    setView((previous) => ({ preset, revision: previous.revision + 1 }));
  }
  function restart(next: DropParameters) {
    useSimulationStore.getState().reset();
    useFreeFallStore.getState().clear(next.initialHeight);
    setParameters(next);
    setRun((value) => value + 1);
    setCamera('Perspective');
  }
  function resetDefaults() {
    setAxes(true);
    restart(DEFAULT_PARAMETERS);
  }
  useEffect(
    () => () => {
      useSimulationStore.getState().reset();
      useFreeFallStore.getState().clear();
    },
    [],
  );
  return (
    <>
      <header className="page-intro">
        <h1>{freeFallExperiment.title}</h1>
        <p>
          Change gravity and measure how long the cube takes to hit the floor.
        </p>
      </header>
      <div className="workspace">
        <ParameterPanel
          key={run}
          active={parameters}
          ready={ready}
          onApply={restart}
          onReset={resetDefaults}
          onReplay={() => restart(parameters)}
        />
        <section className="scene-panel" aria-label="Free-fall experiment">
          <div className="scene-toolbar">
            <div className="scene-state" role="status">
              <span className={settled ? 'status-dot settled' : 'status-dot'} />
              {status}
            </div>
            <label className="axes-toggle">
              <input
                type="checkbox"
                checked={axes}
                onChange={(event) => setAxes(event.target.checked)}
              />
              Coordinate axes
            </label>
          </div>
          <div className="viewport" data-testid="viewport">
            <LabCanvas view={view} frameHeight={parameters.initialHeight}>
              <DropScene key={run} parameters={parameters} />
              {axes && <WorldAxes />}
            </LabCanvas>
            <CameraControls view={view} onChange={setCamera} />
            <ViewportHint />
            <div className="coordinate-note">1 m grid</div>
          </div>
          <LiveMeasurements />
        </section>
      </div>
      <DropReadouts parameters={parameters} />
      <PhysicsDetails>
        <p>Vacuum, uniform gravity, 1 m cube. Contact occurs at y ≈ 0.50 m.</p>
        <p>
          Acceleration uses Δvᵧ/Δt. Impact readings average one step. At rest,
          the ground balances gravity.
        </p>
        <a
          href="https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall"
          target="_blank"
          rel="noreferrer"
        >
          Free fall · OpenStax ↗
        </a>
      </PhysicsDetails>
    </>
  );
}
