import { useState, type FormEvent } from 'react';
import {
  PARAMETER_LIMITS,
  validDropParameters,
  type DropParameters,
  DROP,
} from './config';
import { SimulationControls } from '../../components/controls/SimulationControls';

const FIELDS = [
  { key: 'mass', label: 'Cube mass', symbol: 'm', unit: 'kg' },
  {
    key: 'initialHeight',
    label: 'Release height (center)',
    symbol: 'y₀',
    unit: 'm',
  },
  { key: 'gravity', label: 'Gravity magnitude', symbol: 'g', unit: 'm/s²' },
] as const;

export function ParameterPanel({
  active,
  ready,
  onApply,
  onReset,
  onReplay,
}: {
  active: DropParameters;
  ready: boolean;
  onApply: (parameters: DropParameters) => void;
  onReset: () => void;
  onReplay: () => void;
}) {
  const [draft, setDraft] = useState<Record<keyof DropParameters, string>>({
    mass: String(active.mass),
    initialHeight: String(active.initialHeight),
    gravity: String(active.gravity),
  });
  const [error, setError] = useState('');
  const parameters = {
    mass: Number(draft.mass),
    initialHeight: Number(draft.initialHeight),
    gravity: Number(draft.gravity),
  };
  const dirty = FIELDS.some(
    ({ key }) => parameters[key] !== active[key] || draft[key].trim() === '',
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      FIELDS.some(({ key }) => draft[key].trim() === '') ||
      !validDropParameters(parameters)
    ) {
      setError('Enter values within the limits shown below each field.');
      return;
    }
    setError('');
    onApply(parameters);
  }
  return (
    <aside className="setup-panel" aria-labelledby="setup-title">
      <div className="panel-kicker">EXPERIMENT 001</div>
      <h2 id="setup-title">Free fall</h2>
      <p className="panel-description">
        A 1 m cube, released from rest in an ideal vacuum.
      </p>
      <form onSubmit={submit} noValidate>
        <div className="section-label">
          INITIAL CONDITIONS <span>SI UNITS</span>
        </div>
        <div className="parameter-fields">
          {FIELDS.map(({ key, label, symbol, unit }) => (
            <div className="parameter-field" key={key}>
              <label htmlFor={key}>
                <span className="parameter-symbol" aria-hidden="true">
                  {symbol}
                </span>
                {label}
              </label>
              <div className="number-field">
                <input
                  id={key}
                  type="number"
                  inputMode="decimal"
                  {...PARAMETER_LIMITS[key]}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                  aria-describedby={`${key}-limits`}
                />
                <span>{unit}</span>
              </div>
              <small id={`${key}-limits`}>
                {PARAMETER_LIMITS[key].min}–{PARAMETER_LIMITS[key].max} {unit}
              </small>
            </div>
          ))}
        </div>
        <p className="parameter-caption">
          Released from rest. Drop distance:{' '}
          {(active.initialHeight - DROP.cubeSize / 2).toFixed(2)} m (center
          height minus half the cube side). Positive y is upward.
        </p>
        {error && (
          <p role="alert" className="validation-error">
            {error}
          </p>
        )}
        <button
          className="secondary-button apply-button"
          type="submit"
          disabled={!dirty}
        >
          Apply & reset trial
        </button>
        <p className="button-caption">
          {dirty
            ? 'Pending changes. Current trial keeps its applied settings.'
            : 'Settings applied. Start when you are ready.'}
        </p>
      </form>
      <SimulationControls ready={ready} onReset={onReset} allowSpeed />
      <button
        className="secondary-button replay-projectile"
        onClick={onReplay}
        disabled={!ready}
      >
        ↻ Replay same conditions
      </button>
      <div className="note">
        <span aria-hidden="true">↳</span>
        <p>
          Try a heavier cube. In a vacuum, mass changes weight, but not
          free-fall acceleration.
        </p>
      </div>
      <div className="engine-info">
        <span className="engine-dot" />
        <span>
          POWERED BY RAPIER<span>Fixed physics step · 1/120 s</span>
        </span>
      </div>
    </aside>
  );
}
