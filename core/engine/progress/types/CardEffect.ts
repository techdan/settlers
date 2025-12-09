import { ResourceType, TerrainType } from '@/core/rules/board-constants';
import { CommodityType } from '@/core/rules/commodity-constants';

/**
 * Effect types that can be applied by progress cards
 */
export type CardEffectType =
  | 'add_resource_per_hex'
  | 'add_resource_per_building'
  | 'add_commodity_per_city'
  | 'steal_from_opponents'
  | 'upgrade_knight'
  | 'activate_knight'
  | 'promote_knight'
  | 'free_road'
  | 'free_city_wall'
  | 'select_from_options'
  | 'discard_opponent_cards';

/**
 * Base effect interface
 */
export interface BaseCardEffect {
  type: CardEffectType;
}

/**
 * Effect: Add resources based on hex terrain and adjacent buildings
 */
export interface AddResourcePerHexEffect extends BaseCardEffect {
  type: 'add_resource_per_hex';
  resource: ResourceType;
  hexTerrain: TerrainType;
  requiresAdjacentBuilding: boolean;
  amountPerHex: number; // Amount of resource to add per matching hex
  resourceMapping?: Record<string, ResourceType>;
}

/**
 * Effect: Add resources based on building type
 */
export interface AddResourcePerBuildingEffect extends BaseCardEffect {
  type: 'add_resource_per_building';
  resource: ResourceType;
  buildingType: 'settlement' | 'city';
  count: number;
}

/**
 * Effect: Add commodities based on city improvements
 */
export interface AddCommodityPerCityEffect extends BaseCardEffect {
  type: 'add_commodity_per_city';
  commodity: CommodityType;
  requiresImprovement?: boolean;
  improvementType?: CommodityType;
}

/**
 * Effect: Steal resources or commodities from opponents
 * Used by Resource Monopoly (up to 2 resources per opponent)
 * and Trade Monopoly (1 commodity per opponent if they have it)
 */
export interface StealFromOpponentsEffect extends BaseCardEffect {
  type: 'steal_from_opponents';
  cardType: 'resource' | 'commodity';
  resourceType?: ResourceType; // For resource monopoly - requires runtime selection
  commodityType?: CommodityType; // For trade monopoly - requires runtime selection
  maxPerOpponent: number; // 2 for resources, 1 for commodities
  requiresSelection: boolean; // True if player must choose the resource/commodity type
}

/**
 * Effect: Upgrade knight strength
 */
export interface UpgradeKnightEffect extends BaseCardEffect {
  type: 'upgrade_knight';
  freeUpgrades: number;
}

/**
 * Effect: Activate knights without commodity cost
 */
export interface ActivateKnightEffect extends BaseCardEffect {
  type: 'activate_knight';
  freeActivations: number;
}

/**
 * Effect: Promote knight to next level
 */
export interface PromoteKnightEffect extends BaseCardEffect {
  type: 'promote_knight';
  freePromotions: number;
}

/**
 * Effect: Place free roads
 */
export interface FreeRoadEffect extends BaseCardEffect {
  type: 'free_road';
  count: number;
}

/**
 * Effect: Build free city walls
 */
export interface FreeCityWallEffect extends BaseCardEffect {
  type: 'free_city_wall';
  count: number;
}

/**
 * Effect: Select from multiple options
 */
export interface SelectFromOptionsEffect extends BaseCardEffect {
  type: 'select_from_options';
  options: {
    label: string;
    effects: CardEffect[];
  }[];
}

/**
 * Effect: Discard cards from opponents
 */
export interface DiscardOpponentCardsEffect extends BaseCardEffect {
  type: 'discard_opponent_cards';
  targetType: 'all' | 'select';
  cardType: 'resource' | 'commodity' | 'any';
  count: number;
}

/**
 * Union type of all card effects
 */
export type CardEffect =
  | AddResourcePerHexEffect
  | AddResourcePerBuildingEffect
  | AddCommodityPerCityEffect
  | StealFromOpponentsEffect
  | UpgradeKnightEffect
  | ActivateKnightEffect
  | PromoteKnightEffect
  | FreeRoadEffect
  | FreeCityWallEffect
  | SelectFromOptionsEffect
  | DiscardOpponentCardsEffect;
