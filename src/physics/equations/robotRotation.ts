import type { Vector3Tuple } from '../../types/vector';

/** Robot on a vertical bearing, with cargo modeled as point masses. */
export const ROBOT = {
  emptyInertia: 0.9,
  backpackRadius: 0.48,
  initialOmega: 2,
  blockMass: 5,
  capacity: 15,
  cargoFloor: 1.145,
  cargoThickness: 0.028,
  dropHeight: 0.8,
  gravity: 9.81,
  liftTime: 0.45,
  retractTime: 0.75,
  emptyMass: 10,
  bearingFrictionCoefficient: 0.2,
  bearingContactRadius: 0.01,
} as const;

export const ROBOT_DROP_TIME = Math.sqrt(
  (2 * ROBOT.dropHeight) / ROBOT.gravity,
);

export type RobotTransfer = {
  from: number;
  to: number;
  start: number;
  end: number;
} & (
  { kind: 'add'; landingAngle: number } | { kind: 'remove'; before: number }
);

interface RobotLoadChange {
  kind: RobotTransfer['kind'];
  mass: number;
  time: number;
  before: number;
  after: number;
}

export interface RobotTrial {
  time: number;
  angle: number;
  initialOmega: number;
  bearingFriction: boolean;
  load: number;
  momentum: number;
  transfer: RobotTransfer | null;
  lastChange: RobotLoadChange | null;
}

export function robotInertia(load: number) {
  return ROBOT.emptyInertia + load * ROBOT.backpackRadius ** 2;
}

function unitInterval(value: number) {
  return Math.max(0, Math.min(1, value));
}

function ease(progress: number) {
  return progress ** 2 * (3 - 2 * progress);
}

function transferRadius(transfer: RobotTransfer, time: number) {
  if (transfer.kind === 'add') return ROBOT.backpackRadius;
  if (time >= transfer.end) return 0;
  const progress = unitInterval(
    (time - transfer.start - ROBOT.liftTime) / ROBOT.retractTime,
  );
  return ROBOT.backpackRadius * (1 - ease(progress));
}

export function robotTrialInertia(trial: RobotTrial, time = trial.time) {
  const { transfer } = trial;
  if (transfer?.kind !== 'remove') return robotInertia(trial.load);
  const mass = transfer.from - transfer.to;
  return robotInertia(transfer.to) + mass * transferRadius(transfer, time) ** 2;
}

export function robotOmega(trial: RobotTrial) {
  return trial.momentum / robotTrialInertia(trial);
}

export function createRobotTrial(
  initialOmega: number = ROBOT.initialOmega,
  bearingFriction = false,
): RobotTrial {
  return {
    time: 0,
    angle: 0,
    initialOmega,
    bearingFriction,
    load: 0,
    momentum: ROBOT.emptyInertia * initialOmega,
    transfer: null,
    lastChange: null,
  };
}

export function robotCargoHeight(load: number) {
  return ROBOT.cargoFloor + load * ROBOT.cargoThickness;
}

/** Split the mass interval into the same 5 kg bands for cargo and transfers. */
export function robotCargoBlocks(load: number, base = 0) {
  const blocks = [];
  for (
    let index = Math.floor(base / ROBOT.blockMass);
    index * ROBOT.blockMass < load;
    index++
  ) {
    const bottom = Math.max(base, index * ROBOT.blockMass);
    const top = Math.min(load, (index + 1) * ROBOT.blockMass);
    blocks.push({
      index,
      mass: top - bottom,
      center: robotCargoHeight((bottom + top) / 2),
    });
  }
  return blocks;
}

