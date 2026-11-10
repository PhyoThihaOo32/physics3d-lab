import { type ReactNode, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import { FIXED_TIME_STEP } from '../constants/world';
import { useSimulationStore } from '../../store/simulationStore';

function FixedStepper({ timeStep }: { timeStep: number }) {
  const { step } = useRapier();
  const accumulator = useRef(0);
  const firstFrame = useRef(true);
  const invalidate = useThree((state) => state.invalidate);
  const running = useSimulationStore((state) => state.running);
  useEffect(() => {
    // An idle demand-rendered canvas has a large delta on its next frame.
    // Resume from physical time, without integrating the time spent paused.
    firstFrame.current = true;
    invalidate();
  }, [running, invalidate]);
  useFrame((_, delta) => {
    const state = useSimulationStore.getState();
    if (!state.running) return;
    invalidate();
    if (firstFrame.current) {
      firstFrame.current = false;
      return;
    }
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
