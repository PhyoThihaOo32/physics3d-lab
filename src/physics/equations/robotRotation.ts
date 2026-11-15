/** Rigid robot on an ideal vertical bearing, with point loads in its backpack. */
export const ROBOT = {
  emptyInertia: 0.9,
  backpackRadius: 0.48,
  minRadius: 0.39,
  maxRadius: 0.95,
  slideSpeed: 0.45,
  initialOmega: 2,
  minLoad: 0.5,
  maxLoad: 5,
  capacity: 15,
  cargoFloor: 1.145,
  cargoThickness: 0.028,
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
  height: number;
  catchHeight: number;
}

export interface RobotCapture {
  mass: number;
  time: number;
  before: number;
  after: number;
  height: number;
}

export interface RobotTrial {
  time: number;
  angle: number;
  initialOmega: number;
  radius: number;
  targetRadius: number;
  load: number;
  momentum: number;
  drop: RobotDrop | null;
  captures: readonly RobotCapture[];
}

export function robotInertia(
  load: number,
  radius: number = ROBOT.backpackRadius,
) {
  return ROBOT.emptyInertia + load * radius ** 2;
}

export function robotOmega(trial: RobotTrial) {
  return trial.momentum / robotInertia(trial.load, trial.radius);
}

export function createRobotTrial(
  initialOmega: number = ROBOT.initialOmega,
): RobotTrial {
  return {
    time: 0,
    angle: 0,
    initialOmega,
    radius: ROBOT.backpackRadius,
    targetRadius: ROBOT.backpackRadius,
    load: 0,
    momentum: ROBOT.emptyInertia * initialOmega,
    drop: null,
    captures: [],
  };
}

export function setRobotRadius(trial: RobotTrial, radius: number): RobotTrial {
  if (
    trial.drop ||
    !Number.isFinite(radius) ||
    radius < ROBOT.minRadius ||
    radius > ROBOT.maxRadius
  )
    return trial;
  return {
    ...trial,
    targetRadius: radius,
    radius: trial.time === 0 ? radius : trial.radius,
  };
}

export function robotCargoHeight(load: number) {
  return ROBOT.cargoFloor + load * ROBOT.cargoThickness;
}

export function releaseRobotLoad(
  trial: RobotTrial,
  mass: number,
  height: number = ROBOT.dropHeight,
): RobotTrial {
  if (
    trial.drop ||
    trial.radius !== trial.targetRadius ||
    !Number.isFinite(mass) ||
    mass < ROBOT.minLoad ||
    mass > ROBOT.maxLoad ||
    mass > ROBOT.capacity - trial.load + 1e-9 ||
    !Number.isFinite(height) ||
    height < 0.3 ||
    height > 1.25
  )
    return trial;

  // Release at the position the moving opening will reach at the end of the
  // fall. The payload has no horizontal velocity before it sticks to the robot.
  const duration = Math.sqrt((2 * height) / ROBOT.gravity);
  const catchAngle = trial.angle + robotOmega(trial) * duration;
  return {
    ...trial,
    drop: {
      mass,
      releaseTime: trial.time,
      catchTime: trial.time + duration,
      x: trial.radius * Math.sin(catchAngle),
      z: trial.radius * Math.cos(catchAngle),
      height,
      catchHeight: robotCargoHeight(trial.load + mass / 2),
    },
  };
}

export function robotDropHeight(drop: RobotDrop, time: number) {
  const fallen =
    0.5 * ROBOT.gravity * Math.max(0, time - drop.releaseTime) ** 2;
  return drop.catchHeight + Math.max(0, drop.height - fallen);
}

export function advanceRobotTrial(
  trial: RobotTrial,
  elapsed: number,
): RobotTrial {
  const time = trial.time + elapsed;
  const before = robotOmega(trial);
  const { drop } = trial;
  if (trial.radius !== trial.targetRadius) {
    const distance = trial.targetRadius - trial.radius;
    const slideTime = Math.min(elapsed, Math.abs(distance) / ROBOT.slideSpeed);
    const radius =
      slideTime < Math.abs(distance) / ROBOT.slideSpeed
        ? trial.radius + Math.sign(distance) * slideTime * ROBOT.slideSpeed
        : trial.targetRadius;
    const speed = trial.momentum / robotInertia(trial.load, radius);
    const middle =
      trial.momentum / robotInertia(trial.load, (trial.radius + radius) / 2);
    // Integrate signed ω=L/I through the slide while the central rail moves the cargo.
    const angle =
      trial.angle +
      (slideTime * (before + 4 * middle + speed)) / 6 +
      (elapsed - slideTime) * speed;
    return { ...trial, radius, time, angle };
  }
  if (!drop || time < drop.catchTime) {
    return { ...trial, time, angle: trial.angle + before * elapsed };
  }

  // Inelastic capture. The incoming load contributes zero L about the bearing
  // axis, and the ideal bearing exerts no torque about that axis.
  const load = trial.load + drop.mass;
  const after = trial.momentum / robotInertia(load, trial.radius);
  const angleAtCatch = trial.angle + before * (drop.catchTime - trial.time);
  return {
    ...trial,
    time,
    angle: angleAtCatch + after * (time - drop.catchTime),
    load,
    drop: null,
    captures: [
      ...trial.captures,
      {
        mass: drop.mass,
        time: drop.catchTime,
        before,
        after,
        height: drop.catchHeight,
      },
    ],
  };
}
