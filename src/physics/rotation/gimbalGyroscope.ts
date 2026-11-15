import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import {
  gyroscopeTimeStep,
  gimbalDimensions,
  liftVectors,
  rotorMoments,
  rotationalKineticEnergy,
  spinAngularMomentum,
  steadyPrecessionRate,
  torqueVector,
  type GyroParameters,
  type GyroMode,
  type LiftPulse,
} from '../equations/gimbalGyroscope';
import type { Vector3Tuple } from '../../types/vector';

const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const identity = { x: 0, y: 0, z: 0, w: 1 };
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const ZERO: Vector3Tuple = [0, 0, 0];
const AZIMUTH_SAMPLES = 81;

interface InertialBody {
  body: RAPIER.RigidBody;
  inertia: Vector3;
  principalAxis: Vector3;
}

export class GimbalGyroscope {
  readonly rotor: RAPIER.RigidBody;
  readonly outer: RAPIER.RigidBody;
  readonly middle: RAPIER.RigidBody | null;
  readonly inner: RAPIER.RigidBody | null;
  readonly pivot: Vector3Tuple;
  readonly timeStep: number;
  private readonly pulseSteps: number;
  private readonly precessionSampleSteps: number;
  private steps = 0;
  private pulseStart = -Infinity;
  private pulseId = 0;
  private lift: ReturnType<typeof liftVectors> | null = null;
  private externalTorque: Vector3Tuple = ZERO;
  private pulseInitial: Vector3Tuple = ZERO;
  private readonly pulseAxis = new Vector3(1, 0, 0);
  private readonly impulse = new Vector3();
  private readonly total = new Vector3();
  private readonly offset = new Vector3();
  private readonly linearMomentum = new Vector3();
  private readonly axis = new Vector3();
  private readonly rotorLocation = new Vector3();
  private readonly weight = new Vector3();
  private readonly bodyAxis = new Vector3();
  private readonly angularPrediction = new Vector3();
  private readonly freePrediction = new Vector3();
  private readonly nextBodyAxis = new Vector3();
  private readonly predictionAxis = new Vector3();
  private readonly applied = new Vector3();
  private readonly angularImpulse = new Vector3();
  private readonly bearingTorque = new Vector3();
  private heat = 0;
  private readonly azimuth: { step: number; angle: number }[] = [];
  private readonly trail: Vector3Tuple[] = [];
  private lastAzimuth: number | null = null;
  private unwrappedAzimuth = 0;
  private readonly pivotLever: number;
  private pulseResult: { tilt: number; swerve: number; change: number } | null =
    null;
  private frameAngle = 0;
  private readonly bodies: InertialBody[];
  private readonly inertia: Vector3;
  private readonly pose = new Quaternion();
  private readonly inverse = new Quaternion();
  private readonly omega = new Vector3();
  private readonly momentum = new Vector3();
  private readonly inertial = new Vector3();

