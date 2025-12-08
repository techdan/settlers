import { GameState } from './game';
import { ProgressCardType } from './player';

/**
 * BuildMode represents the current building action the player is performing
 */
export type BuildMode = 'road' | 'settlement' | 'city' | 'knight' | 'city_wall';

/**
 * MetropolisType represents the three types of metropolis in Cities & Knights
 */
export type MetropolisType = 'science' | 'trade' | 'politics';

/**
 * BoardSelectionState consolidates all selection-related state for board interactions
 * This reduces Board component props from 40+ to just 4 props
 */
export interface BoardSelectionState {
  // Build mode
  buildMode: BuildMode | null;
  movingKnightId?: string | null;
  buildingMetropolisType?: MetropolisType | null;

  // Hex card selections (merchant, inventor, taxation)
  hexCardSelection?: {
    type: 'merchant' | 'inventor' | 'taxation';
    selectedHexId?: string;
    inventorSelection?: {
      firstHexId?: string;
      secondHexId?: string;
    };
  };

  // Vertex card selections (intrigue, treason)
  vertexCardSelection?: {
    type: 'intrigue' | 'treason_remove' | 'treason_place';
    selectedKnightId?: string;
    placementVertexId?: string;
  };

  // Edge card selections (diplomat)
  edgeCardSelection?: {
    type: 'diplomat';
    stage?: 'remove' | 'rebuild';
    removedEdgeId?: string;
    relocatedEdgeId?: string;
  };

  // City selections (engineer, medicine, metropolis)
  citySelection?: {
    type: 'engineer' | 'medicine' | 'metropolis';
    cityType?: MetropolisType;
    selectedCityId?: string;
  };

  // Smith selection (upgrade multiple knights)
  smithSelection?: {
    selectableKnightIds?: string[];
    selectedKnightIds?: string[];
  };

  // Progress prompt
  progressPrompt?: {
    cardType?: ProgressCardType;
    visible?: boolean;
    ready?: boolean;
  };
}

/**
 * BoardCallbacks consolidates all callback functions for board interactions
 * These handle user actions on the board
 */
export interface BoardCallbacks {
  onHexSelected?: (hexId: string) => void;
  onVertexSelectedForCard?: (vertexId: string) => void;
  onEdgeSelectedForCard?: (edgeId: string) => void;
  onEngineerCitySelected?: (vertexId: string) => void;
  onMedicineCitySelected?: (vertexId: string) => void;
  onMetropolisCitySelected?: (vertexId: string) => void;
  onCityClick?: (vertexId: string) => void;
  onSettlementClick?: (vertexId: string) => void;
  onKnightClick?: (knightId: string) => void;
  onBarbarianCitySelect?: (vertexId: string) => void;
  onRobberVictimRequest?: (hexId: string, potentialVictims: string[]) => void;
  onCancelBuild: () => void;
}

/**
 * BoardProps - Simplified board component interface
 * Reduced from 40+ props to just 4 props!
 */
export interface BoardProps {
  gameState: GameState;
  playerId: string;
  selectionState: BoardSelectionState;
  callbacks: BoardCallbacks;
}
