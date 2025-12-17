import { DiceTotal, GameState, PlayerState, EMPTY_DICE_STATS, EMPTY_EVENT_DIE_STATS } from '@/lib/types';
import { ResourceType } from '@/core/rules/board-constants';
import { Edge, Vertex } from '@/lib/types/board';
import { isMerchantFleetEffect } from '@/lib/types/effects';
import { getGameStateByRoomId, updateGameState, createGame } from '@/lib/repositories/game-repository';
import { updateRoomStatus } from '@/lib/repositories/room-repository';
import { distributeResources, getTotalResources, logDistribution } from '@/core/engine/resources/resource-manager';
import { distributeCommodities, getTotalCommodities } from '@/core/engine/resources/commodity-manager';
import { rollEventDie, processEventDieRoll, getCategoryFromColor, getEligiblePlayersForCardDraw } from '@/core/engine/dice/event-die-manager';
import { GAME_CONSTANTS } from '@/core/rules/constants';
import { checkVictoryCondition, updateAllVictoryPoints } from '@/core/rules/victory-conditions';
import { generateStandardBoard, getDesertHexId } from '@/core/engine/board/board-generator';
import { createDevCardDeck } from '@/core/engine/development/dev-card-manager';
import { getCanonicalVertexId, getCanonicalEdgeId } from '@/lib/hex';
import { randomUUID } from 'crypto';
import { getRobberDiscardThreshold } from '@/core/utils/city-wall-utils';
import { drawProgressCard } from '@/core/engine/progress/progress-card-manager';
import { canRollDice } from '@/lib/services/obligation-tracker';
import { setPhase, stopTurnTimer } from '@/lib/services/timer-service';

/**
 * Game Service
 * Orchestrates core game operations (dice, turns, etc.)
 */

const createEmptyDiceStats = () => ({ ...EMPTY_DICE_STATS });
const createEmptyEventDieStats = () => ({ ...EMPTY_EVENT_DIE_STATS });

const normalizeDiceStats = (stats?: GameState['diceStats']) => ({
    ...EMPTY_DICE_STATS,
    ...(stats || {})
});
const normalizeEventDieStats = (stats?: GameState['eventDieStats']) => ({
    ...EMPTY_EVENT_DIE_STATS,
    ...(stats || {})
});

const toDiceTotal = (total: number): DiceTotal => {
    if (total < 2 || total > 12) {
        throw new Error(`Invalid dice total ${total}`);
    }
    return total as DiceTotal;
};

/**
 * Create and initialize a new game
 *
 * @param roomId - Room ID
 * @param gameMode - Game mode ('base' or 'cities_and_knights')
 * @returns Created game state
 */
