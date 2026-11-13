import { vectorMagnitude } from '../../physics/vectors/vectorMath';
import {
  AXES,
  MODES,
  numberText as n,
  tupleText,
  type VectorCalculation,
} from './model';

const SUBSCRIPTS = ['ₓ', 'ᵧ', '𝓏'];

export function VectorReadouts({ values }: { values: VectorCalculation }) {
  const { mode, result } = values;
  return (
    <p className="vector-answer">
      {MODES[mode].equation} ={' '}
      <output
        aria-label={mode === 'dot' ? 'Scalar result' : 'Vector result'}
        data-testid="vector-result"
      >
        {typeof result === 'number' ? n(result) : tupleText(result)}
      </output>
    </p>
  );
}

export function VectorDetails({ values }: { values: VectorCalculation }) {
  return (
    <details className="vector-details">
      <summary>Steps</summary>
      <Calculation values={values} />
    </details>
  );
}

function Calculation({ values }: { values: VectorCalculation }) {
  const { a, mode, result } = values;
  if (mode === 'scale') {
    return (
      <p className="vector-formula">
        {n(values.scalar)} · {tupleText(a)} = ⟨
        {a
          .map((component) => `(${n(values.scalar)})(${n(component)})`)
          .join(', ')}
        ⟩ = {tupleText(result)}
      </p>
    );
  }
  const { b } = values;
  if (mode === 'add' || mode === 'subtract') {
    const sign = mode === 'add' ? '+' : '−';
    return (
      <p className="vector-formula">
        {tupleText(a)} {sign} {tupleText(b)} = ⟨
        {a
          .map((component, i) => `${n(component)} ${sign} (${n(b[i])})`)
          .join(', ')}
        ⟩ = {tupleText(result)}
      </p>
    );
  }
  const angle =
    values.theta === null
      ? 'Undefined'
      : `${n((values.theta * 180) / Math.PI)}°`;
  return (
    <>
      <dl className="vector-rows">
        <div>
          <dt>|A|</dt>
          <dd>{n(vectorMagnitude(a))}</dd>
        </div>
        <div>
          <dt>|B|</dt>
          <dd>{n(vectorMagnitude(b))}</dd>
        </div>
        <div>
          <dt>θ</dt>
          <dd>{angle}</dd>
        </div>
      </dl>
      {mode === 'dot' ? (
        <>
          <p className="vector-formula">
            AₓBₓ + AᵧBᵧ + A𝓏B𝓏 ={' '}
            {a
              .map((component, i) => `(${n(component)})(${n(b[i])})`)
              .join(' + ')}{' '}
            = {n(result)}
          </p>
          {values.theta !== null && (
            <p className="vector-formula">|A||B| cos θ ≈ {n(result)}</p>
          )}
          <dl className="vector-rows">
            <div>
              <dt>A onto B</dt>
              <dd>
                {values.projectionAB
                  ? tupleText(values.projectionAB)
                  : 'Undefined'}
              </dd>
            </div>
            <div>
              <dt>B onto A</dt>
              <dd>
                {values.projectionBA
                  ? tupleText(values.projectionBA)
                  : 'Undefined'}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p className="vector-formula">
            Area = |A × B| = {n(values.area)}
            {values.theta !== null && ' ≈ |A||B| sin θ'}
          </p>
          {AXES.map((axis, i) => {
            const j = (i + 1) % 3;
            const k = (i + 2) % 3;
            return (
              <p className="vector-formula" key={axis}>
                C{SUBSCRIPTS[i]} = ({n(a[j])})({n(b[k])}) − ({n(a[k])})(
                {n(b[j])}) = {n(result[i])}
              </p>
            );
          })}
          <p className="vector-formula">A × B = −(B × A)</p>
        </>
      )}
    </>
  );
}
