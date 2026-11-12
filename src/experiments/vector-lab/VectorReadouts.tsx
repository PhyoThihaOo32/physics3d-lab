import type { Vector3Tuple } from '../../types/vector';
import {
  AXES,
  numberText as n,
  tupleText,
  type VectorAnalysis,
  type VectorMode,
} from './model';

const angleText = (theta: number | null) =>
  theta === null ? 'Undefined' : `${n((theta * 180) / Math.PI)}°`;

export function VectorReadouts({
  values,
  mode,
  names,
}: {
  values: VectorAnalysis | null;
  mode: VectorMode;
  names: readonly [string, string];
}) {
  if (!values) return null;
  const {
    a,
    b,
    lengthA,
    lengthB,
    directionA,
    directionB,
    theta,
    dot,
    cross,
    area,
    projectionAB,
    projectionBA,
    sum,
    difference,
  } = values;
  const [A, B] = names;
  const dotLabel = `${A} · ${B}`;
  const crossLabel = `${A} × ${B}`;
  const components = mode === 'components' || mode === 'combine';
  const showDot = mode === 'dot' || mode === 'compare';
  const showCross = mode === 'cross' || mode === 'compare';
  const zero = theta === null;
  const dotState = zero
    ? 'The dot product is zero because one vector has zero length.'
    : dot === 0
      ? 'The vectors are perpendicular, so the dot product is zero.'
      : area === 0 && dot > 0
        ? 'The vectors point in the same direction. This is the maximum positive dot product for their magnitudes.'
        : area === 0
          ? 'The vectors point in opposite directions. This is the most negative dot product for their magnitudes.'
          : dot < 0
            ? 'The angle is obtuse, so the dot product is negative.'
            : 'The angle is acute, so the dot product is positive.';
  const crossState = zero
    ? 'A zero vector gives zero area and no normal direction.'
    : area === 0
      ? 'The vectors are collinear. The parallelogram collapses and the normal has no direction.'
      : dot === 0
        ? 'The vectors are perpendicular. The parallelogram has maximum area for these magnitudes.'
        : 'The normal is perpendicular to both input vectors.';
  return (
    <>
      <dl className="vector-summary" aria-label="Vector magnitudes and angle">
        <div>
          <dt>Magnitude |{A}|</dt>
          <dd>{n(lengthA)}</dd>
        </div>
        <div>
          <dt>Magnitude |{B}|</dt>
          <dd>{n(lengthB)}</dd>
        </div>
        <div>
          <dt>Angle θ</dt>
          <dd data-testid="vector-angle">{angleText(theta)}</dd>
        </div>
      </dl>
      {zero && (
        <p className="vector-note">
          A zero vector has no direction, so θ is undefined.
        </p>
      )}
      <div className="vector-results">
        {components && (
          <section
            className="vector-result"
            aria-labelledby="vector-components-heading"
          >
            <h2 id="vector-components-heading">
              {mode === 'combine'
                ? 'Combine the components'
                : 'Read the components'}
            </h2>
            <VectorRows
              rows={[
                [A, tupleText(a)],
                [B, tupleText(b)],
                ...(mode === 'combine'
                  ? ([
                      ['A + B', tupleText(sum)],
                      ['A − B', tupleText(difference)],
                    ] as const)
                  : ([
                      [
                        `Unit direction of ${A}`,
                        directionA ? tupleText(directionA) : 'Undefined',
                      ],
                      [
                        `Unit direction of ${B}`,
                        directionB ? tupleText(directionB) : 'Undefined',
                      ],
                    ] as const)),
              ]}
            />
            <p>
              {mode === 'combine'
                ? 'A + B is the diagonal of the parallelogram. A − B also points from the tip of B to the tip of A.'
                : 'Follow the red x, green y, and blue z steps from the origin to each endpoint. Dividing a nonzero vector by its magnitude gives its unit direction.'}
            </p>
          </section>
        )}
        {showDot && (
          <section
            className="vector-result"
            aria-labelledby="vector-dot-heading"
          >
            <h2 id="vector-dot-heading">
              Dot product <span>Scalar</span>
            </h2>
            <p className="vector-equation">
              {dotLabel} = <strong data-testid="vector-dot">{n(dot)}</strong>
            </p>
            <p className="vector-formula">{`${A}ₓ${B}ₓ + ${A}ᵧ${B}ᵧ + ${A}𝓏${B}𝓏`}</p>
            <p className="vector-formula">
              {a.map((value, i) => `(${n(value)})(${n(b[i])})`).join(' + ')} ={' '}
              {n(dot)}
            </p>
            <p className="vector-formula">
              |{A}||{B}| cos θ
              {theta !== null &&
                ` = (${n(lengthA)})(${n(lengthB)}) cos ${angleText(theta)} ≈ ${n(dot)}`}
            </p>
            <p>{dotState}</p>
            <VectorRows
              rows={[
                [A, tupleText(a)],
                [B, tupleText(b)],
                [
                  `${A} onto ${B}`,
                  projectionAB ? tupleText(projectionAB) : 'Undefined',
                ],
                [
                  `${B} onto ${A}`,
                  projectionBA ? tupleText(projectionBA) : 'Undefined',
                ],
              ]}
            />
            <p>
              Follow the dashed perpendicular from a tip to the other vector’s
              axis. The signed length along that axis is |{A}| cos θ for the
              projection of {A} onto {B}.
            </p>
          </section>
        )}
        {showCross && (
          <section
            className="vector-result"
            aria-labelledby="vector-cross-heading"
          >
            <h2 id="vector-cross-heading">
              Cross product <span>Vector</span>
            </h2>
            <p className="vector-equation">
              {crossLabel} ={' '}
              <strong data-testid="vector-cross">{tupleText(cross)}</strong>
            </p>
            <VectorRows
              rows={[
                [A, tupleText(a)],
                [B, tupleText(b)],
                ['Parallelogram area', n(area)],
                [
                  'Perpendicular height h',
                  lengthA > 0 ? n(area / lengthA) : 'Undefined',
                ],
              ]}
            />
            <p className="vector-formula">
              Area = |{crossLabel}| = |{A}||{B}| sin θ
              {theta !== null && ` ≈ ${n(area)}`}
            </p>
            <p>
              {crossState} The base is |{A}|. The dashed height h is |{B}| sin θ
              when θ is defined.
            </p>
            <details className="vector-determinant">
              <summary>Determinant form</summary>
              <table aria-label={`Determinant for ${crossLabel}`}>
                <thead>
                  <tr>
                    <th scope="col">î</th>
                    <th scope="col">ĵ</th>
                    <th scope="col">k̂</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {a.map((value, i) => (
                      <td key={AXES[i]}>{n(value)}</td>
                    ))}
                  </tr>
                  <tr>
                    {b.map((value, i) => (
                      <td key={AXES[i]}>{n(value)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </details>
            <div
              className="vector-cross-terms"
              aria-label="Cross product component calculations"
            >
              {AXES.map((axis, i) => {
                const j = (i + 1) % 3;
                const k = (i + 2) % 3;
                return (
                  <p className="vector-formula" key={axis}>
                    {`C${['ₓ', 'ᵧ', '𝓏'][i]} = ${A}${['ₓ', 'ᵧ', '𝓏'][j]}${B}${['ₓ', 'ᵧ', '𝓏'][k]} − ${A}${['ₓ', 'ᵧ', '𝓏'][k]}${B}${['ₓ', 'ᵧ', '𝓏'][j]}`}
                    <br />
                    {`= (${n(a[j])})(${n(b[k])}) − (${n(a[k])})(${n(b[j])}) = ${n(cross[i])}`}
                  </p>
                );
              })}
            </div>
            <h3>Right-hand rule</h3>
            <p>
              Curl the fingers of your right hand from {A} toward {B}, following
              the curved arrow. Your thumb points along {crossLabel}.
            </p>
            <p className="vector-formula">x̂ × ŷ = +ẑ · ŷ × x̂ = −ẑ</p>
            <p className="vector-formula">
              {crossLabel} = −({B} × {A})
            </p>
            <p>
              Swapping the two operands reverses the normal and keeps its
              magnitude and area.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

function VectorRows({
  rows,
}: {
  rows: readonly (readonly [string, string])[];
}) {
  return (
    <dl className="vector-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ApplicationResult({
  equation,
  result,
  units,
}: {
  equation: string;
  result: number | Vector3Tuple;
  units: string;
}) {
  return (
    <p className="vector-application-result">
      {equation}
      <br />
      <strong data-testid="vector-application-result">
        {typeof result === 'number' ? n(result) : tupleText(result)} {units}
      </strong>
    </p>
  );
}
