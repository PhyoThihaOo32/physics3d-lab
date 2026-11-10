import { SceneLabel } from '../labels/SceneLabel';
export function WorldAxes() {
  return (
    <group position={[0, 0.01, 0]}>
      <axesHelper args={[2.5]} />
      <SceneLabel position={[2.8, 0, 0]} text="+x" />
      <SceneLabel position={[0, 2.8, 0]} text="+y" />
      <SceneLabel position={[0, 0, 2.8]} text="+z" />
    </group>
  );
}
