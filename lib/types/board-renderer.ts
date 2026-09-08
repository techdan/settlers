import type { GameState, Vertex, Edge } from './index';
import type { Knight } from './player';
import type { BoardSelectionState, PendingBoardPlacement } from './board-selection-state';

/** Shared presentation contract. Renderers never submit game actions themselves. */
export interface BoardRendererProps {
  gameState: GameState;
  authoritativeState?: GameState;
  placementBusy?: boolean;
  playerId: string;
  hexSize: number;
  selectionState: BoardSelectionState;
  validation: { validVertices: Set<string>; validEdges: Set<string>; validHexes: Set<string> };
  vertices: Vertex[];
  renderEdges: Edge[];
  knightsMap: Map<string, Knight>;
  pendingPlacement: PendingBoardPlacement | null;
  displayedRobberHexId: string | null;
  onVertexClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onHexClick: (id: string) => void;
  onConfirmPlacement: () => void;
  onCancelPlacement: () => void;
  onCancelBuild: () => void;
}
