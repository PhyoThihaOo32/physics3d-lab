import { describe, expect, it } from 'vitest';
import {
  WHEEL_FLIP,
  advanceWheelFlip,
  createWheelFlipTrial,
  measureWheelFlip,
  startWheelFlip,
  wheelAxleDirection,
} from '../physics/equations/wheelFlip';

describe('spinning bicycle wheel', () => {
  it('keeps the teacher and platform at rest until the wheel tilts', () => {
    const trial = advanceWheelFlip(createWheelFlipTrial(), 3, 20);
    expect(trial.supportAngle).toBe(0);
    expect(wheelAxleDirection(trial)[1]).toBe(1);
    expect(measureWheelFlip(trial, 20)).toEqual({
      supportOmega: 0,
      supportMomentum: 0,
      wheelMomentum: 3.2,
      totalMomentum: 3.2,
    });
  });

  it('conserves vertical momentum throughout the flip at any available spin speed', () => {
    for (const spinSpeed of [8, 20, 28]) {
      const initialMomentum = WHEEL_FLIP.spinInertia * spinSpeed;
      let trial = startWheelFlip(createWheelFlipTrial());
      for (let frame = 0; frame < 100; frame += 1) {
        trial = advanceWheelFlip(trial, 0.02, spinSpeed);
        const reading = measureWheelFlip(trial, spinSpeed);
        expect(reading.totalMomentum).toBeCloseTo(initialMomentum, 12);
        expect(reading.supportOmega).toBeGreaterThanOrEqual(0);
      }
      expect(wheelAxleDirection(trial)[1]).toBe(-1);
      expect(trial.motion).toBeNull();
      const reading = measureWheelFlip(trial, spinSpeed);
      expect(reading.wheelMomentum).toBeLessThan(0);
      expect(reading.supportOmega).toBeCloseTo(
        (2 * initialMomentum) /
          (WHEEL_FLIP.supportInertia + WHEEL_FLIP.spinInertia),
      );
    }
  });

  it('keeps the wheel’s carried rotation at a horizontal tilt and stops the platform on the return', () => {
    const initial = startWheelFlip(createWheelFlipTrial());
    const sideways = advanceWheelFlip(initial, WHEEL_FLIP.duration / 2, 20);
    expect(wheelAxleDirection(sideways)[1]).toBeCloseTo(0);
    const reading = measureWheelFlip(sideways, 20);
    expect(reading.wheelMomentum).toBeCloseTo(
      WHEEL_FLIP.diameterInertia * reading.supportOmega,
    );
    const inverted = advanceWheelFlip(sideways, WHEEL_FLIP.duration, 20);
    const returned = advanceWheelFlip(
      startWheelFlip(inverted),
      WHEEL_FLIP.duration + 1,
      20,
    );
    const later = advanceWheelFlip(returned, 2, 20);
    expect(returned.tilt).toBe(0);
    expect(returned.motion).toBeNull();
    expect(measureWheelFlip(returned, 20).supportOmega).toBe(0);
    expect(later.supportAngle).toBe(returned.supportAngle);
  });
});
