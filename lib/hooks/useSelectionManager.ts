import { useState } from 'react';

/**
 * Selection Manager Hook
 * Consolidates all board selection state that was previously scattered across GameController
 */

export type BuildMode = 'road' | 'settlement' | 'city' | 'knight' | 'city_wall';
export type ImprovementType = 'science' | 'trade' | 'politics';
export type HexSelectionType = 'merchant' | 'inventor' | 'taxation';
export type VertexSelectionType = 'intrigue' | 'treason_remove' | 'treason_place';
export type EdgeSelectionType = 'diplomat';
export type DiplomatStage = 'remove' | 'rebuild';
export type TreasonMode = 'select_opponent' | 'waiting_for_knight' | 'select_knight' | 'place_knight';

export interface IntrigueTarget {
  knightId: string;
  opponentId: string;
  vertexId: string;
}

export interface InventorSelection {
  firstHexId?: string;
  firstValue?: number;
  secondHexId?: string;
  secondValue?: number;
}

export interface SelectionState {
  // Build mode
  buildMode: BuildMode | null;
  setBuildMode: (mode: BuildMode | null) => void;

  // Entity selections
  selectedCityId: string | null;
  setSelectedCityId: (id: string | null) => void;
  selectedSettlementId: string | null;
  setSelectedSettlementId: (id: string | null) => void;
  selectedKnightId: string | null;
  setSelectedKnightId: (id: string | null) => void;
  movingKnightId: string | null;
  setMovingKnightId: (id: string | null) => void;

  // Metropolis selection
  buildingMetropolisType: ImprovementType | null;
  setBuildingMetropolisType: (type: ImprovementType | null) => void;
  selectingCityForMetropolis: ImprovementType | null;
  setSelectingCityForMetropolis: (type: ImprovementType | null) => void;
  selectedMetropolisCityId: string | null;
  setSelectedMetropolisCityId: (id: string | null) => void;
  isMetropolisSubmitting: boolean;
  setIsMetropolisSubmitting: (submitting: boolean) => void;

  // Progress card hex selection (merchant, inventor, taxation)
  selectingHexForCard: HexSelectionType | null;
  setSelectingHexForCard: (type: HexSelectionType | null) => void;

  // Inventor card state
  inventorSelection: InventorSelection;
  setInventorSelection: (selection: InventorSelection) => void;
  isInventorConfirmOpen: boolean;
  setIsInventorConfirmOpen: (open: boolean) => void;
  inventorError: string | null;
  setInventorError: (error: string | null) => void;

  // Merchant card state
  isMerchantModalOpen: boolean;
  setIsMerchantModalOpen: (open: boolean) => void;
  selectedMerchantHexId: string | null;
  setSelectedMerchantHexId: (id: string | null) => void;
  merchantError: string | null;
  setMerchantError: (error: string | null) => void;

  // Taxation card state
  isTaxationModalOpen: boolean;
  setIsTaxationModalOpen: (open: boolean) => void;
  selectedTaxationHexId: string | null;
  setSelectedTaxationHexId: (id: string | null) => void;
  taxationError: string | null;
  setTaxationError: (error: string | null) => void;

  // Progress card vertex selection (intrigue, treason)
  selectingVertexForCard: VertexSelectionType | null;
  setSelectingVertexForCard: (type: VertexSelectionType | null) => void;

  // Intrigue card state
  intrigueTarget: IntrigueTarget | null;
  setIntrigueTarget: (target: IntrigueTarget | null) => void;
  intrigueError: string | null;
  setIntrigueError: (error: string | null) => void;
  isSubmittingIntrigue: boolean;
  setIsSubmittingIntrigue: (submitting: boolean) => void;

  // Progress card edge selection (diplomat)
  selectingEdgeForCard: EdgeSelectionType | null;
  setSelectingEdgeForCard: (type: EdgeSelectionType | null) => void;

