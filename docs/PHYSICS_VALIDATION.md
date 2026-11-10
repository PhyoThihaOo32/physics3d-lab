# Physics model and validation

This document describes the implemented Free Fall and Projectile Motion experiments. Both are ideal Newtonian rigid-body models with uniform gravity, SI units, no air resistance, no spin lift, and no force applied after release/launch. Earth gravity is approximated by 9.81 m/s²; gravity is an experiment parameter rather than an exact claim about every terrestrial location.

## Independent simulation and prediction

Rapier owns motion, velocities, and collision impulses. The renderer reads that state. Pure TypeScript functions independently predict trajectories and energy. The theoretical trajectory is never used to position the moving body. Analytical predictions size the viewing envelope and fixed ground only.

Both experiments use a shared fixed-step driver at 1/120 s. Playback changes the accumulation of simulated time, not the physical step, initial velocity, or gravity. Time is integrated step count multiplied by the fixed step. Paused frames add no steps. Rendering delays can slow wall-clock playback; they do not change the recorded physical time or numerical timestep.

Readouts publish at 10 Hz, with an exact final-step flush when paused. First contacts are inspected at every integration step by looking for nonzero ground-contact impulses, avoiding delayed render-frame collision timestamps.

## Coordinates and height references

World coordinates are right-handed: +x right, +y up, +z out of the xy plane. Projectile launches have z = 0 and initial v_z = 0, so flight is planar inside a 3D scene.

| Quantity             | Free Fall            | Projectile Motion                 |
| -------------------- | -------------------- | --------------------------------- |
| Shape                | Cube, side 1 m       | Sphere, radius 0.18 m             |
| Ground surface       | y = 0 m              | y = 0 m                           |
| Initial height input | Center coordinate y₀ | Clearance h₀ = center y₀ − radius |
| Center at contact    | y ≈ 0.50 m           | y ≈ 0.18 m                        |
| Energy reference     | h = y − 0.50 m       | h = y − 0.18 m                    |

The visible ground and collider upper surfaces agree. Projectile ground dimensions accommodate the predicted flight envelope; grid size/divisions and grid origin are multiples of the displayed spacing.

## Free Fall equations

For release from rest before contact:

```text
y(t) = y₀ − ½gt²
vᵧ(t) = −gt
aᵧ = −g
t_contact = √[2(y₀ − 0.50 m) / g]   (g > 0)
```

At g = 0 and initial velocity zero, the cube remains stationary and there is no finite contact prediction. Mass does not change free-fall acceleration. Weight has magnitude Fg = mg, so downward acceleration is −Fg/m = −g.

The cube has friction 0.70 and restitution 0.25; the ground has friction 0.50 and restitution 0. Rapier's average combination gives contact friction 0.60 and restitution 0.125. These contact parameters do not affect motion before contact. The simulation continues through rebound and rest; only the initial free-fall comparison and energy check freeze before the first contact impulse. At rest, net acceleration is approximately zero because the ground balances gravity.

## Projectile equations

Angle θ is measured above +x. At launch:

```text
v₀ₓ = v₀ cos θ
v₀ᵧ = v₀ sin θ
v₀_z = 0
```

While airborne:

```text
x(t) = v₀ₓt
h(t) = h₀ + v₀ᵧt − ½gt²
vₓ(t) = v₀ₓ
vᵧ(t) = v₀ᵧ − gt
aₓ = 0; aᵧ = −g; a_z = 0
```

For g > 0:

```text
T = [v₀ᵧ + √(v₀ᵧ² + 2gh₀)] / g
Range = v₀ₓT
Time to apex = v₀ᵧ / g
Maximum h = h₀ + v₀ᵧ² / (2g)
Impact speed = √[v₀ₓ² + (v₀ᵧ − gT)²]
```

Complementary angles have equal range only when launch and landing center heights agree. At the apex, vertical velocity is zero; horizontal velocity and downward acceleration generally are not zero.

The sphere and ground have zero friction and restitution. The first descending contact impulse ends the flight trial. An initial ground-level upward launch is not prematurely counted as a landing. Reported range/time use the contact step. Reported pre-impact velocity is the last airborne velocity, with its own timestamp, not an extrapolated or post-collision value. Maximum height is sampled; apex time/position are estimated between the two measured samples bracketing the sign change in vertical velocity.

For g = 0 there is no finite landing prediction for supported launches. Upward launches have no finite maximum height over an unbounded flight; horizontal or stationary launches have constant height. The trial's 10 s observation window ends by pausing and records no landing. Nonzero supported gravity is 1–20 m/s². Ground-level horizontal/rest launches and flights shorter than two timesteps are rejected with a reason.

## Acceleration and energy

