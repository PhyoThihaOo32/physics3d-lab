/** Rigid robot on an ideal vertical bearing, with point loads in its backpack. */
export const ROBOT = {
  emptyInertia: 0.9,
  backpackRadius: 0.48,
  initialOmega: 2,
  minLoad: 0.5,
  maxLoad: 5,
  capacity: 15,
  catchHeight: 1.53,
  dropHeight: 0.8,
  gravity: 9.81,
} as const;

export const ROBOT_DROP_TIME = Math.sqrt(
  (2 * ROBOT.dropHeight) / ROBOT.gravity,
);

export interface RobotDrop {
  mass: number;
  releaseTime: number;
  catchTime: number;
  x: number;
  z: number;
}

export interface RobotCapture {
  mass: number;
  time: number;
  before: number;
  after: number;
}

export interface RobotTrial {
  time: number;
  angle: number;
  load: number;
  momentum: number;
  drop: RobotDrop | null;
  captures: readonly RobotCapture[];
}

export function robotInertia(load: number) {
  return ROBOT.emptyInertia + load * ROBOT.backpackRadius ** 2;
}

export function robotOmega(trial: RobotTrial) {
  return trial.momentum / robotInertia(trial.load);
}

export function createRobotTrial(): RobotTrial {
  return {
    time: 0,
    angle: 0,
    load: 0,
    momentum: ROBOT.emptyInertia * ROBOT.initialOmega,
    drop: null,
    captures: [],
  };
}

export function releaseRobotLoad(trial: RobotTrial, mass: number): RobotTrial {
  if (
    trial.drop ||
    !Number.isFinite(mass) ||
    mass < ROBOT.minLoad ||
    mass > ROBOT.maxLoad ||
    mass > ROBOT.capacity - trial.load
  )
    return trial;

  // Release at the position the moving opening will reach at the end of the
  // fall. The payload has no horizontal velocity before it sticks to the robot.
  const catchAngle = trial.angle + robotOmega(trial) * ROBOT_DROP_TIME;
  return {
    ...trial,
    drop: {
      mass,
      releaseTime: trial.time,
      catchTime: trial.time + ROBOT_DROP_TIME,
      x: ROBOT.backpackRadius * Math.sin(catchAngle),
      z: ROBOT.backpackRadius * Math.cos(catchAngle),
    },
  };
}

export function robotDropHeight(drop: RobotDrop, time: number) {
  const fallen = 0.5 * ROBOT.gravity * (time - drop.releaseTime) ** 2;
  return ROBOT.catchHeight + Math.max(0, ROBOT.dropHeight - fallen);
}

export function advanceRobotTrial(
  trial: RobotTrial,
  elapsed: number,
): RobotTrial {
  const time = trial.time + elapsed;
  const before = robotOmega(trial);
  const { drop } = trial;
  if (!drop || time < drop.catchTime) {
    return { ...trial, time, angle: trial.angle + before * elapsed };
  }

  // Inelastic capture. The incoming load contributes zero L about the bearing
  // axis, and the ideal bearing exerts no torque about that axis.
  const load = trial.load + drop.mass;
  const after = trial.momentum / robotInertia(load);
  const angleAtCatch = trial.angle + before * (drop.catchTime - trial.time);
  return {
    ...trial,
    time,
    angle: angleAtCatch + after * (time - drop.catchTime),
    load,
    drop: null,
    captures: [
      ...trial.captures,
      { mass: drop.mass, time: drop.catchTime, before, after },
    ],
  };
}
