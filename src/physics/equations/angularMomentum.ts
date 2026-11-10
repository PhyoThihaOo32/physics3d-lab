/** Illustrative 51 kg segment model, SI units. Body excludes the moving arms. */
export const DANCER = {
  bodyMass: 44,
  bodyInertia: 0.75,
  shoulderRadius: 0.18,
  shoulderHeight: 1.42,
  upperLength: 0.3,
  foreLength: 0.28,
  upperMass: 2,
  foreMass: 1.5,
  armHalfThickness: 0.035,
  duration: 60,
  timeStep: 1 / 480,
  extensionRate: 0.45,
  foldAngle: (5 * Math.PI) / 12,
} as const;
export interface DancerParameters {
  initialOmega: number;
  resistance: number;
}
export const DEFAULT_DANCER: DancerParameters = {
  initialOmega: 2,
  resistance: 0,
};
export interface DancerSnapshot {
  time: number;
  extension: number;
  radius: number;
  inertia: number;
  omega: number;
  momentum: number;
  initialMomentum: number;
  impulse: number;
  torque: number;
  energy: number;
  initialEnergy: number;
  residual: number;
  balanceError: number;
}

/** Reference calculation: finite rectangular rods, parallel-axis theorem, mirrored arms. */
export function dancerInertia(extension: number) {
  const angle = (1 - extension) * DANCER.foldAngle;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const {
    shoulderRadius: d,
    upperLength: a,
    foreLength: b,
    armHalfThickness: h,
  } = DANCER;
  function rod(m: number, length: number, centerRadius: number) {
    return (
      m *
      (centerRadius ** 2 +
        (length ** 2 * c ** 2 + 4 * h ** 2 * s ** 2 + 4 * h ** 2) / 12)
    );
  }
  return (
    DANCER.bodyInertia +
    2 *
      (rod(DANCER.upperMass, a, d + (a * c) / 2) +
        rod(DANCER.foreMass, b, d + (a + b / 2) * c))
  );
}
