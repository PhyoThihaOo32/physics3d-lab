import { formatNumber as f } from '../../physics/units/format';
export function EnergyCheck({
  initial,
  current,
}: {
  initial: number;
  current: number;
}) {
  const difference = current - initial;
  const percent =
    Math.abs(initial) < 1e-12 ? null : Math.abs(difference / initial) * 100;
  return (
    <div className="energy-check">
      <div>
        <span className="section-label">Flight energy</span>
        <strong>E = ½m|v|² + mgh</strong>
      </div>
      <dl>
        <div>
          <dt>Initial E</dt>
          <dd>{f(initial, 3)} J</dd>
        </div>
        <div>
          <dt>Measured E</dt>
          <dd>{f(current, 3)} J</dd>
        </div>
        <div>
          <dt>Difference</dt>
          <dd>{f(difference, 3)} J</dd>
        </div>
        <div>
          <dt>Relative drift</dt>
          <dd>
            {percent === null ? '— (zero initial energy)' : `${f(percent, 3)}%`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
