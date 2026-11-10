import { Component, type ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PCFShadowMap } from 'three';
import { LabCamera } from '../camera/LabCamera';
import type { CameraView } from '../../components/controls/CameraControls';

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="scene-message" role="alert">
          <strong>The 3D scene could not start.</strong>
          <span>Enable WebGL in a modern browser, then reload the page.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LabCanvas({
  children,
  view,
  frameHeight,
  frameWidth,
  center,
  minFrameDistance = 12,
  sceneExtent,
  label = 'Interactive 3D view of a cube falling onto a ground plane',
}: {
  children: ReactNode;
  view: CameraView;
  frameHeight: number;
  minFrameDistance?: number;
  frameWidth?: number;
  center?: readonly [number, number, number];
  sceneExtent?: number;
  label?: string;
}) {
  return (
    <SceneBoundary>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [9, 7, 10], fov: 42, near: 0.1, far: 20000 }}
        gl={{ antialias: true }}
        aria-label={label}
        fallback={
          <div className="scene-message">
            WebGL is required for the 3D experiment.
          </div>
        }
      >
        <color attach="background" args={['#111820']} />
        <fog
          attach="fog"
          args={[
            '#111820',
            sceneExtent ? sceneExtent * 4 : 20,
            sceneExtent ? sceneExtent * 10 : 42,
          ]}
        />
        <ambientLight intensity={0.9} />
        <hemisphereLight args={['#d5e6ed', '#233039', 1.7]} />
        <directionalLight
          position={
            sceneExtent
              ? [
                  (center?.[0] ?? 0) + sceneExtent * 0.3,
                  sceneExtent,
                  sceneExtent * 0.6,
                ]
              : [4, 10, 5]
          }
          intensity={3}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-(sceneExtent ?? 8)}
          shadow-camera-right={sceneExtent ?? 8}
          shadow-camera-top={sceneExtent ?? 8}
          shadow-camera-bottom={-(sceneExtent ?? 8)}
          shadow-camera-far={sceneExtent ? sceneExtent * 4 : 100}
          shadow-normalBias={0.025}
        />
        <Suspense fallback={null}>{children}</Suspense>
        <LabCamera
          view={view}
          frameHeight={frameHeight}
          minFrameDistance={minFrameDistance}
          frameWidth={frameWidth}
          center={center}
        />
      </Canvas>
    </SceneBoundary>
  );
}
