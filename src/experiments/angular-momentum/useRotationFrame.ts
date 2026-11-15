import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSimulationStore } from '../../store/simulationStore';

/** Drive analytic models only while running, and flush readouts at pause. */
export function useRotationFrame(
  advance: (elapsed: number) => void,
  publish: () => void,
  draw: () => void,
) {
  const skipDelta = useRef(true);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(
    () =>
      useSimulationStore.subscribe((state, previous) => {
        if (state.running === previous.running) return;
        skipDelta.current = true;
        if (!state.running) publish();
        invalidate();
      }),
    [invalidate, publish],
  );

  useFrame((_, delta) => {
    const { running, playbackSpeed } = useSimulationStore.getState();
    if (running) {
      if (skipDelta.current) skipDelta.current = false;
      else advance(Math.min(delta, 0.1) * playbackSpeed);
      invalidate();
    }
    draw();
  }, -1);
}
