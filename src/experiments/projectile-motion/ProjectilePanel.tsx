import { useState, type FormEvent } from 'react';
import { SimulationControls } from '../../components/controls/SimulationControls';
import { launchVelocity } from '../../physics/equations/projectile';
import { formatNumber as f } from '../../physics/units/format';
import {
  PROJECTILE_LIMITS,
  projectileParameterError,
  type ProjectileParameters,
} from './config';
const FIELDS = [
  { key: 'speed', label: 'Launch speed', unit: 'm/s' },
  { key: 'angle', label: 'Launch angle', unit: '°' },
  { key: 'height', label: 'Launch height h₀', unit: 'm' },
  { key: 'gravity', label: 'Gravity magnitude', unit: 'm/s²' },
  { key: 'mass', label: 'Sphere mass', unit: 'kg' },
] as const;
export function ProjectilePanel({
  parameters,
  ready,
  complete,
  onApply,
  onReset,
  onReplay,
}: {
  parameters: ProjectileParameters;
  ready: boolean;
  complete: boolean;
  onApply: (parameters: ProjectileParameters) => void;
  onReset: () => void;
  onReplay: () => void;
}) {
  const [draft, setDraft] = useState<
    Record<keyof ProjectileParameters, string>
  >({
    speed: String(parameters.speed),
    angle: String(parameters.angle),
    height: String(parameters.height),
    gravity: String(parameters.gravity),
    mass: String(parameters.mass),
  });
  const [error, setError] = useState('');
  const parsed: ProjectileParameters = {
    speed: Number(draft.speed),
    angle: Number(draft.angle),
    height: Number(draft.height),
    gravity: Number(draft.gravity),
    mass: Number(draft.mass),
  };
  const dirty = FIELDS.some(
    ({ key }) => draft[key].trim() === '' || parsed[key] !== parameters[key],
  );
  const [vx, vy] = launchVelocity(parameters);
  function apply(event: FormEvent) {
    event.preventDefault();
    const problem = FIELDS.some(({ key }) => draft[key].trim() === '')
      ? 'Enter all values.'
      : projectileParameterError(parsed);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    onApply(parsed);
  }
  return (
    <aside className="setup-panel projectile-panel" aria-label="Settings">
      <form onSubmit={apply} noValidate>
        <div className="parameter-fields">
          {FIELDS.map(({ key, label, unit }) => (
            <div className="parameter-field" key={key}>
              <label htmlFor={`projectile-${key}`}>{label}</label>
              <div className="number-field">
                <input
                  id={`projectile-${key}`}
                  type="number"
                  inputMode="decimal"
                  {...PROJECTILE_LIMITS[key]}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                  aria-describedby={`projectile-${key}-limits`}
                />
                <span>{unit}</span>
              </div>
              <small id={`projectile-${key}-limits`}>
                {key === 'gravity'
                  ? '0 or 1–20 m/s²'
                  : `${PROJECTILE_LIMITS[key].min}–${PROJECTILE_LIMITS[key].max} ${unit}`}
              </small>
            </div>
          ))}
        </div>
        {error && (
          <p className="validation-error" role="alert">
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
      <div className="launch-components">
        <span className="section-label sr-only">Applied launch components</span>
        <span>v₀ₓ = {f(vx)} m/s</span>
        <span>v₀ᵧ = {f(vy)} m/s</span>
      </div>
      <SimulationControls
        ready={ready}
        onReset={onReset}
        startLabel="Launch"
        complete={complete}
        allowSpeed
      />
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
