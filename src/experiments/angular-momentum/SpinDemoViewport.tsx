import { useState, type ReactNode } from 'react';
import {
  CameraControls,
  type CameraView,
} from '../../components/controls/CameraControls';
import { ViewportHint } from '../../components/controls/ViewportHint';
import { LabCanvas } from '../../three/scene/LabCanvas';
import type { Vector3Tuple } from '../../types/vector';

export function SpinDemoViewport({
  title,
  status,
  center,
  frameWidth,
  frameHeight,
  initialView,
  actions,
  children,
}: {
  title: string;
  status: string;
  center: Vector3Tuple;
  frameWidth: number;
  frameHeight: number;
  initialView: CameraView['preset'];
  actions: ReactNode;
  children: (vectorsVisible: boolean) => ReactNode;
}) {
  const [view, setView] = useState<CameraView>({
    preset: initialView,
    revision: 0,
  });
  const [vectorsVisible, setVectorsVisible] = useState(true);
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
        >
          {children(vectorsVisible)}
        </LabCanvas>
        <CameraControls
          view={view}
          onChange={(preset) =>
            setView((previous) => ({ preset, revision: previous.revision + 1 }))
          }
        />
        <ViewportHint />
      </div>
    </section>
  );
}
