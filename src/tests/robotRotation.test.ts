import { describe, expect, it } from 'vitest';
import {
  ROBOT,
  ROBOT_DROP_TIME,
  advanceRobotTrial,
  createRobotTrial,
  releaseRobotLoad,
  robotDropHeight,
  robotCargoHeight,
  robotInertia,
  robotOmega,
  setRobotRadius,
} from '../physics/equations/robotRotation';

describe('robot backpack capture', () => {
  it('drops vertically and meets the backpack at the same position and time', () => {
    const spinning = advanceRobotTrial(createRobotTrial(), 0.625);
    const released = releaseRobotLoad(spinning, 2);
    const drop = released.drop!;
    expect(robotDropHeight(drop, spinning.time)).toBeCloseTo(
      robotCargoHeight(1) + ROBOT.dropHeight,
    );
    expect(robotDropHeight(drop, drop.catchTime)).toBeCloseTo(
      robotCargoHeight(1),
    );
    const midair = advanceRobotTrial(released, ROBOT_DROP_TIME / 2);
    expect(midair.load).toBe(0);
    expect(robotOmega(midair)).toBe(ROBOT.initialOmega);
    expect(midair.drop).toEqual(drop);
    const caught = advanceRobotTrial(midair, drop.catchTime - midair.time);
    expect(caught.drop).toBeNull();
    expect(caught.load).toBe(2);
    expect(ROBOT.backpackRadius * Math.sin(caught.angle)).toBeCloseTo(
      drop.x,
      12,
    );
    expect(ROBOT.backpackRadius * Math.cos(caught.angle)).toBeCloseTo(
      drop.z,
      12,
    );
  });

  it('conserves axial momentum and loses rotational energy on inelastic capture', () => {
    const initial = createRobotTrial();
    const released = releaseRobotLoad(initial, 2);
    const caught = advanceRobotTrial(released, ROBOT_DROP_TIME + 0.3);
    const initialI = robotInertia(initial.load);
    const finalI = robotInertia(caught.load);
    const finalOmega = robotOmega(caught);
    expect(finalI - initialI).toBeCloseTo(2 * ROBOT.backpackRadius ** 2, 12);
    expect(finalOmega).toBeCloseTo(1.322751, 5);
    expect(finalOmega * finalI).toBeCloseTo(ROBOT.initialOmega * initialI, 12);
    expect(0.5 * finalI * finalOmega ** 2).toBeLessThan(
      0.5 * initialI * ROBOT.initialOmega ** 2,
    );
    expect(caught.angle).toBeCloseTo(
      ROBOT.initialOmega * ROBOT_DROP_TIME + finalOmega * 0.3,
      12,
    );
  });

  it('accumulates captures at the same radius and rejects invalid loads', () => {
    let trial = createRobotTrial();
    for (const invalid of [0, -1, 6, NaN, Infinity])
      expect(releaseRobotLoad(trial, invalid)).toBe(trial);
    for (let index = 0; index < 3; index++) {
      const released = releaseRobotLoad(trial, 5);
      expect(releaseRobotLoad(released, 1)).toBe(released);
      const next = advanceRobotTrial(released, ROBOT_DROP_TIME + 0.01);
      expect(robotOmega(next)).toBeLessThan(robotOmega(trial));
      expect(next.momentum).toBe(trial.momentum);
      trial = next;
    }
    expect(trial.load).toBe(15);
    expect(trial.captures).toHaveLength(3);
    expect(releaseRobotLoad(trial, ROBOT.minLoad)).toBe(trial);
  });
  it('brings successive weights to the top of the stack and carries them out on the rail', () => {
    const first = advanceRobotTrial(
      releaseRobotLoad(createRobotTrial(-2), 2),
      1,
    );
    const secondDrop = releaseRobotLoad(first, 4, 0.5);
    expect(secondDrop.drop?.catchHeight).toBeCloseTo(robotCargoHeight(4));
    expect(secondDrop.drop?.catchTime).toBeCloseTo(
      1 + Math.sqrt(1 / ROBOT.gravity),
    );
    expect(setRobotRadius(secondDrop, 0.8)).toBe(secondDrop);
    const loaded = advanceRobotTrial(secondDrop, 0.5);
    const sliding = setRobotRadius(loaded, 0.8);
    expect(releaseRobotLoad(sliding, 1)).toBe(sliding);
    const far = advanceRobotTrial(sliding, 1);
    expect(far.radius).toBe(0.8);
    expect(far.momentum).toBe(-1.8);
    expect(robotOmega(far)).toBeCloseTo(-1.8 / (0.9 + 6 * 0.8 ** 2));
    expect(Math.abs(robotOmega(far))).toBeLessThan(
      Math.abs(robotOmega(loaded)),
    );
    expect(far.captures.map(({ mass }) => mass)).toEqual([2, 4]);
  });
});
