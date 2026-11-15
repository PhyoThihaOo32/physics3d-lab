import { describe, expect, it } from 'vitest';
import {
  STRING,
  advanceStringTrial,
  advanceTurntableTrial,
  createStringTrial,
  createTurntableTrial,
  measureString,
  measureTurntable,
  startStringPull,
} from '../physics/equations/spinDemos';

describe('puck pulled inward by a string', () => {
  it('reproduces the textbook example and conserves angular momentum throughout the pull', () => {
    const initial = createStringTrial();
    expect(measureString(initial).tangentialSpeed).toBeCloseTo(2.4, 12);
    expect(measureString(initial).omega).toBeCloseTo(3, 12);
    let puck = startStringPull(initial, 0.48);
    for (let step = 0; step < 240; step++) {
      const previousRadius = puck.radius;
      puck = advanceStringTrial(puck, 1 / 120);
      const { inertia, omega, tangentialSpeed } = measureString(puck);
      expect(puck.radius).toBeLessThanOrEqual(previousRadius);
      expect(inertia * omega).toBeCloseTo(1.92, 12);
      expect(STRING.mass * puck.radius * tangentialSpeed).toBeCloseTo(1.92, 12);
    }
    puck = advanceStringTrial(puck, 0.01);
    const final = measureString(puck);
    expect(puck.pull).toBeNull();
    expect(puck.radialSpeed).toBe(0);
    expect(puck.radius).toBeCloseTo(0.48, 12);
    expect(final.tangentialSpeed).toBeCloseTo(4, 12);
    expect(final.omega).toBeCloseTo(25 / 3, 12);
    expect(final.energy).toBeCloseTo(8, 12);
    expect(startStringPull(puck, 0.6)).toBe(puck);
    expect(startStringPull(puck, 0)).toBe(puck);
  });

  it('keeps the string under tension at the shortest supported radius', () => {
    let puck = startStringPull(createStringTrial(2, 1), STRING.minRadius);
    for (let step = 0; step < 240; step++) {
      const previousVelocity = puck.radialSpeed;
      puck = advanceStringTrial(puck, 1 / 120);
      const radialAcceleration = (puck.radialSpeed - previousVelocity) * 120;
      const centripetalAcceleration =
        puck.radius * measureString(puck).omega ** 2;
      expect(centripetalAcceleration - radialAcceleration).toBeGreaterThan(0);
      expect(measureString(puck).tension).toBeGreaterThan(0);
    }
  });

  it('uses both selected walker mass and measured track radius', () => {
    const trial = advanceTurntableTrial(
      createTurntableTrial(),
      3,
      1.5,
      120,
      80,
      0.75,
    );
    const result = measureTurntable(trial, 120, 80, 0.75);
    expect(Math.hypot(...result.radius)).toBeCloseTo(0.75);
    expect(result.personMomentum).toBeCloseTo((45 * 240) / 165);
    expect(result.totalMomentum).toBeCloseTo(0, 10);
  });
});

describe('walking on a torque-free platform', () => {
  it('balances signed axial moments and reverses through rest', () => {
    let trial = advanceTurntableTrial(createTurntableTrial(), 2, 1.5, 120);
    const ccw = measureTurntable(trial, 120);
    expect(ccw.personOmega).toBeCloseTo(1, 12);
    expect(ccw.platformOmega).toBeCloseTo(-0.5, 12);
    expect(ccw.personMomentum).toBeCloseTo(60, 12);
    expect(ccw.platformMomentum).toBeCloseTo(-60, 12);
    expect(ccw.totalMomentum).toBeCloseTo(0, 12);
    trial = advanceTurntableTrial(trial, 1, -1.5, 120);
    expect(measureTurntable(trial, 120).personMomentum).toBeCloseTo(0, 12);
    trial = advanceTurntableTrial(trial, 1, -1.5, 120);
    const cw = measureTurntable(trial, 120);
    expect(cw.personMomentum).toBeCloseTo(-60, 12);
    expect(cw.platformMomentum).toBeCloseTo(60, 12);
    expect(cw.totalMomentum).toBeCloseTo(0, 12);
  });

  it('rotates heavier platforms more slowly at the same relative speed', () => {
    const light = measureTurntable(
      advanceTurntableTrial(createTurntableTrial(), 2, 1.5, 60),
      60,
    );
    const heavy = measureTurntable(
      advanceTurntableTrial(createTurntableTrial(), 2, 1.5, 240),
      240,
    );
    expect(Math.abs(heavy.platformOmega)).toBeLessThan(
      Math.abs(light.platformOmega),
    );
    expect(heavy.personOmega - heavy.platformOmega).toBeCloseTo(1.5, 12);
    expect(light.totalMomentum).toBeCloseTo(0, 12);
    expect(heavy.totalMomentum).toBeCloseTo(0, 12);
  });
});
