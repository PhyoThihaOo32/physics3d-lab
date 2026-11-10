import { useState, type FormEvent } from 'react';
import { SimulationControls } from '../../components/controls/SimulationControls';
import { launchVelocity } from '../../physics/equations/projectile';
import { formatNumber as f } from '../../physics/units/format';
import {
  PROJECTILE_LIMITS,
  projectileParameterError,
  type ProjectileParameters,
  PROJECTILE,
} from './config';
const FIELDS = [
  { key: 'speed', label: 'Launch speed', symbol: 'v₀', unit: 'm/s' },
  { key: 'angle', label: 'Launch angle', symbol: 'θ', unit: '°' },
  { key: 'height', label: 'Launch height h₀', symbol: 'h₀', unit: 'm' },
  { key: 'gravity', label: 'Gravity magnitude', symbol: 'g', unit: 'm/s²' },
  { key: 'mass', label: 'Sphere mass', symbol: 'm', unit: 'kg' },
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
      ? 'Fill in every initial-condition field.'
      : projectileParameterError(parsed);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    onApply(parsed);
  }
  return (
    <aside
      className="setup-panel projectile-panel"
      aria-labelledby="projectile-controls-title"
    >
      <div className="panel-kicker">EXPERIMENT 002</div>
      <h2 id="projectile-controls-title">Set your launch</h2>
      <p className="panel-description">
        A sphere in an ideal vacuum. Gravity is the only force during flight.
      </p>
      <form onSubmit={apply} noValidate>
        <div className="section-label">
          INITIAL CONDITIONS <span>SI UNITS</span>
        </div>
        <div className="parameter-fields">
          {FIELDS.map(({ key, label, symbol, unit }) => (
            <div className="parameter-field" key={key}>
              <label htmlFor={`projectile-${key}`}>
                <span className="parameter-symbol" aria-hidden="true">
                  {symbol}
                </span>
                {label}
              </label>
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
          disabled={!dirty}
        >
          Apply & reset trial
        </button>
        <p className="button-caption">
          {dirty
            ? 'Pending changes; the current trial keeps its settings.'
            : 'Conditions applied. Launch when you are ready.'}
        </p>
      </form>
      <div className="launch-components">
        <span className="section-label">APPLIED LAUNCH COMPONENTS</span>
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
        onClick={onReplay}
        disabled={!ready}
      >
        ↻ Replay same conditions
      </button>
      <p className="parameter-caption">
        h₀ is the center’s height above its ground-contact level. Positive y is
        up. The center starts at y ={' '}
        {(parameters.height + PROJECTILE.radius).toFixed(2)} m. Playback speed
        changes viewing time, not the physics.
      </p>
    </aside>
  );
}
