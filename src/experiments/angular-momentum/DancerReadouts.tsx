import { Measurement } from '../../components/measurements/Measurement';
import { formatNumber as f } from '../../physics/units/format';
import { useDancerStore } from '../../store/dancerStore';
import {
  dancerInertia,
  type DancerParameters,
} from '../../physics/equations/angularMomentum';
import { useSimulationStore } from '../../store/simulationStore';
export function DancerReadouts({
  parameters,
}: {
  parameters: DancerParameters;
}) {
  const s = useDancerStore((state) => state.snapshot);
  const expected = s.initialMomentum + s.impulse;
  return (
    <>
      <div
        className="measurements dancer-measurements"
        aria-label="Live rotation measurements"
      >
        <Measurement
          label="Hand radius from axis"
          value={f(s.radius, 3)}
          unit="m"
          testId="hand-radius"
        />
        <Measurement
          label="Moment of inertia Iᵧ"
          value={f(s.inertia, 3)}
          unit="kg·m²"
          testId="inertia"
        />
        <Measurement
          label="Angular velocity ωᵧ"
          value={f(s.omega, 3)}
          unit="rad/s"
          testId="omega"
        />
        <Measurement
          label="Rotation rate"
          value={f((s.omega * 60) / (2 * Math.PI), 2)}
          unit="rpm"
          testId="rpm"
        />
        <Measurement
          label="Angular momentum Lᵧ"
          value={f(s.momentum, 3)}
          unit="kg·m²/s"
          testId="momentum"
        />
        <Measurement
          label="Spin kinetic energy K"
          value={f(s.energy, 3)}
          unit="J"
          testId="spin-energy"
        />
      </div>
      <section
        className="theory-panel dancer-theory"
        aria-labelledby="dancer-theory-title"
      >
        <div className="theory-heading">
          <div>
            <div className="section-label">PREDICT · MEASURE · EXPLAIN</div>
            <h2 id="dancer-theory-title">Lᵧ = Iᵧ ωᵧ</h2>
          </div>
          <span>
            {parameters.resistance === 0
              ? 'IDEAL SUPPORT'
              : `RESISTANCE b = ${f(parameters.resistance)} N·m·s/rad`}
          </span>
        </div>
        <div className="dancer-balance">
          <div>
            <span>Expected Lᵧ = L₀ + ∫τᵧ dt</span>
            <strong>
              {f(expected, 3)} <small>kg·m²/s</small>
            </strong>
          </div>
          <div>
            <span>Predicted ωᵧ = expected Lᵧ / measured Iᵧ</span>
            <strong data-testid="predicted-omega">
              {f(expected / s.inertia, 3)} <small>rad/s</small>
            </strong>
          </div>
          <div>
            <span>Momentum balance residual</span>
            <strong data-testid="momentum-residual">
              {f(s.residual, 4)} <small>kg·m²/s</small>
            </strong>
          </div>
          <div>
            <span>External torque τᵧ</span>
            <strong>
              {f(s.torque, 3)} <small>N·m</small>
            </strong>
          </div>
        </div>
        <p className="physics-caption">
          Measured Lᵧ is summed from all five bodies’ spin and orbital angular
          momentum. It is independent of the Iᵧωᵧ comparison. Small
          discrepancies during movement reflect joint and timestep resolution.
        </p>
        <div className="dancer-energy">
          <strong>Raising the arms requires work.</strong>
          <p>
            Spin energy is K = ½Iᵧωᵧ². With constant Lᵧ, it also equals
            Lᵧ²/(2Iᵧ): bringing the arms closer to the axis raises spin energy.
            The joint actuators represent muscle action. Arm-raising motion and
            gravitational potential energy are additional parts of the full
            energy budget.
          </p>
          <p>
            Change in spin energy since t = 0:{' '}
            <output data-testid="spin-energy-change">
              {f(s.energy - s.initialEnergy, 3)} J
            </output>
            . This is not a measurement of total muscle work.
          </p>
        </div>
        <p className="physics-caption">
          Illustrative model: 44 kg body with Iᵧ = 0.750 kg·m²; each upper arm
          is 2.0 kg × 0.30 m and each forearm/hand is 1.5 kg × 0.28 m. Shoulder
          radius 0.18 m. Each arm segment uses a uniform rectangular inertia
          envelope, 0.07 m thick. Reference Iᵧ: {f(dancerInertia(1), 3)} kg·m²
          open, {f(dancerInertia(0), 3)} kg·m² overhead. Motors have finite
          stiffness, so measured poses can differ slightly.
        </p>
      </section>
    </>
  );
}
function downloadCsv() {
  const rows = useDancerStore.getState().history;
  const csv = [
    'time_s,hand_radius_m,inertia_kg_m2,omega_rad_s,rpm,momentum_kg_m2_s,expected_momentum_kg_m2_s,spin_energy_J,external_torque_Nm',
    ...rows.map((s) =>
      [
        s.time,
        s.radius,
        s.inertia,
        s.omega,
        (s.omega * 60) / (2 * Math.PI),
        s.momentum,
        s.initialMomentum + s.impulse,
        s.energy,
        s.torque,
      ]
        .map((n) => n.toPrecision(10))
        .join(','),
    ),
  ].join('\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dancer-trial.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DancerRecords() {
  const records = useDancerStore((s) => s.records);
  const ready = useDancerStore((s) => s.ready);
  const history = useDancerStore((s) => s.history);
  const running = useSimulationStore((s) => s.running);
  return (
    <section className="dancer-records" aria-labelledby="dancer-record-title">
      <div className="dancer-section-heading">
        <div>
          <div className="section-label">COLLECT EVIDENCE</div>
          <h2 id="dancer-record-title">Compare arm positions</h2>
        </div>
        <div className="dancer-actions">
          <button
            className="secondary-button"
            disabled={!ready || running}
            onClick={() => useDancerStore.getState().record()}
          >
            Record paused sample
          </button>
          <button
            className="secondary-button"
            disabled={!history.length}
            onClick={downloadCsv}
          >
            Export trial CSV
          </button>
        </div>
      </div>
      <p className="physics-caption">
        Pause with arms out, record a sample, then raise them overhead and
        repeat. The latest eight samples stay here until a new trial. CSV
        includes the full 10 Hz trial history and exact pause samples.
      </p>
      {records.length ? (
        <div className="dancer-table-wrap">
          <table>
            <caption className="sr-only">Recorded dancer measurements</caption>
            <thead>
              <tr>
                <th>Sample</th>
                <th>t (s)</th>
                <th>r (m)</th>
                <th>Iᵧ (kg·m²)</th>
                <th>ωᵧ (rad/s)</th>
                <th>Lᵧ (kg·m²/s)</th>
                <th>K (J)</th>
              </tr>
            </thead>
            <tbody>
              {records.map((s, i) => (
                <tr key={i}>
                  <th>{i + 1}</th>
                  <td>{f(s.time)}</td>
                  <td>{f(s.radius, 3)}</td>
                  <td>{f(s.inertia, 3)}</td>
                  <td>{f(s.omega, 3)}</td>
                  <td>{f(s.momentum, 3)}</td>
                  <td>{f(s.energy, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="dancer-empty">
          No samples recorded yet. Pause the spin to capture a measurement.
        </p>
      )}
    </section>
  );
}
