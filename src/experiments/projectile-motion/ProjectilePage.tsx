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
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-square" />
            MOTION LAB / PROJECTILE MOTION
          </div>
          <h1>{projectileExperiment.title}</h1>
          <p>{projectileExperiment.description}</p>
        </div>
        <div className="milestone">
          <span>02</span>
          <div>
            PROJECTILE MOTION<strong>Motion lab · Kinematics</strong>
          </div>
        </div>
      </div>
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
            <div>
              <span className="live-dot" />
              {running ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
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
            <div className="scene-title">
              <span>02 / PROJECTILE DYNAMICS</span>
              <strong>One launch. Two components.</strong>
            </div>
            <div className="scene-status" role="status">
              <span className="status-dot" />
              {status}
            </div>
            <CameraControls view={view} onChange={setCamera} />
            {!ready && (
              <div className="loading-badge" role="status">
                Initializing physics engine…
              </div>
            )}
            <ViewportHint />
            <div className="coordinate-note">
              +y up · z = 0
              <span>
                GRID / {framing.gridSpacing} METER
                {framing.gridSpacing === 1 ? '' : 'S'}
              </span>
            </div>
          </div>
          <div className="flight-layers" aria-label="Visualization layers">
            {LAYERS.map(({ key, text }) => (
              <label key={key} className={`layer-${key}`}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(event) =>
                    setLayers({ ...layers, [key]: event.target.checked })
                  }
                />
                {text}
              </label>
            ))}
          </div>
          <div className="trajectory-legend">
            <span className="measured-key">━ Measured trail</span>
            <span className="predicted-key">┄ Predicted path</span>
            <span>Vectors scaled for viewing · ring marks sphere center</span>
          </div>
          <ProjectileMeasurementsPanel />
        </section>
      </div>
      <ProjectileReadouts parameters={parameters} />
      <PhysicsDetails>
        <p>
          The sphere radius is 0.18 m. Heights use h = y − 0.18, so its center
          reaches y ≈ 0.18 m at landing. Both ground and sphere use zero
          friction and zero restitution. A ground-level upward launch is
          allowed; initial touching contact is not counted as landing.
        </p>
        <p>
          Flight results stop at the first descending contact impulse. Range
          uses position at that contact step; pre-impact speed uses the previous
          airborne step. Apex time is interpolated between measured vertical
          velocities; maximum height is sampled. These measurements can differ
          slightly from exact analytic results.
        </p>
        <p>
          Zero-gravity trials have a 10 s observation window, which ends by
          pausing, not by inventing a landing. Supported nonzero gravity is 1–20
          m/s². Launches shorter than two integration steps are rejected because
          they cannot be resolved reliably.
        </p>
      </PhysicsDetails>
      <div className="learning-strip">
        <section className="observation">
          <div className="section-label">TRY AN EXPERIMENT</div>
          <h3>What changes at the highest point?</h3>
          <p>
            Launch at 45° and slow playback to 0.25×. Watch vᵧ shrink to zero,
            then point downward. The horizontal component vₓ stays constant, and
            gravity keeps acting downward. Compare 30° and 60° launches at the
            same speed and h₀ = 0; then change only the mass.
          </p>
          <p className="source-link">
            <a
              href="https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion"
              target="_blank"
              rel="noreferrer"
            >
              Read the projectile model · OpenStax ↗
            </a>
          </p>
        </section>
        <section className="assumptions">
          <div className="section-label">MODEL ASSUMPTIONS</div>
          <ul>
            {projectileExperiment.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          <p>
            Flight pauses automatically at first landing contact. Velocity
            arrows then hide; the flight readouts hold the last airborne sample.
            Measured and predicted paths are drawn independently. The
            sphere-center ring stays visible at large scales; the physical
            radius remains 0.18 m.
          </p>
        </section>
      </div>
    </div>
  );
}
