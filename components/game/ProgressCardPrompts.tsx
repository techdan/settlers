import React from 'react';
import { GameState } from '@/lib/types';
import { SelectionState } from '@/lib/hooks/useSelectionManager';
import { ProgressCardController } from '@/lib/controllers/progress-card-controller';
import { MerchantPlacementModal } from './MerchantPlacementModal';
import { TaxationPlacementModal } from './TaxationPlacementModal';
import { TreasonPlacementModal } from './TreasonPlacementModal';
import { BoardSelectionPrompt } from './BoardSelectionPrompt';
import { ResourceType } from '@/core/rules/board-constants';

interface ProgressCardPromptsProps {
  gameState: GameState;
  selectionManager: SelectionState;
  progressCardController: ProgressCardController;
  onCancelSelection: () => void;
  showIntriguePrompt: boolean;
  intriguePromptStatus?: string;
  showTreasonPlacePrompt: boolean;
  treasonStatus?: string;
  treasonOpponents: {
    id: string;
    name: string;
    color?: string;
    knightCount: number;
    hasKnights: boolean;
  }[];
  treasonInitiatorName: string | null;
  treasonSupplyAvailable: boolean;
  treasonHasLegalPlacement: boolean;
  showTreasonModal: boolean;
  onResetTreason: () => void;
  showMerchantModal: boolean;
  merchantPromptStatus?: string;
  selectedMerchantResource: ResourceType | null;
  showTaxationModal: boolean;
  taxationPromptStatus?: string;
  showEngineeringPrompt: boolean;
  engineeringPromptStatus?: string;
  showMedicinePrompt: boolean;
  medicinePromptStatus?: string;
  showRoadBuildingPrompt: boolean;
  roadBuildingPromptStatus?: string;
  roadBuildingEffect: any;
  showInventorPrompt: boolean;
  inventorPromptStatus?: string;
  showDiplomatPrompt: boolean;
  diplomatPromptStatus?: string;
}

