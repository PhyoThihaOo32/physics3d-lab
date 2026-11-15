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
  // Below the minimum centripetal acceleration (1 m/s at 0.8 m).
  reelAcceleration: 0.6,
} as const;
interface StringReel {
  startTime: number;
  startRadius: number;
  startSpeed: number;
  target: number;
  acceleration: number;
  accelerateTime: number;
  brakeTime: number;
}

export interface StringTrial {
  time: number;
  angle: number;
  radius: number;
  radialSpeed: number;
  radialAcceleration: number;
  mass: number;
  initialSpeed: number;
  reel: StringReel | null;
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
    reel: null,
  };
}

export function setStringLength(
  trial: StringTrial,
  target: number,
): StringTrial {
  if (
    !Number.isFinite(target) ||
    target < STRING.minRadius ||
    target > STRING.initialRadius ||
    target === (trial.reel?.target ?? trial.radius)
  )
    return trial;

  const { radius, radialSpeed } = trial;
  if (target === radius && radialSpeed === 0)
    return { ...trial, reel: null, radialAcceleration: 0 };
  const rate = STRING.reelAcceleration;
  // Choose the approach direction from the position reached by braking now.
  // Retargeting keeps the current speed, including when reversing direction.
  const stoppingRadius =
    radius + (radialSpeed * Math.abs(radialSpeed)) / (2 * rate);
  const direction =
    Math.sign(target - stoppingRadius) || Math.sign(radialSpeed);
  const approachSpeed = direction * radialSpeed;
  const peakSpeed = Math.sqrt(
    Math.max(0, rate * direction * (target - radius) + approachSpeed ** 2 / 2),
  );
  const reel = {
    startTime: trial.time,
    startRadius: radius,
    startSpeed: radialSpeed,
    target,
    acceleration: direction * rate,
    accelerateTime: Math.max(0, (peakSpeed - approachSpeed) / rate),
    brakeTime: peakSpeed / rate,
  };
  return { ...trial, reel };
}

function reelPosition(reel: StringReel, time: number) {
  const elapsed = time - reel.startTime;
  const duration = reel.accelerateTime + reel.brakeTime;
  if (elapsed >= duration)
    return { radius: reel.target, radialSpeed: 0, radialAcceleration: 0 };
  if (elapsed >= reel.accelerateTime) {
    const remaining = duration - elapsed;
    return {
      radius: reel.target - (reel.acceleration * remaining ** 2) / 2,
      radialSpeed: reel.acceleration * remaining,
      radialAcceleration: -reel.acceleration,
    };
  }
  return {
    radius:
      reel.startRadius +
      reel.startSpeed * elapsed +
      (reel.acceleration * elapsed ** 2) / 2,
    radialSpeed: reel.startSpeed + reel.acceleration * elapsed,
    radialAcceleration: reel.acceleration,
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
  const { reel } = trial;
  if (!reel)
    return {
      ...trial,
      time,
      angle: trial.angle + omega(trial.radius) * elapsed,
    };
  const end = reel.startTime + reel.accelerateTime + reel.brakeTime;
  const reelUntil = Math.min(time, end);
  let angle = trial.angle;
  // Integrate dθ/dt = L/(mr²), splitting at the change from driving to braking.
  const switchTime = reel.startTime + reel.accelerateTime;
  for (let start = trial.time; start < reelUntil;) {
    const limit =
      start < switchTime ? Math.min(reelUntil, switchTime) : reelUntil;
    const finish = Math.min(limit, start + 1 / 60);
    angle +=
      ((finish - start) / 6) *
      (omega(reelPosition(reel, start).radius) +
        4 * omega(reelPosition(reel, (start + finish) / 2).radius) +
        omega(reelPosition(reel, finish).radius));
    start = finish;
  }
  const done = time >= end;
  return {
    ...trial,
    ...(done
      ? { radius: reel.target, radialSpeed: 0, radialAcceleration: 0 }
      : reelPosition(reel, time)),
    time,
    angle: angle + Math.max(0, time - end) * omega(reel.target),
    reel: done ? null : reel,
  };
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
