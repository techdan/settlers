import { GameState, PlayerState } from '@/lib/types';
import { getGameStateByRoomId, updateGameState, createGame } from '@/lib/repositories/game-repository';
import { findPlayersByRoomId } from '@/lib/repositories/player-repository';
import { updateRoomStatus } from '@/lib/repositories/room-repository';
import { distributeResources, getTotalResources } from '@/core/engine/resources/resource-manager';
import { distributeCommodities } from '@/core/engine/resources/commodity-manager';
import { rollEventDie, processEventDieRoll } from '@/core/engine/dice/event-die-manager';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { checkVictoryCondition, updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { generateStandardBoard, getDesertHexId } from '@/core/engine/board/board-generator';
import { createDevCardDeck } from '@/core/engine/development/dev-card-manager';
import { getCanonicalVertexId, getCanonicalEdgeId } from '@/lib/hex';
import { randomUUID } from 'crypto';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';

/**
 * Game Service
 * Orchestrates core game operations (dice, turns, etc.)
 */

/**
 * Create and initialize a new game
 *
 * @param roomId - Room ID
 * @param gameMode - Game mode ('base' or 'cities_and_knights')
 * @returns Created game state
 */
export async function startGame(roomId: string, gameMode: 'base' | 'cities_and_knights' = 'base'): Promise<GameState> {
    // 1. Get players
    const roomPlayers = await findPlayersByRoomId(roomId);

    if (roomPlayers.length < 1) throw new Error('Not enough players');

    // 2. Shuffle players
    const shuffledPlayers = [...roomPlayers].sort(() => Math.random() - 0.5);
    const turnOrder = shuffledPlayers.map(p => p.id);

    // 3. Initialize Player States
    const playerStates: PlayerState[] = shuffledPlayers.map((p, i) => {
        const basePlayer = {
            id: p.id,
            name: p.name,
            color: ['red', 'blue', 'white', 'orange'][i % 4] as any,
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            devCards: { knight: 0, victory_point: 0, road_building: 0, year_of_plenty: 0, monopoly: 0 },
            settlementsRemaining: 5,
            citiesRemaining: 4,
            roadsRemaining: 15,
            victoryPoints: 0,
            knightsPlayed: 0,
            hasPlayedDevCard: false,
            devCardsBoughtThisTurn: [],
            defenderVPTokens: 0, // C&K field, but required in type
        };

        // Add Cities & Knights fields if in C&K mode
        if (gameMode === 'cities_and_knights') {
            return {
                ...basePlayer,
                commodities: { paper: 0, cloth: 0, coin: 0 },
                improvements: { science: 0, trade: 0, politics: 0 },
                progressCards: [],
                revealedVPCards: [], // VP cards (Printer, Constitution) auto-revealed
                knights: [],
                metropolisOwned: [],
                activeKnightCount: 0,
                defenderVPTokens: 0, // Physical VP tokens from Defender of Catan
            };
        }

        return basePlayer;
    });

    // 4. Generate Board
    // Check if lobby has a generated board
    const { LobbyService } = await import('@/lib/services/lobby-service');
    const lobbyState = await LobbyService.getLobbyState(roomId);

    let hexes;
    if (lobbyState && lobbyState.boardPreview && lobbyState.boardPreview.length > 0) {
        hexes = lobbyState.boardPreview;
    } else {
        // Fallback to standard board if nothing generated
        hexes = generateStandardBoard();
    }
    const vertices: Record<string, any> = {};
    const edges: Record<string, any> = {};

    hexes.forEach(hex => {
        // Vertices (0-5)
        for (let d = 0; d < 6; d++) {
            const vId = getCanonicalVertexId(hex.hex.q, hex.hex.r, d);
            if (!vertices[vId]) {
                const [q, r, dir] = vId.split(',').map(Number);
                vertices[vId] = {
                    id: vId,
                    q, r, d: dir,
                    owner: null,
                    structure: null
                };
            }
        }
        // Edges (0-5)
        for (let d = 0; d < 6; d++) {
            const eId = getCanonicalEdgeId(hex.hex.q, hex.hex.r, d);
            if (!edges[eId]) {
                const [q, r, dir] = eId.split(',').map(Number);
                edges[eId] = {
                    id: eId,
                    q, r, d: dir,
                    owner: null,
                    structure: null
                };
            }
        }
    });

    // 5. Create Dev Card Deck
    const devCardDeck = createDevCardDeck();

    // 5.1. Create Progress Card Decks (C&K mode only)
    let progressDecks = undefined;
    if (gameMode === 'cities_and_knights') {
        const { createProgressDecks } = await import('@/core/engine/progress/progress-card-definitions');
        progressDecks = createProgressDecks();
    }

    // 6. Find desert hex for robber
    const desertHexId = getDesertHexId(hexes);

    // 7. Create Game State
    const gameState: GameState = {
        id: randomUUID(),
        roomId,
        players: playerStates,
        board: {
            hexes,
            vertices,
            edges
        },
        currentTurn: turnOrder[0],
        turnOrder,
        phase: 'setup_round_1_settlement',
        winner: null,
        lastPlacedSettlementId: null,
        robberHexId: desertHexId,
        devCardDeck,
        longestRoadOwner: null,
        longestRoadLength: 0,
        largestArmyOwner: null,
        logs: [{
            id: randomUUID(),
            timestamp: Date.now(),
            message: `Game started!${gameMode === 'cities_and_knights' ? ' (Cities & Knights mode)' : ''}`
        }],
        // Cities & Knights fields
        gameMode,
        barbarianPosition: gameMode === 'cities_and_knights' ? 0 : undefined,
        metropolises: gameMode === 'cities_and_knights' ? {
            science: { type: 'science', owner: null, vertexId: null },
            trade: { type: 'trade', owner: null, vertexId: null },
            politics: { type: 'politics', owner: null, vertexId: null },
        } : undefined,
        progressDecks,
        eventDieRoll: undefined,
    };

    // 8. Save to database
    await createGame(roomId, gameState);

    // 9. Update room status
    await updateRoomStatus(roomId, 'in_progress');

    return gameState;
}

/**
 * Roll dice and distribute resources
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @returns Updated game state with dice roll
 */
export async function rollDice(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'waiting_for_roll') {
        throw new Error('Not waiting for dice roll');
    }

    // Roll dice
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    gameState.diceRoll = { d1, d2, total };

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Add log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} rolled ${d1} + ${d2} = ${total}`,
        playerId
    });

    // Roll and process event die (C&K expansion only)
    // Note: Event die is rolled even on a 7!
    if (gameState.gameMode === 'cities_and_knights') {
        const eventDieResult = rollEventDie();
        processEventDieRoll(gameState, eventDieResult, d1); // d1 is the red die
        // Note: processEventDieRoll may change phase to 'barbarian_attack'
    }

    // Handle robber (7)
    if (total === 7) {
        // Check if any players need to discard
        // City walls increase the discard threshold (7 + 2 per wall)
        const playersToDiscard = gameState.players.filter(p => {
            const threshold = getRobberDiscardThreshold(gameState, p.id);
            return getTotalResources(p) > threshold;
        });

        if (playersToDiscard.length > 0) {
            gameState.phase = 'discarding';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `Players exceeding their hand limit must discard half`
            });
        } else {
            gameState.phase = 'robber_placement';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${player.name} must move the robber`
            });
        }
    } else {
        // Distribute resources
        distributeResources(gameState, total);

        // Distribute commodities (C&K expansion only)
        distributeCommodities(gameState, total);

        // Set to main phase if not changed by event die processing
        if (gameState.phase === 'waiting_for_roll') {
            gameState.phase = 'main_phase';
        }
    }

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * End current player's turn
 * 
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @returns Updated game state
 */
