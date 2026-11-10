import { useState, type FormEvent } from 'react';
import { SimulationControls } from '../../components/controls/SimulationControls';
import { useDancerStore } from '../../store/dancerStore';
import { useSimulationStore } from '../../store/simulationStore';
import type { DancerParameters } from '../../physics/equations/angularMomentum';
import { dancerParameterError } from './config';
export function DancerPanel({
  parameters,
  onApply,
  onReset,
}: {
  parameters: DancerParameters;
  onApply: (p: DancerParameters) => void;
  onReset: () => void;
}) {
  const [speed, setSpeed] = useState(String(parameters.initialOmega));
  const [resistance, setResistance] = useState(
    String(parameters.resistance || 0.15),
  );
  const [mode, setMode] = useState(
    parameters.resistance ? 'resistance' : 'ideal',
  );
  const [error, setError] = useState('');
  const ready = useDancerStore((s) => s.ready);
  const target = useDancerStore((s) => s.target);
  const setTarget = useDancerStore((s) => s.setTarget);
  const time = useDancerStore((s) => s.snapshot.time);
  const running = useSimulationStore((s) => s.running);
  const complete = time >= 60;
  const next = {
    initialOmega: Number(speed),
    resistance: mode === 'ideal' ? 0 : Number(resistance),
  };
  const dirty =
    next.initialOmega !== parameters.initialOmega ||
    next.resistance !== parameters.resistance ||
    speed.trim() === '' ||
    (mode === 'resistance' && resistance.trim() === '');
  function apply(e: FormEvent) {
    e.preventDefault();
    const problem =
      speed.trim() === '' || (mode === 'resistance' && resistance.trim() === '')
        ? 'Fill in each trial setting.'
        : dancerParameterError(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    onApply(next);
  }
  return (
    <aside
      className="setup-panel dancer-panel"
      aria-labelledby="dancer-controls-title"
    >
      <div className="panel-kicker">EXPERIMENT 003</div>
      <h2 id="dancer-controls-title">Shape the spin</h2>
      <p className="panel-description">
        Move both arms while spinning. Their lengths stay fixed; their distance
        from the axis changes.
      </p>
      <div className="arm-control">
        <label htmlFor="arm-extension">
          Arm raise target <output>{Math.round((1 - target) * 100)}%</output>
        </label>
        <input
          id="arm-extension"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round((1 - target) * 100)}
          disabled={!ready || complete}
          onChange={(e) => setTarget(1 - Number(e.target.value) / 100)}
        />
        <p className="arm-position-key">0% open · 100% rounded overhead</p>
        <div className="arm-presets">
          <button disabled={!ready || complete} onClick={() => setTarget(0)}>
            Raise arms
          </button>
          <button disabled={!ready || complete} onClick={() => setTarget(1)}>
            Open arms
          </button>
        </div>
        <p>
          {complete
            ? 'Start a new trial to move the arms again.'
            : !running
              ? 'Choose a target, then start or resume to move.'
              : 'Arms rise smoothly into a rounded overhead pose.'}
        </p>
      </div>
      <form onSubmit={apply} noValidate>
        <div className="section-label">NEW TRIAL SETTINGS</div>
        <div className="parameter-field">
          <label htmlFor="initial-omega">
            Initial angular velocity <span>rad/s</span>
          </label>
          <input
            id="initial-omega"
            type="number"
            min="-3"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
          />
          <small>
            −3 to +3 · negative reverses direction · 0 starts at rest
          </small>
        </div>
        <label className="dancer-mode" htmlFor="bearing-mode">
          Support model
          <select
            id="bearing-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ideal">Ideal · no resistive torque</option>
            <option value="resistance">Resistive · τᵧ = −bω</option>
          </select>
        </label>
        {mode === 'resistance' && (
          <div className="parameter-field">
            <label htmlFor="bearing-resistance">
              Resistance coefficient b <span>N·m·s/rad</span>
            </label>
            <input
              id="bearing-resistance"
              type="number"
              min="0"
              max="0.5"
              step="0.05"
              value={resistance}
              onChange={(e) => setResistance(e.target.value)}
            />
            <small>0–0.5 · larger values slow the spin faster</small>
          </div>
        )}
        {error && (
          <p className="dancer-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="secondary-button apply-button"
          type="submit"
          disabled={!ready}
        >
          Apply & start fresh trial
        </button>
        <p className="physics-caption">
          {dirty
            ? 'Settings changed. Apply them to reset time and measurements.'
            : 'Trial begins with both arms extended. Initial spin is supplied before t = 0.'}
        </p>
      </form>
      <SimulationControls
        ready={ready && (!dirty || running)}
        complete={complete}
        startLabel="Start spin"
        onReset={onReset}
        allowSpeed
      />
      <p className="physics-caption">
        60 s observation window. Pause to inspect or record a sample. Camera
        arrow keys pan the view; the arm slider uses its own arrow-key controls.
      </p>
    </aside>
  );
}