export const ProgressCardPrompts: React.FC<ProgressCardPromptsProps> = ({
  gameState,
  selectionManager,
  progressCardController,
  onCancelSelection,
  showIntriguePrompt,
  intriguePromptStatus,
  showTreasonPlacePrompt,
  treasonStatus,
  treasonOpponents,
  treasonInitiatorName,
  treasonSupplyAvailable,
  treasonHasLegalPlacement,
  showTreasonModal,
  onResetTreason,
  showMerchantModal,
  merchantPromptStatus,
  selectedMerchantResource,
  showTaxationModal,
  taxationPromptStatus,
  showEngineeringPrompt,
  engineeringPromptStatus,
  showMedicinePrompt,
  medicinePromptStatus,
  showRoadBuildingPrompt,
  roadBuildingPromptStatus,
  roadBuildingEffect,
  showInventorPrompt,
  inventorPromptStatus,
  showDiplomatPrompt,
  diplomatPromptStatus,
}) => {
  return (
    <>
      {showIntriguePrompt && (
        <BoardSelectionPrompt
          title="Intrigue"
          description="Select an opponent knight adjacent to your road network."
          status={intriguePromptStatus}
          onCancel={onCancelSelection}
          onFinish={progressCardController.handleConfirmIntrigueDisplacement}
          finishLabel="Displace"
          finishDisabled={!selectionManager.intrigueTarget || selectionManager.isSubmittingIntrigue}
        />
      )}

      {showTreasonPlacePrompt && (
        <BoardSelectionPrompt
          title="Treason"
          description="Place the captured knight on any empty intersection connected to your roads."
          status={treasonStatus}
          onCancel={progressCardController.handleCancelTreasonPlacement}
          onFinish={progressCardController.handleConfirmTreasonPlacement}
          finishLabel="Place"
          finishDisabled={!selectionManager.treasonSelectedPlacementVertexId || selectionManager.isSubmittingTreason}
        />
      )}

      {showMerchantModal && (
        <MerchantPlacementModal
          isOpen={showMerchantModal}
          selectedResource={selectedMerchantResource}
          status={merchantPromptStatus}
          error={selectionManager.merchantError}
          onCancel={onCancelSelection}
          onPlace={progressCardController.handleConfirmMerchantPlacement}
        />
      )}

      {showTreasonModal && (
        <TreasonPlacementModal
          isOpen={showTreasonModal}
          mode={selectionManager.treasonMode!}
          opponents={treasonOpponents}
          selectedOpponentId={selectionManager.treasonSelectedOpponentId}
          initiatorName={treasonInitiatorName ?? undefined}
          status={treasonStatus}
          error={selectionManager.treasonError}
          hasSelection={
            selectionManager.treasonMode === 'select_opponent'
              ? !!selectionManager.treasonSelectedOpponentId
              : selectionManager.treasonMode === 'select_knight'
                ? !!selectionManager.treasonSelectedKnightId
                : selectionManager.treasonMode === 'place_knight'
                  ? treasonSupplyAvailable && treasonHasLegalPlacement
                    ? !!selectionManager.treasonSelectedPlacementVertexId
                    : true
                  : false
          }
          onSelectOpponent={
            selectionManager.treasonMode === 'select_opponent'
              ? id => {
                  selectionManager.setTreasonSelectedOpponentId(selectionManager.treasonSelectedOpponentId === id ? null : id);
                  selectionManager.setTreasonError(null);
                }
              : undefined
          }
          onConfirm={
            selectionManager.treasonMode === 'select_opponent'
              ? progressCardController.handleConfirmTreasonOpponent
              : selectionManager.treasonMode === 'select_knight'
                ? progressCardController.handleConfirmTreasonKnightRemoval
                : selectionManager.treasonMode === 'place_knight'
                  ? progressCardController.handleConfirmTreasonPlacement
                  : undefined
          }
          confirmLabel={
            selectionManager.treasonMode === 'select_opponent'
              ? 'Confirm'
              : selectionManager.treasonMode === 'select_knight'
                ? 'Remove'
                : selectionManager.treasonMode === 'place_knight'
                  ? treasonSupplyAvailable && treasonHasLegalPlacement
                    ? 'Place'
                    : 'Resolve'
                  : undefined
          }
          disableConfirm={selectionManager.isSubmittingTreason}
          onCancel={
            selectionManager.treasonMode === 'select_opponent'
              ? onResetTreason
              : selectionManager.treasonMode === 'place_knight'
                ? progressCardController.handleCancelTreasonPlacement
                : undefined
          }
        />
      )}

      {showTaxationModal && (
        <TaxationPlacementModal
          isOpen={showTaxationModal}
          status={taxationPromptStatus}
          error={selectionManager.taxationError}
          hasSelection={!!selectionManager.selectedTaxationHexId}
          onCancel={onCancelSelection}
          onPlace={progressCardController.handleConfirmTaxationPlacement}
        />
      )}

      {showEngineeringPrompt && (
        <BoardSelectionPrompt
          title="Engineering"
          description="Click one of your cities without a wall to add a free city wall."
          status={engineeringPromptStatus}
          onCancel={onCancelSelection}
          onFinish={progressCardController.handleConfirmEngineerBuild}
          finishLabel="Build"
          finishDisabled={!selectionManager.selectedEngineerCityId || selectionManager.isEngineerSubmitting}
        />
      )}

      {showMedicinePrompt && (
        <BoardSelectionPrompt
          title="Medicine"
          description="Upgrade a settlement to a city for a discounted cost (2 ore + 1 wheat)."
          status={medicinePromptStatus}
          onCancel={onCancelSelection}
          onFinish={progressCardController.handleConfirmMedicineBuild}
          finishLabel="Upgrade"
          finishDisabled={!selectionManager.selectedMedicineCityId || selectionManager.isSubmittingMedicine}
        />
      )}

      {showRoadBuildingPrompt && (
        <BoardSelectionPrompt
          title="Road Building"
          description="Place up to 2 roads for free on your network."
          status={roadBuildingPromptStatus}
          onCancel={progressCardController.handleCancelRoadBuildingProgress}
          onFinish={progressCardController.handleFinalizeRoadBuildingProgress}
          finishLabel="Build"
          finishDisabled={(roadBuildingEffect?.placedEdges?.length ?? 0) < 2}
        />
      )}

      {showInventorPrompt && !selectionManager.isInventorConfirmOpen && (
        <BoardSelectionPrompt
          title="Inventor"
          description="Swap any two number tokens (not 2, 6, 8, or 12)."
          status={inventorPromptStatus}
          onCancel={onCancelSelection}
        />
      )}

      {showDiplomatPrompt && (
        <BoardSelectionPrompt
          title="Diplomat"
          description={
            selectionManager.diplomatStage === 'rebuild'
              ? 'Place your moved road on any legal edge.'
              : 'Select an open road to remove.'
          }
          status={diplomatPromptStatus}
          onCancel={onCancelSelection}
          onFinish={
            selectionManager.diplomatStage === 'rebuild'
              ? progressCardController.handleConfirmDiplomatRebuild
              : progressCardController.handleConfirmDiplomatRemove
          }
          finishLabel={selectionManager.diplomatStage === 'rebuild' ? 'Rebuild' : 'Remove'}
          finishDisabled={
            selectionManager.isSubmittingDiplomat ||
            (selectionManager.diplomatStage === 'rebuild'
              ? !selectionManager.diplomatRelocateEdgeId
              : !selectionManager.diplomatSelectedEdgeId)
          }
        />
      )}

      {selectionManager.isInventorConfirmOpen &&
        selectionManager.inventorSelection.firstValue !== undefined &&
        selectionManager.inventorSelection.secondValue !== undefined && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onCancelSelection} />
            <div
              className="relative bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-6 w-[360px] space-y-4 pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold">Inventor</h3>
              <p className="text-sm text-slate-200">
                Swapping <span className="font-semibold text-emerald-300">#{selectionManager.inventorSelection.firstValue}</span> with{' '}
                <span className="font-semibold text-cyan-300">#{selectionManager.inventorSelection.secondValue}</span>
              </p>
              {selectionManager.inventorError && (
                <div className="text-sm text-red-200 bg-red-900/50 border border-red-600 rounded-md px-3 py-2">
                  {selectionManager.inventorError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={onCancelSelection}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow cursor-pointer"
                  onClick={progressCardController.handleConfirmInventorSwap}
                >
                  Swap
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};
