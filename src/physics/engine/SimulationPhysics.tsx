import { type ReactNode, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import { FIXED_TIME_STEP } from '../constants/world';
import { useSimulationStore } from '../../store/simulationStore';

function FixedStepper({ timeStep }: { timeStep: number }) {
  const { step } = useRapier();
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    const state = useSimulationStore.getState();
    if (!state.running) return;
    accumulator.current += Math.min(delta, 0.1) * state.playbackSpeed;
    while (
      accumulator.current >= timeStep &&
      useSimulationStore.getState().running
    ) {
      step(timeStep);
      accumulator.current -= timeStep;
    }
  }, -1);
  return null;
}

/** Rendering schedules steps, but every integration uses the same fixed physical timestep. */
export function SimulationPhysics({
  gravity,
  children,
  timeStep = FIXED_TIME_STEP,
  solverIterations = 4,
}: {
  gravity: [number, number, number];
  children: ReactNode;
  timeStep?: number;
  solverIterations?: number;
}) {
  return (
    <Physics
      gravity={gravity}
      timeStep={timeStep}
      numSolverIterations={solverIterations}
      paused
      interpolate={false}
    >
      <FixedStepper timeStep={timeStep} />
      {children}
    </Physics>
  );
}
