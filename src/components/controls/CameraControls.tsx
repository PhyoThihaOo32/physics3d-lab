export type CameraPreset = 'Perspective' | 'Top' | 'Front' | 'Side';
export interface CameraView {
  preset: CameraPreset;
  revision: number;
}
export function CameraControls({
  view,
  onChange,
}: {
  view: CameraView;
  onChange: (preset: CameraPreset) => void;
}) {
  return (
    <div className="camera-controls" aria-label="Camera views">
      {(['Perspective', 'Top', 'Front', 'Side'] as const).map((preset) => (
        <button
          key={preset}
          aria-pressed={view.preset === preset}
          onClick={() => onChange(preset)}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
