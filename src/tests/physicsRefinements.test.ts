import { describe, expect, it } from 'vitest';
import { mechanicalEnergy } from '../physics/equations/energy';
import {
  predictProjectile,
  projectileAtTime,
  launchVelocity,
} from '../physics/equations/projectile';
import {
  DEFAULT_PROJECTILE,
  PROJECTILE,
} from '../experiments/projectile-motion/config';
import { projectileView } from '../experiments/projectile-motion/viewModel';
import { newProjectileMeasurements } from '../store/projectileStore';
import { FIXED_TIME_STEP } from '../physics/constants/world';

describe('physics refinements and geometric consistency', () => {
  it('conserves theoretical mechanical energy throughout an airborne trajectory', () => {
    const p = { ...DEFAULT_PROJECTILE, mass: 3 };
    const initial = mechanicalEnergy(
      p.mass,
      p.gravity,
      p.height,
      launchVelocity(p),
    );
    const t = predictProjectile(p).flightTime!;
    for (let i = 0; i <= 20; i++) {
      const sample = projectileAtTime(p, (t * i) / 20);
      expect(
        mechanicalEnergy(
          p.mass,
          p.gravity,
          sample.position[1],
          sample.velocity,
        ),
      ).toBeCloseTo(initial, 9);
    }
  });
  it('uses a common contact-height potential-energy reference for the cube and sphere', () => {
    expect(mechanicalEnergy(1, 9.81, 4.5 - 0.5, [0, 0, 0])).toBeCloseTo(
      39.24,
      8,
    );
    expect(
      mechanicalEnergy(1, 9.81, 1, launchVelocity(DEFAULT_PROJECTILE)),
    ).toBeCloseTo(59.81, 8);
    expect(mechanicalEnergy(2, 0, 100, [3, 4, 0])).toBe(25);
    expect(mechanicalEnergy(1, 0, 1, [0, 0, 0])).toBe(0);
  });
  it('keeps finite height for horizontal or stationary zero-gravity motion', () => {
    expect(
      predictProjectile({ ...DEFAULT_PROJECTILE, gravity: 0, angle: 0 }),
    ).toMatchObject({ flightTime: null, range: null, maxHeight: 1 });
    expect(
      predictProjectile({ ...DEFAULT_PROJECTILE, gravity: 0, speed: 0 }),
    ).toMatchObject({ flightTime: null, maxHeight: 1 });
    expect(
      predictProjectile({ ...DEFAULT_PROJECTILE, gravity: 0 }),
    ).toMatchObject({ flightTime: null, maxHeight: null });
  });
  it('has equal complementary-angle ranges only for equal launch/landing height', () => {
    const a = predictProjectile({
      ...DEFAULT_PROJECTILE,
      angle: 30,
      height: 0,
    });
    const b = predictProjectile({
      ...DEFAULT_PROJECTILE,
      angle: 60,
      height: 0,
    });
    expect(a.range).toBeCloseTo(b.range!, 10);
    expect(a.flightTime).toBeLessThan(b.flightTime!);
    expect(a.maxHeight).toBeLessThan(b.maxHeight!);
    expect(
      predictProjectile({ ...DEFAULT_PROJECTILE, angle: 30 }).range,
    ).not.toBeCloseTo(
      predictProjectile({ ...DEFAULT_PROJECTILE, angle: 60 }).range!,
      2,
    );
  });
  it('distinguishes apex zero vertical velocity from zero acceleration', () => {
    const prediction = predictProjectile(DEFAULT_PROJECTILE);
    const sample = projectileAtTime(DEFAULT_PROJECTILE, prediction.apexTime!);
    expect(sample.velocity[1]).toBeCloseTo(0, 10);
    expect(sample.velocity[0]).toBeCloseTo(10 / Math.sqrt(2), 10);
    expect(sample.acceleration[1]).toBe(-9.81);
  });
  it.each([
    DEFAULT_PROJECTILE,
    { ...DEFAULT_PROJECTILE, speed: 20, gravity: 1, height: 10 },
    { ...DEFAULT_PROJECTILE, speed: 20, angle: 90, height: 10, gravity: 1 },
    { ...DEFAULT_PROJECTILE, angle: 0, height: 0.1, gravity: 20 },
    { ...DEFAULT_PROJECTILE, gravity: 0 },
    { ...DEFAULT_PROJECTILE, speed: 0, gravity: 0 },
  ])(
    'keeps ground and displayed grid consistent for $speed m/s, $angle°, g=$gravity',
    (parameters) => {
      const view = projectileView(parameters);
      expect(view.groundSize / view.gridSpacing).toBeCloseTo(
        Math.round(view.groundSize / view.gridSpacing),
        10,
      );
      expect(view.groundCenterX / view.gridSpacing).toBeCloseTo(
        Math.round(view.groundCenterX / view.gridSpacing),
        10,
      );
      expect(view.groundCenterX - view.groundSize / 2).toBeLessThan(0);
      expect(view.groundCenterX + view.groundSize / 2).toBeGreaterThan(
        view.range,
      );
      expect(view.duration).toBeLessThan(PROJECTILE.observationLimit);
      const initial = newProjectileMeasurements(parameters).snapshot;
      expect(initial.time).toBe(0);
      expect(initial.acceleration).toBeNull();
      expect(initial.velocity).toEqual(launchVelocity(parameters));
      expect(FIXED_TIME_STEP).toBe(1 / 120);
    },
  );
  it('ends zero-gravity observation without reporting a physical landing', () => {
    const m = newProjectileMeasurements({ ...DEFAULT_PROJECTILE, gravity: 0 });
    for (let step = 0; step < 1200; step++) {
      const time = (step + 1) * FIXED_TIME_STEP;
      const p = projectileAtTime({ ...DEFAULT_PROJECTILE, gravity: 0 }, time);
      m.sample(p.position, p.velocity, false);
    }
    expect(m.snapshot.limitReached).toBe(true);
    expect(m.snapshot.time).toBe(PROJECTILE.zeroGravityDuration);
    expect(m.snapshot.landing).toBeNull();
  });
});
