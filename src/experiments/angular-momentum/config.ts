import type { PhysicsExperiment } from '../../types/experiment';
import {
  DEFAULT_DANCER,
  type DancerParameters,
} from '../../physics/equations/angularMomentum';
export const dancerExperiment: PhysicsExperiment<DancerParameters> = {
  id: 'angular-momentum',
  title: 'Spinning ballet dancer',
  description:
    'Raise the arms. Open them out. Discover how mass distribution changes a spin.',
  defaultParameters: DEFAULT_DANCER,
  learningObjectives: [
    'Explain how arm position changes moment of inertia.',
    'Test conservation of angular momentum when external torque is zero.',
    'Distinguish angular momentum from rotational kinetic energy.',
    'Measure the effect of a resistive external torque.',
  ],
  assumptions: [
    'A simplified 51 kg dancer rotates about a supported, fixed vertical axis.',
    'Both arms move symmetrically; shoulders and elbows bend without changing bone lengths.',
    'The ideal support supplies no torque about the spin axis. Gravity is 9.81 m/s² downward.',
    'Resistance, when selected, follows τᵧ = −bω. This is a bearing model, not detailed foot friction.',
    'Illustrative masses and inertia describe this model; they are not measured human anatomy.',
  ],
};
export function dancerParameterError(p: DancerParameters) {
  if (
    !Number.isFinite(p.initialOmega) ||
    p.initialOmega < -3 ||
    p.initialOmega > 3
  )
    return 'Initial angular velocity must be between −3 and 3 rad/s.';
  if (!Number.isFinite(p.resistance) || p.resistance < 0 || p.resistance > 0.5)
    return 'Resistance must be between 0 and 0.5 N·m·s/rad.';
  return null;
}
