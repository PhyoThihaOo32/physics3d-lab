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
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-square" />
            MOTION LAB / FREE FALL
          </div>
          <h1>{freeFallExperiment.title}</h1>
          <p>{freeFallExperiment.description}</p>
        </div>
        <div className="milestone">
          <span>01</span>
          <div>
            FREE FALL<strong>Motion lab · Kinematics</strong>
          </div>
        </div>
      </div>
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
          <div className="viewport" data-testid="viewport">
            <LabCanvas view={view} frameHeight={parameters.initialHeight}>
              <DropScene key={run} parameters={parameters} />
              {axes && <WorldAxes />}
            </LabCanvas>
            <div className="scene-title">
              <span>01 / RIGID-BODY DYNAMICS</span>
              <strong>Free fall & first contact</strong>
            </div>
            <div className="scene-status" role="status">
              <span className={settled ? 'status-dot settled' : 'status-dot'} />
              {status}
            </div>
            {!ready && (
              <div className="loading-badge" role="status">
                Initializing physics engine…
              </div>
            )}
            <CameraControls view={view} onChange={setCamera} />
            <ViewportHint />
            <div className="coordinate-note">
              +y up<span>GRID / 1 METER</span>
            </div>
          </div>
          <LiveMeasurements />
          <div className="measurement-note">
            Engine measurements · acceleration is unavailable until the first
            physics step · contact time has finite timestep resolution. The
            trial clock continues through rebound; first contact records the end
            of the initial free fall.
          </div>
        </section>
      </div>
      <DropReadouts parameters={parameters} />
      <PhysicsDetails>
        <p>
          The cube side is 1 m; the ground is y = 0, so first contact occurs
          near center height y = 0.50 m. The cube and ground friction
          coefficients are 0.70 and 0.50, giving an average contact coefficient
          of 0.60. Restitution coefficients 0.25 and 0 combine to 0.125; the
          collision is not perfectly elastic.
        </p>
        <p>
          Only gravity acts before first contact. During contact, the ground
          also acts on the cube. At rest its net acceleration is approximately
          zero even though gravity remains present. The equation and energy
          comparisons preserve the last sample before the first collision
          impulse.
        </p>
      </PhysicsDetails>
      <div className="learning-strip">
        <section className="observation">
          <div className="section-label">TRY AN EXPERIMENT</div>
          <h3>Does a heavier cube fall faster?</h3>
          <p>
            Run the trial, note the first-contact time, then change only the
            mass. Without air resistance, acceleration and fall time should stay
            the same. Try g = 1.62 m/s² for an approximate Moon environment, or
            g = 0 for a stationary cube released from rest.
          </p>
          <p className="source-link">
            <a
              href="https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall"
              target="_blank"
              rel="noreferrer"
            >
              Read the free-fall model · OpenStax ↗
            </a>
          </p>
        </section>
        <section className="assumptions">
          <div className="section-label">WHAT THIS MODEL ASSUMES</div>
          <ul>
            {freeFallExperiment.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          <p>
            Height is the cube center’s y coordinate; its bottom reaches the
            ground when y ≈ 0.50 m. At rest, the ground balances gravity, so net
            acceleration is approximately zero. This is an ideal vacuum model,
            not a simulation of air drag or material deformation.
          </p>
        </section>
      </div>
    </>
  );
}
