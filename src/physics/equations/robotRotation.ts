import type { Vector3Tuple } from '../../types/vector';

/** Rigid robot on an ideal vertical bearing, with point loads at one radius. */
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
  liftTime: 0.55,
} as const;

export const ROBOT_DROP_TIME = Math.sqrt(
  (2 * ROBOT.dropHeight) / ROBOT.gravity,
);

export interface RobotTransfer {
  kind: 'add' | 'remove';
  from: number;
  to: number;
  start: number;
  end: number;
  angle: number;
  omega: number;
}

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
  load: number;
  momentum: number;
  transfer: RobotTransfer | null;
  lastChange: RobotLoadChange | null;
}

export function robotInertia(load: number) {
  return ROBOT.emptyInertia + load * ROBOT.backpackRadius ** 2;
}

export function robotOmega(trial: RobotTrial) {
  return trial.momentum / robotInertia(trial.load);
}

export function createRobotTrial(
  initialOmega: number = ROBOT.initialOmega,
): RobotTrial {
  return {
    time: 0,
    angle: 0,
    initialOmega,
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

  const before = robotOmega(trial);
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
        angle: trial.angle + before * ROBOT_DROP_TIME,
        omega: 0,
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
      end: start + ROBOT.liftTime,
      angle: trial.angle,
      omega: before,
    },
  };
}

export function robotTransferAngle(transfer: RobotTransfer, time: number) {
  return transfer.angle + transfer.omega * (time - transfer.start);
}

export function robotTransferPosition(
  transfer: RobotTransfer,
  time: number,
): Vector3Tuple {
  const duration = transfer.kind === 'add' ? ROBOT_DROP_TIME : ROBOT.liftTime;
  const progress =
    time >= transfer.end ? 1 : Math.max(0, (time - transfer.start) / duration);
  const angle = transfer.angle + transfer.omega * duration * progress;
  const center = robotCargoHeight((transfer.from + transfer.to) / 2);
  const verticalOffset =
    transfer.kind === 'add'
      ? ROBOT.dropHeight * (1 - progress ** 2)
      : ROBOT.dropHeight * progress ** 2 * (3 - 2 * progress);
  return [
    ROBOT.backpackRadius * Math.sin(angle),
    center + verticalOffset,
    ROBOT.backpackRadius * Math.cos(angle),
  ];
}

export function advanceRobotTrial(
  trial: RobotTrial,
  elapsed: number,
): RobotTrial {
  const time = trial.time + elapsed;
  const before = robotOmega(trial);
  const { transfer } = trial;
  if (!transfer || time < transfer.end) {
    return { ...trial, time, angle: trial.angle + before * elapsed };
  }
  if (transfer.kind === 'remove') {
    // The lift stays at the same radius. Release carries (m r²)ω away
    // with the outgoing mass, leaving the robot's spin speed unchanged.
    return {
      ...trial,
      time,
      angle: trial.angle + before * elapsed,
      load: transfer.to,
      momentum: robotInertia(transfer.to) * before,
      transfer: null,
      lastChange: {
        kind: 'remove',
        mass: transfer.from - transfer.to,
        time: transfer.end,
        before,
        after: before,
      },
    };
  }

  // Inelastic capture, with zero axial angular momentum in the incoming load.
  const after = trial.momentum / robotInertia(transfer.to);
  return {
    ...trial,
    time,
    angle: transfer.angle + after * (time - transfer.end),
    load: transfer.to,
    transfer: null,
    lastChange: {
      kind: 'add',
      mass: transfer.to - transfer.from,
      time: transfer.end,
      before,
      after,
    },
  };
}