export async function endTurn(
    roomId: string,
    playerId: string
): Promise<GameState> {
    // Get game state
    const gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only end turn during main phase');
    }

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Cities & Knights: Check progress card hand limit (max 4 at end of turn)
    if (gameState.gameMode === 'cities_and_knights' && player.progressCards) {
        if (player.progressCards.length > 4) {
            throw new Error(`You must discard down to 4 progress cards before ending your turn (you have ${player.progressCards.length})`);
        }
    }

    // Recalculate victory points (in case something changed during the turn)
    updateAllVictoryPoints(gameState);

    // Check for victory before ending turn
    checkAndUpdateVictory(gameState);

    // If someone won, don't proceed to next turn
    if (gameState.winner) {
        await updateGameState(gameState);
        return gameState;
    }

    // Move to next player
    const currentIndex = gameState.turnOrder.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[nextIndex];
    gameState.phase = 'waiting_for_roll';

    // Clear dice roll
    gameState.diceRoll = undefined;

    // Clear trade offer
    gameState.tradeOffer = null;

    // Reset dev card flags and move bought cards to hand
    player.hasPlayedDevCard = false;
    if (!player.devCardsBoughtThisTurn) {
        player.devCardsBoughtThisTurn = [];
    }
    player.devCardsBoughtThisTurn.forEach(card => {
        player.devCards[card] = (player.devCards[card] || 0) + 1;
    });
    player.devCardsBoughtThisTurn = [];

    // Add log
    const nextPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} ended their turn. ${nextPlayer?.name}'s turn begins.`
    });

    // Save to database
    await updateGameState(gameState);

    return gameState;
}

/**
 * Check and update game victory condition
 * 
 * @param gameState - Current game state
 * @returns Winner ID if someone won, null otherwise
 */
export function checkAndUpdateVictory(gameState: GameState): string | null {
    const winnerId = checkVictoryCondition(gameState);

    if (winnerId) {
        gameState.winner = winnerId;
        gameState.phase = 'game_over';

        const winner = gameState.players.find(p => p.id === winnerId);
        gameState.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${winner?.name} wins with ${winner?.victoryPoints} victory points!`
        });
    }

    return winnerId;
}
