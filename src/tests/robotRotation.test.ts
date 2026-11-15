import { describe, expect, it } from 'vitest';
import {
  ROBOT,
  ROBOT_DROP_TIME,
  advanceRobotTrial,
  createRobotTrial,
  robotCargoBlocks,
  robotCargoHeight,
  robotInertia,
  robotOmega,
  robotTrialInertia,
  robotTransferPosition,
  setRobotLoad,
} from '../physics/equations/robotRotation';

describe('robot backpack loading', () => {
  it('drops a payload vertically to the correct location and conserves axial angular momentum on capture', () => {
    const initial = advanceRobotTrial(createRobotTrial(), 0.625);
    const released = setRobotLoad(initial, 2);
    const transfer = released.transfer!;
    const [x, startY, z] = robotTransferPosition(transfer, transfer.start, 0);
    const landing = robotTransferPosition(transfer, transfer.end, 0);
    expect(startY).toBeCloseTo(robotCargoHeight(1) + ROBOT.dropHeight);
    expect(landing).toEqual([x, robotCargoHeight(1), z]);
    const midair = advanceRobotTrial(released, ROBOT_DROP_TIME / 2);
    expect(midair.load).toBe(0);
    expect(robotOmega(midair)).toBe(ROBOT.initialOmega);
    const caught = advanceRobotTrial(midair, transfer.end - midair.time);
    expect(caught.transfer).toBeNull();
    expect(caught.load).toBe(2);
    expect(ROBOT.backpackRadius * Math.sin(caught.angle)).toBeCloseTo(x, 12);
    expect(ROBOT.backpackRadius * Math.cos(caught.angle)).toBeCloseTo(z, 12);
    expect(caught.momentum).toBe(initial.momentum);
    expect(robotOmega(caught)).toBeCloseTo(1.322751, 5);
    expect(
      0.5 * robotInertia(caught.load) * robotOmega(caught) ** 2,
    ).toBeLessThan(0.5 * robotInertia(initial.load) * robotOmega(initial) ** 2);
  });

  it('fills and trims the same visible 5 kg blocks regardless of the order of changes', () => {
    const blocks = (load: number, base = 0) =>
      robotCargoBlocks(load, base).map(({ index, mass }) => [index, mass]);
    expect(blocks(0)).toEqual([]);
    expect(blocks(4.5)).toEqual([[0, 4.5]]);
    expect(blocks(5)).toEqual([[0, 5]]);
    expect(blocks(5.5)).toEqual([
      [0, 5],
      [1, 0.5],
    ]);
    expect(blocks(10)).toEqual([
      [0, 5],
      [1, 5],
    ]);
    expect(blocks(12.5)).toEqual([
      [0, 5],
      [1, 5],
      [2, 2.5],
    ]);
    expect(blocks(12.5, 4.5)).toEqual([
      [0, 0.5],
      [1, 5],
      [2, 2.5],
    ]);
    expect(robotCargoBlocks(7.5)[1]?.center).toBe(robotCargoHeight(6.25));
  });

  it('speeds up as lifted cargo moves inward and releases without a spin jump', () => {
    const loaded = advanceRobotTrial(
      setRobotLoad(createRobotTrial(-2), 12.5),
      1,
    );
    const spin = robotOmega(loaded);
    const lifting = setRobotLoad(loaded, 7.5);
    const midlift = advanceRobotTrial(lifting, ROBOT.liftTime / 2);
    expect(midlift.load).toBe(12.5);
    const [x, y, z] = robotTransferPosition(
      midlift.transfer!,
      midlift.time,
      midlift.angle,
    );
    expect(y).toBeGreaterThan(robotCargoHeight(10));
    expect(x).toBeCloseTo(ROBOT.backpackRadius * Math.sin(midlift.angle), 12);
    expect(z).toBeCloseTo(ROBOT.backpackRadius * Math.cos(midlift.angle), 12);
    expect(robotOmega(midlift)).toBeCloseTo(spin, 12);
    const retracting = advanceRobotTrial(
      lifting,
      ROBOT.liftTime + ROBOT.retractTime / 2,
    );
    const [inwardX, , inwardZ] = robotTransferPosition(
      retracting.transfer!,
      retracting.time,
      retracting.angle,
    );
    expect(Math.hypot(inwardX, inwardZ)).toBeCloseTo(ROBOT.backpackRadius / 2);
    expect(robotTrialInertia(retracting)).toBeCloseTo(
      robotInertia(7.5) + 5 * (ROBOT.backpackRadius / 2) ** 2,
      12,
    );
    expect(robotOmega(retracting)).toBeLessThan(spin);
    expect(retracting.momentum).toBe(loaded.momentum);

    const transfer = lifting.transfer!;
    const nearRelease = advanceRobotTrial(
      retracting,
      transfer.end - retracting.time - 0.001,
    );
    const lighter = advanceRobotTrial(
      retracting,
      transfer.end - retracting.time,
    );
    const [exitX, exitY, exitZ] = robotTransferPosition(
      transfer,
      transfer.end,
      lighter.angle,
    );
    expect(Math.hypot(exitX, exitZ)).toBe(0);
    expect(exitY).toBe(robotCargoHeight(10) + ROBOT.dropHeight);
    expect(lighter.transfer).toBeNull();
    expect(lighter.load).toBe(7.5);
    expect(lighter.lastChange?.kind).toBe('remove');
    expect(robotOmega(lighter)).toBeCloseTo(robotOmega(nearRelease), 8);
    expect(robotOmega(lighter)).toBeCloseTo(
      loaded.momentum / robotInertia(7.5),
    );
    expect(lighter.momentum).toBe(loaded.momentum);
    const empty = advanceRobotTrial(setRobotLoad(lighter, 0), 2);
    expect(empty.load).toBe(0);
    expect(robotOmega(empty)).toBeCloseTo(-2, 12);
  });

  it('keeps a heavy ideal load turning but stops earlier under load with dry friction', () => {
    const load = ROBOT.capacity;
    const ideal = advanceRobotTrial(
      setRobotLoad(createRobotTrial(2), load),
      50,
    );
    expect(robotOmega(ideal)).toBeCloseTo(1.8 / robotInertia(load), 12);
    expect(ideal.momentum).toBe(1.8);
    const initial = createRobotTrial(-2, true);
    const falling = setRobotLoad(initial, load);
    const continued = advanceRobotTrial(
      advanceRobotTrial(falling, ROBOT_DROP_TIME / 2),
      ROBOT_DROP_TIME / 2,
    );
    const transfer = falling.transfer;
    if (transfer?.kind !== 'add') throw new Error('Expected a falling load');
    expect(continued.angle).toBeCloseTo(transfer.landingAngle, 12);
    expect(continued.momentum).toBeCloseTo(
      advanceRobotTrial(initial, ROBOT_DROP_TIME).momentum,
      12,
    );
    const stopped = advanceRobotTrial(continued, 4);
    expect(stopped.momentum).toBe(0);
    expect(robotOmega(stopped)).toBe(0);
    const unloaded = advanceRobotTrial(setRobotLoad(stopped, 0), 10);
    expect(unloaded.momentum).toBe(0);
    expect(unloaded.angle).toBe(stopped.angle);
    expect(robotOmega(advanceRobotTrial(initial, stopped.time))).toBeLessThan(
      0,
    );
  });

  it('accepts any target within capacity and rejects overlapping or invalid transfers', () => {
    const start = createRobotTrial();
    for (const target of [-1, 16, NaN, Infinity, 0])
      expect(setRobotLoad(start, target)).toBe(start);
    const adding = setRobotLoad(start, 15);
    expect(setRobotLoad(adding, 5)).toBe(adding);
    const full = advanceRobotTrial(adding, 1);
    expect(full.load).toBe(15);
    expect(setRobotLoad(full, 15)).toBe(full);
  });
});
