import { GameState } from '@/lib/types/game';
import { BoardState, Vertex } from '@/lib/types/board';
import { TerrainType } from '@/core/rules/board-constants';
import { getCanonicalVertexId } from '@/lib/hex';

/**
 * Helper function to get all vertex IDs for a hex
 */
function getVertexIdsForHex(hexId: string): string[] {
  const [q, r] = hexId.split(',').map(Number);
  if (Number.isNaN(q) || Number.isNaN(r)) return [];
  return Array.from({ length: 6 }, (_, d) => getCanonicalVertexId(q, r, d));
}

/**
 * Utility functions for scanning and querying the game board
 */

/**
 * Check if a hex has an adjacent building owned by the specified player
 */
export function hasAdjacentBuilding(
  state: GameState,
  hexId: string,
  playerId: string
): boolean {
  const adjacentVertices = getVertexIdsForHex(hexId);

  return adjacentVertices.some((vertexId) => {
    const vertex = state.board.vertices[vertexId];
    return vertex?.owner === playerId && vertex.structure !== null;
  });
}

/**
 * Get all hexes of a specific terrain type
 */
export function getHexesByTerrain(board: BoardState, terrain: TerrainType) {
  return Object.values(board.hexes).filter((hex: any) => hex.terrain === terrain);
}

/**
 * Get all hexes that have an adjacent building owned by the specified player
 */
export function getHexesWithAdjacentBuildings(
  state: GameState,
  playerId: string,
  terrain?: TerrainType
) {
  const hexes = terrain
    ? getHexesByTerrain(state.board, terrain)
    : Object.values(state.board.hexes);

  return hexes.filter((hex: any) => hasAdjacentBuilding(state, hex.id, playerId));
}

/**
 * Get all vertices owned by a player
 */
export function getPlayerVertices(state: GameState, playerId: string): Vertex[] {
  return Object.values(state.board.vertices).filter(
    (vertex) => vertex?.owner === playerId && vertex.structure !== null
  );
}

/**
 * Get all settlements owned by a player
 */
export function getPlayerSettlements(state: GameState, playerId: string): Vertex[] {
  return Object.values(state.board.vertices).filter(
    (vertex) => vertex?.owner === playerId && vertex.structure === 'settlement'
  );
}

/**
 * Get all cities owned by a player
 */
export function getPlayerCities(state: GameState, playerId: string): Vertex[] {
  return Object.values(state.board.vertices).filter(
    (vertex) => vertex?.owner === playerId && vertex.structure === 'city'
  );
}

/**
 * Count settlements owned by a player
 */
export function countSettlements(state: GameState, playerId: string): number {
  return getPlayerSettlements(state, playerId).length;
}

/**
 * Count cities owned by a player
 */
export function countCities(state: GameState, playerId: string): number {
  return getPlayerCities(state, playerId).length;
}

/**
 * Get all cities with a specific improvement level
 * TODO: Implement when city improvement tracking is clarified
 */
export function getCitiesWithImprovement(
  state: GameState,
  playerId: string,
  improvementLevel: number
): Vertex[] {
  return getPlayerCities(state, playerId);
}

/**
 * Count total city improvement levels for a player
 * TODO: Implement when city improvement tracking is clarified
 */
export function getTotalImprovementLevels(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player?.improvements) return 0;

  return Object.values(player.improvements).reduce((total, level) => total + level, 0);
}

/**
 * Get all edges (roads) owned by a player
 */
export function getPlayerRoads(state: GameState, playerId: string) {
  return Object.values(state.board.edges).filter((edge) => edge?.owner === playerId);
}

/**
 * Count roads owned by a player
 */
export function countRoads(state: GameState, playerId: string): number {
  return getPlayerRoads(state, playerId).length;
}

/**
 * Get all knights owned by a player
 */
export function getPlayerKnights(state: GameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  return player?.knights || [];
}

/**
 * Count active knights owned by a player
 */
export function countActiveKnights(state: GameState, playerId: string): number {
  return getPlayerKnights(state, playerId).filter((knight) => knight.active).length;
}

/**
 * Count inactive knights owned by a player
 */
export function countInactiveKnights(state: GameState, playerId: string): number {
  return getPlayerKnights(state, playerId).filter((knight) => !knight.active).length;
}

/**
 * Get knights of a specific level owned by a player
 */
export function getKnightsByLevel(
  state: GameState,
  playerId: string,
  level: 'basic' | 'strong' | 'mighty'
) {
  return getPlayerKnights(state, playerId).filter((knight) => knight.level === level);
}
