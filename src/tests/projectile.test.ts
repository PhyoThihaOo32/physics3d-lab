import RAPIER from '@dimforge/rapier3d-compat';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECTILE,
  PROJECTILE,
  projectileParameterError,
  type ProjectileParameters,
} from '../experiments/projectile-motion/config';
import { mechanicalEnergy } from '../physics/equations/energy';
import { FIXED_TIME_STEP } from '../physics/constants/world';
import { hasGroundContactImpulse } from '../physics/engine/contacts';
import {
  launchVelocity,
  predictProjectile,
  projectileAtTime,
} from '../physics/equations/projectile';
import { ProjectileMeasurements } from '../physics/measurements/projectileMeasurements';
import { vectorMagnitude } from '../physics/vectors/vectorMath';

beforeAll(async () => {
  await RAPIER.init();
});
const worlds: RAPIER.World[] = [];
afterEach(() => {
  worlds.forEach((world) => world.free());
  worlds.length = 0;
});
function simulate(
  parameters: ProjectileParameters,
  timeStep = FIXED_TIME_STEP,
) {
  const world = new RAPIER.World({ x: 0, y: -parameters.gravity, z: 0 });
  worlds.push(world);
  world.timestep = timeStep;
  const ground = world.createCollider(
    RAPIER.ColliderDesc.cuboid(2000, 0.1, 2000)
      .setTranslation(0, -0.1, 0)
      .setFriction(0)
      .setRestitution(0),
  );
  const [vx, vy, vz] = launchVelocity(parameters);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, PROJECTILE.radius + parameters.height, 0)
      .setLinvel(vx, vy, vz)
      .setCcdEnabled(true)
      .setSoftCcdPrediction(PROJECTILE.softCcdPrediction),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(PROJECTILE.radius)
      .setMass(parameters.mass)
      .setFriction(0)
      .setRestitution(0),
    body,
  );
  const measurements = new ProjectileMeasurements(
    parameters.height,
    [vx, vy, vz],
    timeStep,
  );
  function step() {
    world.step();
    const p = body.translation();
    const v = body.linvel();
    return measurements.sample(
      [p.x, p.y - PROJECTILE.radius, p.z],
      [v.x, v.y, v.z],
      hasGroundContactImpulse(world, body, ground),
    );
  }
  return { world, body, measurements, step };
}

