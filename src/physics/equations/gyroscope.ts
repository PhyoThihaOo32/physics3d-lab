import { Quaternion, Vector3 } from 'three';

const INITIAL_AXIS = new Vector3(-0.6, 0, -0.8);
const UP = new Vector3(0, 1, 0);
const RIGHT = INITIAL_AXIS.clone().cross(UP);
const INITIAL_POSE = new Quaternion().setFromUnitVectors(UP, INITIAL_AXIS);
const MAX_STEP = 1 / 240;

export const GYROSCOPE = {
  spinInertia: 0.16,
  transverseInertia: 0.6,
  axleLength: 0.62,
  spinSpeed: 30,
  peakTorque: 2,
  duration: 1,
} as const;

export interface GyroscopeTrial {
  time: number;
  spinSpeed: number;
  orientation: Quaternion;
}

export function createGyroscopeTrial(
  spinSpeed: number = GYROSCOPE.spinSpeed,
): GyroscopeTrial {
  return { time: 0, spinSpeed, orientation: INITIAL_POSE.clone() };
}

export function angularImpulse(time: number) {
  const { duration, peakTorque } = GYROSCOPE;
  const elapsed = Math.min(duration, Math.max(0, time));
  const phase = (2 * Math.PI * elapsed) / duration;
  return (
    (peakTorque / 2) * (elapsed - (duration * Math.sin(phase)) / (2 * Math.PI))
  );
}

function angularMomentum(spinSpeed: number, time: number) {
  return INITIAL_AXIS.clone()
    .multiplyScalar(GYROSCOPE.spinInertia * spinSpeed)
    .addScaledVector(RIGHT, angularImpulse(time));
}

function orientationRate(
  orientation: Quaternion,
  time: number,
  spinSpeed: number,
) {
  const axis = UP.clone().applyQuaternion(orientation);
  const momentum = angularMomentum(spinSpeed, time);
  const { spinInertia, transverseInertia } = GYROSCOPE;
  // Invert the inertia tensor of a symmetric rigid body about the grip.
  const omega = momentum
    .clone()
    .multiplyScalar(1 / transverseInertia)
    .addScaledVector(
      axis,
      momentum.dot(axis) * (1 / spinInertia - 1 / transverseInertia),
    );
  return new Quaternion(omega.x / 2, omega.y / 2, omega.z / 2, 0).multiply(
    orientation,
  );
}

function addRate(orientation: Quaternion, rate: Quaternion, dt: number) {
  return new Quaternion(
    orientation.x + dt * rate.x,
    orientation.y + dt * rate.y,
    orientation.z + dt * rate.z,
    orientation.w + dt * rate.w,
  );
}

export function advanceGyroscope(
  trial: GyroscopeTrial,
  elapsed: number,
): GyroscopeTrial {
  const end = Math.min(trial.time + elapsed, GYROSCOPE.duration);
  const steps = Math.ceil((end - trial.time) / MAX_STEP);
  if (steps <= 0) return trial;
  const dt = (end - trial.time) / steps;
  let pose = trial.orientation;
  // World-frame angular momentum is the exact integral of the torque pulse.
  // Integrate only the orientation, using fourth-order Runge–Kutta steps.
  for (let step = 0; step < steps; step++) {
    const t = trial.time + step * dt;
    const middle = t + dt / 2;
    const a = orientationRate(pose, t, trial.spinSpeed);
    const b = orientationRate(
      addRate(pose, a, dt / 2).normalize(),
      middle,
      trial.spinSpeed,
    );
    const c = orientationRate(
      addRate(pose, b, dt / 2).normalize(),
      middle,
      trial.spinSpeed,
    );
    const d = orientationRate(
      addRate(pose, c, dt).normalize(),
      t + dt,
      trial.spinSpeed,
    );
    pose = addRate(pose, a, dt / 6);
    pose = addRate(pose, b, dt / 3);
    pose = addRate(pose, c, dt / 3);
    pose = addRate(pose, d, dt / 6).normalize();
  }
  return { time: end, spinSpeed: trial.spinSpeed, orientation: pose };
}

export function measureGyroscope(trial: GyroscopeTrial) {
  const axis = UP.clone().applyQuaternion(trial.orientation);
  const angle = Math.atan2(axis.dot(RIGHT), axis.dot(INITIAL_AXIS));
  const impulse = angularImpulse(trial.time);
  const torque =
    GYROSCOPE.peakTorque *
    Math.sin((Math.PI * trial.time) / GYROSCOPE.duration) ** 2;
  return {
    rise: (Math.asin(Math.min(1, Math.max(-1, axis.y))) * 180) / Math.PI,
    swerve: (angle * 180) / Math.PI,
    torque: RIGHT.clone().multiplyScalar(torque).toArray(),
    impulse,
    initialMomentum: angularMomentum(trial.spinSpeed, 0).toArray(),
    momentum: angularMomentum(trial.spinSpeed, trial.time).toArray(),
    deltaMomentum: RIGHT.clone().multiplyScalar(impulse).toArray(),
  };
}
