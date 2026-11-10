# Physics3D Lab

A lab directory with working **Free Fall**, **Projectile Motion**, and **Spinning Ballet Dancer** experiments. Rapier determines motion, contacts, and articulation. React Three Fiber displays its physical state; the separate analytical model checks the engine's results.

## Run locally

Requires Node.js 22.12+ (Node 22 LTS recommended) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, then choose **Motion → Free fall**. Trials start paused:

1. Adjust **cube mass**, **release height**, or **gravity magnitude**.
2. Select **Apply & reset trial**, then **Start trial**.
3. Read simulated time, height, velocity, acceleration, and first-contact time.
4. **Pause** to inspect the cube. Camera orbit, zoom, pan, presets, and axes stay interactive.
5. **Resume** continues the same physical state. **Reset defaults** restores the default parameters, initial transforms, velocities, time, contact history, camera, and axes.

Editing a field does not change the active trial until applied. Applying settings creates a fresh paused physics world. Free Fall releases from rest; Projectile Motion has adjustable launch velocity. Inputs accept mass 0.1–10 kg, center height 1–10 m, and gravity magnitude 0–20 m/s²; blank, non-finite, and out-of-range values are rejected.

## Keyboard camera controls

Click the 3D view, or Tab to it, to activate keyboard panning. **↑ / ↓ / ← / →** move the view in screen space; **< / >** also pan left/right. Hold a key for continuous movement. A focus outline identifies the active view; **Esc** releases it and Tab continues to the next control. Keys pressed in number fields retain their normal editing behavior. Camera presets restore framing after panning. These controls work in all three experiments, including while paused, and do not apply forces or change physical measurements. A keyboard-visible **Skip to main content** link bypasses the header without changing the current experiment.

## Organization and navigation

- A **lab** groups a physics topic: Motion, Vectors, or Rotation.
- An **experiment** is a specific physical investigation within a lab.
- A **trial** is one run using selected initial conditions.
- Automated developer tests remain in `src/tests/` and `e2e/`; they are separate from student experiments.

| Lab      | Experiment             | Status    |
| -------- | ---------------------- | --------- |
| Motion   | Free fall              | Available |
| Motion   | Projectile motion      | Available |
| Vectors  | Vector operations      | Planned   |
| Rotation | Spinning ballet dancer | Available |

The app opens to the directory. Bookmarkable hash URLs work on static hosting without server rewrite rules:

```text
/#/labs
/#/labs/motion
/#/labs/vectors
/#/labs/rotation
/#/experiments/free-fall
/#/experiments/projectile-motion
/#/experiments/angular-momentum
```

Breadcrumbs, the All labs link, and browser Back/Forward support navigation. Planned experiments have an explanatory preview with no simulation controls. Unknown routes show a recovery link. Leaving an experiment releases the scene and resets its measurement/simulation stores; returning starts a new paused trial with defaults. No results are saved across visits.

To add an experiment, give it a directory under `src/experiments/`, an experiment definition, and an entry in `catalog.ts`. Available entries provide a lazy-loaded page; planned entries cannot provide a renderer. Shared camera, clock, controls, measurements, and physics utilities stay outside individual experiment pages.

## What is measured

| Readout              | Definition                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Simulation time      | Integrated step count × fixed timestep; paused time is excluded.                                      |
| Center height y      | Rapier body's world-space center y coordinate, in meters.                                             |
| Vertical velocity vᵧ | Rapier body's signed vertical velocity, in m/s. Negative means downward.                              |
| Acceleration aᵧ      | Change in Rapier velocity divided by one physics timestep, in m/s². Unavailable until the first step. |
| First contact        | First integrated step with a nonzero cube–ground solver contact impulse.                              |

Acceleration is net kinematic acceleration. In free fall it is approximately −g; after the cube rests it is approximately zero because the surface balances gravity. At impact the displayed finite difference averages an impulse over the timestep. It is not a material's real peak acceleration, which would require a deformation model.

Paused 3D views render only when the scene or camera changes. Starting or resuming schedules continuous frames again, without adding time spent paused to the simulation. The live readouts update at 10 Hz. The exact final step is published when paused, and first contact is published immediately. The analytical comparison freezes at the last pre-contact sample. Its equations do not apply through impact or while supported by the ground.

## Model and numerical validation

