/** Gravity alone; +y is up and g is a positive magnitude. Released from rest. */
export function freeFallAtTime(
  initialHeight: number,
  gravity: number,
  time: number,
) {
  return {
    height: initialHeight - 0.5 * gravity * time ** 2,
    velocity: -gravity * time,
    acceleration: -gravity,
  };
}
/** The center travels to half the cube's height, not y = 0. */
export function freeFallContactTime(
  initialHeight: number,
  gravity: number,
  cubeSize: number,
): number | null {
  return gravity === 0
    ? null
    : Math.sqrt((2 * (initialHeight - cubeSize / 2)) / gravity);
}
