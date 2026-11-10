import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/** A native scene label avoids separate DOM React roots during scene disposal. */
export function SceneLabel({
  text,
  position,
  size = 0.6,
}: {
  text: string;
  position: [number, number, number];
  size?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#17222c';
    context.beginPath();
    context.roundRect(0, 0, 128, 64, 8);
    context.fill();
    context.fillStyle = '#e6eef5';
    context.font = '30px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 33);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[size, size / 2, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
