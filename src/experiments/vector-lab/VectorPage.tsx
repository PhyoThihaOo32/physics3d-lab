import { useState } from 'react';
import {
  CameraControls,
  type CameraPreset,
  type CameraView,
} from '../../components/controls/CameraControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { LabCanvas } from '../../three/scene/LabCanvas';
import {
  APPLICATIONS,
  AXES,
  COMPONENT_LIMIT,
  MODES,
  PRESETS,
  analyzeVectors,
  draftVector,
  numberText,
  parseVector,
  particleMomentum,
  tupleText,
  type ApplicationId,
  type DraftVector,
  type VectorMode,
  type VectorPair,
} from './model';
import { ApplicationResult, VectorReadouts } from './VectorReadouts';
import { VectorScene } from './VectorScene';
import './vector.css';

const CENTER = [0, 0, 0] as const;

export default function VectorPage() {
  const [a, setA] = useState(() => draftVector(PRESETS[0].vectors[0]));
  const [b, setB] = useState(() => draftVector(PRESETS[0].vectors[1]));
  const [mode, setMode] = useState<VectorMode>('components');
  const [application, setApplication] = useState<ApplicationId | ''>('');
  const [mass, setMass] = useState('2');
  const [view, setView] = useState<CameraView>({
    preset: 'Perspective',
    revision: 0,
  });
  const lesson = application ? APPLICATIONS[application] : null;
  const activeMode = lesson?.mode ?? mode;
  const first = parseVector(a);
  const second = parseVector(b);
  const massValue = Number(mass);
  const validMass =
    mass.trim() !== '' &&
    Number.isFinite(massValue) &&
    massValue > 0 &&
    massValue <= COMPONENT_LIMIT;
  const effectiveB =
    application === 'particle'
      ? second && validMass
        ? particleMomentum(second, massValue)
        : null
      : second;
  const values = first && effectiveB ? analyzeVectors(first, effectiveB) : null;
  const inputs = lesson?.symbols ?? ['A', 'B'];
  const names = [
    inputs[0],
    application === 'particle' ? 'p' : inputs[1],
  ] as const;
  const sceneLabels = [names[0], names[1], lesson?.output ?? 'A×B'] as const;
  const cross = activeMode === 'cross' || activeMode === 'compare';
  const combined = cross || activeMode === 'combine';
  const operandScale = values
    ? 3.95 /
      Math.max(
        3.95,
        combined
          ? values.lengthA + values.lengthB
          : Math.max(values.lengthA, values.lengthB),
      )
    : 1;
  const normalScale = values
    ? 3.95 / Math.max(3.95, values.lengthA * values.lengthB)
    : 1;
  function changeView(preset: CameraPreset) {
    setView((previous) => ({ preset, revision: previous.revision + 1 }));
  }
  function setVectors(vectors: VectorPair) {
    setA(draftVector(vectors[0]));
    setB(draftVector(vectors[1]));
  }
  function selectApplication(id: ApplicationId | '') {
    setApplication(id);
    if (id) setVectors(APPLICATIONS[id].vectors);
    else setVectors(PRESETS[0].vectors);
    setMass('2');
  }
  return (
    <div className="vector-lab">
      <header className="page-heading">
        <div>
          <h1>Vector Mathematics Lab</h1>
          <p>
            Build two vectors, rotate the scene, and see how each operation
            changes the result.
          </p>
        </div>
      </header>
      <div className="vector-modes" role="group" aria-label="Vector operation">
        {MODES.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            aria-pressed={!lesson && mode === id}
            onClick={() => {
              setApplication('');
              setMode(id);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="workspace vector-workspace">
        <aside
          className="setup-panel vector-settings"
          aria-labelledby="vector-settings-heading"
        >
          <h2 id="vector-settings-heading">Set the vectors</h2>
          <p>Enter components from −1,000 to 1,000.</p>
          <VectorFields
            symbol={inputs[0]}
            unit={lesson?.units[0]}
            draft={a}
            update={setA}
            color="a"
          />
          <VectorFields
            symbol={inputs[1]}
            unit={lesson?.units[1]}
            draft={b}
            update={setB}
            color="b"
          />
          {application === 'particle' && (
            <label className="vector-mass">
              Particle mass (kg)
              <input
                type="number"
                min="0"
                max={COMPONENT_LIMIT}
                step="any"
                value={mass}
                onChange={(event) => setMass(event.target.value)}
                aria-invalid={!validMass}
              />
            </label>
          )}
          {!values && (
            <p role="alert" className="vector-error">
              {!first || !second
                ? 'Enter a finite value within the component range in each field.'
                : 'Enter a mass greater than zero and at most 1,000 kg.'}
            </p>
          )}
          {!lesson && (
            <>
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
              <fieldset className="vector-presets">
                <legend>Examples</legend>
                <div>
                  {PRESETS.map(({ label, vectors }) => (
                    <button
                      type="button"
                      className="secondary-button"
                      key={label}
                      onClick={() => setVectors(vectors)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <label className="vector-application">
            Physics application
            <select
              value={application}
              onChange={(event) =>
                selectApplication(event.target.value as ApplicationId | '')
              }
            >
              <option value="">Vector mathematics</option>
              {Object.entries(APPLICATIONS).map(([id, item]) => (
                <option key={id} value={id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {lesson && (
            <>
              <p>{lesson.instruction}</p>
              {application === 'particle' && effectiveB && (
                <p className="vector-formula">
                  p = mv = {tupleText(effectiveB)} kg·m/s
                </p>
              )}
              {values && (
                <ApplicationResult
                  equation={lesson.equation}
                  result={lesson.mode === 'dot' ? values.dot : values.cross}
                  units={lesson.outputUnit}
                />
              )}
            </>
          )}
        </aside>
        <section className="scene-panel" aria-label="Vector diagram">
          <div className="scene-toolbar vector-toolbar">
            <strong>
              {lesson?.title ?? MODES.find((item) => item.id === mode)?.label}
            </strong>
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
                analysis={values}
                mode={activeMode}
                operandScale={operandScale}
                normalScale={normalScale}
                labels={sceneLabels}
              />
            </LabCanvas>
            <CameraControls view={view} onChange={changeView} />
            <ViewportHint />
          </div>
          <div className="vector-legend">
            <span className="vector-a">{names[0]}</span>
            <span className="vector-b">{names[1]}</span>
            {cross && (
              <span className="vector-normal">{sceneLabels[2]} normal</span>
            )}
            {activeMode === 'combine' && (
              <>
                <span className="vector-sum">A + B</span>
                <span className="vector-normal">A − B</span>
              </>
            )}
            {(activeMode === 'dot' || activeMode === 'compare') && (
              <>
                <span className="vector-projection-ab">
                  {names[0]} onto {names[1]}
                </span>
                <span className="vector-projection-ba">
                  {names[1]} onto {names[0]}
                </span>
              </>
            )}
          </div>
          {values && (operandScale !== 1 || cross) && (
            <p className="vector-note">
              {operandScale !== 1 &&
                `The scene uses 1 grid step per ${numberText(1 / operandScale)} input units. `}
              {cross &&
                'The normal uses its own length scale. The area and product values below use the original components.'}
            </p>
          )}
        </section>
      </div>
      <VectorReadouts values={values} mode={activeMode} names={names} />
    </div>
  );
}

function VectorFields({
  symbol,
  unit,
  draft,
  update,
  color,
}: {
  symbol: string;
  unit?: string;
  draft: DraftVector;
  update: (value: DraftVector) => void;
  color: 'a' | 'b';
}) {
  return (
    <fieldset className="vector-fields">
      <legend className={`vector-${color}`}>
        Vector {symbol}
        {unit && ` (${unit})`}
      </legend>
      <div className="vector-input-grid">
        {AXES.map((axis, i) => (
          <label key={axis}>
            {symbol}
            {['ₓ', 'ᵧ', '𝓏'][i]}
            <input
              aria-label={`${symbol}${axis}`}
              type="number"
              min={-COMPONENT_LIMIT}
              max={COMPONENT_LIMIT}
              step="any"
              value={draft[i]}
              aria-invalid={
                draft[i].trim() === '' ||
                Math.abs(Number(draft[i])) > COMPONENT_LIMIT
              }
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
