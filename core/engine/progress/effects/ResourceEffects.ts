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
  stealCommodity,
} from '../utilities/ResourceTransfer';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';
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

  const totalAdded = hexes.length * effect.amountPerHex;

  if (totalAdded > 0) {
    addResource(state, playerId, effect.resource, totalAdded);

    // Match legacy log format
    const resourceName = effect.resource === 'wheat' ? 'grain' : effect.resource;
    const cardName = effect.resource === 'wheat' ? 'Irrigation' : 'Mining';

    addLog(
      state,
      `received ${totalAdded} ${resourceName} from ${cardName}`,
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
 * Execute: Steal resources or commodities from opponents
 * Used by Resource Monopoly (up to 2 resources) and Trade Monopoly (1 commodity)
 */
export function executeStealFromOpponents(
  state: GameState,
  playerId: string,
  effect: StealFromOpponentsEffect,
  options?: { resource?: string; commodity?: string }
): GameState {
  const opponents = getOpponents(state, playerId);

  let totalStolen = 0;
  const perPlayerAmounts: string[] = [];

  if (effect.cardType === 'resource') {
    // Resource Monopoly: Take up to 2 of chosen resource from each player
    const resource = (options?.resource || effect.resourceType) as ResourceType;
    if (!resource) {
      throw new Error('Resource Monopoly requires resource selection');
    }

    for (const opponent of opponents) {
      const available = opponent.resources[resource] || 0;
      const amountToSteal = Math.min(available, effect.maxPerOpponent);

      perPlayerAmounts.push(`${opponent.name}: ${amountToSteal}`);

      if (amountToSteal > 0) {
        stealResource(state, opponent.id, playerId, resource, amountToSteal);
        totalStolen += amountToSteal;
      }
    }

    if (totalStolen > 0) {
      addLog(state, `stole ${totalStolen} ${resource} from opponents (${perPlayerAmounts.join(', ')})`, playerId);
    } else {
      addLog(state, `played Resource Monopoly for ${resource} but no one had any`, playerId);
    }
  } else if (effect.cardType === 'commodity') {
    // Trade Monopoly: Take 1 of chosen commodity from each player who has it
    const commodity = (options?.commodity || effect.commodityType) as CommodityType;
    if (!commodity) {
      throw new Error('Trade Monopoly requires commodity selection');
    }

    for (const opponent of opponents) {
      if (!opponent.commodities) continue;

      const available = opponent.commodities[commodity] || 0;
      const amountToSteal = Math.min(available, effect.maxPerOpponent);

      perPlayerAmounts.push(`${opponent.name}: ${amountToSteal}`);

      if (amountToSteal > 0) {
        stealCommodity(state, opponent.id, playerId, commodity, amountToSteal);
        totalStolen += amountToSteal;
      }
    }

    if (totalStolen > 0) {
      addLog(state, `stole ${totalStolen} ${commodity} from opponents (${perPlayerAmounts.join(', ')})`, playerId);
    } else {
      addLog(state, `played Trade Monopoly for ${commodity} but no one had any`, playerId);
    }
  }

  return state;
}
