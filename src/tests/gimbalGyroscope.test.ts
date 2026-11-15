import RAPIER from '@dimforge/rapier3d-compat';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_GYRO,
  DEFAULT_LIFT,
  GYRO_STEP,
  momentOfInertiaSolidDisk,
  spinAngularMomentum,
  steadyPrecessionRate,
  torqueVector,
} from '../physics/equations/gimbalGyroscope';
import { GimbalGyroscope } from '../physics/rotation/gimbalGyroscope';

beforeAll(async () => {
  await RAPIER.init();
});

describe('Rapier gyroscope', () => {
  it('matches the reference inertia, angular momentum, torque and precession calculations', () => {
    const inertia = momentOfInertiaSolidDisk(2, 0.3);
    expect(inertia).toBeCloseTo(0.09, 10);
    expect(spinAngularMomentum(inertia, 40)).toBeCloseTo(3.6, 10);
    expect(torqueVector([0.5, 0, 0], [0, 10, 0])).toEqual([0, 0, 5]);
    expect(steadyPrecessionRate(1.8, 3.6)).toBeCloseTo(0.5, 10);
    expect(steadyPrecessionRate(1.8, 0)).toBeNull();
  });
  it('advances the disk orientation from its signed initial angular velocity', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    try {
      world.timestep = GYRO_STEP;
      const gyro = new GimbalGyroscope(world, { ...DEFAULT_GYRO, spin: -40 });
      for (let step = 0; step < 24; step++) {
        gyro.beforeStep();
        world.step();
        gyro.afterStep();
      }
      expect(gyro.rotor.rotation().x).toBeCloseTo(Math.sin(-1), 2);
      expect(gyro.measure().spin).toBeCloseTo(-40, 4);
      expect(gyro.measure().spinMomentum).toBeCloseTo(-3.6, 4);
      expect(gyro.measure().time).toBeCloseTo(0.05);
    } finally {
      world.free();
    }
  });
  it('rotates the support through a free gimbal without dragging the axle along', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    try {
      world.timestep = GYRO_STEP;
      world.numSolverIterations = 24;
      const gyro = new GimbalGyroscope(world, DEFAULT_GYRO);
      const target = Math.PI / 3;
      for (let step = 0; step < 580; step++) {
        gyro.beforeStep(target);
        world.step();
        gyro.afterStep();
      }
      const reading = gyro.measure();
      expect(reading.frameAngle).toBeCloseTo(60, 4);
      expect(gyro.outer.rotation().y).toBeCloseTo(0.5, 4);
      expect(reading.axisDrift).toBeLessThan(0.5);
      expect(reading.spinMomentum).toBeCloseTo(3.6, 2);
    } finally {
      world.free();
    }
  });
  it('lifts the stopped axle and swerves either way according to spin sign', () => {
    for (const spin of [0, 40, -40]) {
      const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
      try {
        world.timestep = GYRO_STEP;
        world.numSolverIterations = 24;
        const gyro = new GimbalGyroscope(
          world,
          { ...DEFAULT_GYRO, spin },
          'torque',
        );
        world.timestep = gyro.timeStep;
        for (let step = 0; step < Math.round(1 / gyro.timeStep); step++) {
          gyro.beforeStep(0, { ...DEFAULT_LIFT, id: 1 });
          world.step();
          gyro.afterStep();
        }
        const reading = gyro.measure();
        expect(reading.pulseActive).toBe(false);
        expect(reading.impulse[2]).toBeCloseTo(1, 8);
        expect(reading.momentumError).toBeLessThan(0.08);
        if (spin === 0) {
          expect(reading.axis[1]).toBeGreaterThan(0.6);
          expect(Math.abs(reading.axis[2])).toBeLessThan(0.01);
        } else {
          expect(reading.axis[2] * Math.sign(spin)).toBeGreaterThan(0.13);
        }
      } finally {
        world.free();
      }
    }
  });
  it('gets its gravity torque from the pivot and actual rotor position', () => {
    for (const gravity of [0, 9.81]) {
      const world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
      try {
        world.timestep = GYRO_STEP;
        world.numSolverIterations = 24;
        const gyro = new GimbalGyroscope(
          world,
          { ...DEFAULT_GYRO, gravity },
          'gravity',
        );
        world.timestep = gyro.timeStep;
        const start = gyro.measure();
        expect(start.gravityForce[1]).toBeCloseTo(-2 * gravity, 5);
        expect(start.torque[2]).toBeCloseTo(
          -start.gravityLever[0] * 2 * gravity,
          4,
        );
        for (let step = 0; step < Math.round(0.75 / gyro.timeStep); step++) {
          gyro.beforeStep();
          world.step();
          gyro.afterStep();
        }
        const reading = gyro.measure();
        if (gravity === 0) expect(reading.axisDrift).toBeLessThan(0.2);
        else expect(reading.axis[2]).toBeLessThan(-0.35);
      } finally {
        world.free();
      }
    }
  });
  it('precesses more slowly at higher spin and reverses direction with spin', () => {
    const rates = [40, 80, -80].map((spin) => {
      const world = new RAPIER.World({ x: 0, y: -DEFAULT_GYRO.gravity, z: 0 });
      try {
        world.timestep = GYRO_STEP;
        world.numSolverIterations = 24;
        const gyro = new GimbalGyroscope(
          world,
          { ...DEFAULT_GYRO, spin },
          'gravity',
        );
        world.timestep = gyro.timeStep;
        for (let step = 0; step < Math.round(3.2 / gyro.timeStep); step++) {
          gyro.beforeStep();
          world.step();
          gyro.afterStep();
        }
        const result = gyro.measure();
        expect(result.precession).not.toBeNull();
        expect(result.estimatedPrecession).not.toBeNull();
        expect(
          Math.abs(
            Math.abs(result.precession!) / result.estimatedPrecession! - 1,
          ),
        ).toBeLessThan(0.25);
        return result.precession!;
      } finally {
        world.free();
      }
    });
    expect(rates[0]).toBeGreaterThan(1);
    expect(rates[1]).toBeGreaterThan(0);
    expect(rates[0]).toBeGreaterThan(1.6 * rates[1]);
    expect(rates[2]).toBeCloseTo(-rates[1], 2);
  });

  it('bearing drag reduces spin and accounts for dissipated spin energy', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    try {
      world.timestep = GYRO_STEP;
      world.numSolverIterations = 24;
      const gyro = new GimbalGyroscope(world, {
        ...DEFAULT_GYRO,
        friction: 0.012,
      });
      const initial = gyro.measure();
      for (let step = 0; step < 960; step++) {
        gyro.beforeStep();
        world.step();
        gyro.afterStep();
      }
      const result = gyro.measure();
      expect(result.spin).toBeLessThan(34);
      expect(result.heat).toBeGreaterThan(15);
      expect(
        Math.abs(result.energy + result.heat - initial.energy),
      ).toBeLessThan(0.2);
    } finally {
      world.free();
    }
  });

  it('keeps axial spin nearly constant through a long run at maximum gravity and spin', () => {
    for (const radius of [0.05, 0.3, 1]) {
      const gravity = 15;
      const world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
      try {
        world.numSolverIterations = 24;
        const gyro = new GimbalGyroscope(
          world,
          { ...DEFAULT_GYRO, radius, spin: 100, gravity },
          'gravity',
        );
        world.timestep = gyro.timeStep;
        for (let step = 0; step < Math.round(10 / gyro.timeStep); step++) {
          gyro.beforeStep();
          world.step();
          gyro.afterStep();
        }
        expect(Math.abs(gyro.measure().spin - 100)).toBeLessThan(2);
      } finally {
        world.free();
      }
    }
  });
});
