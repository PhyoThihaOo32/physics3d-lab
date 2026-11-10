import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Vector3,
} from 'three';
import type { Vector3Tuple } from '../../types/vector';
export function PredictedTrajectory({
  points,
}: {
  points: readonly Vector3Tuple[];
}) {
  const line = useMemo(() => {
    const geometry = new BufferGeometry().setFromPoints(
      points.map((point) => new Vector3(...point)),
    );
    const result = new Line(
      geometry,
      new LineDashedMaterial({
        color: '#83b4d1',
        dashSize: 0.18,
        gapSize: 0.13,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    result.computeLineDistances();
    return result;
  }, [points]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  return <primitive object={line} />;
}
export function MeasuredTrajectory({
  readPoints,
  readVersion,
  capacity,
  yOffset,
}: {
  readPoints: () => readonly Vector3Tuple[];
  readVersion: () => number;
  capacity: number;
  yOffset: number;
}) {
  const version = useRef(-1);
  const line = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(capacity * 3), 3),
    );
    geometry.setDrawRange(0, 0);
    const result = new Line(
      geometry,
      new LineBasicMaterial({
        color: '#d0edaa',
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    result.frustumCulled = false;
    result.renderOrder = 2;
    result.name = 'Measured trajectory';
    return result;
  }, [capacity]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  useFrame(() => {
    const nextVersion = readVersion();
    if (nextVersion === version.current) return;
    version.current = nextVersion;
    const points = readPoints();
    const attribute = line.geometry.getAttribute('position') as BufferAttribute;
    points.forEach((p, i) => attribute.setXYZ(i, p[0], p[1] + yOffset, p[2]));
    line.geometry.setDrawRange(0, points.length);
    attribute.needsUpdate = true;
  });
  return <primitive object={line} />;
}