- Right-handed coordinates: +x right, +y up, +z out of the xy plane. Grid spacing: 1 m.
- Fixed physics timestep: 1/120 s for motion labs; 1/480 s for the articulated dancer. No wall-clock or render-frame animation determines motion.
- Default cube: side 1 m, mass 1 kg, center initially at y = 4.50 m, velocity zero.
- Default uniform gravity: `(0, -9.81, 0)` m/s², an Earth-surface approximation.
- Ground upper surface is y = 0; first contact occurs when the cube center is approximately 0.50 m high.
- Cube restitution 0.25, friction 0.70; Rapier ground defaults and average coefficient combination.
- CCD with soft prediction distance 0.25 m reduces impact penetration. Contact time has finite-step and contact-solver resolution.
- No air drag, buoyancy, variation of gravity with height, or material deformation. This is an ideal-vacuum experiment, not a claim of exact atmospheric behavior.

For release from rest, before contact:

```text
y(t) = h₀ − ½gt²
vᵧ(t) = −gt
aᵧ = −g
t_contact = √[2(h₀ − 0.50) / g]
```

For zero gravity, release from rest produces no fall and no finite contact time. For default values, predicted first contact is approximately 0.903 s. Changing mass alone should not change this time.

Vitest validates 27 combinations of mass (0.1, 1, 10 kg), gravity (1.62, 9.81, 20 m/s²), and height (1, 4.5, 10 m). Before contact, tolerances are 0.03 m for position, 0.002 m/s for velocity, and 0.005 m/s² for acceleration. First-contact time must match theory within 0.03 s, and final center height within 0.01 m. Additional tests cover mass independence, zero gravity, collision acceleration, frozen free-fall comparisons, reset, and input validation.

Playwright checks directory/lab navigation, planned previews, direct links, browser history, clean experiment re-entry, missing pages, and the rendered scene, initial pause, start/pause/resume, camera interaction while paused, parameter application, invalid values, zero gravity, reset, and narrow-screen overflow.

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
npm run preview
```

For browser tests, install Chromium once:

```sh
npx playwright install chromium
npm run test:e2e
```

## Projectile Motion

Open **Motion → Projectile motion** or `/#/experiments/projectile-motion`.

- Adjust launch speed (0–20 m/s), angle (0–90°), launch height (0–10 m), mass (0.1–10 kg), and gravity (0 or 1–20 m/s²).
- Apply settings, then **Launch**. Initial velocity is resolved into `v₀ₓ = v₀ cos θ` and `v₀ᵧ = v₀ sin θ` and assigned to the Rapier body once.
- Pause/resume, orbit/zoom/pan, use camera presets, and toggle velocity/components, gravity, prediction, and measured trail independently.
- Playback supports 0.1×, 0.25×, 0.5×, 1×, and 2×. Both experiments use the same fixed-step driver; speed scales accumulated simulated time rather than changing velocity, gravity, or the integration timestep.
- The solid trail comes from actual engine positions. The dashed predicted path is calculated independently. Markers identify launch, measured/interpolated apex, and landing. The scene frames the predicted envelope; the ground grid keeps its stated spacing.
- Flight remains in the x–y plane, rendered in 3D. The sphere radius is 0.18 m; height `h = world y − radius`, making `h = 0` the contact level. A ring marks the center for visibility at large scene scales.
- At first descending ground-contact impulse, the trial pauses. Time/range use that contact step. The readouts and equation comparison hold the last airborne sample; velocity arrows hide after contact so they do not conflict with the pre-impact readouts. Gravity remains a field vector.
- Zero gravity gives straight-line motion. Upward motion has no finite peak; horizontal/stationary motion retains its initial height. No finite landing time or range is fabricated. A 10 s observation window pauses the trial without labeling it a landing.
- Ground-level launches require upward velocity. Other launches may start horizontally or from rest at a positive height. Trials shorter than two integration steps are rejected with an explanatory message.

Both experiments offer **Replay same conditions**, **Reset defaults**, a weight/acceleration explanation where relevant, and an airborne mechanical-energy check. Energy drift is calculated from engine position/velocity with zero potential energy at the contact-height reference. The zero-initial-energy case has no percentage drift denominator. Pause flushes the last integration step; navigation and reset clear time, measurements, and histories.

See [physics validation notes](docs/PHYSICS_VALIDATION.md) for equations, reference conventions, numerical tolerances, and validation coverage. These experiments model ideal vacuum motion, not air drag or contact deformation.

## Source architecture

