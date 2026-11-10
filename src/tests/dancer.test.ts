import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import {
  DANCER,
  DancerDynamics,
  dancerInertia,
} from '../physics/rotation/dancer';
import { dancerParameterError } from '../experiments/angular-momentum/config';
import type { DancerParameters } from '../physics/equations/angularMomentum';
beforeAll(async () => {
  await RAPIER.init();
});
function trial(p: DancerParameters) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = DANCER.timeStep;
  const dancer = new DancerDynamics(world, p);
  function advance(
    seconds: number,
    target: number,
    check?: (s: ReturnType<DancerDynamics['measure']>) => void,
  ) {
    for (let i = 0; i < Math.round(seconds / DANCER.timeStep); i++) {
      dancer.beforeStep(target);
      world.step();
      const s = dancer.afterStep();
      check?.(s);
    }
    return dancer.measure();
  }
  return {
    dancer,
    advance,
    free: () => {
      dancer.dispose();
      expect(world.bodies.len()).toBe(0);
      world.free();
    },
  };
}
describe('articulated spinning dancer', () => {
  it.each([-3, -2, 0, 1, 2, 3])(
    'conserves measured momentum through a overhead raise and opening at initial ω=%s',
    (initialOmega) => {
      const t = trial({ initialOmega, resistance: 0 });
      const initial = t.dancer.measure();
      expect(initial.inertia).toBeCloseTo(dancerInertia(1), 5);
      const monitor = (s: typeof initial) => {
        expect(s.balanceError).toBeLessThan(0.5);
        if (initialOmega === 0) {
          expect(Math.abs(s.momentum)).toBeLessThan(1e-5);
          expect(Math.abs(s.omega)).toBeLessThan(0.001);
        }
      };
      const raised = t.advance(5, 0, monitor);
      const fore = t.dancer.arms[1];
      const hand = new Vector3(DANCER.foreLength / 2, 0, 0)
        .applyQuaternion(new Quaternion().copy(fore.rotation()))
        .add(new Vector3().copy(fore.translation()));
      // Inertia alone cannot distinguish a mirrored downward pose: check actual overhead clearance.
      expect(hand.y).toBeGreaterThan(1.9);
      expect(hand.y).toBeLessThan(2.03);
      expect(t.dancer.arms[0].translation().y).toBeGreaterThan(1.55);
      expect(raised.radius).toBeGreaterThan(0.14);
      expect(raised.radius).toBeLessThan(0.19);
      expect(raised.inertia).toBeCloseTo(dancerInertia(0), 1);
      expect(
        Math.abs(raised.omega - initial.momentum / raised.inertia),
      ).toBeLessThan(0.002 * Math.max(1, Math.abs(raised.omega)));
      if (initialOmega !== 0) {
        expect(Math.abs(raised.omega)).toBeGreaterThan(
          1.9 * Math.abs(initialOmega),
        );
        expect(raised.energy).toBeGreaterThan(initial.energy * 1.9);
      }
      const open = t.advance(7, 1, monitor);
      expect(open.omega).toBeCloseTo(initialOmega, 1);
      expect(open.inertia).toBeCloseTo(initial.inertia, 2);
      t.free();
    },
  );
  it.each([0.05, 0.15, 0.5])(
    'matches exponential spin decay with fixed arms at b=%s',
    (resistance) => {
      const t = trial({ initialOmega: 2, resistance });
      const initial = t.dancer.measure();
      const final = t.advance(8, 1, (s) =>
        expect(s.balanceError).toBeLessThan(0.5),
      );
      const analytic = 2 * Math.exp((-resistance * 8) / initial.inertia);
      expect(final.omega).toBeCloseTo(analytic, 2);
      expect(final.energy).toBeLessThan(initial.energy);
      expect(final.momentum).toBeLessThan(initial.momentum);
      expect(final.torque).toBeLessThan(0);
      t.free();
    },
  );
  it('accounts for applied torque during repeated arm movement for the full observation window', () => {
    const t = trial({ initialOmega: -3, resistance: 0.15 });
    let maxError = 0;
    for (let i = 0; i < 12; i++) {
      const s = t.advance(5, i % 2, (s) => {
        maxError = Math.max(maxError, s.balanceError);
        expect(Number.isFinite(s.omega)).toBe(true);
      });
      expect(s.momentum).toBeLessThan(0);
      expect(s.torque).toBeGreaterThan(0);
    }
    expect(maxError).toBeLessThan(1);
    expect(t.dancer.measure().time).toBe(60);
    t.free();
  }, 20_000);
  it('holds momentum through the full ideal observation window', () => {
    const t = trial({ initialOmega: 3, resistance: 0 });
    let maxError = 0;
    for (let i = 0; i < 12; i++)
      t.advance(5, i % 2, (s) => {
        maxError = Math.max(maxError, s.balanceError);
      });
    expect(maxError).toBeLessThan(1.5);
    t.free();
  }, 20_000);
  it('keeps fixed segment lengths and coincident joint anchors during a rapid target reversal', () => {
    const t = trial({ initialOmega: 3, resistance: 0 });
    for (let i = 0; i < 8; i++)
      t.advance(0.4, i % 2, () => {
        for (const joint of t.dancer.joints) {
          const body1 = joint.body1(),
            body2 = joint.body2();
          const a = joint.anchor1(),
            b = joint.anchor2();
          // Rapier's world-space points, independent of render geometry.
          const qa = body1.rotation(),
            qb = body2.rotation();
          function transform(p: typeof a, q: typeof qa, offset: typeof a) {
            const tx = 2 * (q.y * p.z - q.z * p.y),
              ty = 2 * (q.z * p.x - q.x * p.z),
              tz = 2 * (q.x * p.y - q.y * p.x);
            return [
              p.x + q.w * tx + q.y * tz - q.z * ty + offset.x,
              p.y + q.w * ty + q.z * tx - q.x * tz + offset.y,
              p.z + q.w * tz + q.x * ty - q.y * tx + offset.z,
            ];
          }
          const wa = transform(a, qa, body1.translation()),
            wb = transform(b, qb, body2.translation());
          expect(Math.hypot(...wa.map((n, j) => n - wb[j]))).toBeLessThan(
            0.003,
          );
        }
      });
    t.free();
  });
  it('has monotonic reference inertia and rejects invalid initial settings', () => {
    expect(dancerInertia(1)).toBeCloseTo(2.391258333333333, 10);
    expect(dancerInertia(0)).toBeCloseTo(1.0427079248462237, 10);
    let last = dancerInertia(0);
    for (let i = 1; i <= 100; i++) {
      const next = dancerInertia(i / 100);
      expect(next).toBeGreaterThan(last);
      last = next;
    }
    expect(dancerParameterError({ initialOmega: 0, resistance: 0 })).toBeNull();
    expect(
      dancerParameterError({ initialOmega: -3, resistance: 0.5 }),
    ).toBeNull();
    for (const initialOmega of [-3.1, 3.1, NaN, Infinity])
      expect(
        dancerParameterError({ initialOmega, resistance: 0 }),
      ).not.toBeNull();
    for (const resistance of [-0.1, 0.6, NaN, Infinity])
      expect(
        dancerParameterError({ initialOmega: 2, resistance }),
      ).not.toBeNull();
  });
});
