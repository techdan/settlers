import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    useSelectionManager,
    type SelectionState,
} from '@/lib/hooks/useSelectionManager';

function selectionValues(state: SelectionState): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(state).filter(([, value]) => typeof value !== 'function')
    );
}

describe('useSelectionManager', () => {
    it('starts every selection, submission, and dialog field at its neutral value', () => {
        const { result } = renderHook(() => useSelectionManager());

        expect(selectionValues(result.current)).toMatchInlineSnapshot(`
          {
            "buildMode": null,
            "buildingMetropolisType": null,
            "diplomatError": null,
            "diplomatRelocateEdgeId": null,
            "diplomatSelectedEdgeId": null,
            "diplomatSelectedEdgeOwner": null,
            "diplomatStage": null,
            "intrigueError": null,
            "intrigueTarget": null,
            "inventorError": null,
            "inventorSelection": {},
            "isCraneDialogOpen": false,
            "isEngineerSubmitting": false,
            "isInventorConfirmOpen": false,
            "isMerchantModalOpen": false,
            "isMetropolisSubmitting": false,
            "isPlayerCityManagementOpen": false,
            "isSubmittingDiplomat": false,
            "isSubmittingIntrigue": false,
            "isSubmittingMedicine": false,
            "isSubmittingTreason": false,
            "isTaxationModalOpen": false,
            "isTreasonModalOpen": false,
            "merchantError": null,
            "movingKnightId": null,
            "selectedCityId": null,
            "selectedEngineerCityId": null,
            "selectedKnightId": null,
            "selectedMedicineCityId": null,
            "selectedMerchantHexId": null,
            "selectedMetropolisCityId": null,
            "selectedSettlementId": null,
            "selectedSmithKnightIds": [],
            "selectedTaxationHexId": null,
            "selectingCityForEngineer": false,
            "selectingCityForMedicine": false,
            "selectingCityForMetropolis": null,
            "selectingEdgeForCard": null,
            "selectingHexForCard": null,
            "selectingKnightsForSmith": false,
            "selectingVertexForCard": null,
            "smithError": null,
            "taxationError": null,
            "treasonError": null,
            "treasonMode": null,
            "treasonSelectedKnightId": null,
            "treasonSelectedOpponentId": null,
            "treasonSelectedPlacementVertexId": null,
          }
        `);
    });

    it('updates independent board and progress-card selection clusters', () => {
        const { result } = renderHook(() => useSelectionManager());

        act(() => {
            result.current.setBuildMode('road');
            result.current.setMovingKnightId('knight-1');
            result.current.setSelectingCityForMetropolis('science');
            result.current.setInventorSelection({
                firstHexId: '0,0',
                firstValue: 5,
            });
            result.current.setTreasonMode('select_knight');
            result.current.setTreasonSelectedKnightId('knight-2');
        });

        expect(result.current).toMatchObject({
            buildMode: 'road',
            movingKnightId: 'knight-1',
            selectingCityForMetropolis: 'science',
            inventorSelection: {
                firstHexId: '0,0',
                firstValue: 5,
            },
            treasonMode: 'select_knight',
            treasonSelectedKnightId: 'knight-2',
        });
        expect(result.current.selectedCityId).toBeNull();
        expect(result.current.merchantError).toBeNull();
    });

    it('restores every managed value to its initial state', () => {
        const { result } = renderHook(() => useSelectionManager());
        const initialValues = selectionValues(result.current);

        act(() => {
            result.current.setBuildMode('city');
            result.current.setSelectedCityId('city-1');
            result.current.setSelectedSettlementId('settlement-1');
            result.current.setSelectedKnightId('knight-1');
            result.current.setMovingKnightId('knight-2');
            result.current.setBuildingMetropolisType('trade');
            result.current.setSelectingCityForMetropolis('science');
            result.current.setSelectedMetropolisCityId('city-2');
            result.current.setIsMetropolisSubmitting(true);
            result.current.setSelectingHexForCard('inventor');
            result.current.setInventorSelection({ firstHexId: '0,0', firstValue: 5 });
            result.current.setIsInventorConfirmOpen(true);
            result.current.setInventorError('inventor error');
            result.current.setIsMerchantModalOpen(true);
            result.current.setSelectedMerchantHexId('1,0');
            result.current.setMerchantError('merchant error');
            result.current.setIsTaxationModalOpen(true);
            result.current.setSelectedTaxationHexId('0,1');
            result.current.setTaxationError('taxation error');
            result.current.setSelectingVertexForCard('intrigue');
            result.current.setIntrigueTarget({
                knightId: 'knight-3',
                opponentId: 'p2',
                vertexId: 'vertex-1',
            });
            result.current.setIntrigueError('intrigue error');
            result.current.setIsSubmittingIntrigue(true);
            result.current.setSelectingEdgeForCard('diplomat');
            result.current.setDiplomatStage('rebuild');
            result.current.setDiplomatSelectedEdgeId('edge-1');
            result.current.setDiplomatSelectedEdgeOwner('p2');
            result.current.setDiplomatRelocateEdgeId('edge-2');
            result.current.setDiplomatError('diplomat error');
            result.current.setIsSubmittingDiplomat(true);
            result.current.setIsTreasonModalOpen(true);
            result.current.setTreasonMode('place_knight');
            result.current.setTreasonSelectedOpponentId('p2');
            result.current.setTreasonSelectedKnightId('knight-4');
            result.current.setTreasonSelectedPlacementVertexId('vertex-2');
            result.current.setTreasonError('treason error');
            result.current.setIsSubmittingTreason(true);
            result.current.setSelectingCityForEngineer(true);
            result.current.setSelectedEngineerCityId('city-3');
            result.current.setIsEngineerSubmitting(true);
            result.current.setSelectingCityForMedicine(true);
            result.current.setSelectedMedicineCityId('settlement-2');
            result.current.setIsSubmittingMedicine(true);
            result.current.setSelectingKnightsForSmith(true);
            result.current.setSelectedSmithKnightIds(['knight-5']);
            result.current.setSmithError('smith error');
            result.current.setIsCraneDialogOpen(true);
            result.current.setIsPlayerCityManagementOpen(true);
        });

        expect(selectionValues(result.current)).not.toEqual(initialValues);

        act(() => {
            result.current.clearAllSelections();
        });

        expect(selectionValues(result.current)).toEqual(initialValues);
    });
});
