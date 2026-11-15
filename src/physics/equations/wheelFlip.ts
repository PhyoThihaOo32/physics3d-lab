import type { Vector3Tuple } from '../../types/vector';

export const WHEEL_FLIP = {
  spinInertia: 0.16,
  diameterInertia: 0.08,
  supportInertia: 6,
  defaultSpinSpeed: 20,
  duration: 1.6,
} as const;

export interface WheelFlipSetup {
  rimInertia: number;
  supportInertia: number;
}

export const DEFAULT_WHEEL_SETUP: WheelFlipSetup = {
  rimInertia: WHEEL_FLIP.spinInertia,
  supportInertia: WHEEL_FLIP.supportInertia,
};

interface FlipMotion {
  startTime: number;
  from: number;
  to: number;
}

export interface WheelFlipTrial {
  time: number;
  tilt: number;
  supportAngle: number;
  motion: FlipMotion | null;
}

export function createWheelFlipTrial(): WheelFlipTrial {
  return { time: 0, tilt: 0, supportAngle: 0, motion: null };
}

export function startWheelFlip(trial: WheelFlipTrial): WheelFlipTrial {
  if (trial.motion) return trial;
  return {
    ...trial,
    motion: {
      startTime: trial.time,
      from: trial.tilt,
      to: trial.tilt === 0 ? Math.PI : 0,
    },
  };
}

function wheelVerticalInertia(vertical: number, rimInertia: number) {
  // The wheel is carried around +y as the support turns. Its inertia about
  // that axis includes both its axial and diametric moments of inertia.
  return 0.5 * rimInertia * (1 - vertical ** 2) + rimInertia * vertical ** 2;
}

function supportSpeed(tilt: number, spinSpeed: number, setup: WheelFlipSetup) {
  const vertical = Math.cos(tilt);
  return (
    (setup.rimInertia * spinSpeed * (1 - vertical)) /
    (setup.supportInertia + wheelVerticalInertia(vertical, setup.rimInertia))
  );
}

function tiltAt(motion: FlipMotion, time: number) {
  const phase = (time - motion.startTime) / WHEEL_FLIP.duration;
  return phase >= 1
    ? motion.to
    : motion.from +
        ((motion.to - motion.from) * (1 - Math.cos(Math.PI * phase))) / 2;
}

export function advanceWheelFlip(
  trial: WheelFlipTrial,
  elapsed: number,
  spinSpeed: number,
  setup: WheelFlipSetup = DEFAULT_WHEEL_SETUP,
): WheelFlipTrial {
  const time = trial.time + elapsed;
  const { motion } = trial;
  if (!motion) {
    return {
      ...trial,
      time,
      supportAngle:
        trial.supportAngle +
        elapsed * supportSpeed(trial.tilt, spinSpeed, setup),
    };
  }

  const end = motion.startTime + WHEEL_FLIP.duration;
  const flipUntil = Math.min(time, end);
  const middle = tiltAt(motion, (trial.time + flipUntil) / 2);
  const tilt = time >= end ? motion.to : tiltAt(motion, time);
  const supportAngle =
    trial.supportAngle +
    ((flipUntil - trial.time) / 6) *
      (supportSpeed(trial.tilt, spinSpeed, setup) +
        4 * supportSpeed(middle, spinSpeed, setup) +
        supportSpeed(tilt, spinSpeed, setup)) +
    Math.max(0, time - end) * supportSpeed(motion.to, spinSpeed, setup);
  return { time, tilt, supportAngle, motion: time >= end ? null : motion };
}

export function wheelAxleDirection(trial: WheelFlipTrial): Vector3Tuple {
  const sideways = -Math.sin(trial.tilt);
  return [
    sideways * Math.cos(trial.supportAngle),
    Math.cos(trial.tilt),
    -sideways * Math.sin(trial.supportAngle),
  ];
}

export function measureWheelFlip(
  trial: WheelFlipTrial,
  spinSpeed: number,
  setup: WheelFlipSetup = DEFAULT_WHEEL_SETUP,
) {
  const vertical = Math.cos(trial.tilt);
  const supportOmega = supportSpeed(trial.tilt, spinSpeed, setup);
  const supportMomentum = setup.supportInertia * supportOmega;
  const wheelMomentum =
    setup.rimInertia * spinSpeed * vertical +
    wheelVerticalInertia(vertical, setup.rimInertia) * supportOmega;
  return {
    supportOmega,
    supportMomentum,
    wheelMomentum,
    totalMomentum: wheelMomentum + supportMomentum,
  };
}
