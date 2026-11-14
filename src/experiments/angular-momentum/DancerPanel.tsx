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
      <h2 id="dancer-controls-title">Spin controls</h2>
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
        <p className="arm-position-key">0% open · 100% overhead</p>
        <div className="arm-presets">
          <button disabled={!ready || complete} onClick={() => setTarget(0)}>
            Raise arms
          </button>
          <button disabled={!ready || complete} onClick={() => setTarget(1)}>
            Open arms
          </button>
        </div>
        <p className="arm-status">
          {!running && !complete ? 'Arms move while the trial runs.' : ''}
        </p>
      </div>
      <form onSubmit={apply} noValidate>
        <div className="section-label">Trial settings</div>
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
            <small>0–0.5</small>
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
        <p className="physics-caption dancer-pending" role="status">
          {dirty ? 'Apply to use the new settings.' : ''}
        </p>
      </form>
      <SimulationControls
        ready={ready}
        complete={complete}
        startLabel="Start spin"
        onReset={onReset}
        allowSpeed
      />
      <p className="physics-caption">60 s trial</p>
    </aside>
  );
}
