import RAPIER from '@dimforge/rapier3d-compat';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_PARAMETERS,
  DROP,
  validDropParameters,
  type DropParameters,
} from '../experiments/free-fall/config';
import { mechanicalEnergy } from '../physics/equations/energy';
import { FIXED_TIME_STEP } from '../physics/constants/world';
import { hasGroundContactImpulse } from '../physics/engine/contacts';
import {
  freeFallAtTime,
  freeFallContactTime,
} from '../physics/equations/freeFall';
import { DropMeasurements } from '../physics/measurements/dropMeasurements';
import { useFreeFallStore } from '../store/freeFallStore';
import { useSimulationStore } from '../store/simulationStore';

beforeAll(async () => {
  await RAPIER.init();
});
const worlds: RAPIER.World[] = [];
afterEach(() => {
  worlds.forEach((world) => world.free());
  worlds.length = 0;
  useFreeFallStore.getState().clear();
  useSimulationStore.getState().reset();
});
function createDrop(parameters: DropParameters = DEFAULT_PARAMETERS) {
  const world = new RAPIER.World({ x: 0, y: -parameters.gravity, z: 0 });
  worlds.push(world);
  world.timestep = FIXED_TIME_STEP;
  const groundBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      0,
      -DROP.groundHalfThickness,
      0,
    ),
  );
  const ground = world.createCollider(
    RAPIER.ColliderDesc.cuboid(
      DROP.groundHalfWidth,
      DROP.groundHalfThickness,
      DROP.groundHalfWidth,
    )
      .setFriction(DROP.groundFriction)
      .setRestitution(DROP.groundRestitution),
    groundBody,
  );
  const cube = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, parameters.initialHeight, 0)
      .setCcdEnabled(true)
      .setSoftCcdPrediction(DROP.softCcdPrediction),
  );
  const half = DROP.cubeSize / 2;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(half, half, half)
      .setMass(parameters.mass)
      .setFriction(DROP.friction)
      .setRestitution(DROP.restitution)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    cube,
  );
  const measurements = new DropMeasurements(
    parameters.initialHeight,
    FIXED_TIME_STEP,
  );
  function step() {
    world.step();
    return measurements.sample(
      cube.translation().y,
      cube.linvel().y,
      hasGroundContactImpulse(world, cube, ground),
    );
  }
  return { world, cube, measurements, step };
}

