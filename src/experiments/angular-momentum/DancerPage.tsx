import { useEffect, useState } from 'react';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { TimeSeriesChart } from '../../components/graphs/TimeSeriesChart';
import { LabCanvas } from '../../three/scene/LabCanvas';
import { useSimulationStore } from '../../store/simulationStore';
import { useDancerStore } from '../../store/dancerStore';
import {
  DEFAULT_DANCER,
  type DancerParameters,
} from '../../physics/equations/angularMomentum';
import { DancerPanel } from './DancerPanel';
import { DancerScene } from './DancerScene';
import { DancerReadouts, DancerRecords } from './DancerReadouts';
import { dancerExperiment } from './config';
import './dancer.css';
const CENTER = [0, 1.05, 0] as const;
export default function DancerPage() {
  const [parameters, setParameters] = useState(DEFAULT_DANCER);
  const [run, setRun] = useState(0);
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
  const [vectors, setVectors] = useState(true);
  const ready = useDancerStore((s) => s.ready);
  const snapshot = useDancerStore((s) => s.snapshot);
  const history = useDancerStore((s) => s.history);
  const running = useSimulationStore((s) => s.running);
  function setCamera(preset: CameraPreset) {
    setView((v) => ({ preset, revision: v.revision + 1 }));
  }
  function restart(p: DancerParameters) {
    useSimulationStore.getState().reset();
    useDancerStore.getState().clear(p);
    setParameters(p);
    setRun((n) => n + 1);
    setCamera('Perspective');
  }
  function reset() {
    setVectors(true);
    restart(DEFAULT_DANCER);
  }
  useEffect(
    () => () => {
      useSimulationStore.getState().reset();
      useDancerStore.getState().clear();
    },
    [],
  );
  const status = !ready
    ? 'Loading physics'
    : snapshot.time >= 60
      ? 'Observation complete'
      : running
        ? 'Spinning · move the arms'
        : snapshot.time
          ? 'Paused'
          : 'Ready to spin';
  return (
    <div className="dancer-experiment">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-square" />
            ROTATION LAB / ANGULAR MOMENTUM
          </div>
          <h1>{dancerExperiment.title}</h1>
          <p>{dancerExperiment.description}</p>
        </div>
        <div className="milestone">
          <span>03</span>
          <div>
            ANGULAR MOMENTUM<strong>Rotation lab · L = Iω</strong>
          </div>
        </div>
      </div>
      <div className="workspace">
        <DancerPanel
          key={run}
          parameters={parameters}
          onApply={restart}
          onReset={reset}
        />
        <section className="scene-panel" aria-label="Ballet dancer experiment">
          <div className="scene-toolbar">
            <div>
              <span className="live-dot" />
              {running ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
            </div>
            <label className="axes-toggle">
              <input
                type="checkbox"
                checked={vectors}
                onChange={(e) => setVectors(e.target.checked)}
              />
              ω and L vectors
            </label>
          </div>
          <div
            className="viewport dancer-viewport"
            data-testid="dancer-viewport"
          >
            <LabCanvas
              view={view}
              frameHeight={2.3}
              frameWidth={1.9}
              center={CENTER}
              sceneExtent={5}
              minFrameDistance={4.1}
              minOrbitDistance={1.8}
              label="Interactive articulated ballet dancer rotating about a fixed vertical axis"
            >
              <DancerScene
                key={run}
                parameters={parameters}
                vectors={vectors}
              />
            </LabCanvas>
            <div className="scene-title">
              <span>03 / MASS DISTRIBUTION</span>
              <strong>
                {parameters.resistance === 0
                  ? 'Same momentum. A different spin.'
                  : 'External torque changes the spin.'}
              </strong>
            </div>
            <div className="scene-status" role="status">
              <span className="status-dot" />
              {status}
            </div>
            <CameraControls view={view} onChange={setCamera} />
            {!ready && (
              <div className="loading-badge" role="status">
                Initializing articulated physics…
              </div>
            )}
            <ViewportHint />
            <div className="coordinate-note">
              +y up · supported vertical axis<span>FLOOR GRID / 0.5 METER</span>
            </div>
          </div>
          <div className="dancer-scene-caption">
            <span className="dancer-radius-key">◯ Measured hand radius</span>
            <span>
              Arrows use separate display scales · positive spin follows the
              right-hand rule
            </span>
          </div>
          <div className="dancer-observation">
            <div className="section-label">WATCH THE RELATIONSHIP</div>
            <p>
              <strong>Arms in → smaller I → faster spin.</strong> Arms out
              reverses it. Angular momentum stays nearly constant on the ideal
              support; spin energy changes because the actuators do work.
            </p>
          </div>
        </section>
      </div>
      <DancerReadouts parameters={parameters} />
      <section className="dancer-graphs" aria-labelledby="dancer-graphs-title">
        <div className="dancer-section-heading">
          <div>
            <div className="section-label">LIVE MEASUREMENTS · 10 HZ</div>
            <h2 id="dancer-graphs-title">Three views of one spin</h2>
          </div>
          <span>Time advances with the physics, including slow playback.</span>
        </div>
        <div className="dancer-chart-grid">
          <TimeSeriesChart
            title="Moment of inertia Iᵧ"
            unit="kg·m²"
            color="#91d3df"
            points={history.map((s) => ({ time: s.time, value: s.inertia }))}
          />
          <TimeSeriesChart
            title="Angular velocity ωᵧ"
            unit="rad/s"
            color="#c1e29e"
            points={history.map((s) => ({ time: s.time, value: s.omega }))}
          />
          <TimeSeriesChart
            title="Angular momentum Lᵧ"
            unit="kg·m²/s"
            color="#d5b6f0"
            points={history.map((s) => ({
              time: s.time,
              value: s.momentum,
              reference: s.initialMomentum + s.impulse,
            }))}
            referenceLabel="L₀ + ∫τᵧ dt"
          />
        </div>
      </section>
      <DancerRecords />
      <div className="learning-strip">
        <section className="observation">
          <div className="section-label">TRY THESE THREE EXPERIMENTS</div>
          <h3>Predict first. Then test.</h3>
          <ol>
            <li>
              Start at 2 rad/s with ideal support. Record open and tucked poses.
              Does I₁ω₁ ≈ I₂ω₂? Compare spin energy too.
            </li>
            <li>
              Apply 0 rad/s, then fold and extend. Symmetric arm movement should
              not create a sustained spin.
            </li>
            <li>
              Choose resistive support, b = 0.15 N·m·s/rad. Hold one pose. Watch
              Lᵧ decrease; compare it with the dashed torque-balance curve.
            </li>
          </ol>
          <p className="source-link">
            <a
              href="https://openstax.org/books/university-physics-volume-1/pages/11-3-conservation-of-angular-momentum"
              target="_blank"
              rel="noreferrer"
            >
              Angular momentum and muscle work · OpenStax ↗
            </a>
          </p>
        </section>
        <section className="assumptions">
          <div className="section-label">MODEL ASSUMPTIONS</div>
          <ul>
            {dancerExperiment.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p>
            A real ballet dancer pushes against the floor and actively maintains
            balance. This supported model isolates the effect of moving mass
            toward and away from a rotation axis.
          </p>
        </section>
      </div>
      <details className="physics-details">
        <summary>Articulation model & measurement accuracy</summary>
        <div>
          <p>
            Four dynamic arm segments connect to a dynamic torso through
            motorized revolute shoulder and elbow joints. The torso can rotate
            about y; its position and tilt are supported. Joint motors apply
            internal action and reaction forces. Upper arms fold down to 75° and
            elbows bend to 150°, keeping segment lengths fixed. Internal
            collisions are disabled for the simplified segment envelopes.
          </p>
          <p>
            Inertia uses each segment’s rotated inertia tensor plus m(x² + z²).
            Measured Lᵧ sums (Iω)ᵧ + m(zvₓ − xv_z) for every body. The pinned
            Rapier integrator is supplemented with Euler’s gyroscopic term −ω ×
            (Iω) for the moving arms; angular velocity is never overwritten to
            enforce conservation. In the symmetric model, Lᵧ ≈ Iᵧωᵧ.
          </p>
          <p>
            Integration uses 1/480 s with 24 solver iterations; playback changes
            scheduling only. Readouts and graphs update at 10 Hz; pausing
            publishes the last integrated step. The momentum residual compares
            measured Lᵧ with initial momentum plus the numerically integrated
            external resistive torque. Values near zero use an absolute
            residual, avoiding meaningless percent errors.
          </p>
          <p>
            Spin kinetic energy is ½Iᵧωᵧ², excluding relative arm-folding
            kinetic energy. Neither its change nor the resistive loss alone
            equals total muscle work. Shape, mass distribution and motor
            strength are illustrative, not a calibrated model of a person.
            Displayed decimal places do not imply laboratory measurement
            precision. The sculpted dress, hair, hands and fixed crossed-leg
            pose illustrate this segment model; they are not separately
            calibrated anatomical masses.
          </p>
        </div>
      </details>
    </div>
  );
}
