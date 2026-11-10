import { useSimulationStore } from '../../store/simulationStore';
import { formatNumber } from '../../physics/units/format';
export function SimulationControls({
  ready,
  onReset,
  startLabel = 'Start trial',
  complete = false,
  allowSpeed = false,
}: {
  ready: boolean;
  onReset: () => void;
  startLabel?: string;
  complete?: boolean;
  allowSpeed?: boolean;
}) {
  const { running, elapsed, setRunning, playbackSpeed, setPlaybackSpeed } =
    useSimulationStore();
  return (
    <div className="simulation-controls" aria-label="Simulation controls">
      <button
        className="replay-button"
        disabled={!ready || complete}
        onClick={() => setRunning(!running)}
      >
        {complete
          ? 'Trial complete'
          : running
            ? 'Ⅱ Pause'
            : elapsed === 0
              ? `▶ ${startLabel}`
              : '▶ Resume'}
      </button>
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
