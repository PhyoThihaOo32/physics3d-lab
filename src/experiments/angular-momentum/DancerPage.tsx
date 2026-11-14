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
        ? 'Spinning'
        : snapshot.time
          ? 'Paused'
          : 'Ready to spin';
  return (
    <div className="dancer-experiment">
      <div className="page-heading">
        <div>
          <h1>{dancerExperiment.title}</h1>
          <p>
            Start the spin, then raise and open the arms. Watch the spin speed.
          </p>
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
            <div className="dancer-status" role="status">
              <span className="status-dot" />
              {status}
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
            <CameraControls view={view} onChange={setCamera} />
            <ViewportHint />
            <div className="coordinate-note">0.5 m grid</div>
          </div>
          <div className="dancer-scene-caption">
            <span className="dancer-radius-key">◯ Hand radius</span>
            {vectors && <span>Arrows scaled separately</span>}
          </div>
          <div className="dancer-observation">
            <p>
              With ideal support, bringing the arms closer to the axis lowers
              inertia and speeds up the spin. Angular momentum stays nearly
              constant.
            </p>
          </div>
        </section>
      </div>
      <DancerReadouts parameters={parameters} />
      <section className="dancer-graphs" aria-labelledby="dancer-graphs-title">
        <div className="dancer-section-heading">
          <h2 id="dancer-graphs-title">Spin over time</h2>
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
      <details className="physics-details">
        <summary>Model details</summary>
        <div>
          <p>
            A 51 kg model spins about a fixed vertical axis. Mirrored shoulder
            and elbow joints raise the arms without changing their lengths.
            Segment masses and inertia are illustrative.
          </p>
          <p>
            Ideal support applies no torque about the spin axis. Resistive
            support applies τᵧ = −bω. Measured Lᵧ sums the spin and orbital
            momentum of all five bodies. The residual compares it with L₀ + ∫τᵧ
            dt.
          </p>
          <p>
            Spin energy K = ½Iᵧωᵧ² covers rotation about the axis. The full
            energy budget also includes arm motion and gravitational potential
            energy.
          </p>
          <p>
            Physics step: 1/480 s. Readouts: 10 Hz and the final paused step.
          </p>
          <a
            className="dancer-source"
            href="https://openstax.org/books/university-physics-volume-1/pages/11-3-conservation-of-angular-momentum"
            target="_blank"
            rel="noreferrer"
          >
            Angular momentum · OpenStax ↗
          </a>
        </div>
      </details>
    </div>
  );
}
