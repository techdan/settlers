import type { BoardRendererProps } from '@/lib/types/board-renderer';
import type { Knight } from '@/lib/types/player';

export function vertexIsSelected(props: BoardRendererProps, id: string, knight?: Knight): boolean {
  const s = props.selectionState;
  return s.citySelection?.selectedCityId === id
    || s.vertexCardSelection?.placementVertexId === id
    || (!!knight && (s.vertexCardSelection?.selectedKnightId === knight.id
      || !!s.smithSelection?.selectedKnightIds?.includes(knight.id)
      || s.movingKnightId === knight.id));
}

export function edgeIsSelected(props: BoardRendererProps, id: string): boolean {
  const s = props.selectionState.edgeCardSelection;
  return s?.selectedEdgeId === id || s?.removedEdgeId === id || s?.relocatedEdgeId === id;
}

export function hexSelection(props: BoardRendererProps, id: string): 'primary' | 'secondary' | null {
  const s = props.selectionState.hexCardSelection;
  if (s?.inventorSelection?.secondHexId === id) return 'secondary';
  if (s?.inventorSelection?.firstHexId === id || s?.selectedHexId === id) return 'primary';
  return null;
}

export function selectionInstruction(props: BoardRendererProps): string | null {
  const { gameState: g, selectionState: s, pendingPlacement: pending } = props;
  if (pending) return `Confirm this ${pending.type.replaceAll('_', ' ')} placement`;
  if (s.movingKnightId) return 'Choose a highlighted destination for your knight';
  if (s.smithSelection) return 'Choose highlighted knights to promote';
  if (s.vertexCardSelection) return `${s.vertexCardSelection.type.replaceAll('_', ' ')} · choose a highlighted intersection`;
  if (s.edgeCardSelection) return `Diplomat · choose a highlighted road to ${s.edgeCardSelection.stage === 'rebuild' ? 'relocate' : 'remove'}`;
  if (s.citySelection) return `${s.citySelection.type} · choose a highlighted ${s.citySelection.type === 'medicine' ? 'settlement' : 'city'}`;
  if (s.hexCardSelection?.type === 'inventor') return 'Inventor · choose two highlighted number tokens';
  if (s.hexCardSelection) return `${s.hexCardSelection.type} · choose a highlighted tile`;
  if (s.buildingMetropolisType) return `Choose a city for your ${s.buildingMetropolisType} metropolis`;
  if (s.buildMode) return `Choose a highlighted site for your ${s.buildMode.replaceAll('_', ' ')}`;
  if (g.phase.includes('setup') && g.currentTurn === props.playerId) return g.phase.endsWith('road') ? 'Place a road beside your new building' : 'Choose a highlighted intersection to build';
  if (g.phase === 'robber_placement' && g.currentTurn === props.playerId) return 'Choose a highlighted tile for the robber';
  if (g.phase === 'barbarian_city_selection' && g.pendingBarbarianVictims?.includes(props.playerId)) return 'Choose the city to lose to the barbarians';
  if (g.phase === 'knight_displacement' && g.pendingDisplacement?.playerId === props.playerId) return 'Choose a highlighted refuge for your displaced knight';
  if (g.phase.startsWith('road_building') && g.currentTurn === props.playerId) return 'Choose a highlighted edge for your free road';
  return null;
}

export function canCancelSelection(props: BoardRendererProps): boolean {
  const s = props.selectionState;
  return !!(s.buildMode || s.movingKnightId || s.smithSelection || s.hexCardSelection
    || s.vertexCardSelection || s.edgeCardSelection || s.citySelection || s.buildingMetropolisType);
}
