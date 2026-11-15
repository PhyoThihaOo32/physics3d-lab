import { useSimulationStore } from '../../store/simulationStore';
import { formatNumber } from '../../physics/units/format';
interface RunButtonProps {
  ready: boolean;
  startLabel?: string;
  complete?: boolean;
  onReplay?: () => void;
}

export function SimulationRunButton({
  ready,
  startLabel = 'Start trial',
  complete = false,
  onReplay,
}: RunButtonProps) {
  const running = useSimulationStore((state) => state.running);
  const atStart = useSimulationStore((state) => state.elapsed === 0);
  const setRunning = useSimulationStore((state) => state.setRunning);
  return (
    <button
      className="replay-button"
      disabled={!ready || (complete && !onReplay)}
      onClick={complete ? onReplay : () => setRunning(!running)}
    >
      {complete
        ? onReplay
          ? `↻ ${startLabel}`
          : 'Trial complete'
        : running
          ? 'Ⅱ Pause'
          : atStart
            ? `▶ ${startLabel}`
            : '▶ Resume'}
    </button>
  );
}

export function SimulationControls(
  props: {
    onReset: () => void;
    allowSpeed?: boolean;
  } & ({ settingsOnly: true } | (RunButtonProps & { settingsOnly?: false })),
) {
  const { onReset, allowSpeed = false, settingsOnly } = props;
  const elapsed = useSimulationStore((state) => state.elapsed);
  const playbackSpeed = useSimulationStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useSimulationStore(
    (state) => state.setPlaybackSpeed,
  );
  return (
    <div
      className={
        settingsOnly
          ? 'simulation-controls simulation-settings'
          : 'simulation-controls'
      }
      aria-label="Simulation controls"
    >
      {!props.settingsOnly && <SimulationRunButton {...props} />}
      <button className="secondary-button" onClick={onReset}>
        ↻ Reset defaults
      </button>
      <div className="clock">
        <span>SIMULATION TIME</span>
        <output data-testid="time" aria-live="off">
          {formatNumber(elapsed)}
        </output>
        <span>s</span>
      </div>
      {allowSpeed && (
        <label className="playback-control">
          Playback speed
          <select
            value={playbackSpeed}
            onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
          >
            {[0.1, 0.25, 0.5, 1, 2].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
