import { GameState } from '@/lib/types/game';

/**
 * Utility functions for managing game state transitions and active effects
 */

/**
 * Set an active effect on the game state
 * TODO: Implement when active effect tracking is clarified
 */
export function setActiveEffect(
  state: GameState,
  effect: string | null
): GameState {
  void effect;
  // TODO: Implement based on actual GameState structure
  return state;
}

/**
 * Clear the active effect from the game state
 * TODO: Implement when active effect tracking is clarified
 */
export function clearActiveEffect(state: GameState): GameState {
  // TODO: Implement based on actual GameState structure
  return state;
}

/**
 * Check if a specific effect is currently active
 * TODO: Implement when active effect tracking is clarified
 */
export function isEffectActive(state: GameState, effect: string): boolean {
  void state;
  void effect;
  // TODO: Implement based on actual GameState structure
  return false;
}

/**
 * Add a log entry to the game state
 */
export function addLog(
  state: GameState,
  message: string,
  playerId?: string
): GameState {
  state.logs.push({
    id: crypto.randomUUID(),
    message,
    timestamp: Date.now(),
    playerId,
  });

  return state;
}

/**
 * Add a card to a player's played progress cards
 * TODO: Implement tracking if needed
 */
export function addPlayedProgressCard(
  state: GameState,
  playerId: string,
  cardType: string
): GameState {
  void playerId;
  void cardType;
  // TODO: Implement based on actual GameState structure
  return state;
}

/**
 * Remove a card from a player's progress cards
 */
export function removeProgressCard(
  state: GameState,
  playerId: string,
  cardType: string
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.progressCards) return state;

  const cardIndex = player.progressCards.findIndex((card) => card === cardType);
  if (cardIndex !== -1) {
    player.progressCards.splice(cardIndex, 1);
  }

  return state;
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return state.currentTurn === playerId;
}

/**
 * Get all opponents of a player
 */
export function getOpponents(state: GameState, playerId: string) {
  return state.players.filter((p) => p.id !== playerId);
}

/**
 * Advance to the next player's turn
 */
export function advanceTurn(state: GameState): GameState {
  const currentIndex = state.players.findIndex((p) => p.id === state.currentTurn);
  const nextIndex = (currentIndex + 1) % state.players.length;
  state.currentTurn = state.players[nextIndex].id;
  return state;
}

/**
 * Safely clone game state for immutable updates
 * Note: This creates a shallow clone of the state object
 * Deep cloning of nested objects should be handled by the caller
 */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      resources: { ...p.resources },
      commodities: p.commodities ? { ...p.commodities } : undefined,
      progressCards: p.progressCards ? [...p.progressCards] : undefined,
    })),
    board: {
      ...state.board,
      hexes: { ...state.board.hexes },
      vertices: { ...state.board.vertices },
      edges: { ...state.board.edges },
    },
    logs: [...state.logs],
  };
}