export function setRobotLoad(trial: RobotTrial, target: number): RobotTrial {
  if (
    trial.transfer ||
    !Number.isFinite(target) ||
    target < 0 ||
    target > ROBOT.capacity ||
    target === trial.load
  ) {
    return trial;
  }

  const start = trial.time;
  if (target > trial.load) {
    // The payload falls vertically at the position the pack will reach.
    return {
      ...trial,
      transfer: {
        kind: 'add',
        from: trial.load,
        to: target,
        start,
        end: start + ROBOT_DROP_TIME,
        landingAngle: advanceSpin(trial, ROBOT_DROP_TIME).angle,
      },
    };
  }

  return {
    ...trial,
    transfer: {
      kind: 'remove',
      from: trial.load,
      to: target,
      start,
      end: start + ROBOT.liftTime + ROBOT.retractTime,
      before: robotOmega(trial),
    },
  };
}

export function robotTransferPosition(
  transfer: RobotTransfer,
  time: number,
  angle: number,
): Vector3Tuple {
  const progress =
    time >= transfer.end
      ? 1
      : unitInterval(
          (time - transfer.start) /
            (transfer.kind === 'add' ? ROBOT_DROP_TIME : ROBOT.liftTime),
        );
  const heading = transfer.kind === 'add' ? transfer.landingAngle : angle;
  const radius = transferRadius(transfer, time);
  const center = robotCargoHeight((transfer.from + transfer.to) / 2);
  const verticalOffset =
    transfer.kind === 'add'
      ? ROBOT.dropHeight * (1 - progress ** 2)
      : ROBOT.dropHeight * ease(progress);
  return [
    radius * Math.sin(heading),
    center + verticalOffset,
    radius * Math.cos(heading),
  ];
}

function advanceSpin(trial: RobotTrial, elapsed: number): RobotTrial {
  const time = trial.time + elapsed;
  if (trial.momentum === 0) return { ...trial, time };
  // Dry friction uses the static supported weight and acts opposite the spin.
  const torque = trial.bearingFriction
    ? ROBOT.bearingFrictionCoefficient *
      ROBOT.bearingContactRadius *
      (ROBOT.emptyMass + trial.load) *
      ROBOT.gravity
    : 0;
  const magnitude = Math.abs(trial.momentum);
  const direction = Math.sign(trial.momentum);
  const turnTime = torque ? Math.min(elapsed, magnitude / torque) : elapsed;
  const remaining = Math.max(0, magnitude - torque * elapsed);
  const averageMomentum = (direction * (magnitude + remaining)) / 2;
  const inertia = robotTrialInertia(trial, trial.time + turnTime / 2);
  return {
    ...trial,
    time,
    angle: trial.angle + (averageMomentum / inertia) * turnTime,
    momentum: remaining ? direction * remaining : 0,
  };
}

export function advanceRobotTrial(
  trial: RobotTrial,
  elapsed: number,
): RobotTrial {
  const time = trial.time + elapsed;
  const { transfer } = trial;
  if (!transfer) return advanceSpin(trial, elapsed);

  const end = Math.min(time, transfer.end);
  let next = trial;
  if (transfer.kind === 'remove') {
    // Radius changes during retraction. Sample inertia at short midpoints so
    // the angle stays accurate even when playback runs faster than real time.
    const steps = Math.max(1, Math.ceil((end - trial.time) * 120));
    for (let step = 1; step <= steps; step++) {
      const sampleTime = trial.time + ((end - trial.time) * step) / steps;
      next = advanceSpin(next, sampleTime - next.time);
    }
  } else {
    next = advanceSpin(trial, end - trial.time);
  }
  if (time < transfer.end) return next;

  // Incoming mass falls vertically. Outgoing mass leaves on the axis.
  // Neither transfers axial angular momentum at the instant of capture/release.
  const settled: RobotTrial = {
    ...next,
    time: transfer.end,
    angle: transfer.kind === 'add' ? transfer.landingAngle : next.angle,
    load: transfer.to,
    transfer: null,
    lastChange: {
      kind: transfer.kind,
      mass: Math.abs(transfer.to - transfer.from),
      time: end,
      before: transfer.kind === 'add' ? robotOmega(next) : transfer.before,
      after: next.momentum / robotInertia(transfer.to),
    },
  };
  return advanceSpin(settled, time - transfer.end);
}
