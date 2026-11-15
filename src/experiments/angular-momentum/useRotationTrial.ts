import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

export function useRotationTrial<T extends { time: number }>(
  create: () => T,
  step: (trial: T, elapsed: number) => T,
) {
  const trial = useRef(create());
  const [reading, setReading] = useState(create);
  const getTrial = useCallback(() => trial.current, []);
  const publish = useCallback(() => {
    setReading(trial.current);
    useSimulationStore.getState().reportTime(trial.current.time);
  }, []);
  const advance = useCallback(
    (elapsed: number) => {
      const previous = trial.current;
      trial.current = step(previous, elapsed);
      if (
        Math.floor(trial.current.time * 10) !== Math.floor(previous.time * 10)
      )
        publish();
    },
    [step, publish],
  );
  const update = useCallback(
    (change: (previous: T) => T) => {
      trial.current = change(trial.current);
      publish();
    },
    [publish],
  );
  const reset = useCallback(() => {
    trial.current = create();
    useSimulationStore.getState().reset();
    publish();
  }, [create, publish]);
  useEffect(
    () => () => {
      trial.current = create();
      useSimulationStore.getState().reset();
    },
    [create],
  );
  return { reading, getTrial, advance, publish, update, reset };
}
