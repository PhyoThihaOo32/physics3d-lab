import { describe, expect, it } from 'vitest';
import {
  STRING,
  advanceStringTrial,
  advanceTurntableTrial,
  createStringTrial,
  createTurntableTrial,
  measureString,
  measureTurntable,
  setStringLength,
} from '../physics/equations/spinDemos';

describe('puck pulled inward by a string', () => {
  it('reproduces the textbook example and conserves angular momentum throughout the pull', () => {
    const initial = createStringTrial();
    expect(measureString(initial).tangentialSpeed).toBeCloseTo(2.4, 12);
    expect(measureString(initial).omega).toBeCloseTo(3, 12);
    let puck = setStringLength(initial, STRING.exampleTarget);
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
    expect(puck.reel).toBeNull();
    expect(puck.radialSpeed).toBe(0);
    expect(puck.radius).toBeCloseTo(0.48, 12);
    expect(final.tangentialSpeed).toBeCloseTo(4, 12);
    expect(final.omega).toBeCloseTo(25 / 3, 12);
    expect(final.energy).toBeCloseTo(8, 12);
    expect(setStringLength(puck, STRING.exampleTarget)).toBe(puck);
    expect(setStringLength(puck, 0)).toBe(puck);
    expect(setStringLength(puck, 0.9)).toBe(puck);
  });

  it('retargets mid-pull, preserves radial velocity, and keeps the string taut', () => {
    let puck = createStringTrial(2, 1);
    const followFor = (steps: number) => {
      for (let step = 0; step < steps; step++) {
        const previousSpeed = puck.radialSpeed;
        puck = advanceStringTrial(puck, 1 / 120);
        expect(puck.radius).toBeGreaterThanOrEqual(STRING.minRadius - 1e-12);
        expect(puck.radius).toBeLessThanOrEqual(STRING.initialRadius + 1e-12);
        expect(Math.abs(puck.radialSpeed - previousSpeed)).toBeLessThan(
          STRING.reelAcceleration / 120 + 1e-12,
        );
        const { inertia, omega, tension } = measureString(puck);
        expect(inertia * omega).toBeCloseTo(1.6, 12);
        expect(tension).toBeGreaterThan(0);
      }
    };
    puck = setStringLength(puck, STRING.minRadius);
    followFor(55);
    const before = puck;
    expect(before.radialSpeed).toBeLessThan(0);
    puck = setStringLength(puck, 0.72);
    expect(puck.radius).toBe(before.radius);
    expect(puck.angle).toBe(before.angle);
    expect(puck.radialSpeed).toBe(before.radialSpeed);
    followFor(85);
    expect(puck.radialSpeed).toBeGreaterThan(0);
    puck = setStringLength(puck, 0.39);
    followFor(250);
    expect(puck.reel).toBeNull();
    expect(puck.radius).toBe(0.39);
    expect(puck.radialSpeed).toBe(0);
    puck = setStringLength(puck, STRING.initialRadius);
    followFor(250);
    expect(puck.radius).toBe(STRING.initialRadius);
    expect(measureString(puck).tangentialSpeed).toBe(1);
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
