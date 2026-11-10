import { SimulationClock } from '../engine/SimulationClock';
export interface MotionSample {
  time: number;
  height: number;
  verticalVelocity: number;
  acceleration: number | null;
}
export interface DropSnapshot extends MotionSample {
  firstContactTime: number | null;
  lastFreeFall: MotionSample;
}
/** Acceleration is a finite difference over one physics step, including contact impulses. */
export class DropMeasurements {
  readonly clock: SimulationClock;
  snapshot: DropSnapshot;
  constructor(initialHeight: number, timeStep: number) {
    this.clock = new SimulationClock(timeStep);
    const initial = {
      time: 0,
      height: initialHeight,
      verticalVelocity: 0,
      acceleration: null,
    };
    this.snapshot = {
      ...initial,
      firstContactTime: null,
      lastFreeFall: initial,
    };
  }
  sample(
    height: number,
    verticalVelocity: number,
    hasContact: boolean,
  ): DropSnapshot {
    const sample: MotionSample = {
      time: this.clock.advance(),
      height,
      verticalVelocity,
      acceleration:
        (verticalVelocity - this.snapshot.verticalVelocity) /
        this.clock.timeStep,
    };
    const firstContactTime =
      this.snapshot.firstContactTime ?? (hasContact ? sample.time : null);
    this.snapshot = {
      ...sample,
      firstContactTime,
      lastFreeFall:
        firstContactTime === null ? sample : this.snapshot.lastFreeFall,
    };
    return this.snapshot;
  }
}
