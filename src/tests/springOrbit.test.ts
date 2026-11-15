import { describe, expect, it } from 'vitest';
import {
  advanceSpring,
  createSpringTrial,
  DEFAULT_SPRING,
  measureSpring,
  updateSpring,
} from '../physics/equations/springOrbit';

describe('central spring orbit', () => {
  it('begins in circular equilibrium and conserves axial angular momentum', () => {
    const start = createSpringTrial();
    const before = measureSpring(start);
    const after = measureSpring(advanceSpring(start, 6));
    expect(after.radius).toBeCloseTo(before.radius, 3);
    expect(after.momentum).toBeCloseTo(before.momentum, 10);
    expect(after.energy).toBeCloseTo(before.energy, 5);
  });

  it('changes the radial motion and energy when the rest length is adjusted', () => {
    const before = advanceSpring(
      createSpringTrial({ ...DEFAULT_SPRING, mass: 2 }),
      0.5,
    );
    const changed = updateSpring(before, {
      ...before.settings,
      restLength: 0.35,
    });
    expect(changed.x).toBe(before.x);
    expect(changed.vx).toBe(before.vx);
    expect(changed.work).toBeGreaterThan(0);
    const after = measureSpring(advanceSpring(changed, 0.6));
    const initial = measureSpring(before);
    expect(after.radius).toBeLessThan(initial.radius - 0.1);
    expect(after.momentum).toBeCloseTo(initial.momentum, 10);
    expect(after.adjustedEnergy).toBeCloseTo(initial.energy, 3);
  });
});
