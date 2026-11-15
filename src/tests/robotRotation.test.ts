import { describe, expect, it } from 'vitest';
import {
  ROBOT,
  ROBOT_DROP_TIME,
  advanceRobotTrial,
  createRobotTrial,
  releaseRobotLoad,
  robotDropHeight,
  robotInertia,
  robotOmega,
} from '../physics/equations/robotRotation';

describe('robot backpack capture', () => {
  it('drops vertically and meets the backpack at the same position and time', () => {
    const spinning = advanceRobotTrial(createRobotTrial(), 0.625);
    const released = releaseRobotLoad(spinning, 2);
    const drop = released.drop!;
    expect(robotDropHeight(drop, spinning.time)).toBeCloseTo(
      ROBOT.catchHeight + ROBOT.dropHeight,
    );
    expect(robotDropHeight(drop, drop.catchTime)).toBeCloseTo(
      ROBOT.catchHeight,
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
});
