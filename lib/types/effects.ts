import type { ResourceType } from '@/core/rules/board-constants';
import type { CommodityType } from '@/core/rules/commodity-constants';
import type { TreasonEffect } from '@/lib/types/game';

export type RoadBuildingEffect = {
    type: 'road_building_progress';
    playerId: string;
    placedEdges?: string[];
    completed?: boolean;
};

export type MerchantFleetEffect = {
    type: 'merchant_fleet';
    playerId: string;
    tradeItem: ResourceType | CommodityType;
    expiresAfterTurn?: string;
};

export type ActiveEffect = RoadBuildingEffect | MerchantFleetEffect | TreasonEffect | { type: string; [key: string]: unknown };

const hasEffectType = (effect: unknown, type: string): effect is { type: string } => {
    return typeof effect === 'object' && effect !== null && (effect as { type?: unknown }).type === type;
};

export const isRoadBuildingEffect = (effect: unknown): effect is RoadBuildingEffect => {
    return (
        hasEffectType(effect, 'road_building_progress') &&
        typeof (effect as { playerId?: unknown }).playerId === 'string'
    );
};

export const isMerchantFleetEffect = (effect: unknown): effect is MerchantFleetEffect => {
    return (
        hasEffectType(effect, 'merchant_fleet') &&
        typeof (effect as { playerId?: unknown }).playerId === 'string' &&
        typeof (effect as { tradeItem?: unknown }).tradeItem === 'string'
    );
};

export const isTreasonEffect = (effect: unknown): effect is TreasonEffect => {
    return hasEffectType(effect, 'treason');
};
