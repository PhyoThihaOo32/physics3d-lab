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
  private readonly segments: {
    body: RAPIER.RigidBody;
    mass: number;
    principal: Vector3;
    frame: Quaternion;
  }[];
  // Mass properties are fixed within a trial. Reuse scratch objects in the
  // 480 Hz integration loop instead of allocating vectors on every step.
  private readonly rotation = new Quaternion();
  private readonly inverse = new Quaternion();
  private readonly axis = new Vector3();
  private readonly omega = new Vector3();
  private readonly spin = new Vector3();
  private readonly gyro = new Vector3();
  private readonly tip = new Vector3();
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
    this.segments = [this.torso, ...this.arms].map((body) => ({
      body,
      mass: body.mass(),
      principal: new Vector3().copy(body.principalInertia()),
      frame: new Quaternion().copy(body.principalInertiaLocalFrame()),
    }));
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
    for (const { body, principal, frame } of this.segments) {
      if (body === this.torso) continue;
      this.rotation.copy(body.rotation()).multiply(frame);
      this.inverse.copy(this.rotation).invert();
      this.omega.copy(body.angvel());
      this.spin
        .copy(this.omega)
        .applyQuaternion(this.inverse)
        .multiply(principal)
        .applyQuaternion(this.rotation);
      body.resetTorques(false);
      body.addTorque(
        this.gyro.copy(this.omega).cross(this.spin).negate(),
        true,
      );
    }
    this.torque = -this.parameters.resistance * this.torso.angvel().y;
    this.torso.resetTorques(false);
    this.torso.addTorque(v(0, this.torque, 0), true);
    this.impulse += this.torque * DANCER.timeStep;
  }
  get stepCount() {
    return this.steps;
  }
  get time() {
    return this.steps * DANCER.timeStep;
  }
  advanceStep() {
    this.steps++;
  }
  afterStep() {
    this.advanceStep();
    return this.measure();
  }
  measure(): DancerSnapshot {
    let inertia = 0,
      momentum = 0;
    for (const { body, principal, frame, mass } of this.segments) {
      this.rotation.copy(body.rotation()).multiply(frame);
      this.inverse.copy(this.rotation).invert();
      this.axis.set(0, 1, 0).applyQuaternion(this.inverse);
      const center = body.worldCom();
      const velocity = body.linvel();
      inertia +=
        this.axis.x ** 2 * principal.x +
        this.axis.y ** 2 * principal.y +
        this.axis.z ** 2 * principal.z +
        mass * (center.x ** 2 + center.z ** 2);
      this.spin
        .copy(body.angvel())
        .applyQuaternion(this.inverse)
        .multiply(principal)
        .applyQuaternion(this.rotation);
      momentum +=
        this.spin.y + mass * (center.z * velocity.x - center.x * velocity.z);
    }
    const omega = this.torso.angvel().y;
    const expected = (this.initialMomentum ?? momentum) + this.impulse;
    const scale = Math.max(Math.abs(this.initialMomentum ?? momentum), 1);
    const hand = this.arms[1];
    this.tip
      .set(DANCER.foreLength / 2, 0, 0)
      .applyQuaternion(this.rotation.copy(hand.rotation()))
      .add(this.axis.copy(hand.translation()));
    return {
      time: this.time,
      extension: this.extension,
      radius: Math.hypot(this.tip.x, this.tip.z),
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
