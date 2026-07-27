import { GameState } from '@/lib/types/game';
import { InteractionOption } from '../types/CardInteraction';
import { ResourceType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';

/**
 * Builds interaction options for resource selection
 */
export function buildResourceOptions(state?: GameState, playerId?: string): InteractionOption[] {
  void state;
  void playerId;
  const resources: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

  return resources.map((resource) => ({
    id: resource,
    label: resource.charAt(0).toUpperCase() + resource.slice(1),
    icon: getResourceIcon(resource),
  }));
}

/**
 * Builds interaction options for commodity selection
 */
export function buildCommodityOptions(state?: GameState, playerId?: string): InteractionOption[] {
  void state;
  void playerId;
  const commodities: CommodityType[] = ['paper', 'cloth', 'coin'];

  return commodities.map((commodity) => ({
    id: commodity,
    label: commodity.charAt(0).toUpperCase() + commodity.slice(1),
    icon: getCommodityIcon(commodity),
  }));
}

/**
 * Gets icon/emoji for resource type
 */
function getResourceIcon(resource: ResourceType): string {
  switch (resource) {
    case 'wood':
      return '🪵';
    case 'brick':
      return '🧱';
    case 'sheep':
      return '🐑';
    case 'wheat':
      return '🌾';
    case 'ore':
      return '⛰️';
    default:
      return '❓';
  }
}

/**
 * Gets icon/emoji for commodity type
 */
function getCommodityIcon(commodity: CommodityType): string {
  switch (commodity) {
    case 'paper':
      return '📜';
    case 'cloth':
      return '🧵';
    case 'coin':
      return '🪙';
    default:
      return '❓';
  }
}
