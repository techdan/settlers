import { tradeWithBank, offerTrade, acceptTrade, rejectTrade, cancelTrade } from '@/app/actions';
import { CommodityType } from '@/core/rules/commodity-constants';
import { ResourceType } from '@/core/rules/board-constants';

export interface TradeControllerDeps {
  roomId: string;
  playerId: string;
}

export interface TradeController {
  handleBankTrade: (
    giving: ResourceType | CommodityType,
    receiving: ResourceType | CommodityType
  ) => Promise<void>;
  handleOfferTrade: (
    offering: Record<ResourceType, number>,
    requesting: Record<ResourceType, number>
  ) => Promise<void>;
  handleAcceptTrade: () => Promise<void>;
  handleRejectTrade: () => Promise<void>;
  handleCancelTrade: () => Promise<void>;
}

/**
 * Trade Controller
 * Centralizes all trade actions (bank and player-to-player)
 */
export function createTradeController(deps: TradeControllerDeps): TradeController {
  const { roomId, playerId } = deps;

  const handleBankTrade = async (
    giving: ResourceType | CommodityType,
    receiving: ResourceType | CommodityType
  ) => {
    await tradeWithBank(roomId, playerId, giving, receiving);
  };

  const handleOfferTrade = async (
    offering: Record<ResourceType, number>,
    requesting: Record<ResourceType, number>
  ) => {
    await offerTrade(roomId, playerId, offering, requesting);
  };

  const handleAcceptTrade = async () => {
    await acceptTrade(roomId, playerId);
  };

  const handleRejectTrade = async () => {
    await rejectTrade(roomId, playerId);
  };

  const handleCancelTrade = async () => {
    await cancelTrade(roomId, playerId);
  };

  return {
    handleBankTrade,
    handleOfferTrade,
    handleAcceptTrade,
    handleRejectTrade,
    handleCancelTrade,
  };
}
