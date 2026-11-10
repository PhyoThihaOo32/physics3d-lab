import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';
/** Inspect solver impulses each physics step; frame-level collision events may be delayed. */
export function hasGroundContactImpulse(
  world: World,
  body: RigidBody,
  ground: Collider,
): boolean {
  let contact = false;
  world.contactPair(body.collider(0), ground, (manifold) => {
    for (let i = 0; i < manifold.numContacts(); i++)
      if (manifold.contactImpulse(i) > 0) contact = true;
  });
  return contact;
}
