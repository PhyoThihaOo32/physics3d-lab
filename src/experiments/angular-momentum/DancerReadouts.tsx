import { Measurement } from '../../components/measurements/Measurement';
import { formatNumber as f } from '../../physics/units/format';
import { useDancerStore } from '../../store/dancerStore';
import { type DancerParameters } from '../../physics/equations/angularMomentum';
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
            <h2 id="dancer-theory-title">Lᵧ = Iᵧ ωᵧ</h2>
          </div>
          <span>
            {parameters.resistance === 0
              ? 'Ideal support'
              : `b = ${f(parameters.resistance)} N·m·s/rad`}
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
            <span>Predicted ωᵧ</span>
            <strong data-testid="predicted-omega">
              {f(expected / s.inertia, 3)} <small>rad/s</small>
            </strong>
          </div>
          <div>
            <span>Momentum error</span>
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
        <div className="dancer-energy">
          <strong>Spin energy change</strong>{' '}
          <output data-testid="spin-energy-change">
            {f(s.energy - s.initialEnergy, 3)} J
          </output>
        </div>
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
          <h2 id="dancer-record-title">Samples</h2>
        </div>
        <div className="dancer-actions">
          <button
            className="secondary-button"
            aria-label="Record paused sample"
            disabled={!ready || running}
            onClick={() => useDancerStore.getState().record()}
          >
            Record
          </button>
          <button
            className="secondary-button"
            aria-label="Export trial CSV"
            disabled={!history.length}
            onClick={downloadCsv}
          >
            CSV
          </button>
        </div>
      </div>
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
        <p className="dancer-empty">No samples recorded yet.</p>
      )}
    </section>
  );
}
