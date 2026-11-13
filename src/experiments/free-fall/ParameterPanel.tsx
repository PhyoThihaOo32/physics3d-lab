import { useState, type FormEvent } from 'react';
import {
  PARAMETER_LIMITS,
  validDropParameters,
  type DropParameters,
} from './config';
import { SimulationControls } from '../../components/controls/SimulationControls';

const FIELDS = [
  { key: 'mass', label: 'Cube mass', unit: 'kg' },
  {
    key: 'initialHeight',
    label: 'Release height (center)',
    unit: 'm',
  },
  { key: 'gravity', label: 'Gravity magnitude', unit: 'm/s²' },
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
      setError('Enter values within the limits.');
      return;
    }
    setError('');
    onApply(parameters);
  }
  return (
    <aside className="setup-panel" aria-label="Settings">
      <form onSubmit={submit} noValidate>
        <div className="parameter-fields">
          {FIELDS.map(({ key, label, unit }) => (
            <div className="parameter-field" key={key}>
              <label htmlFor={key}>{label}</label>
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
        {error && (
          <p role="alert" className="validation-error">
            {error}
          </p>
        )}
        <button
          className="secondary-button apply-button"
          type="submit"
          aria-label="Apply & reset trial"
          disabled={!dirty}
        >
          Apply
        </button>
        <p className="button-caption" role="status">
          {dirty ? 'Changes pending' : ''}
        </p>
      </form>
      <SimulationControls ready={ready} onReset={onReset} allowSpeed />
      <button
        className="secondary-button replay-projectile"
        aria-label="Replay same conditions"
        onClick={onReplay}
        disabled={!ready}
      >
        Replay
      </button>
    </aside>
  );
}
