import {
  Bone,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  type Material,
} from 'three';
import { DANCER } from '../../physics/equations/angularMomentum';

type Section = readonly [
  y: number,
  width: number,
  depth: number,
  centerZ?: number,
];
type Point = readonly [number, number, number];

/** Welded rings give the sculpture continuous normals instead of separate primitive joints. */
function surface(
  rows: number,
  columns: number,
  point: (u: number, v: number) => Point,
  reverse = false,
) {
  const positions: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= columns; j++)
      positions.push(...point(i / rows, (j / columns) * Math.PI * 2));
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j,
        b = a + 1,
        c = a + columns + 1,
        d = c + 1;
      indices.push(...(reverse ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Average the duplicated UV seam; it must not show as a hard line in ivory material.
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i <= rows; i++) {
    const a = i * (columns + 1),
      b = a + columns;
    const n = new Vector3()
      .fromBufferAttribute(normals, a)
      .add(new Vector3().fromBufferAttribute(normals, b))
      .normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

function sampleSections(sections: readonly Section[]) {
  const radii = new CatmullRomCurve3(
    sections.map((p) => new Vector3(p[1], p[0], p[2])),
    false,
    'centripetal',
  );
  const offsets = new CatmullRomCurve3(
    sections.map((p) => new Vector3(0, p[0], p[3] ?? 0)),
    false,
    'centripetal',
  );
  return (u: number) => ({
    profile: radii.getPoint(u),
    offset: offsets.getPoint(u).z,
  });
}
const BODY_SECTIONS: readonly Section[] = [
  [-0.12, 0.095, 0.069],
  [-0.07, 0.14, 0.084],
  [0, 0.117, 0.074],
  [0.08, 0.088, 0.059],
  [0.15, 0.091, 0.061],
  [0.23, 0.12, 0.077],
  [0.3, 0.142, 0.086, 0.006],
  [0.37, 0.15, 0.075],
  [0.415, 0.166, 0.063, -0.005],
  [0.445, 0.123, 0.052, -0.006],
  [0.476, 0.044, 0.039],
  [0.52, 0.034, 0.034, 0.001],
  [0.552, 0.038, 0.036, 0.005],
];
function bodySurface(
  p: Vector3,
  offset: number,
  theta: number,
  padding = 0,
): Point {
  const chest = Math.exp(-(((p.y - 0.3) / 0.055) ** 2)) * 0.008;
  return [
    (p.x + padding) * Math.cos(theta),
    p.y,
    (p.z + padding) * Math.sin(theta) +
      offset +
      chest * Math.max(0, Math.sin(theta)) ** 4,
  ];
}
export function bodyGeometry() {
  const sample = sampleSections(BODY_SECTIONS);
  const rows = Array.from({ length: 101 }, (_, i) => sample(i / 100));
  return surface(100, 64, (u, theta) => {
    const { profile, offset } = rows[Math.round(u * 100)];
    return bodySurface(profile, offset, theta);
  });
}
export function bodiceGeometry() {
  const sample = sampleSections(BODY_SECTIONS);
  const table = Array.from({ length: 257 }, (_, i) => sample(i / 256));
  return surface(70, 64, (u, theta) => {
    const front = Math.max(0, Math.sin(theta));
    const neckline =
      u ** 12 *
      (0.075 * front ** 6 + 0.05 * Math.max(0, -Math.sin(theta)) ** 4);
    const y = -0.105 + u * 0.54 - neckline;
    // A baked profile preserves the fitted surface without per-vertex spline searches.
    let low = 0,
      high = table.length - 1;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (table[mid].profile.y < y) low = mid;
      else high = mid;
    }
    const t =
      (y - table[low].profile.y) /
      (table[high].profile.y - table[low].profile.y);
    const profile = table[low].profile.clone().lerp(table[high].profile, t);
    const offset =
      table[low].offset + (table[high].offset - table[low].offset) * t;
    return bodySurface(profile, offset, theta, 0.0025);
  });
}
export function headGeometry() {
  const sample = sampleSections([
    [0.525, 0.014, 0.02, 0.023],
    [0.548, 0.035, 0.034, 0.021],
    [0.575, 0.058, 0.046, 0.015],
    [0.62, 0.076, 0.06, 0.005],
    [0.672, 0.08, 0.073, -0.003],
    [0.72, 0.067, 0.067, -0.01],
    [0.753, 0.041, 0.044, -0.009],
    [0.765, 0.001, 0.001, -0.008],
  ]);
  const rows = Array.from({ length: 81 }, (_, i) => sample(i / 80));
  return surface(80, 64, (u, theta) => {
    const { profile: p, offset } = rows[Math.round(u * 80)];
    const front = Math.max(0, Math.sin(theta)) ** 34;
    const nose = 0.02 * Math.exp(-(((p.y - 0.624) / 0.021) ** 2)) * front;
    const mouth =
      0.004 *
      Math.exp(-(((p.y - 0.588) / 0.008) ** 2)) *
      Math.max(0, Math.sin(theta)) ** 18;
    return [
      p.x * Math.cos(theta),
      p.y,
      p.z * Math.sin(theta) + offset + nose + mouth,
    ];
  });
}
export function hairGeometry() {
  return surface(
    35,
    64,
    (u, theta) => {
      const front = (Math.sin(theta) + 1) / 2;
      const polar = u * (2.0 - 0.52 * front);
      const groove = 1 + 0.008 * Math.cos(theta * 22 + polar * 3);
      return [
        0.082 * Math.sin(polar) * Math.cos(theta) * groove,
        0.665 + 0.104 * Math.cos(polar),
        -0.014 + 0.077 * Math.sin(polar) * Math.sin(theta) * groove,
      ];
    },
    true,
  );
}
export function tutuGeometry(layer: number) {
  return surface(
    30,
    192,
    (u, theta) => {
      const radius = 0.112 + u * (0.295 - layer * 0.014);
      const flare = Math.sin((u * Math.PI) / 2);
      const ripple = 0.016 * Math.cos(theta * 32 + u * 0.5) * u ** 1.7;
      const rim = 0.008 * Math.sin(theta * 7) * u ** 4;
      return [
        radius * Math.cos(theta),
        -0.049 - 0.165 * flare - layer * 0.009 + ripple + rim,
        radius * Math.sin(theta),
      ];
    },
    true,
  );
}

/** An oval, tapered sweep follows a curved anatomical centerline. */
export function limbGeometry(
  points: readonly Point[],
  widths: readonly number[],
  depths: readonly number[],
  rows = 70,
) {
  const path = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    false,
    'centripetal',
  );
  const radii = new CatmullRomCurve3(
    widths.map((w, i) => new Vector3(w, depths[i], i)),
    false,
    'centripetal',
  );
  const frames = path.computeFrenetFrames(rows, false);
  const samples = Array.from({ length: rows + 1 }, (_, i) => ({
    center: path.getPointAt(i / rows),
    radius: radii.getPoint(i / rows),
  }));
  return surface(
    rows,
    24,
    (u, theta) => {
      const i = Math.round(u * rows),
        center = samples[i].center,
        r = samples[i].radius;
      const n = frames.normals[i],
        b = frames.binormals[i];
      return [
        center.x + n.x * r.x * Math.cos(theta) + b.x * r.y * Math.sin(theta),
        center.y + n.y * r.x * Math.cos(theta) + b.y * r.y * Math.sin(theta),
        center.z + n.z * r.x * Math.cos(theta) + b.z * r.y * Math.sin(theta),
      ];
    },
    true,
  );
}

