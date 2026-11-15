import { useState, type FormEvent } from 'react';
import {
  liftVectors,
  type GyroMode,
  type GyroParameters,
  type LiftSettings,
} from '../../physics/equations/gimbalGyroscope';
import { formatNumber as f } from '../../physics/units/format';
import { vectorMagnitude } from '../../physics/vectors/vectorMath';
import {
  DEFAULT_GYRO_VECTORS,
  VECTOR_OPTIONS,
  type GyroVector,
  type GyroVectorSettings,
} from './gyroViews';

const ROTOR_FIELDS = [
  { name: 'mass', label: 'Rotor mass', unit: 'kg', min: 0.2, max: 10 },
  { name: 'radius', label: 'Rotor radius', unit: 'm', min: 0.05, max: 1 },
  { name: 'spin', label: 'Initial spin', unit: 'rad/s', min: -100, max: 100 },
  { name: 'gravity', label: 'Gravity', unit: 'm/s²', min: 0, max: 15 },
] as const;

const LIFT_FIELDS = [
  { name: 'force', label: 'Force', unit: 'N', min: 0, max: 10, step: 0.1 },
  {
    name: 'lever',
    label: 'Lever arm',
    unit: 'm',
    min: 0.05,
    max: 0.75,
    step: 0.01,
  },
  {
    name: 'angle',
    label: 'Force angle',
    unit: '°',
    min: -180,
    max: 180,
    step: 1,
  },
] as const;

export function GyroSetup({
  mode,
  parameters,
  onApply,
  onSpin,
  onGravity,
  comparing,
}: {
  mode: GyroMode;
  parameters: GyroParameters;
  onApply: (parameters: GyroParameters) => void;
  onSpin: (spin: number) => void;
  onGravity: (gravity: number) => void;
  comparing: boolean;
}) {
  const [gravityDraft, setGravityDraft] = useState(parameters.gravity);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      mass: Number(data.get('mass')),
      radius: Number(data.get('radius')),
      spin: comparing ? parameters.spin : Number(data.get('spin')),
      gravity:
        mode === 'gravity' ? Number(data.get('gravity')) : parameters.gravity,
      friction: Number(data.get('friction')),
    };
    if (
      !ROTOR_FIELDS.every(
        ({ name, min, max }) =>
          Number.isFinite(next[name]) && next[name] >= min && next[name] <= max,
      )
    )
      return;
    onApply(next);
  }

  return (
    <form className="gyro-form" onSubmit={submit}>
      <h2>Rotor setup</h2>
      {ROTOR_FIELDS.filter(
        ({ name }) => name !== 'gravity' && (name !== 'spin' || !comparing),
      ).map(({ name, label, unit, min, max }) => (
        <div className="parameter-field" key={name}>
          <label htmlFor={`gyro-${name}`}>{label}</label>
          <div className="number-field">
            <input
              id={`gyro-${name}`}
              name={name}
              type="number"
              min={min}
              max={max}
              step="any"
              defaultValue={parameters[name]}
              required
            />
            <span>{unit}</span>
          </div>
        </div>
      ))}
      {!comparing && (
        <div className="gyro-choices" role="group" aria-label="Spin presets">
          {[
            { name: 'No spin', speed: 0 },
            { name: 'Slow', speed: 10 },
            { name: 'Medium', speed: 30 },
            { name: 'Fast', speed: 60 },
          ].map(({ name, speed }) => (
            <button
              type="button"
              key={name}
              className="secondary-button"
              aria-pressed={parameters.spin === speed}
              onClick={() => onSpin(speed)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {mode === 'gravity' && (
        <>
          <label className="dancer-mode" htmlFor="gyro-gravity">
            <span className="spin-range-label">
              Gravity <output>{f(gravityDraft)} m/s²</output>
            </span>
            <input
              className="spin-range"
              id="gyro-gravity"
              name="gravity"
              type="range"
              min="0"
              max="15"
              step="0.01"
              value={gravityDraft}
              onChange={(event) => setGravityDraft(Number(event.target.value))}
            />
          </label>
          <div
            className="gyro-choices"
            role="group"
            aria-label="Gravity presets"
          >
            {[
              { label: 'Zero g', gravity: 0 },
              { label: 'Moon', gravity: 1.62 },
              { label: 'Earth', gravity: 9.81 },
            ].map(({ label, gravity }) => (
              <button
                type="button"
                key={label}
                className="secondary-button"
                aria-pressed={parameters.gravity === gravity}
                onClick={() => onGravity(gravity)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      <label className="dancer-mode">
        Bearing friction
        <select name="friction" defaultValue={parameters.friction}>
          <option value={0}>Ideal</option>
          <option value={0.003}>Low</option>
          <option value={0.012}>Medium</option>
        </select>
      </label>
      <button className="secondary-button" type="submit">
        Apply setup
      </button>
    </form>
  );
}

export function GyroLiftControls({
  lift,
  onChange,
  disabled,
}: {
  lift: LiftSettings;
  onChange: (lift: LiftSettings) => void;
  disabled: boolean;
}) {
  return (
    <div className="gyro-lift-controls">
      <h2>Lifting force</h2>
      {LIFT_FIELDS.map(({ name, label, unit, min, max, step }) => (
        <label key={name} className="dancer-mode">
          <span className="spin-range-label">
            {label}{' '}
            <output>
              {lift[name]} {unit}
            </output>
          </span>
          <input
            className="spin-range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={lift[name]}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...lift, [name]: Number(event.target.value) })
            }
          />
        </label>
      ))}
      <p className="physics-caption">
        One-second pulse · {f(vectorMagnitude(liftVectors(lift).torque))} N·m
      </p>
    </div>
  );
}

export function GyroLayerControls({
  mode,
  vectors,
  onVectors,
  geometry,
  onGeometry,
}: {
  mode: GyroMode;
  vectors: GyroVectorSettings;
  onVectors: (vectors: GyroVectorSettings) => void;
  geometry: boolean;
  onGeometry: (geometry: boolean) => void;
}) {
  const options: GyroVector[] = ['spin', 'momentum'];
  if (mode !== 'free')
    options.push(
      'lever',
      'force',
      'torque',
      mode === 'torque' ? 'impulse' : 'precession',
    );
  if (mode === 'gravity') options.push('trail');
  return (
    <details className="physics-details gyro-layers">
      <summary>Vector and geometry layers</summary>
      <div className="gyro-checkboxes">
        {options.map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={vectors[key]}
              onChange={(event) =>
                onVectors({ ...vectors, [key]: event.target.checked })
              }
            />
            {key === 'force' && mode === 'gravity'
              ? 'Weight mg'
              : VECTOR_OPTIONS[key]}
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={geometry}
            onChange={(event) => onGeometry(event.target.checked)}
          />
          XYZ axes
        </label>
        <button
          className="secondary-button"
          onClick={() => {
            onVectors(DEFAULT_GYRO_VECTORS);
            onGeometry(true);
          }}
        >
          Reset layers
        </button>
      </div>
    </details>
  );
}
