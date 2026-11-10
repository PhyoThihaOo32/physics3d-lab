import type { ExperimentRegistration, LabDefinition } from '../types/catalog';
import { freeFallExperiment } from './free-fall/config';
import { projectileExperiment } from './projectile-motion/config';
import { dancerExperiment } from './angular-momentum/config';

export const labs: readonly LabDefinition[] = [
  {
    id: 'motion',
    title: 'Motion',
    category: 'MECHANICS',
    symbol: '↗',
    description:
      'Explore how position, velocity, and acceleration change as objects move.',
    objectives: [
      'Connect motion to position, velocity, and acceleration.',
      'Change initial conditions and compare measured motion with theory.',
    ],
  },
  {
    id: 'vectors',
    title: 'Vectors',
    category: 'MATHEMATICAL FOUNDATIONS',
    symbol: '⟨ ⟩',
    description:
      'Understand magnitude, direction, components, and how vectors combine.',
    objectives: [
      'Resolve vectors into components.',
      'Interpret addition, dot products, and cross products geometrically.',
    ],
  },
  {
    id: 'rotation',
    title: 'Rotation',
    category: 'MECHANICS',
    symbol: '↻',
    description:
      'Investigate rotating systems, moment of inertia, and angular momentum.',
    objectives: [
      'Relate mass distribution to moment of inertia.',
      'Explore when angular momentum is conserved.',
    ],
  },
];

/** Metadata stays lightweight. An experiment's renderer and physics load only when opened. */
export const experiments: readonly ExperimentRegistration[] = [
  {
    id: freeFallExperiment.id,
    labId: 'motion',
    title: 'Free fall',
    topic: 'Kinematics',
    description:
      'Release a cube, change gravity and mass, and measure its fall.',
    objectives: freeFallExperiment.learningObjectives,
    measurements: [
      'Time',
      'Height',
      'Vertical velocity',
      'Acceleration',
      'First-contact time',
    ],
    status: 'available',
    load: () => import('./free-fall/FreeFallPage'),
  },
  {
    id: projectileExperiment.id,
    labId: 'motion',
    title: 'Projectile motion',
    topic: 'Kinematics',
    description:
      'Launch a sphere and explore horizontal and vertical motion together.',
    objectives: projectileExperiment.learningObjectives,
    measurements: [
      'Flight time',
      'Range',
      'Maximum height',
      'Velocity components',
      'Acceleration components',
    ],
    status: 'available',
    load: () => import('./projectile-motion/ProjectilePage'),
  },
  {
    id: 'vector-lab',
    labId: 'vectors',
    title: 'Vector operations',
    topic: '3D vectors',
    description:
      'Explore components, vector addition, dot products, and cross products.',
    objectives: [
      'Inspect vectors and their components in 3D.',
      'Explain cross-product direction and magnitude.',
    ],
    measurements: ['Magnitude', 'Angle', 'Dot product', 'Cross product'],
    status: 'planned',
  },
  {
    id: 'angular-momentum',
    labId: 'rotation',
    title: dancerExperiment.title,
    topic: 'Rotational dynamics',
    description: dancerExperiment.description,
    objectives: dancerExperiment.learningObjectives,
    measurements: [
      'Radius',
      'Moment of inertia',
      'Angular velocity',
      'Angular momentum',
      'Spin kinetic energy',
    ],
    status: 'available',
    load: () => import('./angular-momentum/DancerPage'),
  },
];

export const getLab = (id: string) => labs.find((lab) => lab.id === id);
export const getExperiment = (id: string) =>
  experiments.find((experiment) => experiment.id === id);
export const getLabExperiments = (id: string) =>
  experiments.filter((experiment) => experiment.labId === id);
export const labUrl = (id: string) => `#/labs/${id}`;
export const experimentUrl = (id: string) => `#/experiments/${id}`;
