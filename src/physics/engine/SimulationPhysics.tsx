import { type ReactNode, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import { FIXED_TIME_STEP } from '../constants/world';
import { useSimulationStore } from '../../store/simulationStore';

function FixedStepper() {
  const { step } = useRapier();
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    const state = useSimulationStore.getState();
    if (!state.running) return;
    accumulator.current += Math.min(delta, 0.1) * state.playbackSpeed;
    while (
      accumulator.current >= FIXED_TIME_STEP &&
      useSimulationStore.getState().running
    ) {
      step(FIXED_TIME_STEP);
      accumulator.current -= FIXED_TIME_STEP;
    }
  }, -1);
  return null;
}

/** Rendering schedules steps, but every integration uses the same fixed physical timestep. */
export function SimulationPhysics({
  gravity,
  children,
}: {
  gravity: [number, number, number];
  children: ReactNode;
}) {
  return (
    <Physics
      gravity={gravity}
      timeStep={FIXED_TIME_STEP}
      paused
      interpolate={false}
    >
      <FixedStepper />
      {children}
    </Physics>
  );
}
