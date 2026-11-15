import { useState } from 'react';
import { Measurement } from '../../components/measurements/Measurement';
import {
  liftVectors,
  type GyroMode,
  type GyroParameters,
  type LiftSettings,
} from '../../physics/equations/gimbalGyroscope';
import type { GyroReading } from '../../physics/rotation/gimbalGyroscope';
import { formatNumber as f } from '../../physics/units/format';
import {
  angleBetweenVectors,
  vectorMagnitude,
} from '../../physics/vectors/vectorMath';

export function GyroReadouts({
  reading,
  mode,
  parameters,
  comparing = false,
}: {
  reading: GyroReading | null;
  mode: GyroMode;
  parameters: GyroParameters;
  comparing?: boolean;
}) {
  const testId = (name: string) =>
    comparing ? `gimbal-fast-${name}` : `gimbal-${name}`;
  return (
    <div className="measurements dancer-measurements gyro-measurements">
      <Measurement
        label="Spin ω"
        value={f(reading?.spin ?? null)}
        unit="rad/s"
        testId={testId('spin')}
      />
      <Measurement
        label="Axial inertia I"
        value={f(
          reading?.inertia ?? null,
          (reading?.inertia ?? 1) < 0.01 ? 5 : 3,
        )}
        unit="kg·m²"
        testId={testId('inertia')}
      />
      <Measurement
        label="Axial spin momentum"
        value={f(reading?.spinMomentum ?? null)}
        unit="kg·m²/s"
        testId={testId('momentum')}
      />
      {mode === 'free' && (
        <Measurement
          label="Axle change in lab"
          value={f(reading?.axisDrift ?? null)}
          unit="°"
          testId={testId('axis-drift')}
        />
      )}
      {mode !== 'free' && (
        <Measurement
          label="Momentum about pivot"
          value={f(reading ? vectorMagnitude(reading.totalMomentum) : null)}
          unit="kg·m²/s"
          testId={testId('pivot-momentum')}
        />
      )}
      {mode !== 'free' && (
        <Measurement
          label={mode === 'gravity' ? 'Gravity torque τ' : 'Applied torque τ'}
          value={f(reading ? vectorMagnitude(reading.torque) : null)}
          unit="N·m"
          testId={testId('torque')}
        />
      )}
      {mode === 'torque' && (
        <>
          <Measurement
            label="Lift impulse"
            value={f(reading ? vectorMagnitude(reading.liftImpulse) : null)}
            unit="kg·m²/s"
            testId={testId('impulse')}
          />
          <Measurement
            label="Tilt after lift"
            value={f(reading?.pulseResult?.tilt ?? null, 1)}
            unit="°"
            testId={testId('lift-tilt')}
          />
          <Measurement
            label="Swerve after lift"
            value={f(reading?.pulseResult?.swerve ?? null, 1)}
            unit="°"
            testId={testId('lift-swerve')}
          />
          <Measurement
            label="Axis change after lift"
            value={f(reading?.pulseResult?.change ?? null, 1)}
            unit="°"
            testId={testId('lift-change')}
          />
        </>
      )}
      {mode === 'gravity' && (
        <>
          <Measurement
            label="Measured precession Ωₚ"
            value={f(reading?.precession ?? null)}
            unit="rad/s"
            testId={testId('precession')}
          />
          <Measurement
            label="Steady estimate |Ωₚ|"
            value={f(reading?.estimatedPrecession ?? null)}
            unit="rad/s"
            testId={testId('estimate')}
          />
          <Measurement
            label="Axle tilt"
            value={f(reading?.tilt ?? null, 1)}
            unit="°"
            testId={testId('tilt')}
          />
        </>
      )}
      {parameters.friction > 0 && (
        <>
          <Measurement
            label="Spin energy"
            value={f(reading?.energy ?? null)}
            unit="J"
            testId={testId('energy')}
          />
          <Measurement
            label="Dissipated energy"
            value={f(reading?.heat ?? null)}
            unit="J"
            testId={testId('heat')}
          />
        </>
      )}
    </div>
  );
}

const EQUATION_VIEWS = ['Symbolic', 'Substitution', 'Result'] as const;

