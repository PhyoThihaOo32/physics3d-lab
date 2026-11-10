import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ArrowHelper, Group, Vector3 } from 'three';
import type { Vector3Tuple } from '../../types/vector';
import { SceneLabel } from '../labels/SceneLabel';
type VectorInput = Vector3Tuple | (() => Vector3Tuple);
export interface VectorArrow3DProps {
  origin: VectorInput;
  vector: VectorInput;
  magnitudeScale?: number;
  label: string;
  unit: string;
  visible?: boolean;
  category: 'velocity' | 'component' | 'acceleration';
  color?: string;
  labelSize?: number;
}
const COLORS = {
  velocity: '#c1e29e',
  component: '#8ac8eb',
  acceleration: '#e3b17a',
};
export function VectorArrow3D({
  origin,
  vector,
  magnitudeScale = 1,
  label,
  visible = true,
  category,
  color,
  labelSize = 0.6,
}: VectorArrow3DProps) {
  const root = useRef<Group>(null);
  const labelAnchor = useRef<Group>(null);
  const arrow = useMemo(
    () =>
      new ArrowHelper(
        new Vector3(1, 0, 0),
        new Vector3(),
        1,
        color ?? COLORS[category],
      ),
    [color, category],
  );
  const direction = useMemo(() => new Vector3(), []);
  useEffect(() => () => arrow.dispose(), [arrow]);
  useFrame(() => {
    if (!root.current || !labelAnchor.current) return;
    const start = typeof origin === 'function' ? origin() : origin;
    const value = typeof vector === 'function' ? vector() : vector;
    direction.set(...value);
    const length = direction.length() * magnitudeScale;
    root.current.visible = visible && length > 1e-6;
    root.current.position.set(...start);
    if (length <= 1e-6) return;
    direction.normalize();
    arrow.setDirection(direction);
    arrow.setLength(
      length,
      Math.min(length * 0.25, labelSize * 0.6),
      Math.min(length * 0.13, labelSize * 0.3),
    );
    labelAnchor.current.position
      .copy(direction)
      .multiplyScalar(length + labelSize * 0.45);
  });
  return (
    <group ref={root}>
      <primitive object={arrow} />
      <group ref={labelAnchor}>
        <SceneLabel text={label} position={[0, 0, 0]} size={labelSize} />
      </group>
    </group>
  );
}
