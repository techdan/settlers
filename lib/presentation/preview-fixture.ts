import { createHex, getCanonicalVertexId, getCanonicalEdgeId } from '@/lib/hex';
import { createTestGameState, createTestPlayer } from '@/lib/test-utils/test-helpers';
import type { BoardState } from '@/lib/types/board';
import type { TerrainType } from '@/core/rules/board-constants';

/** A repeatable local art/playground fixture; never persisted as a multiplayer game. */
export function createIslandPreview() {
  const board: BoardState = { hexes: [], vertices: {}, edges: {} };
  const terrain: TerrainType[] = ['mountain', 'forest', 'field', 'field', 'pasture', 'hill', 'forest', 'forest', 'hill', 'field', 'desert', 'pasture', 'mountain', 'pasture', 'hill', 'forest', 'mountain', 'field', 'pasture'];
  const numbers = [10, 6, 9, 6, 12, 5, 9, 11, 8, 4, 0, 11, 8, 10, 3, 5, 3, 4, 2];
  let index = 0;
  for (let r = -2; r <= 2; r++) {
    for (let q = Math.max(-2, -r - 2); q <= Math.min(2, -r + 2); q++) {
      board.hexes.push({ id: `${q},${r}`, hex: createHex(q, r), terrain: terrain[index], numberToken: numbers[index] || null });
      for (let d = 0; d < 6; d++) {
        const vertexId = getCanonicalVertexId(q, r, d);
        const edgeId = getCanonicalEdgeId(q, r, d);
        if (!board.vertices[vertexId]) board.vertices[vertexId] = { id: vertexId, q, r, d, owner: null, structure: null };
        if (!board.edges[edgeId]) board.edges[edgeId] = { id: edgeId, q, r, d, owner: null, structure: null };
      }
      index++;
    }
  }
  const players = [
    createTestPlayer({ id: 'you', name: 'You', color: '#ff0000', resources: { wood: 3, brick: 2, sheep: 4, wheat: 3, ore: 2 }, victoryPoints: 5 }),
    createTestPlayer({ id: 'rowan', name: 'Rowan', color: '#0000ff', victoryPoints: 4 }),
    createTestPlayer({ id: 'wren', name: 'Wren', color: '#ff7a00', victoryPoints: 3 }),
    createTestPlayer({ id: 'ellis', name: 'Ellis', color: '#d4b483', victoryPoints: 4 }),
  ];
  // Varied public status exercises the shared player cards in the art preview.
  players[0].improvements = { science: 3, trade: 2, politics: 1 };
  players[0].progressCards = ['alchemist', 'crane'];
  players[1].improvements = { science: 1, trade: 3, politics: 2 };
  players[1].resources = { wood: 2, brick: 1, sheep: 1, wheat: 2, ore: 1 };
  players[1].defenderVPTokens = 1;
  players[2].improvements = { science: 2, trade: 1, politics: 0 };
  players[2].resources = { wood: 1, brick: 0, sheep: 2, wheat: 1, ore: 0 };
  players[3].improvements = { science: 4, trade: 2, politics: 2 };
  players[3].metropolisOwned = ['science'];
  players[3].resources = { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 2 };
  const vertices = Object.values(board.vertices);
  [6, 18, 29, 42, 48, 35].forEach((i, j) => {
    const vertex = vertices[i];
    vertex.owner = players[j % 4].id;
    vertex.structure = j === 0 ? 'city' : j === 3 ? 'metropolis' : 'settlement';
    vertex.hasCityWall = j === 0;
  });
  Object.values(board.edges).forEach((edge, i) => {
    if ([8, 9, 10, 23, 24, 37, 38, 52, 53, 54].includes(i)) {
      edge.owner = players[Math.floor(i / 16) % 4].id;
      edge.structure = 'road';
    }
  });
  players[0].knights = [{ id: 'guard', playerId: 'you', vertexId: vertices[25].id, level: 'strong', active: true }];
  players[0].activeKnightCount = 2;
  for (const player of players) {
    player.citiesRemaining = 4 - vertices.filter(vertex => vertex.owner === player.id && (vertex.structure === 'city' || vertex.structure === 'metropolis')).length;
    player.settlementsRemaining = 5 - vertices.filter(vertex => vertex.owner === player.id && vertex.structure === 'settlement').length;
  }
  return createTestGameState({
    id: 'island-preview', roomId: 'preview', board, players, currentTurn: 'you',
    gameMode: 'cities_and_knights', phase: 'main_phase', barbarianPosition: 2,
    robberHexId: board.hexes.find(hex => hex.terrain === 'desert')!.id,
    merchantHexId: board.hexes[1].id, activeMerchant: 'you',
    metropolises: {
      science: { type: 'science', owner: 'ellis', vertexId: vertices[42].id },
      trade: { type: 'trade', owner: null, vertexId: null },
      politics: { type: 'politics', owner: null, vertexId: null },
    },
    diceRoll: { d1: 3, d2: 3, total: 6 }, eventDieRoll: { face: 'science', timestamp: 1 },
    logs: [{ id: 'arrival', timestamp: 1, message: 'A new island. A thousand possibilities.' }],
  });
}