Acceleration is measured by `(current engine velocity − previous engine velocity) / timestep`. The initial derivative baseline is the assigned launch velocity, so the launch itself is not falsely included as a large acceleration. Before the first step, acceleration is shown as unavailable.

Contact acceleration is an impulse averaged over one numerical step. It is not a prediction of peak acceleration in a deformable real material. Projectile flight readouts freeze before contact; Free Fall's live readouts continue to show contact and rest separately from its frozen free-fall comparison.

Airborne energy is independently computed from measured velocity and height:

```text
E = ½m|v|² + mgh
Difference = E_current − E_initial
Relative drift = |Difference / E_initial| × 100%
```

The percentage is omitted when initial energy is zero. Potential-energy references are defined above. Contact losses are excluded by using the pre-contact comparison sample. The energy readout is derived from engine measurements, not a claim that the numerical integrator conserves energy exactly.

## Validation coverage and tolerances

| Check                              | Acceptance used by tests                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Free Fall core matrix              | 27 combinations: masses 0.1, 1, 10 kg; g = 1.62, 9.81, 20 m/s²; center heights 1, 4.5, 10 m |
| Free Fall airborne position        | Absolute theoretical difference < 0.03 m                                                    |
| Free Fall velocity / acceleration  | Difference < 0.002 m/s / 0.005 m/s²                                                         |
| Contact time                       | Difference < 0.03 s in the tested parameter matrix                                          |
| Free Fall final center / speed     | Height within 0.01 m of 0.50 m; speed below 0.01 m/s                                        |
| Projectile core matrix             | 16 combinations: 0°, 30°, 45°, 90°; g = 1.62, 9.81; masses 0.1, 10 kg                       |
| Projectile airborne x / h          | Difference < 0.01 m / 0.05 m in the core matrix                                             |
| Projectile velocity / acceleration | Difference < 0.002 m/s / 0.005 m/s² in the core matrix                                      |
| Projectile range                   | Error bounded by horizontal speed × 0.03 s, plus 0.01 m (0.02 m for boundary cases)         |
| Projectile maximum height          | Difference < 0.05 m in core cases, < 0.10 m at supported boundaries                         |
| Airborne energy drift              | Less than 1% in tested Free Fall and Projectile matrices and boundary cases                 |
| Timestep convergence               | Halving 1/60 s to 1/120 s reduces the measured positional error at 0.5 s                    |

These are validation tolerances for the documented test cases, not a promise that displayed decimal places are physical accuracy or that every arbitrary combination has the same relative error. Contacts are discretely resolved. Very short flights are particularly sensitive to timestep resolution and are guarded.

Additional checks cover mass independence, zero gravity, zero initial speed above ground, ground-level upward launches, low-height horizontal launches, long high-speed trajectories, vertical launches, nonzero acceleration at the apex, energy reference levels, zero-energy denominators, bounded trail storage, observation limits, valid input ranges, and reset state.

The equal-height 10 m/s, 45° reference predicts approximately T = 1.442 s, R = 10.194 m, and height gained = 2.548 m. The default projectile launches 1 m above the contact level instead, predicting T ≈ 1.571 s, R ≈ 11.111 m, and maximum h ≈ 3.548 m.

Browser integration checks cover direct navigation, labels and validation, launch/pause/resume, orbit and presets while paused, layer toggles, playback invariance, replay/reset, automatic landing pause, zero-gravity observation, mobile overflow, and clean re-entry. Rendering is also visually inspected on desktop and narrow screens. Production preview checks the built application, not just the development server.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run format:check`, and `npm run build` from the project root.

## Observed default trials in production preview

The built application was launched and visually inspected on desktop and a 390 px screen. These are observed values for the locked dependency versions, not replacements for the equations:

| Default measurement     | Analytical prediction | Rapier observation |
| ----------------------- | --------------------- | ------------------ |
| Free Fall first contact | 0.903 s               | 0.908 s            |
| Projectile flight time  | 1.571 s               | 1.575 s            |
| Projectile range        | 11.111 m              | 11.137 m           |
| Projectile maximum h    | 3.548 m               | 3.541 m            |

Airborne energy drift at the frozen last-airborne sample was 0.230% for Free Fall and 0.263% for the default projectile. Production preview reported no JavaScript or browser console errors. Playback invariance, pause/replay/reset, planned-vs-available navigation, and mobile overflow are additionally covered by browser tests.

## Primary references

- [OpenStax: Free Fall](https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall)
- [OpenStax: Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)
- [OpenStax: Conservation of Energy](https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy)
- [React Three Rapier Physics API](https://pmndrs.github.io/react-three-rapier/interfaces/PhysicsProps.html)
