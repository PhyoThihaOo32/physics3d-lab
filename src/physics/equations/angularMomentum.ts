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
  shoulderLift: (80 * Math.PI) / 180,
  elbowBend: (25 * Math.PI) / 180,
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

/** Symmetric second-to-fifth-position port de bras, with smooth starts and stops. */
export function dancerArmPose(extension: number) {
  const lift = Math.max(0, Math.min(1, 1 - extension));
  const eased = lift * lift * (3 - 2 * lift);
  const shoulder = eased * DANCER.shoulderLift;
  const elbow = eased * DANCER.elbowBend;
  return { shoulder, elbow, forearm: shoulder + elbow };
}

/** Independent finite-rod reference about the vertical spin axis. Height alone adds no Iᵧ. */
export function dancerInertia(extension: number) {
  const pose = dancerArmPose(extension);
  const {
    shoulderRadius: d,
    upperLength: a,
    foreLength: b,
    armHalfThickness: h,
  } = DANCER;
  const upperCos = Math.cos(pose.shoulder),
    foreCos = Math.cos(pose.forearm);
  function rod(m: number, length: number, radius: number, angle: number) {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    return (
      m *
      (radius ** 2 +
        (length ** 2 * c ** 2 + 4 * h ** 2 * s ** 2 + 4 * h ** 2) / 12)
    );
  }
  return (
    DANCER.bodyInertia +
    2 *
      (rod(DANCER.upperMass, a, d + (a * upperCos) / 2, pose.shoulder) +
        rod(
          DANCER.foreMass,
          b,
          d + a * upperCos + (b * foreCos) / 2,
          pose.forearm,
        ))
  );
}