  constructor(
    private world: RAPIER.World,
    readonly parameters: GyroParameters,
    readonly mode: GyroMode = 'free',
  ) {
    this.timeStep = gyroscopeTimeStep(parameters, mode);
    this.pulseSteps = Math.round(1 / this.timeStep);
    this.precessionSampleSteps = Math.round(0.025 / this.timeStep);
    const { mass, radius, spin } = parameters;
    const { height, inner, middle, lever } = gimbalDimensions(radius, mode);
    this.pivot = [0, height, 0];
    this.pivotLever = lever;
    const { axial, transverse } = rotorMoments(parameters, mode);
    this.inertia = new Vector3(axial, transverse, transverse);
    this.rotor = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, height, 0)
        .setGravityScale(0)
        .setCanSleep(false)
        .setAngvel(v(spin))
        .setAdditionalMassProperties(
          mass,
          v(),
          v(axial, transverse, transverse),
          identity,
        ),
    );
    this.rotor.recomputeMassPropertiesFromColliders();
    this.outer = world.createRigidBody(
      (mode === 'free'
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.fixed()
      ).setTranslation(0, height, 0),
    );
    if (mode !== 'free') {
      this.middle = null;
      this.inner = null;
      world.createImpulseJoint(
        RAPIER.JointData.spherical(v(), v()),
        this.outer,
        this.rotor,
        true,
      );
      this.bodies = [
        { body: this.rotor, inertia: this.inertia, principalAxis: X },
      ];
      return;
    }
    const middleInertia = this.createRing(height, mass * 0.04, middle, 'x');
    const innerInertia = this.createRing(height, mass * 0.03, inner, 'y');
    this.middle = middleInertia.body;
    this.inner = innerInertia.body;
    world.createImpulseJoint(
      RAPIER.JointData.revolute(v(), v(), v(0, 1)),
      this.outer,
      this.middle,
      true,
    );
    world.createImpulseJoint(
      RAPIER.JointData.revolute(v(), v(), v(0, 0, 1)),
      this.middle,
      this.inner,
      true,
    );
    world.createImpulseJoint(
      RAPIER.JointData.revolute(v(), v(), v(1)),
      this.inner,
      this.rotor,
      true,
    );
    this.bodies = [
      { body: this.rotor, inertia: this.inertia, principalAxis: X },
      middleInertia,
      innerInertia,
    ];
  }

  private createRing(
    height: number,
    mass: number,
    radius: number,
    normal: 'x' | 'y',
  ): InertialBody {
    const axial = mass * radius ** 2;
    const transverse = axial / 2;
    const inertia = new Vector3(
      normal === 'x' ? axial : transverse,
      normal === 'y' ? axial : transverse,
      transverse,
    );
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, height, 0)
        .setCanSleep(false)
        .setAdditionalMassProperties(mass, v(), inertia, identity),
    );
    body.recomputeMassPropertiesFromColliders();
    return { body, inertia, principalAxis: normal === 'x' ? X : Y };
  }

  private addGyroscopicTorque(
    { body, inertia, principalAxis }: InertialBody,
    external: Vector3,
  ) {
    this.omega.copy(body.angvel());
    this.bodyAxis
      .copy(principalAxis)
      .applyQuaternion(this.pose.copy(body.rotation()));
    const axial = inertia.dot(principalAxis);
    const transverse = inertia.z;
    const inverseDifference = 1 / axial - 1 / transverse;
    this.freePrediction
      .copy(this.omega)
      .addScaledVector(external, this.timeStep / transverse)
      .addScaledVector(
        this.bodyAxis,
        this.timeStep * external.dot(this.bodyAxis) * inverseDifference,
      );
    this.angularPrediction.copy(this.freePrediction);
    // Rapier integrates applied torque against the current inertia tensor.
    // Account for the tensor's own rotation over the same step. For a
    // symmetric body, the inertial impulse is -(I_next - I_now) ω_next.
    // Iterating the semi-implicit prediction avoids the energy drift of an
    // explicit Euler correction when the rotor spins rapidly.
    for (let iteration = 0; iteration < 6; iteration++) {
      // Rapier applies torque in substeps, so use the angular velocity
      // near the middle of the step to predict the new axis orientation.
      this.predictionAxis
        .copy(this.omega)
        .lerp(
          this.angularPrediction,
          0.5 + 0.5 / this.world.numSolverIterations,
        );
      const sweep = this.predictionAxis.length() * this.timeStep;
      this.predictionAxis.normalize();
      this.nextBodyAxis
        .copy(this.bodyAxis)
        .applyAxisAngle(this.predictionAxis, sweep);
      this.angularImpulse
        .copy(this.nextBodyAxis)
        .multiplyScalar(this.nextBodyAxis.dot(this.angularPrediction))
        .addScaledVector(
          this.bodyAxis,
          -this.bodyAxis.dot(this.angularPrediction),
        )
        .multiplyScalar(-(axial - transverse));
      this.angularPrediction
        .copy(this.freePrediction)
        .addScaledVector(this.angularImpulse, 1 / transverse)
        .addScaledVector(
          this.bodyAxis,
          this.angularImpulse.dot(this.bodyAxis) * inverseDifference,
        );
    }
    body.resetTorques(false);
    body.addTorque(this.angularImpulse.multiplyScalar(1 / this.timeStep), true);
  }

  private measureBodyMomentum(body: RAPIER.RigidBody, inertia: Vector3) {
    this.pose.copy(body.rotation());
    this.inverse.copy(this.pose).invert();
    this.omega.copy(body.angvel());
    return this.momentum
      .copy(this.omega)
      .applyQuaternion(this.inverse)
      .multiply(inertia)
      .applyQuaternion(this.pose);
  }

  private diskCenter() {
    this.rotorLocation.copy(this.rotor.translation());
    if (this.mode !== 'free') {
      this.bodyAxis
        .copy(X)
        .applyQuaternion(this.pose.copy(this.rotor.rotation()));
      this.rotorLocation.addScaledVector(this.bodyAxis, this.pivotLever);
    }
    return this.rotorLocation;
  }

  private getTotalMomentum() {
    this.total.set(0, 0, 0);
    for (const { body, inertia } of this.bodies) {
      this.total.add(this.measureBodyMomentum(body, inertia));
      this.offset.copy(body.worldCom()).sub(this.inertial.set(...this.pivot));
      this.linearMomentum.copy(body.linvel()).multiplyScalar(body.mass());
      this.total.add(this.offset.cross(this.linearMomentum));
    }
    return this.total;
  }

  private angleReadings(axis: Vector3) {
    return {
      tilt: (Math.atan2(axis.y, Math.hypot(axis.x, axis.z)) * 180) / Math.PI,
      swerve: (Math.atan2(axis.z, axis.x) * 180) / Math.PI,
      change: (Math.atan2(Math.hypot(axis.y, axis.z), axis.x) * 180) / Math.PI,
    };
  }

  private samplePrecession() {
    const axis = this.axis
      .copy(X)
      .applyQuaternion(this.pose.copy(this.rotor.rotation()));
    const tip = this.offset
      .copy(axis)
      .multiplyScalar(this.pivotLever + this.parameters.radius * 0.35)
      .add(this.inertial.set(...this.pivot));
    this.trail.push(tip.toArray());
    if (this.trail.length > 200) this.trail.shift();
    if (Math.hypot(axis.x, axis.z) < 0.2) {
      this.azimuth.length = 0;
      this.lastAzimuth = null;
      return;
    }
    const angle = Math.atan2(-axis.z, axis.x);
    if (this.lastAzimuth !== null) {
      const difference = angle - this.lastAzimuth;
      this.unwrappedAzimuth += Math.atan2(
        Math.sin(difference),
        Math.cos(difference),
      );
    }
    this.lastAzimuth = angle;
    this.azimuth.push({ step: this.steps, angle: this.unwrappedAzimuth });
    if (this.azimuth.length > AZIMUTH_SAMPLES) this.azimuth.shift();
  }

  private observedPrecession() {
    const first = this.azimuth[0];
    const last = this.azimuth.at(-1);
    if (!first || !last) return null;
    const duration = (last.step - first.step) * this.timeStep;
    return duration >= 0.45 ? (last.angle - first.angle) / duration : null;
  }

  private measureBearingDrag() {
    const coefficient = this.parameters.friction;
    this.bearingTorque.set(0, 0, 0);
    if (coefficient === 0) return;
    this.axis.copy(X).applyQuaternion(this.pose.copy(this.rotor.rotation()));
    this.omega.copy(this.rotor.angvel());
    if (this.inner) this.omega.sub(this.offset.copy(this.inner.angvel()));
    const spin = this.omega.dot(this.axis);
    this.bearingTorque.copy(this.axis).multiplyScalar(-coefficient * spin);
    this.heat += coefficient * spin ** 2 * this.timeStep;
  }

  beforeStep(frameTarget = 0, pulse: LiftPulse | null = null) {
    const maxTurn = (this.timeStep * Math.PI) / 3;
    this.frameAngle += Math.max(
      -maxTurn,
      Math.min(maxTurn, frameTarget - this.frameAngle),
    );
    if (this.mode === 'free')
      this.outer.setNextKinematicRotation(
        this.pose.setFromAxisAngle(Y, this.frameAngle),
      );
    if (this.mode === 'torque' && pulse && pulse.id !== this.pulseId) {
      this.pulseId = pulse.id;
      this.pulseStart = this.steps;
      this.lift = liftVectors(pulse);
      this.pulseInitial = this.getTotalMomentum().toArray();
      this.pulseAxis
        .copy(X)
        .applyQuaternion(this.pose.copy(this.rotor.rotation()));
      this.impulse.set(0, 0, 0);
      this.pulseResult = null;
    }
    const pulseActive = this.steps - this.pulseStart < this.pulseSteps;
    this.externalTorque = pulseActive && this.lift ? this.lift.torque : ZERO;
    this.measureBearingDrag();
    const rotorTorque = this.applied
      .set(...this.externalTorque)
      .add(this.bearingTorque);
    if (this.mode === 'gravity') {
      this.weight.copy(this.world.gravity).multiplyScalar(this.rotor.mass());
      rotorTorque.add(
        this.offset
          .copy(this.diskCenter())
          .sub(this.rotor.translation())
          .cross(this.weight),
      );
    }
    for (const body of this.bodies) {
      const external =
        body.body === this.rotor
          ? rotorTorque
          : this.inertial
              .copy(this.bearingTorque)
              .multiplyScalar(body.body === this.inner ? -1 : 0);
      this.addGyroscopicTorque(body, external);
    }
    // An ideal applicator supplies a force couple about the fixed lab axis.
    // The two forces cancel in translation, leaving r × F on the rotor.
    this.rotor.addTorque(v(...this.externalTorque), true);
    this.rotor.addTorque(this.bearingTorque, true);
    this.inner?.addTorque(
      this.inertial.copy(this.bearingTorque).negate(),
      true,
    );
    if (this.mode === 'gravity') {
      this.rotor.resetForces(false);
      // Apply the rotor's actual weight at the offset disk center. The
      // spherical bearing supplies the reaction force at the pivot.
      this.rotor.addForceAtPoint(this.weight, this.diskCenter(), true);
    }
    if (pulseActive)
      this.impulse.addScaledVector(
        this.offset.set(...this.externalTorque),
        this.timeStep,
      );
    if (this.pulseId)
      this.impulse.addScaledVector(this.bearingTorque, this.timeStep);
  }

  afterStep() {
    this.steps++;
    if (this.steps - this.pulseStart === this.pulseSteps) {
      const axis = this.axis
        .copy(X)
        .applyQuaternion(this.pose.copy(this.rotor.rotation()));
      this.pulseResult = {
        ...this.angleReadings(axis),
        change: (axis.angleTo(this.pulseAxis) * 180) / Math.PI,
      };
    }
    if (
      this.mode === 'gravity' &&
      this.steps % this.precessionSampleSteps === 0
    )
      this.samplePrecession();
  }

  measure(includeTrail = false) {
    this.pose.copy(this.rotor.rotation());
    const axis = this.axis.copy(X).applyQuaternion(this.pose);
    const spin = axis.dot(this.omega.copy(this.rotor.angvel()));
    const inertia = this.inertia.x;
    const spinMomentum = spinAngularMomentum(inertia, spin);
    const angles = this.angleReadings(axis);
    const rotorCenter = this.diskCenter().toArray();
    const gravityForce =
      this.mode === 'gravity'
        ? this.linearMomentum
            .copy(this.world.gravity)
            .multiplyScalar(this.rotor.mass())
            .toArray()
        : ZERO;
    const gravityLever = this.offset
      .set(...rotorCenter)
      .sub(this.inertial.set(...this.pivot))
      .toArray();
    const gravityTorque = torqueVector(gravityLever, gravityForce);
    const pulseActive = this.steps - this.pulseStart < this.pulseSteps;
    const gravity = this.mode === 'gravity' ? -this.world.gravity.y : 0;
    const estimatedRate = steadyPrecessionRate(
      this.rotor.mass() * gravity * this.pivotLever,
      spinMomentum,
    );
    // The fast-spin estimate assumes transverse angular momentum is small.
    const pivotInertia = this.inertia.y;
    const estimateValid =
      this.mode === 'gravity' &&
      estimatedRate !== null &&
      Math.abs(axis.y) < 0.8 &&
      estimatedRate * pivotInertia < 0.16 * Math.abs(spinMomentum);
    const total = this.getTotalMomentum();
    const error = this.offset
      .copy(total)
      .sub(this.inertial.set(...this.pulseInitial))
      .sub(this.impulse)
      .length();
    return {
      time: this.steps * this.timeStep,
      spin,
      axis: axis.toArray(),
      axisDrift: angles.change,
      tilt: angles.tilt,
      swerve: angles.swerve,
      frameAngle: (this.frameAngle * 180) / Math.PI,
      torque:
        this.mode === 'gravity'
          ? gravityTorque
          : pulseActive
            ? this.externalTorque
            : ZERO,
      lever: this.lift?.r ?? ZERO,
      force: this.lift?.F ?? ZERO,
      gravityForce,
      gravityLever,
      gravity,
      precession: this.observedPrecession(),
      estimatedPrecession: estimateValid ? estimatedRate : null,
      axisTrail: includeTrail ? this.trail.slice() : [],
      bearingTorque: this.bearingTorque.toArray(),
      heat: this.heat,
      pulseActive,
      pulseCount: this.pulseId,
      pulseResult: this.pulseResult,
      initialMomentum: this.pulseInitial,
      totalMomentum: total.toArray(),
      impulse: this.impulse.toArray(),
      momentumError: error,
      rotorCenter,
      inertia,
      spinMomentum,
      energy: rotationalKineticEnergy(inertia, spin),
    };
  }

  dispose() {
    for (const body of [this.rotor, this.inner, this.middle, this.outer]) {
      if (body && this.world.getRigidBody(body.handle) === body)
        this.world.removeRigidBody(body);
    }
  }
}

export type GyroReading = ReturnType<GimbalGyroscope['measure']>;
