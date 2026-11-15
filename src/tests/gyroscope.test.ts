import { describe, expect, it } from 'vitest';
import {
  GYROSCOPE,
  advanceGyroscope,
  createGyroscopeTrial,
  measureGyroscope,
} from '../physics/equations/gyroscope';

function completedTrial(spin: number) {
  return measureGyroscope(
    advanceGyroscope(createGyroscopeTrial(spin), GYROSCOPE.duration),
  );
}

describe('bicycle wheel gyroscope', () => {
  it('raises the stationary axle by the integrated angular acceleration', () => {
    const result = completedTrial(0);
    const expectedAngle =
      (GYROSCOPE.peakTorque * GYROSCOPE.duration ** 2) /
      (4 * GYROSCOPE.transverseInertia);
    expect(result.rise).toBeCloseTo((expectedAngle * 180) / Math.PI, 6);
    expect(result.swerve).toBeCloseTo(0, 8);
    expect(result.momentum).toEqual(result.deltaMomentum);
  });

  it('swerves in opposite directions under the same lifting torque when spin is reversed', () => {
    const forward = completedTrial(GYROSCOPE.spinSpeed);
    const reverse = completedTrial(-GYROSCOPE.spinSpeed);
    expect(forward.swerve).toBeGreaterThan(10);
    expect(forward.swerve).toBeGreaterThan(Math.abs(forward.rise));
    expect(reverse.swerve).toBeCloseTo(-forward.swerve, 7);
    expect(reverse.rise).toBeCloseTo(forward.rise, 7);
    expect(forward.deltaMomentum).toEqual(reverse.deltaMomentum);
  });

  it('adds the torque impulse to initial angular momentum at any point and freezes at the endpoint', () => {
    const start = createGyroscopeTrial();
    const middle = advanceGyroscope(start, GYROSCOPE.duration / 2);
    const values = measureGyroscope(middle);
    expect(values.impulse).toBeCloseTo(0.5);
    expect(Math.hypot(...values.torque)).toBeCloseTo(GYROSCOPE.peakTorque);
    values.momentum.forEach((value, component) => {
      expect(value).toBeCloseTo(
        values.initialMomentum[component] + values.deltaMomentum[component],
        10,
      );
    });
    const end = advanceGyroscope(middle, 2);
    expect(end.time).toBe(GYROSCOPE.duration);
    expect(advanceGyroscope(end, 1)).toBe(end);
    expect(end.orientation.length()).toBeCloseTo(1, 10);
    expect(measureGyroscope(end).swerve).toBeCloseTo(
      completedTrial(start.spinSpeed).swerve,
      7,
    );
  });
});
