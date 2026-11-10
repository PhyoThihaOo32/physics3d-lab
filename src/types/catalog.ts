import type { ComponentType } from 'react';

export interface LabDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  symbol: string;
  objectives: readonly string[];
}

interface ExperimentMetadata {
  id: string;
  labId: string;
  title: string;
  description: string;
  topic: string;
  objectives: readonly string[];
  measurements: readonly string[];
}

export type ExperimentRegistration = ExperimentMetadata &
  (
    | { status: 'available'; load: () => Promise<{ default: ComponentType }> }
    | { status: 'planned'; load?: never }
  );
