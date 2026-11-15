import { useState, type ReactNode } from 'react';
import {
  CameraControls,
  type CameraView,
} from '../../components/controls/CameraControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { LabCanvas } from '../../three/scene/LabCanvas';
import type { SpinAxisView } from '../../three/camera/LabCamera';
import type { Vector3Tuple } from '../../types/vector';

export function SpinDemoViewport({
  title,
  status,
  center,
  frameWidth,
  frameHeight,
  initialView,
  actions,
  spinAxisView,
  children,
}: {
  title: string;
  status: string;
  center: Vector3Tuple;
  frameWidth: number;
  frameHeight: number;
  initialView: CameraView['preset'];
  actions: ReactNode;
  spinAxisView?: SpinAxisView;
  children: (vectorsVisible: boolean) => ReactNode;
}) {
  const [view, setView] = useState<CameraView>({
    preset: initialView,
    revision: 0,
  });
  const [vectorsVisible, setVectorsVisible] = useState(true);
  const [axisSnapshot, setAxisSnapshot] = useState<SpinAxisView>();
  return (
    <section className="scene-panel" aria-label={title}>
      <div className="scene-toolbar spin-demo-toolbar">
        <div className="dancer-status" role="status">
          <span className="status-dot" />
          {status}
        </div>
        <div className="spin-demo-actions">
          {actions}
          <button
            className="secondary-button spin-vectors-toggle"
            aria-pressed={vectorsVisible}
            onClick={() => setVectorsVisible((visible) => !visible)}
          >
            Vectors
          </button>
        </div>
      </div>
      <div className="viewport spin-demo-viewport">
        <LabCanvas
          view={view}
          frameHeight={frameHeight}
          frameWidth={frameWidth}
          center={center}
          minFrameDistance={3.6}
          minOrbitDistance={1.8}
          sceneExtent={5}
          label={title}
          fullOrbit={Boolean(spinAxisView)}
          spinAxisView={axisSnapshot}
        >
          {children(vectorsVisible)}
        </LabCanvas>
        <CameraControls
          view={view}
          spinAxis={Boolean(spinAxisView)}
          onChange={(preset) => {
            if (preset === 'Spin axis') setAxisSnapshot(spinAxisView);
            setView((previous) => ({
              preset,
              revision: previous.revision + 1,
            }));
          }}
        />
        <ViewportHint />
      </div>
    </section>
  );
}
