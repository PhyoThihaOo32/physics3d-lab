# Angular momentum: spinning ballet dancer

## Investigation

**Question:** How does pulling the arms toward the rotation axis change a dancer's angular velocity, angular momentum and rotational kinetic energy?

**Prediction:** With no external torque about the vertical axis, decreasing moment of inertia increases angular velocity. The product Iᵧωᵧ stays approximately constant. Spin kinetic energy increases because the actuators representing muscles do work.

The simulation uses real mechanics for a simplified supported body. A real dancer's anatomy, floor forces, balance and muscle behavior are more complex. These results describe this explicit model rather than predicting a particular person's pirouette.

## Quantities and conventions

| Quantity      | Definition                                                               | SI unit   |
| ------------- | ------------------------------------------------------------------------ | --------- |
| t             | Integrated physical time; excludes pauses                                | s         |
| r             | Distance of the modeled right hand/wrist endpoint from the vertical axis | m         |
| Iᵧ            | Total moment of inertia about that axis                                  | kg·m²     |
| ωᵧ            | Signed torso angular velocity about the vertical axis                    | rad/s     |
| Rotation rate | ωᵧ × 60/(2π)                                                             | rpm       |
| Lᵧ            | Total spin plus orbital angular momentum about the axis                  | kg·m²/s   |
| Kspin         | ½Iᵧωᵧ², the common-axis spin contribution                                | J         |
| τᵧ            | External resistive torque −bωᵧ                                           | N·m       |
| b             | Viscous rotational resistance coefficient                                | N·m·s/rad |

Positive rotation follows the right-hand rule about +y. Negative initial velocity reverses rotation; it does not mean negative energy. The hand-radius ring is a floor projection. Arrow lengths use separate display scales; compare numerical values rather than arrow lengths across different physical quantities.

## Model

- Body excluding moving arms: 44 kg, Iᵧ = 0.750 kg·m², constrained position and tilt. Total model mass is 51 kg.
- Each upper arm: 2.0 kg, 0.30 m. Each forearm/hand segment: 1.5 kg, 0.28 m. Both use a uniform 0.07 m square inertia envelope.
- Shoulder centers: 0.18 m from the axis, 1.42 m above the platform. Shoulder and elbow axes move with the dancer.
- Arms extended: shoulder and elbow angles 0°. Arms tucked: shoulders 75° downward, elbows 150° flexed. Segment lengths do not change.
- Extension target moves at at most 45 percentage points per physical second; actual joints follow with finite stiffness. Numerical/physical motor compliance causes small pose differences.
- Internal joint motors transfer forces and torques between body segments. They represent actuation, not a physiological muscle model. Segment self-contact is disabled for the simplified envelopes.
- Gravity is 9.81 m/s² downward and contributes no torque about the vertical axis. The support prevents translation and tilt. Its ideal mode supplies no vertical-axis torque.
- Resistive mode supplies the explicit external torque τᵧ = −bωᵧ. It is a viscous bearing model, not Coulomb foot friction or air drag.
- The observation window is 60 physical seconds. Completion pauses the simulation without imposing a physical stop.

## Independent reference equations

Let extension e run from 0 (tucked) to 1 (open), α = (1−e)75°, d = 0.18 m, upper length a = 0.30 m, fore length b = 0.28 m, and thickness t = 0.07 m. The mirrored upper/forearm directions have angles −α and +α relative to horizontal. Their center radii are:

```text
r_upper = d + ½a cos α
r_fore  = d + (a + ½b) cos α
r_hand  = d + (a + b) cos α
I_segment,y = m r_center² + m(length² cos²α + t² sin²α + t²)/12
I_total,y = I_body,y + 2(I_upper,y + I_fore,y)
```

The last two terms account for each finite segment's own inertia rather than treating all mass as concentrated at its hand. In the running engine, Iᵧ is measured from actual body poses and tensors instead of substituting the extension target into this equation.

```text
No external torque: Lᵧ = constant ≈ Iᵧωᵧ
With external torque: Lᵧ(t) = Lᵧ(0) + ∫τᵧ dt
Predicted ωᵧ(t) ≈ [Lᵧ(0) + ∫τᵧ dt] / measured Iᵧ(t)
Kspin = ½Iᵧωᵧ² ≈ Lᵧ²/(2Iᵧ)
Fixed I, viscous resistance: ωᵧ(t) = ωᵧ(0) exp(−bt/Iᵧ)
```

The ideal reference open inertia is 2.391258 kg·m² and tucked inertia is 1.209479 kg·m². Starting at 2 rad/s gives L₀ = 4.782517 kg·m²/s. The exact geometric reference predicts a tucked speed of about 3.954 rad/s. The actual motorized pose can differ slightly under gravity and centrifugal load.

## Procedure A: ideal angular momentum

1. Reset defaults. Keep the ideal support and initial angular velocity 2 rad/s.
2. Record the initial paused sample. Predict the tucked angular speed using ω₂ = I₁ω₁/I₂ and the reference inertias.
3. Start spin, choose **Arms in**, and allow at least 4 physical seconds for movement and settling. Slow playback changes observation pace, not the physical result.
4. Pause and record a sample. Compare I and ω with the open sample. Compute I₁ω₁ and I₂ω₂. Compare both with independently measured Lᵧ and the dashed torque-balance curve.
5. Resume, choose **Arms out**, wait for settling, pause and record again. Test whether the initial speed approximately returns.
6. Export CSV for the continuous history. Keep the residual and finite-step accuracy in mind when interpreting small changes.

## Procedure B: energy and zero initial spin

1. Compare open/tucked spin energies from Procedure A. Explain why constant angular momentum does not imply constant kinetic energy.
2. Set initial angular velocity to 0 rad/s and apply a new trial.
3. Start, fold and extend symmetrically, then pause. Check that no sustained common-axis spin or angular momentum appears.
4. Repeat with −2 rad/s. Predict the signs of ωᵧ and Lᵧ and the sign of energy before running.

The change in displayed spin energy is not total muscle work: arm-folding kinetic energy, gravitational potential changes and motor damping are also relevant. The simulation does not infer metabolic energy.

## Procedure C: external torque

1. Select the resistive support, set initial angular velocity 2 rad/s and coefficient 0.15 N·m·s/rad, then apply.
2. Keep the arms extended and start. Predict exponential angular-speed decay with the initial Iᵧ.
3. Compare measured momentum with L₀ + ∫τᵧ dt. Momentum is no longer conserved, but the torque balance should still hold approximately.
4. Repeat with tucking. Separate the tendency of smaller I to raise speed from the external torque removing momentum.
5. Repeat with negative initial angular velocity. The resistive torque should reverse sign and continue opposing rotation.

## Numerical accuracy and interpretation

The engine uses 1/480 s fixed integration and 24 solver iterations. It includes the Euler gyroscopic term for the pinned Rapier version. Measurements use actual segment poses and velocities; the torso's angular velocity is never assigned L/I after initialization. This makes conservation an independently tested result rather than an enforced display identity.

The UI publishes at 10 Hz and on pause. Time is physical integration time, so rendering speed and slow playback do not alter the timestep. Small drift and transient joint errors remain. Automated acceptance bounds are documented in [PHYSICS_VALIDATION.md](PHYSICS_VALIDATION.md). More decimal places improve comparison readability, not physical accuracy.

References: [OpenStax: Conservation of Angular Momentum](https://openstax.org/books/university-physics-volume-1/pages/11-3-conservation-of-angular-momentum), [Rapier: joints](https://rapier.rs/docs/user_guides/javascript/joints/).