describe('projectile motion: analytical model and Rapier integration', () => {
  const cases = [0, 30, 45, 90].flatMap((angle) =>
    [1.62, 9.81].flatMap((gravity) =>
      [0.1, 10].map((mass) => ({
        ...DEFAULT_PROJECTILE,
        angle,
        gravity,
        mass,
      })),
    ),
  );
  it.each(cases)(
    'angle=$angle, gravity=$gravity, mass=$mass agrees with theory',
    (parameters) => {
      const { step, measurements } = simulate(parameters);
      const prediction = predictProjectile(parameters);
      while (
        !measurements.snapshot.landing &&
        measurements.clock.time < prediction.flightTime! + 0.2
      ) {
        const s = step();
        if (!s.landing) {
          const initialEnergy = mechanicalEnergy(
            parameters.mass,
            parameters.gravity,
            parameters.height,
            launchVelocity(parameters),
          );
          const energy = mechanicalEnergy(
            parameters.mass,
            parameters.gravity,
            s.position[1],
            s.velocity,
          );
          expect(Math.abs(energy - initialEnergy) / initialEnergy).toBeLessThan(
            0.01,
          );
          const theory = projectileAtTime(parameters, s.time);
          expect(Math.abs(s.position[0] - theory.position[0])).toBeLessThan(
            0.01,
          );
          expect(Math.abs(s.position[1] - theory.position[1])).toBeLessThan(
            0.05,
          );
          expect(Math.abs(s.velocity[0] - theory.velocity[0])).toBeLessThan(
            0.002,
          );
          expect(Math.abs(s.velocity[1] - theory.velocity[1])).toBeLessThan(
            0.002,
          );
          expect(Math.abs(s.acceleration![0])).toBeLessThan(0.005);
          expect(
            Math.abs(s.acceleration![1] + parameters.gravity),
          ).toBeLessThan(0.005);
          expect(Math.abs(s.position[2])).toBeLessThan(1e-6);
        }
      }
      const s = measurements.snapshot;
      expect(s.landing).not.toBeNull();
      expect(Math.abs(s.landing!.time - prediction.flightTime!)).toBeLessThan(
        0.03,
      );
      expect(Math.abs(s.landing!.range - prediction.range!)).toBeLessThan(
        Math.abs(launchVelocity(parameters)[0]) * 0.03 + 0.01,
      );
      expect(Math.abs(s.maxHeight - prediction.maxHeight!)).toBeLessThan(0.05);
      expect(s.landing!.preImpact.time).toBeLessThan(s.landing!.time);
      expect(s.landing!.preImpact.acceleration![1]).toBeCloseTo(
        -parameters.gravity,
        2,
      );
      expect(s.position[1]).toBeGreaterThan(-0.03);
    },
  );
  it('matches the equal-height 10 m/s, 45° textbook benchmark without counting launch contact as landing', () => {
    const p = { ...DEFAULT_PROJECTILE, height: 0 };
    const predicted = predictProjectile(p);
    expect(predicted.flightTime).toBeCloseTo(1.4416, 3);
    expect(predicted.range).toBeCloseTo(10.1937, 3);
    expect(predicted.maxHeight).toBeCloseTo(2.5484, 3);
    const { step, measurements } = simulate(p);
    while (!measurements.snapshot.landing && measurements.clock.time < 2)
      step();
    expect(measurements.snapshot.landing!.time).toBeGreaterThan(1.4);
    expect(measurements.snapshot.apex!.time).toBeCloseTo(
      predicted.apexTime!,
      2,
    );
  });
  it('uses launch velocity as the derivative baseline, not a fictitious launch acceleration', () => {
    const { step } = simulate(DEFAULT_PROJECTILE);
    const s = step();
    expect(s.acceleration![0]).toBeCloseTo(0, 4);
    expect(s.acceleration![1]).toBeCloseTo(-9.81, 3);
  });
  it('keeps zero-gravity velocity constant and reports no finite predicted landing', () => {
    const p = { ...DEFAULT_PROJECTILE, gravity: 0 };
    const { step, measurements } = simulate(p);
    for (let i = 0; i < 240; i++) step();
    expect(measurements.snapshot.landing).toBeNull();
    expect(measurements.snapshot.acceleration).toEqual([0, 0, 0]);
    expect(vectorMagnitude(measurements.snapshot.velocity)).toBeCloseTo(
      p.speed,
      5,
    );
    expect(predictProjectile(p)).toMatchObject({
      flightTime: null,
      range: null,
      maxHeight: null,
    });
  });
  it('reduces positional integration error when the timestep is halved', () => {
    const errors = [1 / 60, 1 / 120].map((dt) => {
      const { step, measurements } = simulate(DEFAULT_PROJECTILE, dt);
      for (let i = 0; i < Math.round(0.5 / dt); i++) step();
      return Math.abs(
        measurements.snapshot.position[1] -
          projectileAtTime(DEFAULT_PROJECTILE, 0.5).position[1],
      );
    });
    expect(errors[1]).toBeLessThan(errors[0] * 0.6);
  });
  it('bounds trail memory and stops observation at the explicitly defined time limit', () => {
    const m = new ProjectileMeasurements(1, [1, 0, 0], 0.1, 8, 2);
    for (let i = 1; i <= 30; i++) m.sample([i * 0.1, 1, 0], [1, 0, 0], false);
    expect(m.snapshot.limitReached).toBe(true);
    expect(m.snapshot.time).toBe(2);
    expect(m.trail.length).toBeLessThanOrEqual(8);
    expect(m.snapshot.landing).toBeNull();
  });
  it('rejects unsupported, empty-equivalent, and non-airborne initial conditions', () => {
    expect(
      projectileParameterError({ ...DEFAULT_PROJECTILE, gravity: NaN }),
    ).not.toBeNull();
    expect(
      projectileParameterError({ ...DEFAULT_PROJECTILE, gravity: 0.5 }),
    ).not.toBeNull();
    expect(
      projectileParameterError({ ...DEFAULT_PROJECTILE, height: 0, angle: 0 }),
    ).not.toBeNull();
    expect(
      projectileParameterError({ ...DEFAULT_PROJECTILE, speed: 0, height: 1 }),
    ).toBeNull();
    expect(
      projectileParameterError({ ...DEFAULT_PROJECTILE, height: 0 }),
    ).toBeNull();
  });
  it.each([
    {
      ...DEFAULT_PROJECTILE,
      speed: 20,
      angle: 45,
      height: 10,
      gravity: 1,
      mass: 10,
    },
    { ...DEFAULT_PROJECTILE, speed: 20, angle: 90, height: 10, gravity: 1 },
    { ...DEFAULT_PROJECTILE, speed: 20, angle: 0, height: 0.1, gravity: 20 },
    { ...DEFAULT_PROJECTILE, speed: 0, height: 1, gravity: 20 },
  ])(
    'resolves supported boundary launches: v=$speed, angle=$angle, g=$gravity',
    (parameters) => {
      const { step, measurements } = simulate(parameters);
      const predicted = predictProjectile(parameters);
      while (
        !measurements.snapshot.landing &&
        measurements.clock.time < predicted.flightTime! + 0.2
      )
        step();
      expect(measurements.snapshot.landing).not.toBeNull();
      expect(
        Math.abs(measurements.snapshot.landing!.time - predicted.flightTime!),
      ).toBeLessThan(0.03);
      expect(
        Math.abs(measurements.snapshot.landing!.range - predicted.range!),
      ).toBeLessThan(Math.abs(launchVelocity(parameters)[0]) * 0.03 + 0.02);
      expect(
        Math.abs(measurements.snapshot.maxHeight - predicted.maxHeight!),
      ).toBeLessThan(0.1);
      const sample = measurements.snapshot.lastAirborne;
      const initialEnergy = mechanicalEnergy(
        parameters.mass,
        parameters.gravity,
        parameters.height,
        launchVelocity(parameters),
      );
      const energy = mechanicalEnergy(
        parameters.mass,
        parameters.gravity,
        sample.position[1],
        sample.velocity,
      );
      expect(Math.abs(energy - initialEnergy) / initialEnergy).toBeLessThan(
        0.01,
      );
    },
  );
  it('rejects a flight too short to resolve with the fixed timestep', () => {
    expect(
      projectileParameterError({
        ...DEFAULT_PROJECTILE,
        height: 0,
        speed: 0.1,
        angle: 1,
      }),
    ).toContain('two physics steps');
  });
});