```text
src/
  app/                         Application shell, simulation styles, and catalog styles
    layout/                    Shared application header and footer
    pages/                     Directory, lab, experiment, and missing-page views
    routes.ts                  Static-host-compatible hash navigation
  physics/
    constants/                 Coordinate convention and timestep
    engine/                    Simulation clock and contact inspection
    units/                     Readable SI-number formatting
    equations/                 Pure analytical free-fall calculations
    measurements/              Time, derivatives, first-contact history
    vectors/ validation/       Reserved for later experiments
  three/
    scene/                     Shared Canvas, lighting, error handling
    camera/                    Orbit controls and camera presets
    helpers/                   Consistent world axes
    labels/                    Native scene labels
    lighting/ vectors/ trails/
  experiments/
    projectile-motion/         Projectile scene, parameters, results, and teaching view
    catalog.ts                 Typed lab and experiment registry
    free-fall/                 Drop scene, parameters, teaching readouts, page
    vector-lab/                Reserved
    angular-momentum/          Reserved
  components/
    controls/                  Reusable simulation and camera controls
    measurements/              Numeric readouts and airborne energy checks
    equations/ panels/ graphs/
  store/                       Simulation controls and UI measurement snapshots
  hooks/                       Reserved
  types/                       Experiment and catalog interfaces
  tests/                       Physics validation
e2e/                           Browser integration checks
```

Empty reserved directories contain `.gitkeep`. Physics transforms remain inside Rapier/R3F. Camera controls and lighting remain independent of pause state. The experiment configuration and page remain separate from the application shell. A typed catalog declares each lab, its experiments, and whether each experiment is available or planned. Experiment code is loaded only when opened; the directory does not initialize Three.js or Rapier. The vector lab and robot are not implemented yet; no backend or authentication is included.

References: [OpenStax free fall](https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall), [React Three Fiber installation](https://r3f.docs.pmnd.rs/getting-started/installation), and [React Three Rapier](https://github.com/pmndrs/react-three-rapier).

`package-lock.json` records the installed dependency versions. The `minimatch` override supplies the patched lint-toolchain dependency. The directory is a small application bundle; Three.js and Rapier load in a shared 3D chunk only when an experiment opens. Vite still reports that experiment chunk as large because it contains the renderer and WebAssembly runtime.

## Hosting and continuous integration

Source is maintained in the private GitHub repository `PhyoThihaOo32/physics3d-lab`. The `main` branch contains the release source. GitHub Actions runs strict type checking, lint, formatting, numerical tests, the production build, and Chromium integration tests.

Vercel project `physics3d-lab` builds the Vite application with `npm ci` and `npm run build`, serving `dist/`. The application uses hash routes, so direct experiment links work without server rewrite rules. Local `.vercel/` metadata, environment files, dependencies, and test artifacts are excluded from Git and deployment uploads.

For an authorized manual production deployment from a clean checkout, use `vercel --prod` after linking this directory to the project. Vercel retains deployment history for reverting to a previous successful release. The public production URL is also set as the GitHub repository homepage after the first successful deployment.

## Spinning ballet dancer

Open **Rotation → Spinning ballet dancer**. The initial trial uses 2 rad/s and an ideal support. Start the spin, then use **Arm raise target**, **Raise arms**, or **Open arms** while running. Shoulders and elbows bend smoothly; arm segments keep their lengths. A supported vertical axis isolates the mass-distribution effect without simulating human balance.

Read hand radius, total moment of inertia, angular velocity, signed RPM, angular momentum and spin kinetic energy. The graphs use independent SI scales and compare measured momentum with initial momentum plus integrated external torque. Pause to record up to eight comparison samples or export the full trial history as CSV. Initial angular velocity (−3 to +3 rad/s) and resistance (0–0.5 N·m·s/rad) apply to a new paused trial. Pending edits do not prevent resuming the current trial; its applied settings remain in effect. Zero initial spin does not generate sustained rotation when the arms move symmetrically.

Five dynamic bodies and four internal motorized joints produce the motion. The torso is constrained to yaw about a fixed vertical axis. Rapier's angular integration is supplemented by Euler's gyroscopic term for each moving arm; angular velocity is never overwritten to force conservation. Inertia uses each body's rotated tensor and the parallel-axis theorem; measured angular momentum independently sums spin and orbital contributions. A pure geometric equation supplies an independent reference inertia.

This is a 51 kg illustrative segment model, not measured anatomy. Under ideal support, Lᵧ is approximately conserved; with resistance, τᵧ = −bω and Lᵧ decreases in magnitude. Spin energy increases as the arms rise toward the axis because actuators do work. Displayed spin energy excludes arm-raising motion and gravitational potential energy, so its change is not total muscle work. See [the detailed lab procedure](docs/DANCER_LAB.md) and [physics validation](docs/PHYSICS_VALIDATION.md) for equations, assumptions, tolerances and test coverage.
