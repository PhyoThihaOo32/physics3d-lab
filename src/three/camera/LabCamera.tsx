import { useEffect, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CameraView } from '../../components/controls/CameraControls';
import { useKeyboardPan } from './useKeyboardPan';
export function LabCamera({
  view,
  frameHeight,
  frameWidth = 0,
  center,
  minFrameDistance = 12,
  minOrbitDistance = 4,
  elevation = 0.45,
}: {
  view: CameraView;
  frameHeight: number;
  minFrameDistance?: number;
  minOrbitDistance?: number;
  elevation?: number;
  frameWidth?: number;
  center?: readonly [number, number, number];
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useKeyboardPan(controls);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  useEffect(() => {
    const x = center?.[0] ?? 0;
    const y = center?.[1] ?? frameHeight / 2;
    const z = center?.[2] ?? 0;
    const distance =
      Math.max(
        minFrameDistance,
        frameHeight * 1.8,
        (frameWidth * 1.5) / Math.max(aspect, 0.3),
      ) * (frameWidth ? 1 : Math.max(1, 1.2 / Math.max(aspect, 0.3)));
    const positions: Record<CameraView['preset'], [number, number, number]> = {
      Perspective: [
        x + distance * (frameWidth ? 0.25 : 0.7),
        y + distance * elevation,
        z + distance * 0.8,
      ],
      Top: [x, y + distance, z + 0.001],
      Front: [x, y, z + distance],
      Side: [x + distance, y, z + 0.001],
    };
    camera.position.set(...positions[view.preset]);
    camera.up.set(0, 1, 0);
    camera.lookAt(x, y, z);
    controls.current?.target.set(x, y, z);
    controls.current?.update();
  }, [
    camera,
    view.preset,
    view.revision,
    frameHeight,
    minFrameDistance,
    elevation,
    frameWidth,
    center,
    aspect,
  ]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={
        center ? [center[0], center[1], center[2]] : [0, frameHeight / 2, 0]
      }
      minDistance={minOrbitDistance}
      maxDistance={Math.max(50, frameWidth * 8, frameHeight * 8)}
      minPolarAngle={0.00001}
      maxPolarAngle={Math.PI / 2 - 0.001}
    />
  );
}
