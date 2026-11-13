import { Measurement } from '../../components/measurements/Measurement';
import {
  freeFallAtTime,
  freeFallContactTime,
} from '../../physics/equations/freeFall';
import { formatNumber as f } from '../../physics/units/format';
import { FIXED_TIME_STEP } from '../../physics/constants/world';
import { useFreeFallStore } from '../../store/freeFallStore';
import { DROP, type DropParameters } from './config';
import { mechanicalEnergy } from '../../physics/equations/energy';
import { EnergyCheck } from '../../components/measurements/EnergyCheck';

export function LiveMeasurements() {
  const sample = useFreeFallStore((state) => state.snapshot);
  return (
    <div className="measurements" aria-label="Live physics measurements">
      <Measurement
        label="CENTER HEIGHT y"
        value={f(sample.height)}
        unit="m"
        testId="height"
      />
      <Measurement
        label="VELOCITY vᵧ"
        value={f(sample.verticalVelocity)}
        unit="m/s"
        testId="velocity"
      />
      <Measurement
        label="ACCELERATION aᵧ"
        value={f(sample.acceleration)}
        unit="m/s²"
        testId="acceleration"
      />
      <Measurement
        label="FIRST CONTACT"
        value={f(sample.firstContactTime, 3)}
        unit="s"
        testId="contact-time"
      />
    </div>
  );
}

export function DropReadouts({ parameters }: { parameters: DropParameters }) {
  const snapshot = useFreeFallStore((state) => state.snapshot);
  const sample = snapshot.lastFreeFall;
  const theory = freeFallAtTime(
    parameters.initialHeight,
    parameters.gravity,
    sample.time,
  );
  const expectedContact = freeFallContactTime(
    parameters.initialHeight,
    parameters.gravity,
    DROP.cubeSize,
  );
  const contacted = snapshot.firstContactTime !== null;
  return (
    <section className="theory-panel" aria-labelledby="comparison-title">
      <div className="theory-heading">
        <div>
          <div className="section-label">CHECK THE PHYSICS</div>
          <h2 id="comparison-title">Simulation meets theory.</h2>
        </div>
        <span>
          {contacted ? 'Last free-fall sample' : 'Live free-fall sample'} · t ={' '}
          {f(sample.time, 3)} s
        </span>
      </div>
      <div className="comparison-layout">
        <div className="equations">
          <div>
            <strong>y = y₀ − ½gt²</strong>
            <span>
              y = {f(parameters.initialHeight)} − ½({f(parameters.gravity)})(
              {f(sample.time, 3)})² = {f(theory.height)} m
            </span>
          </div>
          <div>
            <strong>vᵧ = −gt</strong>
            <span>
              vᵧ = −({f(parameters.gravity)})({f(sample.time, 3)}) ={' '}
              {f(theory.velocity)} m/s
            </span>
          </div>
          <div>
            <strong>aᵧ = −g</strong>
            <span>
              aᵧ = −{f(parameters.gravity)} = {f(theory.acceleration)} m/s²
            </span>
          </div>
        </div>
        <div className="comparison-table">
          <table>
            <caption className="sr-only">
              Simulated and theoretical values at the same free-fall time
            </caption>
            <thead>
              <tr>
                <th scope="col">Quantity</th>
                <th scope="col">Rapier</th>
                <th scope="col">Theory</th>
                <th scope="col">Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">y (m)</th>
                <td>{f(sample.height, 3)}</td>
                <td>{f(theory.height, 3)}</td>
                <td>{f(sample.height - theory.height, 3)}</td>
              </tr>
              <tr>
                <th scope="row">vᵧ (m/s)</th>
                <td>{f(sample.verticalVelocity, 3)}</td>
                <td>{f(theory.velocity, 3)}</td>
                <td>{f(sample.verticalVelocity - theory.velocity, 3)}</td>
              </tr>
              <tr>
                <th scope="row">aᵧ (m/s²)</th>
                <td>{f(sample.acceleration, 3)}</td>
                <td>{f(theory.acceleration, 3)}</td>
                <td>
                  {f(
                    sample.acceleration === null
                      ? null
                      : sample.acceleration - theory.acceleration,
                    3,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="contact-prediction">
        <span>
          <strong>Predicted first contact</strong> t = √[2(y₀ − 0.50) / g] ={' '}
          <output data-testid="predicted-contact">
            {expectedContact === null
              ? 'No fall at g = 0'
              : `${f(expectedContact, 3)} s`}
          </output>
        </span>
        <span>
          <strong>Simulated first contact</strong>{' '}
          {snapshot.firstContactTime === null
            ? 'Awaiting contact'
            : `${f(snapshot.firstContactTime, 3)} s`}
        </span>
      </div>
      <p className="physics-caption">
        {contacted
          ? 'The table freezes before first contact: free-fall equations no longer describe the motion once the ground acts on the cube. '
          : 'The table compares values at the same simulated time. '}
        Live acceleration is Δvᵧ/Δt over one{' '}
        {(FIXED_TIME_STEP * 1000).toFixed(2)} ms physics step. During impact it
        is a timestep average, not a material’s true peak acceleration. Small
        differences come from numerical integration and contact resolution.
      </p>
      <div className="weight-explanation">
        <strong>
          Weight Fg = mg = ({f(parameters.mass)})({f(parameters.gravity)}) ={' '}
          {f(parameters.mass * parameters.gravity)} N
        </strong>
        <span>
          While airborne, aᵧ = −Fg/m = −{f(parameters.gravity)} m/s². Mass
          changes weight and energy, but cancels from acceleration.
        </span>
      </div>
      <EnergyCheck
        initial={mechanicalEnergy(
          parameters.mass,
          parameters.gravity,
          parameters.initialHeight - DROP.cubeSize / 2,
          [0, 0, 0],
        )}
        current={mechanicalEnergy(
          parameters.mass,
          parameters.gravity,
          sample.height - DROP.cubeSize / 2,
          [0, sample.verticalVelocity, 0],
        )}
      />
    </section>
  );
}
