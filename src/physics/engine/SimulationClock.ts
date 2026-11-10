/** Count integrated steps, never render-frame or wall-clock time. Pauses add no steps. */
export class SimulationClock {
  private steps = 0;
  constructor(readonly timeStep: number) {}
  get time() {
    return this.steps * this.timeStep;
  }
  get stepCount() {
    return this.steps;
  }
  advance() {
    this.steps++;
    return this.time;
  }
}
