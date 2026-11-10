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
  minOrbitDistance = 4,
  appearance = 'lab',
  elevation = 0.45,
  sceneExtent,
  label = 'Interactive 3D view of a cube falling onto a ground plane',
}: {
  children: ReactNode;
  view: CameraView;
  frameHeight: number;
  minFrameDistance?: number;
  minOrbitDistance?: number;
  appearance?: 'lab' | 'studio';
  elevation?: number;
  frameWidth?: number;
  center?: readonly [number, number, number];
  sceneExtent?: number;
  label?: string;
}) {
  const studio = appearance === 'studio';
  const background = studio ? '#d7cfc4' : '#111820';
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
        <color attach="background" args={[background]} />
        <fog
          attach="fog"
          args={[
            background,
            sceneExtent ? sceneExtent * 4 : 20,
            sceneExtent ? sceneExtent * 10 : 42,
          ]}
        />
        <ambientLight intensity={studio ? 0.55 : 0.9} />
        <hemisphereLight
          args={
            studio ? ['#fff6ed', '#bba99b', 1.0] : ['#d5e6ed', '#233039', 1.7]
          }
        />
        <directionalLight
          position={
            studio
              ? [-3, 4.5, 4]
              : sceneExtent
                ? [
                    (center?.[0] ?? 0) + sceneExtent * 0.3,
                    sceneExtent,
                    sceneExtent * 0.6,
                  ]
                : [4, 10, 5]
          }
          intensity={studio ? 2.0 : 3}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={studio ? -2.5 : -(sceneExtent ?? 8)}
          shadow-camera-right={studio ? 2.5 : (sceneExtent ?? 8)}
          shadow-camera-top={studio ? 2.5 : (sceneExtent ?? 8)}
          shadow-camera-bottom={studio ? -2.5 : -(sceneExtent ?? 8)}
          shadow-camera-far={sceneExtent ? sceneExtent * 4 : 100}
          shadow-normalBias={studio ? 0.008 : 0.025}
          shadow-radius={studio ? 5 : 1}
        />
        <Suspense fallback={null}>{children}</Suspense>
        <LabCamera
          view={view}
          elevation={elevation}
          frameHeight={frameHeight}
          minFrameDistance={minFrameDistance}
          minOrbitDistance={minOrbitDistance}
          frameWidth={frameWidth}
          center={center}
        />
      </Canvas>
    </SceneBoundary>
  );
}
