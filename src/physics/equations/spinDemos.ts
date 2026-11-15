import { crossProduct, scaleVector } from '../vectors/vectorMath';
import type { Vector3Tuple } from '../../types/vector';

/** Positive rotation follows the right-hand rule about +y. */
export function radialVector(angle: number, radius: number): Vector3Tuple {
  return [radius * Math.sin(angle), 0, radius * Math.cos(angle)];
}

export function tangentVector(angle: number, speed: number): Vector3Tuple {
  return [speed * Math.cos(angle), 0, -speed * Math.sin(angle)];
}

export const STRING = {
  mass: 1,
  initialRadius: 0.8,
  initialSpeed: 2.4,
  minRadius: 0.32,
  exampleTarget: 0.48,
  pullDuration: 2,
} as const;
interface StringPull {
  startTime: number;
  startRadius: number;
  target: number;
}

export interface StringTrial {
  time: number;
  angle: number;
  radius: number;
  radialSpeed: number;
  radialAcceleration: number;
  mass: number;
  initialSpeed: number;
  pull: StringPull | null;
}

export function createStringTrial(
  mass: number = STRING.mass,
  initialSpeed: number = STRING.initialSpeed,
): StringTrial {
  return {
    time: 0,
    angle: 0,
    radius: STRING.initialRadius,
    radialSpeed: 0,
    radialAcceleration: 0,
    mass,
    initialSpeed,
    pull: null,
  };
}

export function startStringPull(
  trial: StringTrial,
  target: number,
): StringTrial {
  if (
    trial.pull ||
    !Number.isFinite(target) ||
    target < STRING.minRadius ||
    target >= trial.radius
  )
    return trial;
  const pull = { startTime: trial.time, startRadius: trial.radius, target };
  return { ...trial, ...pullPosition(pull, trial.time), pull };
}

function pullPosition(pull: StringPull, time: number) {
  if (time >= pull.startTime + STRING.pullDuration)
    return { radius: pull.target, radialSpeed: 0, radialAcceleration: 0 };
  const phase = (Math.PI * (time - pull.startTime)) / STRING.pullDuration;
  const change = pull.target - pull.startRadius;
  return {
    radius: pull.startRadius + (change * (1 - Math.cos(phase))) / 2,
    radialSpeed:
      (change * Math.PI * Math.sin(phase)) / (2 * STRING.pullDuration),
    radialAcceleration:
      (change * (Math.PI / STRING.pullDuration) ** 2 * Math.cos(phase)) / 2,
  };
}

function stringOmega(radius: number, initialSpeed: number) {
  return (STRING.initialRadius * initialSpeed) / radius ** 2;
}

export function advanceStringTrial(
  trial: StringTrial,
  elapsed: number,
): StringTrial {
  const time = trial.time + elapsed;
  const omega = (radius: number) => stringOmega(radius, trial.initialSpeed);
  if (!trial.pull)
    return {
      ...trial,
      time,
      angle: trial.angle + omega(trial.radius) * elapsed,
    };
  const { pull } = trial;
  const end = pull.startTime + STRING.pullDuration;
  const pullUntil = Math.min(time, end);
  const middle = pullPosition(pull, (trial.time + pullUntil) / 2);
  const finish = pullPosition(pull, pullUntil);
  // Integrate dθ/dt = L/(mr²) over the changing-radius segment, then coast.
  const angle =
    trial.angle +
    ((pullUntil - trial.time) / 6) *
      (omega(trial.radius) + 4 * omega(middle.radius) + omega(finish.radius)) +
    Math.max(0, time - end) * omega(pull.target);
  return { ...trial, ...finish, time, angle, pull: time >= end ? null : pull };
}

export function measureString(trial: StringTrial) {
  const inertia = trial.mass * trial.radius ** 2;
  const omega = stringOmega(trial.radius, trial.initialSpeed);
  const tangentialSpeed = predictStringSpeed(trial.radius, trial.initialSpeed);
  const energy =
    0.5 * trial.mass * (tangentialSpeed ** 2 + trial.radialSpeed ** 2);
  const tension =
    trial.mass * (trial.radius * omega ** 2 - trial.radialAcceleration);
  return {
    inertia,
    omega,
    tangentialSpeed,
    momentum: trial.mass * STRING.initialRadius * trial.initialSpeed,
    energy,
    tension,
  };
}

export function predictStringSpeed(
  radius: number,
  initialSpeed: number = STRING.initialSpeed,
) {
  return (STRING.initialRadius * initialSpeed) / radius;
}

export const TURNTABLE = {
  personMass: 60,
  radius: 1,
  defaultInertia: 120,
  defaultSpeed: 1.5,
  walkAcceleration: 1.5,
} as const;

export interface TurntableTrial {
  time: number;
  personAngle: number;
  platformAngle: number;
  relativeOmega: number;
}

export function createTurntableTrial(): TurntableTrial {
  return { time: 0, personAngle: 0, platformAngle: 0, relativeOmega: 0 };
}

function speedShares(platformInertia: number, mass: number, radius: number) {
  const personInertia = mass * radius ** 2;
  const total = platformInertia + personInertia;
  return { person: platformInertia / total, platform: -personInertia / total };
}

export function advanceTurntableTrial(
  trial: TurntableTrial,
  elapsed: number,
  targetRelativeSpeed: number,
  platformInertia: number,
  mass: number = TURNTABLE.personMass,
  radius: number = TURNTABLE.radius,
): TurntableTrial {
  const target = targetRelativeSpeed / radius;
  const difference = target - trial.relativeOmega;
  const rampTime = Math.min(
    elapsed,
    Math.abs(difference) / TURNTABLE.walkAcceleration,
  );
  const relativeOmega =
    trial.relativeOmega +
    Math.sign(difference) * rampTime * TURNTABLE.walkAcceleration;
  const relativeAngle =
    (rampTime * (trial.relativeOmega + relativeOmega)) / 2 +
    (elapsed - rampTime) * relativeOmega;
  const share = speedShares(platformInertia, mass, radius);
  return {
    time: trial.time + elapsed,
    personAngle: trial.personAngle + relativeAngle * share.person,
    platformAngle: trial.platformAngle + relativeAngle * share.platform,
    relativeOmega,
  };
}

export function measureTurntable(
  trial: TurntableTrial,
  platformInertia: number,
  mass: number = TURNTABLE.personMass,
  trackRadius: number = TURNTABLE.radius,
) {
  const share = speedShares(platformInertia, mass, trackRadius);
  const personOmega = share.person * trial.relativeOmega;
  const platformOmega = share.platform * trial.relativeOmega;
  const radius = radialVector(trial.personAngle, trackRadius);
  const velocity = tangentVector(trial.personAngle, personOmega * trackRadius);
  const personMomentum = crossProduct(radius, scaleVector(velocity, mass))[1];
  const platformMomentum = platformInertia * platformOmega;
  return {
    personOmega,
    platformOmega,
    radius,
    velocity,
    personMomentum,
    platformMomentum,
    totalMomentum: personMomentum + platformMomentum,
  };
}
