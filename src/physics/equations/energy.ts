import type { Vector3Tuple } from '../../types/vector';
/** SI units; potential energy is referenced to the experiment's contact-height level. */
export function mechanicalEnergy(
  mass: number,
  gravity: number,
  height: number,
  velocity: Vector3Tuple,
) {
  return (
    0.5 * mass * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2) +
    mass * gravity * height
  );
}
