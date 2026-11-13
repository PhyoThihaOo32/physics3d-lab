import { Measurement } from '../../components/measurements/Measurement';
import { formatNumber as f } from '../../physics/units/format';
import {
  launchVelocity,
  predictProjectile,
  projectileAtTime,
} from '../../physics/equations/projectile';
import { vectorMagnitude } from '../../physics/vectors/vectorMath';
import { useProjectileStore } from '../../store/projectileStore';
import type { ProjectileParameters } from './config';
import { mechanicalEnergy } from '../../physics/equations/energy';
import { EnergyCheck } from '../../components/measurements/EnergyCheck';

export function ProjectileMeasurementsPanel() {
  const snapshot = useProjectileStore((state) => state.snapshot);
  const sample = snapshot.landing ? snapshot.lastAirborne : snapshot;
  return (
    <>
      <div
        className="measurements projectile-measurements"
        aria-label="Flight measurements"
      >
        <Measurement
          label="HORIZONTAL x"
          value={f(sample.position[0])}
          unit="m"
          testId="projectile-x"
        />
        <Measurement
          label="HEIGHT h = y − r"
          value={f(sample.position[1])}
          unit="m"
          testId="projectile-height"
        />
        <Measurement
          label="SPEED |v|"
          value={f(vectorMagnitude(sample.velocity))}
          unit="m/s"
          testId="projectile-speed"
        />
        <Measurement
          label="SAMPLE TIME"
          value={f(sample.time, 3)}
          unit="s"
          testId="projectile-sample-time"
        />
        <Measurement
          label="VELOCITY vₓ"
          value={f(sample.velocity[0])}
          unit="m/s"
          testId="projectile-vx"
        />
        <Measurement
          label="VELOCITY vᵧ"
          value={f(sample.velocity[1])}
          unit="m/s"
          testId="projectile-vy"
        />
        <Measurement
          label="ACCELERATION aₓ"
          value={f(sample.acceleration?.[0] ?? null)}
          unit="m/s²"
          testId="projectile-ax"
        />
        <Measurement
          label="ACCELERATION aᵧ"
          value={f(sample.acceleration?.[1] ?? null)}
          unit="m/s²"
          testId="projectile-ay"
        />
      </div>
      {snapshot.landing && (
        <div className="measurement-note">Last airborne sample</div>
      )}
    </>
  );
}
export function ProjectileReadouts({
  parameters,
}: {
  parameters: ProjectileParameters;
}) {
  const snapshot = useProjectileStore((state) => state.snapshot);
  const s = snapshot.lastAirborne;
  const theory = projectileAtTime(parameters, s.time);
  const prediction = predictProjectile(parameters);
  const initialVelocity = launchVelocity(parameters);
  const [vx, vy] = initialVelocity;
  const comparison = [
    { label: 'x (m)', measured: s.position[0], predicted: theory.position[0] },
    { label: 'h (m)', measured: s.position[1], predicted: theory.position[1] },
    {
      label: 'vₓ (m/s)',
      measured: s.velocity[0],
      predicted: theory.velocity[0],
    },
    {
      label: 'vᵧ (m/s)',
      measured: s.velocity[1],
      predicted: theory.velocity[1],
    },
    {
      label: 'aₓ (m/s²)',
      measured: s.acceleration?.[0] ?? null,
      predicted: theory.acceleration[0],
    },
    {
      label: 'aᵧ (m/s²)',
      measured: s.acceleration?.[1] ?? null,
      predicted: theory.acceleration[1],
    },
  ];
  const results = [
    {
      name: 'Flight time (s)',
      value: snapshot.landing?.time ?? null,
      predicted: prediction.flightTime,
      testId: 'flight-time',
    },
    {
      name: 'Range (m)',
      value: snapshot.landing?.range ?? null,
      predicted: prediction.range,
      testId: 'flight-range',
    },
    {
      name: 'Maximum height h (m)',
      value: snapshot.maxHeight,
      predicted: prediction.maxHeight,
      testId: 'flight-max-height',
      note: snapshot.landing || snapshot.apex ? '' : 'So far',
    },
    {
      name: 'Pre-impact speed (m/s)',
      value: snapshot.landing
        ? vectorMagnitude(snapshot.landing.preImpact.velocity)
        : null,
      predicted: prediction.impactSpeed,
      testId: 'impact-speed',
      note: snapshot.landing
        ? `At t = ${f(snapshot.landing.preImpact.time, 3)} s`
        : '',
    },
  ];
  return (
    <>
      <section
        className="theory-panel flight-results"
        aria-labelledby="flight-results-title"
      >
        <div className="theory-heading">
          <div>
            <h2 id="flight-results-title">Flight results</h2>
          </div>
        </div>
        <div className="comparison-table">
          <table>
            <caption className="sr-only">
              Measured flight results and analytical predictions
            </caption>
            <thead>
              <tr>
                <th scope="col">Result</th>
                <th scope="col">Measured</th>
                <th scope="col">Predicted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.name}>
                  <th scope="row">
                    {row.name}
                    {row.note && <small>{row.note}</small>}
                  </th>
                  <td>
                    <output data-testid={row.testId}>{f(row.value, 3)}</output>
                  </td>
                  <td>{f(row.predicted, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parameters.gravity === 0 && (
          <p className="physics-caption">
            No landing at g = 0. Trial ends at 10 s.
          </p>
        )}
      </section>
      <section
        className="theory-panel"
        aria-labelledby="projectile-equations-title"
      >
        <div className="theory-heading">
          <div>
            <h2 id="projectile-equations-title">Theory</h2>
          </div>
          <span>
            {snapshot.landing ? 'Last airborne sample' : 'Live sample'} · t ={' '}
            {f(s.time, 3)} s
          </span>
        </div>
        <div className="comparison-layout">
          <div className="equations">
            <div>
              <strong>v₀ₓ = v₀ cos θ · v₀ᵧ = v₀ sin θ</strong>
              <span>
                v₀ₓ = {f(parameters.speed)} cos({f(parameters.angle, 0)}°) ={' '}
                {f(vx)} m/s
                <br />
                v₀ᵧ = {f(parameters.speed)} sin({f(parameters.angle, 0)}°) ={' '}
                {f(vy)} m/s
              </span>
            </div>
            <div>
              <strong>x = v₀ₓt</strong>
              <span>
                x = ({f(vx)})({f(s.time, 3)}) = {f(theory.position[0])} m
              </span>
            </div>
            <div>
              <strong>h = h₀ + v₀ᵧt − ½gt²</strong>
              <span>
                h = {f(parameters.height)} + ({f(vy)})({f(s.time, 3)}) − ½(
                {f(parameters.gravity)})({f(s.time, 3)})² ={' '}
                {f(theory.position[1])} m
              </span>
            </div>
            <div>
              <strong>vᵧ = v₀ᵧ − gt · aᵧ = −g</strong>
              <span>
                vᵧ = {f(vy)} − ({f(parameters.gravity)})({f(s.time, 3)}) ={' '}
                {f(theory.velocity[1])} m/s
                <br />
                aₓ = 0 · aᵧ = −{f(parameters.gravity)} m/s²
              </span>
            </div>
          </div>
          <div className="comparison-table">
            <table>
              <caption className="sr-only">
                Rapier and analytical values at the same airborne time
              </caption>
              <thead>
                <tr>
                  <th scope="col">Quantity</th>
                  <th scope="col">Measured</th>
                  <th scope="col">Theory</th>
                  <th scope="col">Difference</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{f(row.measured, 3)}</td>
                    <td>{f(row.predicted, 3)}</td>
                    <td>
                      {f(
                        row.measured === null
                          ? null
                          : row.measured - row.predicted,
                        3,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <EnergyCheck
        initial={mechanicalEnergy(
          parameters.mass,
          parameters.gravity,
          parameters.height,
          initialVelocity,
        )}
        current={mechanicalEnergy(
          parameters.mass,
          parameters.gravity,
          s.position[1],
          s.velocity,
        )}
      />
    </>
  );
}