export function armSculpture(side: number, material: Material) {
  const a = DANCER.upperLength,
    length = a + DANCER.foreLength;
  const shoulderX = side * DANCER.shoulderRadius;
  // Fine anatomical profile: shoulder, biceps, elbow, forearm, wrist. Hands are separate.
  const profile = new CatmullRomCurve3(
    [
      new Vector3(0.027, 0.024, -0.045),
      new Vector3(0.042, 0.032, 0.04),
      new Vector3(0.033, 0.026, 0.16),
      new Vector3(0.026, 0.024, a),
      new Vector3(0.031, 0.024, a + 0.07),
      new Vector3(0.02, 0.017, length - 0.13),
      new Vector3(0.014, 0.012, length - 0.08),
    ],
    false,
    'centripetal',
  );
  const samples = Array.from({ length: 101 }, (_, i) =>
    profile.getPoint(i / 100),
  );
  const geometry = surface(
    100,
    32,
    (u, theta) => {
      const p = samples[Math.round(u * 100)],
        s = p.z;
      const curve = -0.009 * Math.sin(Math.PI * Math.min(1, s / a));
      return [
        shoulderX + side * s,
        DANCER.shoulderHeight + p.x * Math.cos(theta) + curve,
        p.y * Math.sin(theta),
      ];
    },
    side > 0,
  );
  const positions = geometry.getAttribute('position');
  const indices: number[] = [],
    weights: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const s = side * (positions.getX(i) - shoulderX);
    const u = Math.max(0, Math.min(1, (s - a + 0.035) / 0.07));
    const w = u * u * (3 - 2 * u);
    const shoulderBlend = Math.max(0, Math.min(1, (s + 0.035) / 0.09));
    const upperWeight = shoulderBlend * shoulderBlend * (3 - 2 * shoulderBlend);
    indices.push(0, 1, 2, 0);
    weights.push(1 - upperWeight, upperWeight * (1 - w), upperWeight * w, 0);
  }
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  const mesh = new SkinnedMesh(geometry, material);
  const root = new Bone(),
    upper = new Bone(),
    fore = new Bone();
  root.position.set(0, 1, 0);
  upper.position.set(shoulderX + (side * a) / 2, DANCER.shoulderHeight, 0);
  fore.position.set(
    shoulderX + side * (a + DANCER.foreLength / 2),
    DANCER.shoulderHeight,
    0,
  );
  mesh.add(root, upper, fore);
  mesh.updateMatrixWorld(true);
  const skeleton = new Skeleton([root, upper, fore]);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return {
    mesh,
    root,
    upper,
    fore,
    dispose: () => {
      geometry.dispose();
      skeleton.dispose();
    },
  };
}
