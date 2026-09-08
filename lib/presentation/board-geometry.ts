import { generatePorts } from '@/core/engine/board/port-generator';
import { createHex, hexCornerToPixel, hexEdgeToPixel, hexToPixel } from '@/lib/hex';
import type { BoardHex, Edge, Vertex } from '@/lib/types/board';

export type GroundPoint = { x: number; z: number };
export type BoardBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export function tilePosition(tile: BoardHex): GroundPoint {
  const p = hexToPixel(tile.hex, 1);
  return { x: p.x, z: p.y };
}

export function vertexPosition(vertex: Vertex): GroundPoint {
  const p = hexCornerToPixel(createHex(vertex.q, vertex.r), vertex.d, 1);
  return { x: p.x, z: p.y };
}

export function edgePosition(edge: Edge): GroundPoint {
  const p = hexEdgeToPixel(createHex(edge.q, edge.r), edge.d, 1);
  return { x: p.x, z: p.y };
}

/** Keep the generator's fixed pixel harbor offset; normalize only after generation. */
export function boardPorts(hexSize: number) {
  const size = Number.isFinite(hexSize) && hexSize > 0 ? hexSize : 90;
  return generatePorts(size).map(port => ({
    ...port,
    position: { x: port.position.x / size, z: port.position.y / size },
    vertices: (port.vertices ?? []).map(p => ({ x: p.x / size, z: p.y / size })),
  }));
}

/** Same western sea approach as Classic, at world radius one. */
export function barbarianRoutePoints(ports: ReturnType<typeof boardPorts>): GroundPoint[] {
  return Array.from({ length: 8 }, (_, index) => {
    const t = index / 7;
    const u = 1 - t;
    let x = (u * u * -455 + 2 * u * t * -575 + t * t * -430) / 90;
    let z = (u * u * -345 + 2 * u * t * -135 + t * t * 75) / 90;
    for (const port of ports) {
      const distance = Math.hypot(x - port.position.x, z - port.position.z);
      if (distance < .7) {
        const length = Math.hypot(x, z) || 1;
        const push = .7 - distance + .08;
        x += x / length * push;
        z += z / length * push;
      }
    }
    return { x, z };
  });
}

export function boardBounds(tiles: BoardHex[], ports: ReturnType<typeof boardPorts>, route: GroundPoint[]): BoardBounds {
  const points = [
    ...tiles.flatMap(tile => {
      const p = tilePosition(tile);
      return [{ x: p.x - 1.08, z: p.z - 1.08 }, { x: p.x + 1.08, z: p.z + 1.08 }];
    }),
    ...ports.flatMap(port => [
      { x: port.position.x - .72, z: port.position.z - .72 },
      { x: port.position.x + .72, z: port.position.z + .72 },
    ]),
    ...route.flatMap(p => [{ x: p.x - .58, z: p.z - .58 }, { x: p.x + .58, z: p.z + .58 }]),
  ];
  if (!points.length) return { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
  return {
    minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)),
  };
}
