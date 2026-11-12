import { useState } from 'react';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { vectorMagnitude } from '../../physics/vectors/vectorMath';
import { LabCanvas } from '../../three/scene/LabCanvas';
import {
  AXES,
  COMPONENT_LIMIT,
  MODES,
  PRESETS,
  calculateVectorOperation,
  draftVector,
  numberText,
  parseComponent,
  parseVector,
  type DraftVector,
  type VectorMode,
} from './model';
import { VectorReadouts, VectorDetails } from './VectorReadouts';
import { VectorScene } from './VectorScene';
import './vector.css';

const CENTER = [0, 0, 0] as const;
const SUBSCRIPTS = ['ₓ', 'ᵧ', '𝓏'];
const ZERO = [0, 0, 0] as const;
const SCENE_LIMIT = 3.95;

export default function VectorPage() {
  const [a, setA] = useState(() => draftVector(PRESETS[0].vectors[0]));
  const [b, setB] = useState(() => draftVector(PRESETS[0].vectors[1]));
  const [scalar, setScalar] = useState('2');
  const [mode, setMode] = useState<VectorMode>('add');
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
  const scaling = mode === 'scale';
  const product = mode === 'dot' || mode === 'cross';
  const first = parseVector(a);
  const second = scaling ? ZERO : parseVector(b);
  const factor = scaling ? parseComponent(scalar) : 1;
  const values =
    first && second && factor !== null
      ? calculateVectorOperation(mode, first, second, factor)
      : null;
  const lengthA = first ? vectorMagnitude(first) : 0;
  const lengthB = second ? vectorMagnitude(second) : 0;
  const resultLength =
    values && typeof values.result !== 'number'
      ? vectorMagnitude(values.result)
      : 0;
  const operandScale =
    SCENE_LIMIT /
    Math.max(
      SCENE_LIMIT,
      lengthA,
      lengthB,
      mode === 'cross' ? lengthA + lengthB : resultLength,
    );
  const normalScale = Math.min(
    operandScale,
    SCENE_LIMIT / Math.max(SCENE_LIMIT, resultLength),
  );
  const separateNormalScale = mode === 'cross' && normalScale !== operandScale;
  function changeView(preset: CameraPreset) {
    setView((previous) => ({ preset, revision: previous.revision + 1 }));
  }
  return (
    <div className="vector-lab">
      <header className="page-heading">
        <div>
          <h1>Vector Mathematics Lab</h1>
          <p>
            Choose an operation and edit the values to see the calculation and
            its 3D diagram.
          </p>
        </div>
      </header>
      <div className="vector-modes" role="group" aria-label="Vector operation">
        {(Object.keys(MODES) as VectorMode[]).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
          >
            {MODES[id].label}{' '}
            <span aria-hidden="true">{MODES[id].equation}</span>
          </button>
        ))}
      </div>
      <div className="workspace vector-workspace">
        <aside
          className="setup-panel vector-settings"
          aria-labelledby="vector-settings-heading"
        >
          <h2 id="vector-settings-heading">
            {scaling ? 'Vector and multiplier' : 'Vectors A and B'}
          </h2>
          <VectorFields symbol="A" draft={a} update={setA} />
          {scaling ? (
            <label className="vector-scalar">
              Scalar multiplier k
              <input
                type="number"
                min={-COMPONENT_LIMIT}
                max={COMPONENT_LIMIT}
                step="any"
                value={scalar}
                onChange={(event) => setScalar(event.target.value)}
                aria-invalid={factor === null}
              />
            </label>
          ) : (
            <VectorFields symbol="B" draft={b} update={setB} />
          )}
          {values ? (
            <VectorReadouts values={values} />
          ) : (
            <p role="alert" className="vector-error">
              Enter a number between −1,000 and 1,000 in each field.
            </p>
          )}
          {!scaling && (
            <button
              type="button"
              className="secondary-button vector-swap"
              onClick={() => {
                setA(b);
                setB(a);
              }}
            >
              Swap A and B
            </button>
          )}
          {product && (
            <fieldset className="vector-presets">
              <legend>Examples</legend>
              <div>
                {PRESETS.map(({ label, vectors }) => (
                  <button
                    type="button"
                    className="secondary-button"
                    key={label}
                    onClick={() => {
                      setA(draftVector(vectors[0]));
                      setB(draftVector(vectors[1]));
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </aside>
        <section className="scene-panel" aria-label="Vector diagram">
          <div className="scene-toolbar vector-toolbar">
            <strong>{MODES[mode].equation}</strong>
            <span>+y up · right-handed axes</span>
          </div>
          <div className="viewport vector-viewport">
            <LabCanvas
              view={view}
              frameHeight={7.6}
              frameWidth={6.8}
              center={CENTER}
              minFrameDistance={10.8}
              minOrbitDistance={2}
              sceneExtent={6}
              fullOrbit
              label="3D vector diagram with an orbiting camera"
            >
              <VectorScene
                values={values}
                operandScale={operandScale}
                normalScale={normalScale}
              />
            </LabCanvas>
            <CameraControls view={view} onChange={changeView} />
            <ViewportHint />
          </div>
          <div className="vector-legend">
            <span className="vector-a">A</span>
            {!scaling && <span className="vector-b">B</span>}
            {mode === 'dot' ? (
              <>
                <span className="vector-projection-ab">A onto B</span>
                <span className="vector-projection-ba">B onto A</span>
              </>
            ) : (
              <span
                className={
                  mode === 'cross' ? 'vector-normal' : 'vector-result-arrow'
                }
              >
                {MODES[mode].equation}
              </span>
            )}
          </div>
          {values && (operandScale !== 1 || separateNormalScale) && (
            <p className="vector-note">
              {operandScale !== 1 &&
                `Each grid step represents ${numberText(1 / operandScale)} input units. `}
              {separateNormalScale && 'The normal has a separate length scale.'}
            </p>
          )}
        </section>
      </div>
      {values && <VectorDetails key={values.mode} values={values} />}
    </div>
  );
}

function VectorFields({
  symbol,
  draft,
  update,
}: {
  symbol: 'A' | 'B';
  draft: DraftVector;
  update: (value: DraftVector) => void;
}) {
  return (
    <fieldset className="vector-fields">
      <legend className={symbol === 'A' ? 'vector-a' : 'vector-b'}>
        Vector {symbol}
      </legend>
      <div className="vector-input-grid">
        {AXES.map((axis, i) => (
          <label key={axis}>
            {symbol}
            {SUBSCRIPTS[i]}
            <input
              aria-label={`${symbol}${axis}`}
              type="number"
              min={-COMPONENT_LIMIT}
              max={COMPONENT_LIMIT}
              step="any"
              value={draft[i]}
              aria-invalid={parseComponent(draft[i]) === null}
              onChange={(event) => {
                const next: DraftVector = [...draft];
                next[i] = event.target.value;
                update(next);
              }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