export function GyroEquations({
  reading,
  mode,
  parameters,
  lift,
}: {
  reading: GyroReading | null;
  mode: GyroMode;
  parameters: GyroParameters;
  lift: LiftSettings;
}) {
  const [view, setView] =
    useState<(typeof EQUATION_VIEWS)[number]>('Substitution');
  const inertia = reading?.inertia ?? null;
  const spin = reading?.spin ?? null;
  const momentum = reading?.spinMomentum ?? null;
  const liftTorque = vectorMagnitude(liftVectors(lift).torque);
  const gravityTorque = reading ? vectorMagnitude(reading.torque) : null;
  const gravityAngle = reading
    ? angleBetweenVectors(reading.gravityLever, reading.gravityForce)
    : null;
  const inertiaPrecision = (inertia ?? 1) < 0.01 ? 5 : 3;
  const rows = [
    {
      symbolic: 'I = ½MR²',
      substitution: `I = ½(${f(parameters.mass, 2)})(${f(parameters.radius, 2)})² = ${f(inertia, inertiaPrecision)} kg·m²`,
      result: `I = ${f(inertia, inertiaPrecision)} kg·m²`,
    },
    {
      symbolic: 'Lspin = Iω',
      substitution: `Lspin = (${f(inertia, inertiaPrecision)})(${f(spin)}) = ${f(momentum)} kg·m²/s`,
      result: `Lspin = ${f(momentum)} kg·m²/s`,
    },
  ];
  if (mode === 'torque') {
    rows.push(
      {
        symbolic: 'τ = r × F',
        substitution: `|τ| = (${lift.lever})(${lift.force}) |sin ${lift.angle}°| = ${f(liftTorque)} N·m`,
        result: `Next pulse |τ| = ${f(liftTorque)} N·m`,
      },
      {
        symbolic: 'dL/dt = τnet, ΔL = ∫τnet dt',
        substitution: `|∫τnet dt| = ${f(reading ? vectorMagnitude(reading.impulse) : null)} kg·m²/s`,
        result: `Net |ΔL| about pivot = ${f(reading ? vectorMagnitude(reading.impulse) : null)} kg·m²/s`,
      },
    );
  }
  if (mode === 'gravity') {
    rows.push(
      {
        symbolic: 'τ = r × Mg',
        substitution: `|τ| = rMg sin θ = (${f(reading ? vectorMagnitude(reading.gravityLever) : null, 3)})(${f(parameters.mass)})(${f(parameters.gravity)}) sin ${f(gravityAngle === null ? null : (gravityAngle * 180) / Math.PI, 1)}° = ${f(gravityTorque)} N·m`,
        result: `|τ| = ${f(gravityTorque)} N·m`,
      },
      {
        symbolic: 'Steady |Ωₚ| ≈ Mgr / |Lspin|',
        substitution: `Steady |Ωₚ| ≈ (${f(parameters.mass)})(${f(parameters.gravity)})(${f(reading ? vectorMagnitude(reading.gravityLever) : null, 3)}) / |${f(momentum)}| = ${f(reading?.estimatedPrecession ?? null)} rad/s`,
        result: `Steady |Ωₚ| ≈ ${f(reading?.estimatedPrecession ?? null)} rad/s`,
      },
    );
  }
  return (
    <details className="physics-details">
      <summary>Equations</summary>
      <div>
        <div className="gyro-choices" role="group" aria-label="Equation view">
          {EQUATION_VIEWS.map((choice) => (
            <button
              className="secondary-button"
              key={choice}
              aria-pressed={choice === view}
              onClick={() => setView(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
        {rows.map((row) => (
          <p key={row.symbolic}>
            {view === 'Symbolic'
              ? row.symbolic
              : view === 'Substitution'
                ? row.substitution
                : row.result}
          </p>
        ))}
        {mode === 'free' && (
          <p>
            With nearly zero external torque, angular momentum stays nearly
            constant in the lab frame.
          </p>
        )}
        {mode === 'torque' && (
          <>
            <p>
              The fixed-direction force couple applies the same torque in both
              trials. The diagram adds the torque impulse to initial total
              angular momentum about the pivot, including any bearing drag.
            </p>
            {reading?.pulseCount ? (
              <p>
                Measured angular momentum balance residual{' '}
                {f(reading.momentumError, 4)} kg·m²/s.
              </p>
            ) : null}
          </>
        )}
        {mode === 'gravity' && (
          <p>
            The axle starts horizontal. It can wobble as it precesses, or fall
            when spin is zero. The measured rate averages the turn about +y over
            up to two seconds. The steady estimate applies when spin dominates.
          </p>
        )}
        {parameters.friction > 0 && (
          <p>
            Bearing drag converts mechanical energy into heat. Spin energy
            covers the rotation about the axle.
          </p>
        )}
      </div>
    </details>
  );
}
