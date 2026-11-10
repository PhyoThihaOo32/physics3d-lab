import type { Vector3Tuple } from '../../types/vector';
import { SimulationClock } from '../engine/SimulationClock';
import { interpolateVector, vectorMagnitude } from '../vectors/vectorMath';
export interface FlightSample {
  time: number;
  position: Vector3Tuple;
  velocity: Vector3Tuple;
  acceleration: Vector3Tuple | null;
}
export interface FlightLanding {
  time: number;
  range: number;
  preImpact: FlightSample;
}
export interface ProjectileSnapshot extends FlightSample {
  landing: FlightLanding | null;
  lastAirborne: FlightSample;
  maxHeight: number;
  apex: { time: number; position: Vector3Tuple } | null;
  limitReached: boolean;
}

/** Inputs are engine measurements in coordinates h = world y − sphere radius. */
export class ProjectileMeasurements {
  readonly clock: SimulationClock;
  snapshot: ProjectileSnapshot;
  trail: Vector3Tuple[];
  trailVersion = 0;
  constructor(
    height: number,
    velocity: Vector3Tuple,
    timeStep: number,
    readonly maxTrailPoints = 2400,
    readonly observationLimit = 60,
  ) {
    this.clock = new SimulationClock(timeStep);
    const initial: FlightSample = {
      time: 0,
      position: [0, height, 0],
      velocity,
      acceleration: null,
    };
    this.snapshot = {
      ...initial,
      landing: null,
      lastAirborne: initial,
      maxHeight: height,
      apex: null,
      limitReached: false,
    };
    this.trail = [initial.position];
  }
  sample(position: Vector3Tuple, velocity: Vector3Tuple, contact: boolean) {
    if (this.snapshot.landing || this.snapshot.limitReached)
      return this.snapshot;
    const previous = this.snapshot;
    const time = this.clock.advance();
    const current: FlightSample = {
      time,
      position,
      velocity,
      acceleration: [
        (velocity[0] - previous.velocity[0]) / this.clock.timeStep,
        (velocity[1] - previous.velocity[1]) / this.clock.timeStep,
        (velocity[2] - previous.velocity[2]) / this.clock.timeStep,
      ],
    };
    const landed = contact && previous.velocity[1] <= 0;
    let apex = previous.apex;
    if (
      !apex &&
      !landed &&
      previous.velocity[1] >= 0 &&
      velocity[1] <= 0 &&
      previous.velocity[1] > velocity[1]
    ) {
      const fraction =
        previous.velocity[1] / (previous.velocity[1] - velocity[1]);
      apex = {
        time: previous.time + fraction * this.clock.timeStep,
        position: interpolateVector(previous.position, position, fraction),
      };
    }
    this.snapshot = {
      ...current,
      landing: landed
        ? { time, range: position[0], preImpact: previous.lastAirborne }
        : null,
      lastAirborne: landed ? previous.lastAirborne : current,
      maxHeight: landed
        ? previous.maxHeight
        : Math.max(previous.maxHeight, position[1]),
      apex,
      limitReached: !landed && time >= this.observationLimit,
    };
    if (this.clock.stepCount % 2 === 0 || landed) {
      if (this.trail.length >= this.maxTrailPoints)
        this.trail = this.trail.filter((_, index) => index % 2 === 0);
      this.trail.push(position);
      this.trailVersion++;
    }
    return this.snapshot;
  }
  get speed() {
    return vectorMagnitude(this.snapshot.velocity);
  }
}
