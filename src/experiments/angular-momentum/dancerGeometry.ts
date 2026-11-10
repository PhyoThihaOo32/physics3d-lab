import {
  Bone,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
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
  [-0.07, 0.138, 0.084, -0.008],
  [0, 0.111, 0.071, -0.003],
  [0.08, 0.082, 0.057, 0.002],
  [0.15, 0.088, 0.059, 0.006],
  [0.23, 0.114, 0.075, 0.012],
  [0.3, 0.133, 0.08, 0.015],
  [0.37, 0.141, 0.072, 0.008],
  [0.415, 0.162, 0.061, 0],
  [0.445, 0.119, 0.049, 0],
  [0.476, 0.04, 0.036, 0.002],
  [0.52, 0.031, 0.032, 0.004],
  [0.552, 0.038, 0.036, 0.005],
];
function bodySurface(
  p: Vector3,
  offset: number,
  theta: number,
  padding = 0,
): Point {
  const x = (p.x + padding) * Math.cos(theta);
  const chest =
    Math.exp(-(((p.y - 0.3) / 0.055) ** 2)) *
    0.008 *
    (Math.exp(-(((x - 0.048) / 0.045) ** 2)) +
      Math.exp(-(((x + 0.048) / 0.045) ** 2)));
  return [
    x,
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
const HEAD_SECTIONS: readonly Section[] = [
  [0.526, 0.011, 0.018, 0.018],
  [0.548, 0.03, 0.03, 0.016],
  [0.58, 0.049, 0.04, 0.011],
  [0.617, 0.063, 0.051, 0.003],
  [0.661, 0.069, 0.062, -0.004],
  [0.704, 0.06, 0.06, -0.008],
  [0.735, 0.038, 0.041, -0.007],
  [0.75, 0.001, 0.001, -0.005],
];
function facialDepth(x: number, y: number, front: number) {
  const g = (value: number, center: number, width: number) =>
    Math.exp(-(((value - center) / width) ** 2));
  const nose =
    (0.016 * g(y, 0.609, 0.013) + 0.009 * g(y, 0.633, 0.024)) * g(x, 0, 0.009);
  const sockets = -0.0035 * g(Math.abs(x), 0.03, 0.014) * g(y, 0.644, 0.01);
  const cheeks = 0.003 * g(Math.abs(x), 0.04, 0.018) * g(y, 0.613, 0.02);
  const lips = 0.0025 * g(x, 0, 0.015) * g(y, 0.574, 0.006);
  return (nose + sockets + cheeks + lips) * front;
}
export function facePoint(x: number, y: number, lift = 0): Point {
  const sample = sampleSections(HEAD_SECTIONS);
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (sample(mid).profile.y < y) lo = mid;
    else hi = mid;
  }
  const { profile: p, offset } = sample((lo + hi) / 2);
  const front = Math.sqrt(Math.max(0, 1 - (x / p.x) ** 2));
  return [x, y, p.z * front + offset + facialDepth(x, y, front) + lift];
}
export function headGeometry() {
  const sample = sampleSections(HEAD_SECTIONS);
  const rows = Array.from({ length: 81 }, (_, i) => sample(i / 80));
  const geometry = surface(80, 64, (u, theta) => {
    const { profile: p, offset } = rows[Math.round(u * 80)];
    const x = p.x * Math.cos(theta),
      front = Math.max(0, Math.sin(theta));
    return [
      x,
      p.y,
      p.z * Math.sin(theta) + offset + facialDepth(x, p.y, front),
    ];
  });
  const position = geometry.getAttribute('position'),
    colors: number[] = [];
  const skin = new Color('#efcec2'),
    rose = new Color('#e2a69c');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const blush =
      0.16 *
      Math.exp(
        -(((Math.abs(x) - 0.041) / 0.02) ** 2) - ((y - 0.611) / 0.021) ** 2,
      ) *
      Math.max(0, Math.min(1, z / 0.05));
    const c = skin.clone().lerp(rose, blush);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}
export function hairGeometry() {
  return surface(
    35,
    64,
    (u, theta) => {
      const front = (Math.sin(theta) + 1) / 2,
        polar = u * (2.02 - 0.58 * front);
      const groove = 1 + 0.005 * Math.cos(theta * 28 + polar * 4);
      return [
        0.071 * Math.sin(polar) * Math.cos(theta) * groove,
        0.654 + 0.097 * Math.cos(polar),
        -0.009 + 0.066 * Math.sin(polar) * Math.sin(theta) * groove,
      ];
    },
    true,
  );
}
/** Broad, softly curled folds, with offset underlayers instead of a serrated paper hem. */
export function tutuGeometry(layer: number) {
  const rows = 40,
    columns = 192;
  const top = surface(
    rows,
    columns,
    (u, theta) => {
      const phase = theta * 12;
      const radius =
        0.108 + u * (0.262 - layer * 0.01) + 0.01 * Math.cos(phase) * u ** 2;
      const folds = 0.036 * Math.cos(phase + u * 0.35) * u ** 1.7;
      const curl = 0.022 * u ** 8 * (0.55 + 0.45 * Math.cos(phase));
      const drift = 0.009 * Math.sin(theta * 3 + 0.5) * u ** 2;
      return [
        radius * Math.cos(theta),
        -0.063 -
          0.123 * Math.sin((u * Math.PI) / 2) +
          folds +
          curl +
          drift -
          layer * 0.007,
        radius * Math.sin(theta),
      ];
    },
    true,
  );
  // A closed, softly rounded hem prevents the folds looking like intersecting paper sheets.
  const attr = top.getAttribute('position'),
    n = attr.count,
    positions: number[] = [],
    indices: number[] = [];
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < n; i++)
      positions.push(attr.getX(i), attr.getY(i) - side * 0.004, attr.getZ(i));
  const original = top.getIndex()!;
  for (let i = 0; i < original.count; i += 3) {
    const a = original.getX(i),
      b = original.getX(i + 1),
      c = original.getX(i + 2);
    indices.push(a, b, c, c + n, b + n, a + n);
  }
  for (const row of [0, rows])
    for (let j = 0; j < columns; j++) {
      const a = row * (columns + 1) + j,
        b = a + 1;
      indices.push(a, a + n, b, b, a + n, b + n);
    }
  top.dispose();
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
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
      new Vector3(0.035, 0.028, 0.04),
      new Vector3(0.028, 0.024, 0.16),
      new Vector3(0.023, 0.021, a),
      new Vector3(0.026, 0.021, a + 0.07),
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
    const u = Math.max(0, Math.min(1, (s - a + 0.055) / 0.11));
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
  mesh.receiveShadow = false;
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
