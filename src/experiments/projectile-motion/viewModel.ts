import type { Vector3Tuple } from '../../types/vector';
import {
  predictProjectile,
  projectileAtTime,
} from '../../physics/equations/projectile';
import { PROJECTILE, type ProjectileParameters } from './config';
export function projectileView(parameters: ProjectileParameters) {
  const prediction = predictProjectile(parameters);
  const duration = prediction.flightTime ?? PROJECTILE.zeroGravityDuration;
  const endpoint = projectileAtTime(parameters, duration).position;
  const range = Math.max(0, endpoint[0]);
  const height = Math.max(
    2,
    prediction.maxHeight ?? endpoint[1],
    parameters.height,
  );
  const extent = Math.max(8, range, height);
  const margin = Math.max(2, extent * 0.15);
  const gridSpacing =
    extent > 150 ? 20 : extent > 60 ? 10 : extent > 25 ? 5 : 1;
  return {
    duration,
    range,
    height,
    extent,
    groundSize:
      Math.ceil(Math.max(12, range + margin * 2) / gridSpacing) * gridSpacing,
    groundCenterX: Math.ceil(range / 2 / gridSpacing) * gridSpacing,
    gridSpacing,
    frameWidth: Math.max(4, range + margin),
    frameHeight: height + margin * 0.5,
    center: [range / 2, height / 2 + PROJECTILE.radius, 0] as Vector3Tuple,
    vectorScale:
      (extent * 0.14) /
      Math.max(parameters.speed, prediction.impactSpeed ?? 0, 1),
    gravityScale: (extent * 0.12) / Math.max(parameters.gravity, 1),
    labelSize: Math.max(0.45, extent * 0.035),
  };
}
