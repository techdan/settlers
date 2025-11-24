export interface Hex {
  q: number;
  r: number;
  s: number;
}

export const createHex = (q: number, r: number): Hex => ({ q, r, s: -q - r });

export const hexToPixel = (hex: Hex, size: number): { x: number; y: number } => {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * (3 / 2) * hex.r;
  return { x, y };
};

export const pixelToHex = (x: number, y: number, size: number): Hex => {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
};

const hexRound = (fracQ: number, fracR: number): Hex => {
  let q = Math.round(fracQ);
  let r = Math.round(fracR);
  let s = Math.round(-fracQ - fracR);
  const qDiff = Math.abs(q - fracQ);
  const rDiff = Math.abs(r - fracR);
  const sDiff = Math.abs(s - (-fracQ - fracR));

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }
  return { q, r, s };
};

export const hexEquals = (a: Hex, b: Hex) => a.q === b.q && a.r === b.r;

export const getNeighbors = (hex: Hex): Hex[] => {
  const directions = [
    createHex(1, 0), createHex(1, -1), createHex(0, -1),
    createHex(-1, 0), createHex(-1, 1), createHex(0, 1)
  ];
  return directions.map(d => createHex(hex.q + d.q, hex.r + d.r));
};

// Directions in counter-clockwise order starting from East (0 deg)
// 0: East (1, 0)
// 1: NE (1, -1)
// 2: NW (0, -1)
// 3: West (-1, 0)
// 4: SW (-1, 1)
// 5: SE (0, 1)
const DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export const getCanonicalVertexId = (q: number, r: number, d: number): string => {
  // Corner d is shared by:
  // 1. Current hex (q, r)
  // 2. Neighbor (6-d)%6 at Corner (d+2)%6
  // 3. Neighbor (6-d-1)%6 at Corner (d+4)%6

  const n1Dir = (6 - d) % 6;
  const n2Dir = (6 - d - 1 + 6) % 6; // Handle negative wrap

  const candidates = [
    { q, r, d },
    {
      q: q + DIRECTIONS[n1Dir].q,
      r: r + DIRECTIONS[n1Dir].r,
      d: (d + 2) % 6
    },
    {
      q: q + DIRECTIONS[n2Dir].q,
      r: r + DIRECTIONS[n2Dir].r,
      d: (d + 4) % 6
    }
  ];

  candidates.sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.d - b.d;
  });

  const c = candidates[0];
  return `${c.q},${c.r},${c.d}`;
};

export const getCanonicalEdgeId = (q: number, r: number, d: number): string => {
  // Edge d is shared by:
  // 1. Current hex (q, r)
  // 2. Neighbor (6-d)%6 at Edge (d+3)%6

  const nDir = (6 - d) % 6;

  const candidates = [
    { q, r, d },
    {
      q: q + DIRECTIONS[nDir].q,
      r: r + DIRECTIONS[nDir].r,
      d: (d + 3) % 6
    }
  ];

  candidates.sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.d - b.d;
  });

  const c = candidates[0];
  return `${c.q},${c.r},${c.d}`;
};

export const hexCornerToPixel = (hex: Hex, corner: number, size: number): { x: number; y: number } => {
  const center = hexToPixel(hex, size);
  const angle_deg = 30 + 60 * corner;
  const angle_rad = (Math.PI / 180) * angle_deg;
  return {
    x: center.x + size * Math.cos(angle_rad),
    y: center.y + size * Math.sin(angle_rad)
  };
};

export const hexEdgeToPixel = (hex: Hex, edge: number, size: number): { x: number; y: number } => {
  const center = hexToPixel(hex, size);
  const angle_deg = 0 + 60 * edge; // 0, 60, 120...
  const angle_rad = (Math.PI / 180) * angle_deg;
  const dist = size * (Math.sqrt(3) / 2); // Distance to edge midpoint
  return {
    x: center.x + dist * Math.cos(angle_rad),
    y: center.y + dist * Math.sin(angle_rad)
  };
};

