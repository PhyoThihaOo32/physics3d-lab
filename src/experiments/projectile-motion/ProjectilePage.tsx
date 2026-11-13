import { ViewportHint } from '../../components/controls/ViewportHint';
import { useEffect, useMemo, useState } from 'react';
import { LabCanvas } from '../../three/scene/LabCanvas';
import { WorldAxes } from '../../three/helpers/WorldAxes';
import { PhysicsDetails } from '../../components/panels/PhysicsDetails';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';
import { useProjectileStore } from '../../store/projectileStore';
import { useSimulationStore } from '../../store/simulationStore';
import {
  DEFAULT_PROJECTILE,
  projectileExperiment,
  type ProjectileParameters,
} from './config';
import { ProjectileScene, type ProjectileLayers } from './ProjectileScene';
import { ProjectilePanel } from './ProjectilePanel';
import {
  ProjectileReadouts,
  ProjectileMeasurementsPanel,
} from './ProjectileReadouts';
import { projectileView } from './viewModel';
import './projectile.css';
const DEFAULT_LAYERS: ProjectileLayers = {
  velocity: true,
  components: true,
  gravity: true,
  prediction: true,
  trail: true,
};
const LAYERS = [
  { key: 'velocity', text: 'Velocity v' },
  { key: 'components', text: 'Components vₓ / vᵧ' },
  { key: 'gravity', text: 'Gravity g' },
  { key: 'prediction', text: 'Predicted path' },
  { key: 'trail', text: 'Measured trail' },
] as const;
export default function ProjectilePage() {
  const [parameters, setParameters] = useState(DEFAULT_PROJECTILE);
  const [run, setRun] = useState(0);
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [axes, setAxes] = useState(true);
  const ready = useProjectileStore((state) => state.ready);
  const snapshot = useProjectileStore((state) => state.snapshot);
  const running = useSimulationStore((state) => state.running);
  const framing = useMemo(() => projectileView(parameters), [parameters]);
  const complete = !!snapshot.landing || snapshot.limitReached;
  const status = !ready
    ? 'Loading physics'
    : snapshot.landing
      ? 'Landed'
      : snapshot.limitReached
        ? 'Observation complete'
        : !running
          ? snapshot.time === 0
            ? 'Ready to launch'
            : 'Paused'
          : snapshot.velocity[1] > 0
            ? 'Rising'
            : snapshot.velocity[1] < 0
              ? 'Descending'
              : 'In flight';
  function setCamera(preset: CameraPreset) {
    setView((previous) => ({ preset, revision: previous.revision + 1 }));
  }
  function restart(next: ProjectileParameters) {
    useSimulationStore.getState().reset();
    useProjectileStore.getState().clear(next);
    setParameters(next);
    setRun((value) => value + 1);
    setCamera('Perspective');
  }
  function reset() {
    setLayers(DEFAULT_LAYERS);
    setAxes(true);
    restart(DEFAULT_PROJECTILE);
  }
  useEffect(
    () => () => {
      useSimulationStore.getState().reset();
      useProjectileStore.getState().clear();
    },
    [],
  );
  return (
    <div className="projectile-experiment">
      <header className="page-intro">
        <h1>{projectileExperiment.title}</h1>
        <p>
          Change the launch angle and compare the measured range with the
          prediction.
        </p>
      </header>
      <div className="workspace">
        <ProjectilePanel
          key={run}
          parameters={parameters}
          ready={ready}
          complete={complete}
          onApply={restart}
          onReset={reset}
          onReplay={() => restart(parameters)}
        />
        <section
          className="scene-panel"
          aria-label="Projectile motion experiment"
        >
          <div className="scene-toolbar">
            <div
              className="scene-state"
              role="status"
              data-testid="flight-status"
            >
              <span className="status-dot" />
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
          <div className="viewport" data-testid="projectile-viewport">
            <LabCanvas
              view={view}
              frameHeight={framing.frameHeight}
              frameWidth={framing.frameWidth}
              center={framing.center}
              sceneExtent={framing.extent}
              label="Interactive 3D projectile flight with trajectory and velocity components"
            >
              <ProjectileScene
                key={run}
                parameters={parameters}
                layers={layers}
              />
              {axes && <WorldAxes />}
            </LabCanvas>
            <CameraControls view={view} onChange={setCamera} />
            <ViewportHint />
            <div className="coordinate-note">{framing.gridSpacing} m grid</div>
          </div>
          <div className="flight-layers" aria-label="Visualization layers">
            {LAYERS.map(({ key, text }) => (
              <label key={key} className={`layer-${key}`}>
                <input
                  type="checkbox"
                  aria-label={text}
                  checked={layers[key]}
                  onChange={(event) =>
                    setLayers({ ...layers, [key]: event.target.checked })
                  }
                />
                {key === 'trail' || key === 'prediction' ? (
                  <>
                    <span aria-hidden="true">
                      {key === 'trail' ? '━ ' : '┄ '}
                    </span>
                    {text}
                  </>
                ) : (
                  text
                )}
              </label>
            ))}
          </div>
          <ProjectileMeasurementsPanel />
        </section>
      </div>
      <ProjectileReadouts parameters={parameters} />
      <PhysicsDetails>
        <p>
          Vacuum, uniform gravity, 0.18 m sphere radius. Height h = y − 0.18 m.
        </p>
        <p>
          Landing ends the trial. Flight comparisons use the last airborne step.
          Arrows are scaled for display.
        </p>
        <a
          href="https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion"
          target="_blank"
          rel="noreferrer"
        >
          Projectile motion · OpenStax ↗
        </a>
      </PhysicsDetails>
    </div>
  );
}
