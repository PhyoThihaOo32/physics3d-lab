import type { ProjectileParameters } from '../../experiments/projectile-motion/config';
import type { Vector3Tuple } from '../../types/vector';

export function launchVelocity({
  speed,
  angle,
}: Pick<ProjectileParameters, 'speed' | 'angle'>): Vector3Tuple {
  const radians = (angle * Math.PI) / 180;
  return [
    Math.abs(Math.cos(radians)) < 1e-12 ? 0 : speed * Math.cos(radians),
    speed * Math.sin(radians),
    0,
  ];
}
export function projectileAtTime(
  parameters: ProjectileParameters,
  time: number,
) {
  const [vx, vy] = launchVelocity(parameters);
  return {
    position: [
      vx * time,
      parameters.height + vy * time - 0.5 * parameters.gravity * time ** 2,
      0,
    ] as Vector3Tuple,
    velocity: [vx, vy - parameters.gravity * time, 0] as Vector3Tuple,
    acceleration: [0, -parameters.gravity, 0] as Vector3Tuple,
  };
}
export function predictProjectile(parameters: ProjectileParameters) {
  const [vx, vy] = launchVelocity(parameters);
  const flightTime =
    parameters.gravity === 0
      ? null
      : (vy + Math.sqrt(vy ** 2 + 2 * parameters.gravity * parameters.height)) /
        parameters.gravity;
  const apexTime = parameters.gravity === 0 ? null : vy / parameters.gravity;
  return {
    flightTime,
    range: flightTime === null ? null : vx * flightTime,
    apexTime,
    maxHeight:
      apexTime === null
        ? vy === 0
          ? parameters.height
          : null
        : parameters.height + vy ** 2 / (2 * parameters.gravity),
    impactSpeed:
      flightTime === null
        ? null
        : Math.hypot(vx, vy - parameters.gravity * flightTime),
  };
}
