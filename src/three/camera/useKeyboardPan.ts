import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls } from '@react-three/drei';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

function direction(key: string): readonly [number, number] | null {
  switch (key) {
    case 'ArrowUp':
      return [0, 1];
    case 'ArrowDown':
      return [0, -1];
    case 'ArrowLeft':
    case '<':
      return [-1, 0];
    case 'ArrowRight':
    case '>':
      return [1, 0];
    default:
      return null;
  }
}

/** Focus-scoped, screen-space camera panning. Physics state is never touched. */
export function useKeyboardPan(
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>,
) {
  const getScene = useThree((state) => state.get);
  const pressed = useRef(new Set<string>());
  const vectors = useRef({
    right: new Vector3(),
    up: new Vector3(),
    offset: new Vector3(),
  });

  const pan = useRef<(x: number, y: number) => void>(() => {});

  useEffect(() => {
    const { camera, gl, invalidate } = getScene();
    const move = (x: number, y: number) => {
      const orbit = controls.current;
      const height = gl.domElement.clientHeight;
      if (!orbit?.enabled || !orbit.enablePan || height === 0) return;
      let unitsPerPixel: number;
      if (camera instanceof PerspectiveCamera) {
        unitsPerPixel =
          (2 *
            camera.position.distanceTo(orbit.target) *
            Math.tan((camera.fov * Math.PI) / 360)) /
          height;
      } else if (camera instanceof OrthographicCamera) {
        unitsPerPixel = (camera.top - camera.bottom) / camera.zoom / height;
      } else return;
      camera.updateMatrixWorld();
      const { right, up, offset } = vectors.current;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      offset
        .copy(right)
        .multiplyScalar(x * unitsPerPixel)
        .addScaledVector(up, y * unitsPerPixel);
      camera.position.add(offset);
      orbit.target.add(offset);
      orbit.update();
      invalidate();
    };
    pan.current = move;
    const canvas = gl.domElement;
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'region');
    canvas.setAttribute(
      'aria-label',
      '3D view. Use arrow keys to pan; less-than and greater-than move left and right. Press Escape to leave the view.',
    );
    const clear = () => pressed.current.clear();
    const focus = () => canvas.focus({ preventScroll: true });
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clear();
        canvas.blur();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const movement = direction(event.key);
      if (!movement) return;
      event.preventDefault();
      if (!pressed.current.has(event.key))
        move(movement[0] * 8, movement[1] * 8);
      pressed.current.add(event.key);
    };
    const keyUp = (event: KeyboardEvent) => {
      pressed.current.delete(event.key);
    };
    canvas.addEventListener('pointerdown', focus);
    canvas.addEventListener('keydown', keyDown);
    canvas.addEventListener('keyup', keyUp);
    canvas.addEventListener('blur', clear);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      clear();
      pan.current = () => {};
      canvas.removeEventListener('pointerdown', focus);
      canvas.removeEventListener('keydown', keyDown);
      canvas.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('blur', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
      canvas.removeAttribute('tabindex');
      canvas.removeAttribute('role');
      canvas.removeAttribute('aria-label');
    };
  }, [controls, getScene]);

  useFrame((_, delta) => {
    let x = 0;
    let y = 0;
    for (const key of pressed.current) {
      const movement = direction(key);
      if (movement) {
        x += movement[0];
        y += movement[1];
      }
    }
    const length = Math.hypot(x, y);
    if (length > 0) {
      const pixels = 280 * Math.min(delta, 0.05);
      pan.current((x / length) * pixels, (y / length) * pixels);
    }
  });
}
