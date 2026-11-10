export interface PhysicsExperiment<Parameters> {
  id: string;
  title: string;
  description: string;
  learningObjectives: readonly string[];
  defaultParameters: Readonly<Parameters>;
  assumptions: readonly string[];
}
