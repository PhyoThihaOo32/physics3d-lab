export type CameraPreset =
  'Perspective' | 'Top' | 'Front' | 'Side' | 'Spin axis';
export interface CameraView {
  preset: CameraPreset;
  revision: number;
}
export function CameraControls({
  view,
  onChange,
  spinAxis = false,
}: {
  view: CameraView;
  onChange: (preset: CameraPreset) => void;
  spinAxis?: boolean;
}) {
  const presets: CameraPreset[] = ['Perspective', 'Top', 'Front', 'Side'];
  if (spinAxis) presets.push('Spin axis');
  return (
    <div className="camera-controls" aria-label="Camera views">
      {presets.map((preset) => (
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
