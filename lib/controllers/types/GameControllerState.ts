import { GameState } from '@/lib/types';
import { TradeOffer } from '@/lib/types/game';
import {
  BuildMode,
  ImprovementType,
  HexSelectionType,
  VertexSelectionType,
  EdgeSelectionType,
  DiplomatStage,
  InventorSelection,
} from '@/lib/hooks/useSelectionManager';

/**
 * Shared controller context passed into specialized controllers
 */
export interface GameControllerContext {
  gameState: GameState | null;
  playerId: string;
  roomId: string;
  /**
   * Optional fetch/refresh helper for controllers that need to pull fresh state
   */
  refreshGameState?: () => Promise<void>;
  /**
   * Optional optimistic-state helper used by controllers that mirror client updates
   */
  getOptimisticState?: (state: GameState) => GameState;
}

/**
 * Knight-specific UI state
 */
export interface KnightControllerState {
  movingKnightId: string | null;
  selectedKnightId: string | null;
  knightDisplacementState: {
    targetVertexId: string | null;
    displacedKnightId: string | null;
  } | null;
}

/**
 * Progress card-specific selection state
 */
export interface ProgressCardControllerState {
  selectingHexForCard: HexSelectionType | null;
  selectingVertexForCard: VertexSelectionType | null;
  selectingEdgeForCard: EdgeSelectionType | null;

  merchantSelectedHexId: string | null;
  inventorSelection: InventorSelection | null;
  taxationSelectedHexId: string | null;
  intrigueSelectedKnightId: string | null;
  treasonRemovedKnightId: string | null;
  treasonPlacementVertexId: string | null;
  diplomatEdgeState: {
    stage: DiplomatStage | null;
    removedEdgeId: string | null;
    relocatedEdgeId: string | null;
  } | null;

  selectingCityForEngineer: boolean;
  selectingCityForMedicine: boolean;
  engineerSelectedCityId: string | null;
  medicineSelectedCityId: string | null;

  smithSelectableKnightIds: string[];
  smithSelectedKnightIds: string[];

  progressPromptCardType: string | null;
  progressPromptVisible: boolean;
  progressPromptReady: boolean;
}

/**
 * Trade-specific UI state
 */
export interface TradeControllerState {
  currentTradeOffer: TradeOffer | null;
  pendingTradeOfferId: string | null;
}

/**
 * Build/selection state shared by build controls
 */
export interface SelectionControllerState {
  buildMode: BuildMode | null;
  buildingMetropolisType: ImprovementType | null;
  selectingBarbarianCity: boolean;
  selectedBarbarianCityId: string | null;
}