describe('engine measurements against ideal free fall', () => {
  const cases = [0.1, 1, 10].flatMap((mass) =>
    [1.62, 9.81, 20].flatMap((gravity) =>
      [1, 4.5, 10].map((initialHeight) => ({ mass, gravity, initialHeight })),
    ),
  );
  it.each(cases)(
    'g=$gravity, mass=$mass, height=$initialHeight: correct acceleration and contact time',
    (parameters) => {
      const { step, measurements, cube } = createDrop(parameters);
      const expectedContact = freeFallContactTime(
        parameters.initialHeight,
        parameters.gravity,
        DROP.cubeSize,
      )!;
      const steps = Math.ceil((expectedContact + 2) / FIXED_TIME_STEP);
      for (let i = 0; i < steps; i++) {
        const sample = step();
        expect(sample.height).toBeGreaterThan(DROP.cubeSize / 2 - 0.03);
        if (sample.firstContactTime === null) {
          const initialEnergy = mechanicalEnergy(
            parameters.mass,
            parameters.gravity,
            parameters.initialHeight - DROP.cubeSize / 2,
            [0, 0, 0],
          );
          const energy = mechanicalEnergy(
            parameters.mass,
            parameters.gravity,
            sample.height - DROP.cubeSize / 2,
            [0, sample.verticalVelocity, 0],
          );
          expect(Math.abs(energy - initialEnergy) / initialEnergy).toBeLessThan(
            0.01,
          );
          const expected = freeFallAtTime(
            parameters.initialHeight,
            parameters.gravity,
            sample.time,
          );
          expect(Math.abs(sample.height - expected.height)).toBeLessThan(0.03);
          expect(
            Math.abs(sample.verticalVelocity - expected.velocity),
          ).toBeLessThan(0.002);
          expect(
            Math.abs(sample.acceleration! - expected.acceleration),
          ).toBeLessThan(0.005);
        }
      }
      expect(
        Math.abs(measurements.snapshot.firstContactTime! - expectedContact),
      ).toBeLessThan(0.03);
      expect(Math.abs(cube.translation().y - DROP.cubeSize / 2)).toBeLessThan(
        0.01,
      );
      expect(Math.abs(cube.linvel().y)).toBeLessThan(0.01);
      expect(cube.mass()).toBeCloseTo(parameters.mass, 5);
    },
  );
  it('mass does not change free-fall contact time in a vacuum', () => {
    const times = [0.1, 1, 10].map((mass) => {
      const { step, measurements } = createDrop({
        ...DEFAULT_PARAMETERS,
        mass,
      });
      while (
        measurements.clock.time < 2 &&
        measurements.snapshot.firstContactTime === null
      )
        step();
      return measurements.snapshot.firstContactTime;
    });
    expect(times[0]).not.toBeNull();
    expect(times[1]).toBe(times[0]);
    expect(times[2]).toBe(times[0]);
  });
  it('zero gravity and zero initial velocity stay stationary while simulation time advances', () => {
    const { step, measurements } = createDrop({
      ...DEFAULT_PARAMETERS,
      gravity: 0,
    });
    for (let i = 0; i < 240; i++) step();
    expect(measurements.snapshot).toMatchObject({
      time: 2,
      height: 4.5,
      verticalVelocity: 0,
      acceleration: 0,
      firstContactTime: null,
    });
    expect(freeFallContactTime(4.5, 0, 1)).toBeNull();
  });
  it('records contact acceleration and freezes the comparison at the last free-fall step', () => {
    const { step, measurements } = createDrop();
    while (
      measurements.clock.time < 2 &&
      measurements.snapshot.firstContactTime === null
    )
      step();
    expect(measurements.snapshot.firstContactTime).not.toBeNull();
    expect(measurements.snapshot.acceleration!).toBeGreaterThan(0);
    const frozen = measurements.snapshot.lastFreeFall;
    for (let i = 0; i < 300; i++) step();
    expect(measurements.snapshot.lastFreeFall).toEqual(frozen);
    expect(Math.abs(measurements.snapshot.acceleration!)).toBeLessThan(0.01);
    expect(measurements.snapshot.time).toBeGreaterThan(frozen.time);
  });
  it('reset clears time, contact, derivatives, and snapshots for new release conditions', () => {
    const { step, measurements } = createDrop();
    step();
    useFreeFallStore.getState().report(measurements.snapshot);
    useSimulationStore.getState().setRunning(true);
    useSimulationStore.getState().reportTime(measurements.clock.time);
    useFreeFallStore.getState().clear(8);
    useSimulationStore.getState().reset();
    expect(useFreeFallStore.getState()).toMatchObject({
      ready: false,
      snapshot: {
        time: 0,
        height: 8,
        verticalVelocity: 0,
        acceleration: null,
        firstContactTime: null,
      },
    });
    expect(useSimulationStore.getState()).toMatchObject({
      running: false,
      elapsed: 0,
    });
  });
  it('rejects invalid physical inputs and accepts supported boundary values', () => {
    for (const key of ['mass', 'initialHeight', 'gravity'] as const) {
      expect(validDropParameters({ ...DEFAULT_PARAMETERS, [key]: NaN })).toBe(
        false,
      );
      expect(
        validDropParameters({ ...DEFAULT_PARAMETERS, [key]: Infinity }),
      ).toBe(false);
      expect(validDropParameters({ ...DEFAULT_PARAMETERS, [key]: -1 })).toBe(
        false,
      );
    }
    expect(
      validDropParameters({ mass: 0.1, initialHeight: 1, gravity: 0 }),
    ).toBe(true);
    expect(
      validDropParameters({ mass: 10, initialHeight: 10, gravity: 20 }),
    ).toBe(true);
  });
});
