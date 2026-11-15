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
const STRING_MOMENTUM =
  STRING.mass * STRING.initialRadius * STRING.initialSpeed;

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
  pull: StringPull | null;
}

export function createStringTrial(): StringTrial {
  return {
    time: 0,
    angle: 0,
    radius: STRING.initialRadius,
    radialSpeed: 0,
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
  return {
    ...trial,
    pull: { startTime: trial.time, startRadius: trial.radius, target },
  };
}

function pullPosition(pull: StringPull, time: number) {
  if (time >= pull.startTime + STRING.pullDuration)
    return { radius: pull.target, radialSpeed: 0 };
  const phase = (Math.PI * (time - pull.startTime)) / STRING.pullDuration;
  const change = pull.target - pull.startRadius;
  return {
    radius: pull.startRadius + (change * (1 - Math.cos(phase))) / 2,
    radialSpeed:
      (change * Math.PI * Math.sin(phase)) / (2 * STRING.pullDuration),
  };
}

function stringOmega(radius: number) {
  return STRING_MOMENTUM / (STRING.mass * radius ** 2);
}

export function advanceStringTrial(
  trial: StringTrial,
  elapsed: number,
): StringTrial {
  const time = trial.time + elapsed;
  if (!trial.pull)
    return {
      ...trial,
      time,
      angle: trial.angle + stringOmega(trial.radius) * elapsed,
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
      (stringOmega(trial.radius) +
        4 * stringOmega(middle.radius) +
        stringOmega(finish.radius)) +
    Math.max(0, time - end) * stringOmega(pull.target);
  return { ...trial, ...finish, time, angle, pull: time >= end ? null : pull };
}

export function measureString(trial: StringTrial) {
  const inertia = STRING.mass * trial.radius ** 2;
  const omega = stringOmega(trial.radius);
  const tangentialSpeed = trial.radius * omega;
  const energy =
    0.5 * STRING.mass * (tangentialSpeed ** 2 + trial.radialSpeed ** 2);
  return { inertia, omega, tangentialSpeed, momentum: STRING_MOMENTUM, energy };
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

function speedShares(platformInertia: number) {
  const personInertia = TURNTABLE.personMass * TURNTABLE.radius ** 2;
  const total = platformInertia + personInertia;
  return { person: platformInertia / total, platform: -personInertia / total };
}

export function advanceTurntableTrial(
  trial: TurntableTrial,
  elapsed: number,
  targetRelativeSpeed: number,
  platformInertia: number,
): TurntableTrial {
  const target = targetRelativeSpeed / TURNTABLE.radius;
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
  const share = speedShares(platformInertia);
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
) {
  const share = speedShares(platformInertia);
  const personOmega = share.person * trial.relativeOmega;
  const platformOmega = share.platform * trial.relativeOmega;
  const radius = radialVector(trial.personAngle, TURNTABLE.radius);
  const velocity = tangentVector(
    trial.personAngle,
    personOmega * TURNTABLE.radius,
  );
  const personMomentum = crossProduct(
    radius,
    scaleVector(velocity, TURNTABLE.personMass),
  )[1];
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
