import { GameState } from '@/lib/types/game';
import { PlayerState } from '@/lib/types/player';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';

/**
 * Utility functions for transferring resources and commodities between players
 */

/**
 * Add resources to a player
 */
export function addResource(
  state: GameState,
  playerId: string,
  resource: ResourceType,
  amount: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  player.resources[resource] = (player.resources[resource] || 0) + amount;
  return state;
}

/**
 * Add commodity to a player
 */
export function addCommodity(
  state: GameState,
  playerId: string,
  commodity: CommodityType,
  amount: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  if (!player.commodities) {
    player.commodities = { paper: 0, cloth: 0, coin: 0 };
  }

  player.commodities[commodity] = (player.commodities[commodity] || 0) + amount;
  return state;
}

/**
 * Remove resources from a player
 */
export function removeResource(
  state: GameState,
  playerId: string,
  resource: ResourceType,
  amount: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const current = player.resources[resource] || 0;
  player.resources[resource] = Math.max(0, current - amount);
  return state;
}

/**
 * Remove commodity from a player
 */
export function removeCommodity(
  state: GameState,
  playerId: string,
  commodity: CommodityType,
  amount: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  if (!player.commodities) {
    player.commodities = { paper: 0, cloth: 0, coin: 0 };
  }

  const current = player.commodities[commodity] || 0;
  player.commodities[commodity] = Math.max(0, current - amount);
  return state;
}

/**
 * Steal a resource from an opponent and give it to the stealing player
 */
export function stealResource(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  resource: ResourceType,
  amount: number
): GameState {
  const fromPlayer = state.players.find((p) => p.id === fromPlayerId);
  const toPlayer = state.players.find((p) => p.id === toPlayerId);

  if (!fromPlayer || !toPlayer) return state;

  const available = fromPlayer.resources[resource] || 0;
  const actualAmount = Math.min(amount, available);

  if (actualAmount > 0) {
    fromPlayer.resources[resource] = available - actualAmount;
    toPlayer.resources[resource] = (toPlayer.resources[resource] || 0) + actualAmount;
  }

  return state;
}

/**
 * Steal a commodity from an opponent and give it to the stealing player
 */
export function stealCommodity(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  commodity: CommodityType,
  amount: number
): GameState {
  const fromPlayer = state.players.find((p) => p.id === fromPlayerId);
  const toPlayer = state.players.find((p) => p.id === toPlayerId);

  if (!fromPlayer || !toPlayer) return state;

  if (!fromPlayer.commodities) {
    fromPlayer.commodities = { paper: 0, cloth: 0, coin: 0 };
  }
  if (!toPlayer.commodities) {
    toPlayer.commodities = { paper: 0, cloth: 0, coin: 0 };
  }

  const available = fromPlayer.commodities[commodity] || 0;
  const actualAmount = Math.min(amount, available);

  if (actualAmount > 0) {
    fromPlayer.commodities[commodity] = available - actualAmount;
    toPlayer.commodities[commodity] = (toPlayer.commodities[commodity] || 0) + actualAmount;
  }

  return state;
}

/**
 * Get total resource count for a player
 */
export function getTotalResources(player: PlayerState): number {
  return Object.values(player.resources).reduce((sum, count) => sum + (count || 0), 0);
}

/**
 * Get total commodity count for a player
 */
export function getTotalCommodities(player: PlayerState): number {
  if (!player.commodities) return 0;
  return Object.values(player.commodities).reduce((sum, count) => sum + (count || 0), 0);
}

/**
 * Get total cards (resources + commodities) for a player
 */
export function getTotalCards(player: PlayerState): number {
  return getTotalResources(player) + getTotalCommodities(player);
}

/**
 * Check if player has enough resources
 */
export function hasResources(
  player: PlayerState,
  resources: Partial<Record<ResourceType, number>>
): boolean {
  return Object.entries(resources).every(
    ([resource, required]) =>
      (player.resources[resource as ResourceType] || 0) >= (required || 0)
  );
}

/**
 * Check if player has enough commodities
 */
export function hasCommodities(
  player: PlayerState,
  commodities: Partial<Record<CommodityType, number>>
): boolean {
  if (!player.commodities) return false;

  const playerCommodities = player.commodities;
  return Object.entries(commodities).every(
    ([commodity, required]) =>
      (playerCommodities[commodity as CommodityType] || 0) >= (required || 0)
  );
}
