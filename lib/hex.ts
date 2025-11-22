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
