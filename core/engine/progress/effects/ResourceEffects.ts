import { GameState } from '@/lib/types/game';
import {
  AddResourcePerHexEffect,
  AddResourcePerBuildingEffect,
  AddCommodityPerCityEffect,
  StealFromOpponentsEffect,
} from '../types/CardEffect';
import {
  addResource,
  addCommodity,
  stealResource,
} from '../utilities/ResourceTransfer';
import {
  getHexesWithAdjacentBuildings,
  countSettlements,
  countCities,
  getPlayerCities,
} from '../utilities/BoardScanning';
import { addLog, getOpponents } from '../utilities/StateManagement';

/**
 * Effect executors for resource and commodity-related card effects
 */

/**
 * Execute: Add resources based on hex terrain and adjacent buildings
 * Used by cards like Irrigation (wheat from fields), Mining (ore from mountains)
 */
export function executeAddResourcePerHex(
  state: GameState,
  playerId: string,
  effect: AddResourcePerHexEffect
): GameState {
  const hexes = getHexesWithAdjacentBuildings(state, playerId, effect.hexTerrain);

  let totalAdded = 0;
  for (const hex of hexes) {
    addResource(state, playerId, effect.resource, 1);
    totalAdded++;
  }

  if (totalAdded > 0) {
    addLog(
      state,
      `received ${totalAdded} ${effect.resource} from ${effect.hexTerrain} hexes`,
      playerId
    );
  }

  return state;
}

/**
 * Execute: Add resources based on building count
 * Used by cards like Merchant (adds resources per settlement/city)
 */
export function executeAddResourcePerBuilding(
  state: GameState,
  playerId: string,
  effect: AddResourcePerBuildingEffect
): GameState {
  const buildingCount =
    effect.buildingType === 'settlement'
      ? countSettlements(state, playerId)
      : countCities(state, playerId);

  const totalToAdd = buildingCount * effect.count;

  if (totalToAdd > 0) {
    addResource(state, playerId, effect.resource, totalToAdd);
    addLog(
      state,
      `received ${totalToAdd} ${effect.resource} from ${buildingCount} ${effect.buildingType}${buildingCount !== 1 ? 's' : ''}`,
      playerId
    );
  }

  return state;
}

/**
 * Execute: Add commodities based on city improvements
 * Used by cards that reward players for building city improvements
 *
 * TODO: Implement city improvement filtering when integrating with existing system
 */
export function executeAddCommodityPerCity(
  state: GameState,
  playerId: string,
  effect: AddCommodityPerCityEffect
): GameState {
  const cities = getPlayerCities(state, playerId);
  const totalToAdd = cities.length;

  if (totalToAdd > 0) {
    addCommodity(state, playerId, effect.commodity, totalToAdd);
    addLog(
      state,
      `received ${totalToAdd} ${effect.commodity} from ${totalToAdd} ${
        totalToAdd !== 1 ? 'cities' : 'city'
      }`,
      playerId
    );
  }

  return state;
}

/**
 * Execute: Steal resources from opponents
 * Used by cards like Resource Monopoly, Guild Dues
 */
export function executeStealFromOpponents(
  state: GameState,
  playerId: string,
  effect: StealFromOpponentsEffect
): GameState {
  const opponents = getOpponents(state, playerId);

  let totalStolen = 0;

  for (const opponent of opponents) {
    let amountToSteal = effect.count;

    if (effect.resourceType === 'any') {
      // Steal any available resource (implementation would need UI selection)
      // For now, we'll skip this as it requires interaction
      continue;
    } else {
      // Steal specific resource type
      const available = opponent.resources[effect.resourceType] || 0;
      const actualAmount = Math.min(amountToSteal, available);

      if (actualAmount > 0) {
        stealResource(state, opponent.id, playerId, effect.resourceType, actualAmount);
        totalStolen += actualAmount;
      }
    }

    // If perOpponent is false, only steal from one opponent
    if (!effect.perOpponent) break;
  }

  if (totalStolen > 0) {
    addLog(
      state,
      `stole ${totalStolen} ${effect.resourceType} from ${
        effect.perOpponent ? 'opponents' : 'an opponent'
      }`,
      playerId
    );
  }

  return state;
}