  // Diplomat card state
  diplomatStage: DiplomatStage | null;
  setDiplomatStage: (stage: DiplomatStage | null) => void;
  diplomatSelectedEdgeId: string | null;
  setDiplomatSelectedEdgeId: (id: string | null) => void;
  diplomatSelectedEdgeOwner: string | null;
  setDiplomatSelectedEdgeOwner: (id: string | null) => void;
  diplomatRelocateEdgeId: string | null;
  setDiplomatRelocateEdgeId: (id: string | null) => void;
  diplomatError: string | null;
  setDiplomatError: (error: string | null) => void;
  isSubmittingDiplomat: boolean;
  setIsSubmittingDiplomat: (submitting: boolean) => void;

  // Treason card state
  isTreasonModalOpen: boolean;
  setIsTreasonModalOpen: (open: boolean) => void;
  treasonMode: TreasonMode | null;
  setTreasonMode: (mode: TreasonMode | null) => void;
  treasonSelectedOpponentId: string | null;
  setTreasonSelectedOpponentId: (id: string | null) => void;
  treasonSelectedKnightId: string | null;
  setTreasonSelectedKnightId: (id: string | null) => void;
  treasonSelectedPlacementVertexId: string | null;
  setTreasonSelectedPlacementVertexId: (id: string | null) => void;
  treasonError: string | null;
  setTreasonError: (error: string | null) => void;
  isSubmittingTreason: boolean;
  setIsSubmittingTreason: (submitting: boolean) => void;

  // Engineer card state
  selectingCityForEngineer: boolean;
  setSelectingCityForEngineer: (selecting: boolean) => void;
  selectedEngineerCityId: string | null;
  setSelectedEngineerCityId: (id: string | null) => void;
  isEngineerSubmitting: boolean;
  setIsEngineerSubmitting: (submitting: boolean) => void;

  // Medicine card state
  selectingCityForMedicine: boolean;
  setSelectingCityForMedicine: (selecting: boolean) => void;
  selectedMedicineCityId: string | null;
  setSelectedMedicineCityId: (id: string | null) => void;
  isSubmittingMedicine: boolean;
  setIsSubmittingMedicine: (submitting: boolean) => void;

  // Smith card state
  selectingKnightsForSmith: boolean;
  setSelectingKnightsForSmith: (selecting: boolean) => void;
  selectedSmithKnightIds: string[];
  setSelectedSmithKnightIds: (ids: string[]) => void;
  smithError: string | null;
  setSmithError: (error: string | null) => void;

  // Dialog states
  isCraneDialogOpen: boolean;
  setIsCraneDialogOpen: (open: boolean) => void;
  isPlayerCityManagementOpen: boolean;
  setIsPlayerCityManagementOpen: (open: boolean) => void;

  // Utility function to clear all selections
  clearAllSelections: () => void;
}

/**
 * Custom hook that manages all board selection and card-specific state
 * Replaces ~40 scattered useState calls in GameController
 */