export async function startGame(roomId: string, gameMode: 'base' | 'cities_and_knights' = 'base'): Promise<GameState> {
    // 1. Get players with assigned colors
    const { LobbyService } = await import('@/lib/services/lobby-service');
    const roomPlayers = await LobbyService.getPlayersWithColors(roomId);

    if (roomPlayers.length < 1) throw new Error('Not enough players');

    // 2. Shuffle players
    const shuffledPlayers = [...roomPlayers].sort(() => Math.random() - 0.5);
    const turnOrder = shuffledPlayers.map(p => p.id);

    // 3. Initialize Player States
    const playerStates: PlayerState[] = shuffledPlayers.map((p, i) => {
        const basePlayer = {
            id: p.id,
            name: p.name,
            color: p.color as PlayerState['color'],
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
    const lobbyState = await LobbyService.getLobbyState(roomId);

    let hexes;
    if (lobbyState && lobbyState.boardPreview && lobbyState.boardPreview.length > 0) {
        hexes = lobbyState.boardPreview;
    } else {
        // Fallback to standard board if nothing generated
        hexes = generateStandardBoard();
    }
    const vertices: Record<string, Vertex> = {};
    const edges: Record<string, Edge> = {};

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

    // 6.1. Get timer configuration from lobby
    const timerConfig = lobbyState?.timerConfig;

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
        diceStats: createEmptyDiceStats(),
        eventDieStats: createEmptyEventDieStats(),
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
        hasBarbariansAttacked: gameMode === 'cities_and_knights' ? false : undefined,
        metropolises: gameMode === 'cities_and_knights' ? {
            science: { type: 'science', owner: null, vertexId: null },
            trade: { type: 'trade', owner: null, vertexId: null },
            politics: { type: 'politics', owner: null, vertexId: null },
        } : undefined,
        progressDecks,
        eventDieRoll: undefined,
        // Timer fields (initialized from lobby config)
        timerConfig: timerConfig?.enabled ? timerConfig : undefined,
        playerTimeBanks: timerConfig?.enabled
            ? Object.fromEntries(turnOrder.map(playerId => [playerId, timerConfig.timeBank]))
            : undefined,
        playerTotalTime: timerConfig?.enabled
            ? Object.fromEntries(turnOrder.map(playerId => [playerId, 0]))
            : undefined,
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
    let gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');
    // Const alias for use in closures (TypeScript doesn't preserve null narrowing for let variables in callbacks)
    const state = gameState;

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    // Check for pending obligations (global gating rule)
    const obligationCheck = canRollDice(gameState);
    if (!obligationCheck.canRollDice) {
        const waitingOnPlayers = obligationCheck.waitingOn
            .map(id => state.players.find(p => p.id === id)?.name || id)
            .join(', ');
        throw new Error(`Cannot roll dice. Waiting on: ${waitingOnPlayers}`);
    }

    // Block rolling if Aqueduct selections from the previous turn are still pending
    if (gameState.pendingAqueduct && gameState.pendingAqueduct.length > 0 && gameState.phase === 'aqueduct_selection') {
        throw new Error('Cannot roll until pending Aqueduct selections are finished');
    }

    if (gameState.phase !== 'waiting_for_roll') {
        console.error('[rollDice] Phase mismatch! Expected: waiting_for_roll, Got:', gameState.phase);
        throw new Error('Not waiting for dice roll');
    }

    // Roll dice
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    gameState.diceRoll = { d1, d2, total };
    const totalKey = toDiceTotal(total);
    gameState.diceStats = normalizeDiceStats(gameState.diceStats);
    gameState.diceStats[totalKey] = (gameState.diceStats[totalKey] || 0) + 1;
    gameState.eventDieStats = normalizeEventDieStats(gameState.eventDieStats);

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

        // Handle progress card draws immediately when a color is rolled
        if (eventDieResult !== 'ship') {
            const category = getCategoryFromColor(eventDieResult);
            const eligiblePlayerIds = getEligiblePlayersForCardDraw(state, category, d1);
            eligiblePlayerIds.forEach(id => {
                drawProgressCard(state, id, category);
            });
        }
    }

    // Clear any stale discard context before handling the new roll
    gameState.discardContext = undefined;

    // Handle robber (7)
    if (total === 7) {
        // Check if any players need to discard
        // City walls increase the discard threshold (7 + 2 per wall)
        const playersToDiscard = gameState.players.filter(p => {
            const threshold = getRobberDiscardThreshold(state, p.id);
            return getTotalResources(p) > threshold;
        });

        if (playersToDiscard.length > 0) {
            gameState.discardContext = { type: 'robber' };
            gameState.phase = 'discarding';
            gameState.logs.push({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `Players exceeding their hand limit must discard half`
            });
        } else {
            // C&K Rule: Robber doesn't move until first barbarian attack
            if (gameState.gameMode === 'cities_and_knights' && !gameState.hasBarbariansAttacked) {
                gameState = setPhase(gameState, 'main_phase');
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `7 rolled, but the robber stays in the desert until the first barbarian attack.`
                });
            } else {
                gameState.phase = 'robber_placement';
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `${player.name} must move the robber`
                });
            }
        }
    } else {
        // Snapshot resources/commodities for Aqueduct check
        const initialTotals: Record<string, number> = {};
        gameState.players.forEach(p => {
            initialTotals[p.id] = getTotalResources(p) + getTotalCommodities(p);
        });

        // Distribute resources
        const resourceDistribution = distributeResources(gameState, total);

        // Distribute commodities (C&K expansion only)
        const commodityDistribution = distributeCommodities(gameState, total);

        // Combine resource/commodity logs so each player gets a single entry
        logDistribution(gameState, resourceDistribution, commodityDistribution);

        // Check Aqueduct (Science level 3)
        if (gameState.gameMode === 'cities_and_knights') {
            const eligibleForAqueduct: string[] = [];
            gameState.players.forEach(p => {
                if ((p.improvements?.science || 0) >= 3) {
                    const currentTotal = getTotalResources(p) + getTotalCommodities(p);
                    if (currentTotal === initialTotals[p.id]) {
                        // No change in total count => received nothing
                        eligibleForAqueduct.push(p.id);
                    }
                }
            });

            if (eligibleForAqueduct.length > 0) {
                gameState.pendingAqueduct = eligibleForAqueduct;
                const names = eligibleForAqueduct.map(id => state.players.find(p => p.id === id)?.name).join(', ');
                gameState.logs.push({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    message: `Aqueduct triggered! ${names} can choose a resource.`,
                });
            }
        }

        // Set to main phase if not changed by event die processing or Aqueduct
        if (gameState.phase === 'waiting_for_roll') {
            gameState = setPhase(gameState, 'main_phase');
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
    let gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate turn
    if (gameState.currentTurn !== playerId) {
        throw new Error('Not your turn');
    }

    if (gameState.phase !== 'main_phase') {
        throw new Error('Can only end turn during main phase');
    }

    // Stop turn timer and refund unused time
    gameState = stopTurnTimer(gameState, playerId);

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Cities & Knights: Check Commercial Harbor responses are complete
    if (gameState.pendingCommercialHarbor) {
        const pendingResponses = gameState.pendingCommercialHarbor.offers.filter(
            o => o.offeredResource !== null && o.response === undefined
        ).length;
        if (pendingResponses > 0) {
            throw new Error(`Cannot end turn while ${pendingResponses} Commercial Harbor response${pendingResponses === 1 ? ' is' : 's are'} pending`);
        }
    }

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
    const nextPlayerId = gameState.turnOrder[nextIndex];
    gameState.currentTurn = nextPlayerId;
    const hasPendingAqueduct = !!(gameState.pendingAqueduct && gameState.pendingAqueduct.length > 0);
    gameState.phase = hasPendingAqueduct ? 'aqueduct_selection' : 'waiting_for_roll';
    gameState.aqueductResumePhase = hasPendingAqueduct ? 'waiting_for_roll' : undefined;

    // Clear dice roll
    gameState.diceRoll = undefined;

    // Clear trade offer
    gameState.tradeOffer = null;

    // Clear any Merchant Fleet effects from the ending player
    if (gameState.activeEffects) {
        const activeEffects = gameState.activeEffects;
        gameState.activeEffects = activeEffects.filter(
            effect => !(isMerchantFleetEffect(effect) && effect.playerId === playerId)
        );
    }

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

/**
 * Claim a resource via Aqueduct ability
 *
 * @param roomId - Room ID
 * @param playerId - Player ID
 * @param resource - Resource to claim
 * @returns Updated game state
 */
export async function claimAqueductResource(
    roomId: string,
    playerId: string,
    resource: ResourceType
): Promise<GameState> {
    // Get game state
    let gameState = await getGameStateByRoomId(roomId);
    if (!gameState) throw new Error('Game not found');

    // Validate player eligibility
    if (!gameState.pendingAqueduct || !gameState.pendingAqueduct.includes(playerId)) {
        throw new Error('You are not eligible for Aqueduct');
    }

    const resolvingFromBlockedPhase = gameState.phase === 'aqueduct_selection';
    const resumePhase = gameState.aqueductResumePhase;

    // Get player
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Add resource
    player.resources[resource]++;

    // Remove from pending list
    gameState.pendingAqueduct = gameState.pendingAqueduct.filter(id => id !== playerId);

    // Log
    gameState.logs.push({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: `${player.name} used Aqueduct to take 1 ${resource}`,
        playerId
    });

    // If no more pending players, return to main phase
    const hasPendingAqueduct = gameState.pendingAqueduct.length > 0;
    if (!hasPendingAqueduct) {
        gameState.pendingAqueduct = undefined;
        gameState.aqueductResumePhase = undefined;

        // Resume the phase we were blocking, or fall back to main_phase if none was set
        if (resumePhase) {
            gameState.phase = resumePhase;
        } else if (resolvingFromBlockedPhase) {
            gameState = setPhase(gameState, 'main_phase');
        }
    }

    // Save
    await updateGameState(gameState);

    return gameState;
}
