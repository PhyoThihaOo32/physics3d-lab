import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';

import {
  DANCER,
  dancerArmPose,
  type DancerParameters,
  type DancerSnapshot,
} from '../equations/angularMomentum';
export {
  DANCER,
  DEFAULT_DANCER,
  dancerInertia,
} from '../equations/angularMomentum';
export type {
  DancerParameters,
  DancerSnapshot,
} from '../equations/angularMomentum';
const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const identity = { x: 0, y: 0, z: 0, w: 1 };

/** Rapier's articulated bodies are the source of all measured motion. */
export class DancerDynamics {
  readonly torso: RAPIER.RigidBody;
  readonly arms: RAPIER.RigidBody[] = [];
  readonly joints: RAPIER.RevoluteImpulseJoint[] = [];
  private steps = 0;
  private extension = 1;
  private impulse = 0;
  private torque = 0;
  readonly initialMomentum: number;
  readonly initialEnergy: number;
  private previousIterations: number;
  constructor(
    private world: RAPIER.World,
    readonly parameters: DancerParameters,
  ) {
    this.previousIterations = world.numSolverIterations;
    world.numSolverIterations = 24;
    this.torso = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 1, 0)
        .enabledTranslations(false, false, false)
        .enabledRotations(false, true, false)
        .setCanSleep(false)
        .setAdditionalMassProperties(
          DANCER.bodyMass,
          v(),
          v(6, DANCER.bodyInertia, 6),
          identity,
        )
        .setAngvel(v(0, parameters.initialOmega, 0)),
    );
    this.torso.recomputeMassPropertiesFromColliders();
    for (const side of [1, -1]) {
      const {
        shoulderRadius: d,
        shoulderHeight: y,
        upperLength: a,
        foreLength: b,
        armHalfThickness: h,
      } = DANCER;
      const pair: RAPIER.RigidBody[] = [];
      for (const [length, mass, x] of [
        [a, DANCER.upperMass, side * (d + a / 2)],
        [b, DANCER.foreMass, side * (d + a + b / 2)],
      ]) {
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, 0)
            .setCanSleep(false)
            .setLinvel(0, 0, -parameters.initialOmega * x)
            .setAngvel(v(0, parameters.initialOmega, 0)),
        );
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(length / 2, h, h)
            .setMass(mass)
            .setCollisionGroups(0),
          body,
        );
        body.recomputeMassPropertiesFromColliders();
        pair.push(body);
        this.arms.push(body);
      }
      this.joints.push(
        world.createImpulseJoint(
          RAPIER.JointData.revolute(
            v(side * d, y - 1, 0),
            v((-side * a) / 2, 0, 0),
            v(0, 0, side),
          ),
          this.torso,
          pair[0],
          true,
        ) as RAPIER.RevoluteImpulseJoint,
      );
      this.joints.push(
        world.createImpulseJoint(
          RAPIER.JointData.revolute(
            v((side * a) / 2, 0, 0),
            v((-side * b) / 2, 0, 0),
            v(0, 0, side),
          ),
          pair[0],
          pair[1],
          true,
        ) as RAPIER.RevoluteImpulseJoint,
      );
    }
    const initial = this.measure();
    this.initialMomentum = initial.momentum;
    this.initialEnergy = initial.energy;
  }
  beforeStep(target: number) {
    const move = DANCER.extensionRate * DANCER.timeStep;
    this.extension += Math.max(-move, Math.min(move, target - this.extension));
    const pose = dancerArmPose(this.extension);
    this.joints.forEach((joint, i) =>
      joint.configureMotorPosition(
        i % 2 === 0 ? pose.shoulder : pose.elbow,
        20000,
        300,
      ),
    );
    // Rapier 0.19.2 does not integrate the Euler gyroscopic term here.
    // Supply -ω × (I_world ω) to its angular-acceleration equation.
    // This is an inertial term, not an external torque or a momentum correction.
    for (const body of this.arms) {
      const q = new Quaternion()
        .copy(body.rotation())
        .multiply(new Quaternion().copy(body.principalInertiaLocalFrame()));
      const omega = new Vector3().copy(body.angvel());
      const spin = omega
        .clone()
        .applyQuaternion(q.clone().invert())
        .multiply(new Vector3().copy(body.principalInertia()))
        .applyQuaternion(q);
      body.resetTorques(false);
      body.addTorque(omega.clone().cross(spin).negate(), true);
    }
    this.torque = -this.parameters.resistance * this.torso.angvel().y;
    this.torso.resetTorques(false);
    this.torso.addTorque(v(0, this.torque, 0), true);
    this.impulse += this.torque * DANCER.timeStep;
  }
  afterStep() {
    this.steps++;
    return this.measure();
  }
  measure(): DancerSnapshot {
    let inertia = 0,
      momentum = 0;
    for (const body of [this.torso, ...this.arms]) {
      const q = new Quaternion()
        .copy(body.rotation())
        .multiply(new Quaternion().copy(body.principalInertiaLocalFrame()));
      const inverse = q.clone().invert();
      const axis = new Vector3(0, 1, 0).applyQuaternion(inverse);
      const principal = body.principalInertia();
      const center = body.worldCom();
      const velocity = body.linvel();
      inertia +=
        axis.x ** 2 * principal.x +
        axis.y ** 2 * principal.y +
        axis.z ** 2 * principal.z +
        body.mass() * (center.x ** 2 + center.z ** 2);
      const spin = new Vector3()
        .copy(body.angvel())
        .applyQuaternion(inverse)
        .multiply(new Vector3().copy(principal))
        .applyQuaternion(q);
      momentum +=
        spin.y + body.mass() * (center.z * velocity.x - center.x * velocity.z);
    }
    const omega = this.torso.angvel().y;
    const expected = (this.initialMomentum ?? momentum) + this.impulse;
    const scale = Math.max(Math.abs(this.initialMomentum ?? momentum), 1);
    const hand = this.arms[1];
    const tip = new Vector3(DANCER.foreLength / 2, 0, 0)
      .applyQuaternion(new Quaternion().copy(hand.rotation()))
      .add(new Vector3().copy(hand.translation()));
    return {
      time: this.steps * DANCER.timeStep,
      extension: this.extension,
      radius: Math.hypot(tip.x, tip.z),
      inertia,
      omega,
      momentum,
      initialMomentum: this.initialMomentum ?? momentum,
      impulse: this.impulse,
      torque: this.torque,
      energy: 0.5 * inertia * omega ** 2,
      initialEnergy: this.initialEnergy ?? 0.5 * inertia * omega ** 2,
      residual: momentum - expected,
      balanceError: (100 * Math.abs(momentum - expected)) / scale,
    };
  }
  dispose() {
    let removed = false;
    // R3F may free/reset its lazy world before child effect cleanup (StrictMode).
    // Query the live world instead of dereferencing a body from a freed WASM set.
    for (const body of [...this.arms, this.torso]) {
      if (this.world.getRigidBody(body.handle) === body) {
        this.world.removeRigidBody(body);
        removed = true;
      }
    }
    if (removed) this.world.numSolverIterations = this.previousIterations;
  }
}