export const getAdjacentVertexIds = (q: number, r: number, d: number): string[] => {
  // Neighbors of Corner d are:
  // 1. Corner (d-1)%6 (via Edge (d-1)%6? No, via Edge d? No.)
  //    Corner d is connected to Corner (d-1)%6 via Edge (d)%6? No.
  //    Edge 0 connects C5 and C0.
  //    Edge 1 connects C0 and C1.
  //    So C0 is connected to C5 (via E0) and C1 (via E1).
  //    C(d) is connected to C(d-1) via E(d) and C(d+1) via E(d+1).

  return [
    getCanonicalVertexId(q, r, (d - 1 + 6) % 6),
    getCanonicalVertexId(q, r, (d + 1) % 6),
    // The 3rd vertex is on the neighbor.
    // It connects via the 3rd edge.
    // The 3rd edge is Edge (d+1)%6 of Neighbor (6-d)%6.
    // That edge connects Neighbor Corner (d+1)%6 and Neighbor Corner (d+2)%6?
    // No, Edge k connects C(k-1) and C(k)? No.
    // Edge 0 connects C5 and C0.
    // Edge 1 connects C0 and C1.
    // So Edge k connects C(k-1) and C(k)? No.
    // Edge 1 connects C0 and C1.
    // Edge k connects C(k-1) and C(k).
    // So Edge (d+1) connects C(d) and C(d+1).

    // We want the vertex at the other end of the 3rd edge.
    // The 3rd edge is Edge (d+1)%6 of Neighbor (6-d)%6.
    // Let N = Neighbor (6-d)%6.
    // Edge k = (d+1)%6.
    // Edge k connects C(k-1) and C(k).
    // C(k-1) = C(d). This is the shared corner (H Corner d).
    // C(k) = C(d+1). This is the other vertex!
    // So we want Canonical Vertex ID of Neighbor (6-d)%6 at Corner (d+1)%6.

    getCanonicalVertexId(
      q + DIRECTIONS[(6 - d) % 6].q,
      r + DIRECTIONS[(6 - d) % 6].r,
      (d + 1) % 6
    )
  ];
};

export const getEdgeEndpoints = (q: number, r: number, d: number): string[] => {
  // Edge d connects Vertex (d+5)%6 and Vertex d
  // (Edge 0 connects C5 and C0)
  return [
    getCanonicalVertexId(q, r, (d + 5) % 6),
    getCanonicalVertexId(q, r, d)
  ];
};

export const getAdjacentEdgesForVertex = (q: number, r: number, d: number): string[] => {
  // 1. Edge d of H (connects C(d-1) and C(d)? No. Edge 0 connects C5 and C0. Edge 1 connects C0 and C1.)
  //    So C0 is touched by Edge 0 and Edge 1.
  //    C(d) is touched by Edge d and Edge (d+1)%6.

  const nDir = (6 - d) % 6;

  return [
    getCanonicalEdgeId(q, r, d),
    getCanonicalEdgeId(q, r, (d + 1) % 6),
    // 3rd edge: Edge (d+2)%6 of Neighbor (6-d)%6
    getCanonicalEdgeId(
      q + DIRECTIONS[nDir].q,
      r + DIRECTIONS[nDir].r,
      (d + 2) % 6
    )
  ];
};

export const getHexesForVertex = (q: number, r: number, d: number): Hex[] => {
  // Vertex d touches:
  // 1. Current Hex
  // 2. Neighbor (6-d)%6
  // 3. Neighbor (6-d-1)%6

  const n1Dir = (6 - d) % 6;
  const n2Dir = (6 - d - 1 + 6) % 6;

  const h1 = createHex(q, r);
  const n1 = createHex(q + DIRECTIONS[n1Dir].q, r + DIRECTIONS[n1Dir].r);
  const n2 = createHex(q + DIRECTIONS[n2Dir].q, r + DIRECTIONS[n2Dir].r);

  return [h1, n1, n2];
};
