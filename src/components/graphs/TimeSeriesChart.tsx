import { formatNumber as f } from '../../physics/units/format';
export interface ChartPoint {
  time: number;
  value: number;
  reference?: number;
}
/** Independent SI scales prevent normalized curves from disguising conservation errors. */
export function TimeSeriesChart({
  title,
  unit,
  color,
  points,
  referenceLabel,
}: {
  title: string;
  unit: string;
  color: string;
  points: ChartPoint[];
  referenceLabel?: string;
}) {
  const values = points.flatMap((p) =>
    p.reference === undefined ? [p.value] : [p.value, p.reference],
  );
  let low = Math.min(0, ...values),
    high = Math.max(0, ...values);
  if (high - low < 0.1) high = low + 1;
  const span = high - low;
  high += span * 0.12;
  if (low < 0) low -= span * 0.12;
  const timeMax = Math.max(10, Math.ceil((points.at(-1)?.time ?? 0) / 10) * 10);
  const x = (t: number) => 53 + (t / timeMax) * 295;
  const y = (v: number) => 143 - ((v - low) / (high - low)) * 116;
  const path = (reference = false) =>
    points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${x(p.time).toFixed(2)},${y(reference ? (p.reference ?? p.value) : p.value).toFixed(2)}`,
      )
      .join(' ');
  const last = points.at(-1);
  return (
    <figure className="time-chart">
      <figcaption>
        <span>{title}</span>
        <strong style={{ color }}>
          {f(last?.value ?? 0, 3)} <small>{unit}</small>
        </strong>
      </figcaption>
      <svg
        viewBox="0 0 370 180"
        role="img"
        aria-label={`${title} versus time in seconds; units ${unit}. Latest value ${f(last?.value ?? 0, 3)}.`}
      >
        {[0, 0.5, 1].map((t) => {
          const value = low + t * (high - low);
          return (
            <g key={t}>
              <line
                x1="53"
                x2="348"
                y1={y(value)}
                y2={y(value)}
                stroke="#344651"
              />
              <text x="46" y={y(value) + 3} textAnchor="end">
                {f(value, 2)}
              </text>
            </g>
          );
        })}
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={x(timeMax * t)} y="162" textAnchor="middle">
            {f(timeMax * t, 0)} s
          </text>
        ))}
        <path d={path()} fill="none" stroke={color} strokeWidth="2.3" />
        {referenceLabel && (
          <path
            d={path(true)}
            fill="none"
            stroke="#f2d398"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}
        {last && (
          <circle cx={x(last.time)} cy={y(last.value)} r="3" fill={color} />
        )}
      </svg>
      {referenceLabel && (
        <p className="chart-legend">
          Solid: measured · dashed: {referenceLabel}
        </p>
      )}
    </figure>
  );
}
