import React from 'react';
import { Board } from '@/components/board/Board';
import { GameState } from '@/lib/types';
import { SelectionState } from '@/lib/hooks/useSelectionManager';
import { KnightController } from '@/lib/controllers/knight-controller';
import { ProgressCardController } from '@/lib/controllers/progress-card-controller';
import { ImprovementController } from '@/lib/controllers/improvement-controller';
import { TabletopStatusIcon } from '@/themes/tabletop/glyphs';
import { TabletopButton } from '@/components/game/ui/TabletopModal';

interface GameBoardSectionProps {
  gameState: GameState;
  playerId: string;
  selectionManager: SelectionState;
  smithEligibleVertexIds: string[];
  isRoadBuildingProgressActive: boolean;
  showRoadBuildingPrompt: boolean;
  onCancelSelection: () => void;
  onConfirmSmithPromotions: () => void;
  onLoseCityToBarbarians: (vertexId: string) => Promise<void>;
  onRobberVictimRequest: (hexId: string, victims: string[]) => void;
  onRobberMoveStarted: () => void;
  progressCardController: ProgressCardController;
  improvementController: ImprovementController;
  knightController: KnightController;
}

export const GameBoardSection: React.FC<GameBoardSectionProps> = ({
  gameState,
  playerId,
  selectionManager,
  smithEligibleVertexIds,
  isRoadBuildingProgressActive,
  showRoadBuildingPrompt,
  onCancelSelection,
  onConfirmSmithPromotions,
  onLoseCityToBarbarians,
  onRobberVictimRequest,
  onRobberMoveStarted,
  progressCardController,
  improvementController,
  knightController,
}) => {
  return (
    <>
      {selectionManager.selectingKnightsForSmith && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[var(--ui-success)] bg-[var(--ui-panel)] px-6 py-4 text-[var(--ui-text)] shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <TabletopStatusIcon type="info" size={28} label="Smith selection" />
            <div className="text-sm">
              <div className="font-bold text-[var(--ui-accent)]">Smith</div>
              <div>Select up to 2 knights to promote.</div>
            </div>
            <div className="flex items-center gap-2">
              <TabletopButton
                onClick={selectionManager.clearAllSelections}
              >
                Cancel
              </TabletopButton>
              <TabletopButton
                variant="primary"
                className="shadow"
                disabled={selectionManager.selectedSmithKnightIds.length === 0}
                onClick={onConfirmSmithPromotions}
              >
                Promote
              </TabletopButton>
            </div>
          </div>
        </div>
      )}

      <Board
        gameState={gameState}
        playerId={playerId}
        selectionState={{
          buildMode: selectionManager.buildMode,
          movingKnightId: selectionManager.movingKnightId,
          buildingMetropolisType: selectionManager.buildingMetropolisType,
          hexCardSelection: selectionManager.selectingHexForCard
            ? {
                type: selectionManager.selectingHexForCard,
                selectedHexId:
                  selectionManager.selectingHexForCard === 'merchant'
                    ? selectionManager.selectedMerchantHexId ?? undefined
                    : selectionManager.selectingHexForCard === 'taxation'
                      ? selectionManager.selectedTaxationHexId ?? undefined
                      : undefined,
                inventorSelection: selectionManager.inventorSelection
                  ? {
                      firstHexId: selectionManager.inventorSelection.firstHexId,
                      secondHexId: selectionManager.inventorSelection.secondHexId,
                    }
                  : undefined,
              }
            : undefined,
          vertexCardSelection: selectionManager.selectingVertexForCard
            ? {
                type: selectionManager.selectingVertexForCard,
                selectedKnightId:
                  selectionManager.selectingVertexForCard === 'intrigue'
                    ? selectionManager.intrigueTarget?.knightId ?? undefined
                    : selectionManager.selectingVertexForCard === 'treason_remove'
                      ? selectionManager.treasonSelectedKnightId ?? undefined
                      : undefined,
                placementVertexId:
                  selectionManager.selectingVertexForCard === 'treason_place'
                    ? selectionManager.treasonSelectedPlacementVertexId ?? undefined
                    : undefined,
              }
            : undefined,
          edgeCardSelection: selectionManager.selectingEdgeForCard
            ? {
                type: selectionManager.selectingEdgeForCard,
                stage: selectionManager.diplomatStage ?? undefined,
                selectedEdgeId:
                  selectionManager.diplomatStage === 'remove'
                    ? selectionManager.diplomatSelectedEdgeId ?? undefined
                    : undefined,
                removedEdgeId:
                  selectionManager.diplomatStage === 'rebuild'
                    ? selectionManager.diplomatSelectedEdgeId ?? undefined
                    : undefined,
                relocatedEdgeId: selectionManager.diplomatRelocateEdgeId ?? undefined,
              }
            : undefined,
          citySelection: selectionManager.selectingCityForEngineer
            ? {
                type: 'engineer',
                selectedCityId: selectionManager.selectedEngineerCityId ?? undefined,
              }
            : selectionManager.selectingCityForMedicine
              ? {
                  type: 'medicine',
                  selectedCityId: selectionManager.selectedMedicineCityId ?? undefined,
                }
              : selectionManager.selectingCityForMetropolis
                ? {
                    type: 'metropolis',
                    cityType: selectionManager.selectingCityForMetropolis,
                    selectedCityId: selectionManager.selectedMetropolisCityId ?? undefined,
                  }
                : undefined,
          smithSelection: selectionManager.selectingKnightsForSmith
            ? {
                selectableKnightIds: smithEligibleVertexIds,
                selectedKnightIds: selectionManager.selectedSmithKnightIds,
              }
            : undefined,
          progressPrompt: showRoadBuildingPrompt
            ? {
                cardType: 'road_building_progress',
                visible: showRoadBuildingPrompt,
                ready: isRoadBuildingProgressActive,
              }
            : undefined,
        }}
        callbacks={{
          onCancelBuild: onCancelSelection,
          onHexSelected: progressCardController.handleHexSelected,
          onVertexSelectedForCard: progressCardController.handleVertexSelected,
          onEdgeSelectedForCard: progressCardController.handleEdgeSelected,
          onEngineerCitySelected: progressCardController.handleEngineerCitySelected,
          onMedicineCitySelected: progressCardController.handleMedicineCitySelected,
          onMetropolisCitySelected: improvementController.handleMetropolisCitySelected,
          onCityClick: improvementController.handleCityClick,
          onSettlementClick: improvementController.handleSettlementClick,
          onKnightClick: knightController.handleKnightClick,
          onBarbarianCitySelect: onLoseCityToBarbarians,
          onRobberVictimRequest: onRobberVictimRequest,
          onRobberMoveStarted,
        }}
      />
    </>
  );
};