export function useSelectionManager(): SelectionState {
  // Build mode
  const [buildMode, setBuildMode] = useState<BuildMode | null>(null);

  // Entity selections
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [selectedKnightId, setSelectedKnightId] = useState<string | null>(null);
  const [movingKnightId, setMovingKnightId] = useState<string | null>(null);

  // Metropolis selection
  const [buildingMetropolisType, setBuildingMetropolisType] = useState<ImprovementType | null>(null);
  const [selectingCityForMetropolis, setSelectingCityForMetropolis] = useState<ImprovementType | null>(null);
  const [selectedMetropolisCityId, setSelectedMetropolisCityId] = useState<string | null>(null);
  const [isMetropolisSubmitting, setIsMetropolisSubmitting] = useState(false);

  // Progress card hex selection
  const [selectingHexForCard, setSelectingHexForCard] = useState<HexSelectionType | null>(null);

  // Inventor card
  const [inventorSelection, setInventorSelection] = useState<InventorSelection>({});
  const [isInventorConfirmOpen, setIsInventorConfirmOpen] = useState(false);
  const [inventorError, setInventorError] = useState<string | null>(null);

  // Merchant card
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [selectedMerchantHexId, setSelectedMerchantHexId] = useState<string | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  // Taxation card
  const [isTaxationModalOpen, setIsTaxationModalOpen] = useState(false);
  const [selectedTaxationHexId, setSelectedTaxationHexId] = useState<string | null>(null);
  const [taxationError, setTaxationError] = useState<string | null>(null);

  // Progress card vertex selection
  const [selectingVertexForCard, setSelectingVertexForCard] = useState<VertexSelectionType | null>(null);

  // Intrigue card
  const [intrigueTarget, setIntrigueTarget] = useState<IntrigueTarget | null>(null);
  const [intrigueError, setIntrigueError] = useState<string | null>(null);
  const [isSubmittingIntrigue, setIsSubmittingIntrigue] = useState(false);

  // Progress card edge selection
  const [selectingEdgeForCard, setSelectingEdgeForCard] = useState<EdgeSelectionType | null>(null);

  // Diplomat card
  const [diplomatStage, setDiplomatStage] = useState<DiplomatStage | null>(null);
  const [diplomatSelectedEdgeId, setDiplomatSelectedEdgeId] = useState<string | null>(null);
  const [diplomatSelectedEdgeOwner, setDiplomatSelectedEdgeOwner] = useState<string | null>(null);
  const [diplomatRelocateEdgeId, setDiplomatRelocateEdgeId] = useState<string | null>(null);
  const [diplomatError, setDiplomatError] = useState<string | null>(null);
  const [isSubmittingDiplomat, setIsSubmittingDiplomat] = useState(false);

  // Treason card
  const [isTreasonModalOpen, setIsTreasonModalOpen] = useState(false);
  const [treasonMode, setTreasonMode] = useState<TreasonMode | null>(null);
  const [treasonSelectedOpponentId, setTreasonSelectedOpponentId] = useState<string | null>(null);
  const [treasonSelectedKnightId, setTreasonSelectedKnightId] = useState<string | null>(null);
  const [treasonSelectedPlacementVertexId, setTreasonSelectedPlacementVertexId] = useState<string | null>(null);
  const [treasonError, setTreasonError] = useState<string | null>(null);
  const [isSubmittingTreason, setIsSubmittingTreason] = useState(false);

  // Engineer card
  const [selectingCityForEngineer, setSelectingCityForEngineer] = useState(false);
  const [selectedEngineerCityId, setSelectedEngineerCityId] = useState<string | null>(null);
  const [isEngineerSubmitting, setIsEngineerSubmitting] = useState(false);

  // Medicine card
  const [selectingCityForMedicine, setSelectingCityForMedicine] = useState(false);
  const [selectedMedicineCityId, setSelectedMedicineCityId] = useState<string | null>(null);
  const [isSubmittingMedicine, setIsSubmittingMedicine] = useState(false);

  // Smith card
  const [selectingKnightsForSmith, setSelectingKnightsForSmith] = useState(false);
  const [selectedSmithKnightIds, setSelectedSmithKnightIds] = useState<string[]>([]);
  const [smithError, setSmithError] = useState<string | null>(null);

  // Dialogs
  const [isCraneDialogOpen, setIsCraneDialogOpen] = useState(false);
  const [isPlayerCityManagementOpen, setIsPlayerCityManagementOpen] = useState(false);

  /**
   * Clears all selection state - useful for canceling actions
   */
  const clearAllSelections = () => {
    setBuildMode(null);
    setSelectedCityId(null);
    setSelectedSettlementId(null);
    setSelectedKnightId(null);
    setMovingKnightId(null);
    setBuildingMetropolisType(null);
    setSelectingCityForMetropolis(null);
    setSelectedMetropolisCityId(null);
    setSelectingHexForCard(null);
    setInventorSelection({});
    setIsInventorConfirmOpen(false);
    setInventorError(null);
    setIsMerchantModalOpen(false);
    setSelectedMerchantHexId(null);
    setMerchantError(null);
    setIsTaxationModalOpen(false);
    setSelectedTaxationHexId(null);
    setTaxationError(null);
    setSelectingVertexForCard(null);
    setIntrigueTarget(null);
    setIntrigueError(null);
    setSelectingEdgeForCard(null);
    setDiplomatStage(null);
    setDiplomatSelectedEdgeId(null);
    setDiplomatSelectedEdgeOwner(null);
    setDiplomatRelocateEdgeId(null);
    setDiplomatError(null);
    setTreasonMode(null);
    setTreasonSelectedOpponentId(null);
    setTreasonSelectedKnightId(null);
    setTreasonSelectedPlacementVertexId(null);
    setTreasonError(null);
    setSelectingCityForEngineer(false);
    setSelectedEngineerCityId(null);
    setSelectingCityForMedicine(false);
    setSelectedMedicineCityId(null);
    setIsSubmittingMedicine(false);
    setSelectingKnightsForSmith(false);
    setSelectedSmithKnightIds([]);
    setSmithError(null);
  };

  return {
    buildMode,
    setBuildMode,
    selectedCityId,
    setSelectedCityId,
    selectedSettlementId,
    setSelectedSettlementId,
    selectedKnightId,
    setSelectedKnightId,
    movingKnightId,
    setMovingKnightId,
    buildingMetropolisType,
    setBuildingMetropolisType,
    selectingCityForMetropolis,
    setSelectingCityForMetropolis,
    selectedMetropolisCityId,
    setSelectedMetropolisCityId,
    isMetropolisSubmitting,
    setIsMetropolisSubmitting,
    selectingHexForCard,
    setSelectingHexForCard,
    inventorSelection,
    setInventorSelection,
    isInventorConfirmOpen,
    setIsInventorConfirmOpen,
    inventorError,
    setInventorError,
    isMerchantModalOpen,
    setIsMerchantModalOpen,
    selectedMerchantHexId,
    setSelectedMerchantHexId,
    merchantError,
    setMerchantError,
    isTaxationModalOpen,
    setIsTaxationModalOpen,
    selectedTaxationHexId,
    setSelectedTaxationHexId,
    taxationError,
    setTaxationError,
    selectingVertexForCard,
    setSelectingVertexForCard,
    intrigueTarget,
    setIntrigueTarget,
    intrigueError,
    setIntrigueError,
    isSubmittingIntrigue,
    setIsSubmittingIntrigue,
    selectingEdgeForCard,
    setSelectingEdgeForCard,
    diplomatStage,
    setDiplomatStage,
    diplomatSelectedEdgeId,
    setDiplomatSelectedEdgeId,
    diplomatSelectedEdgeOwner,
    setDiplomatSelectedEdgeOwner,
    diplomatRelocateEdgeId,
    setDiplomatRelocateEdgeId,
    diplomatError,
    setDiplomatError,
    isSubmittingDiplomat,
    setIsSubmittingDiplomat,
    isTreasonModalOpen,
    setIsTreasonModalOpen,
    treasonMode,
    setTreasonMode,
    treasonSelectedOpponentId,
    setTreasonSelectedOpponentId,
    treasonSelectedKnightId,
    setTreasonSelectedKnightId,
    treasonSelectedPlacementVertexId,
    setTreasonSelectedPlacementVertexId,
    treasonError,
    setTreasonError,
    isSubmittingTreason,
    setIsSubmittingTreason,
    selectingCityForEngineer,
    setSelectingCityForEngineer,
    selectedEngineerCityId,
    setSelectedEngineerCityId,
    isEngineerSubmitting,
    setIsEngineerSubmitting,
    selectingCityForMedicine,
    setSelectingCityForMedicine,
    selectedMedicineCityId,
    setSelectedMedicineCityId,
    isSubmittingMedicine,
    setIsSubmittingMedicine,
    selectingKnightsForSmith,
    setSelectingKnightsForSmith,
    selectedSmithKnightIds,
    setSelectedSmithKnightIds,
    smithError,
    setSmithError,
    isCraneDialogOpen,
    setIsCraneDialogOpen,
    isPlayerCityManagementOpen,
    setIsPlayerCityManagementOpen,
    clearAllSelections,
  };
}
