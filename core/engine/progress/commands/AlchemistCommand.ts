import { GameState } from '@/lib/types/game';
import { ProgressCardCommand } from '../types/CardConfig';
import { addLog } from '../utilities/StateManagement';
import { getCardMetadata } from '../progress-card-definitions';
import {
  processEventDieRoll,
  getCategoryFromColor,
  getEligiblePlayersForCardDraw,
} from '../../dice/event-die-manager';
import { distributeResources, getTotalResources, logDistribution } from '../../resources/resource-manager';
import { distributeCommodities, getTotalCommodities } from '../../resources/commodity-manager';
import { getRobberDiscardThreshold } from '../../../utils/city-wall-utils';
import { drawProgressCard } from '../progress-card-manager';
import { setPhase } from '@/lib/services/timer-service';

/**
 * Alchemist Card Command
 * Science card: Choose the dice results before rolling (1-6 each)
 *
 * This is the most complex progress card as it simulates an entire dice roll,
 * including event die, resource distribution, robber handling, and aqueduct checks.
 *
 * Legacy implementation: executeAlchemist() (lines 455-579)
 */
export class AlchemistCommand implements ProgressCardCommand {
  execute(state: GameState, playerId: string, options?: any): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const chosenDice1 = options?.chosenDice1 as number | undefined;
    const chosenDice2 = options?.chosenDice2 as number | undefined;

    if (chosenDice1 === undefined || chosenDice2 === undefined) {
      throw new Error('Alchemist requires choosing both dice values (1-6 each)');
    }

    if (chosenDice1 < 1 || chosenDice1 > 6 || chosenDice2 < 1 || chosenDice2 > 6) {
      throw new Error('Dice values must be between 1 and 6');
    }

    if (state.phase !== 'waiting_for_roll') {
      throw new Error('Alchemy can only be played before rolling dice');
    }

    const pendingAlchemy = state.pendingAlchemy;
    if (!pendingAlchemy || pendingAlchemy.playerId !== playerId) {
      throw new Error('Alchemy event die must be revealed before choosing dice');
    }

    const d1 = chosenDice1;
    const d2 = chosenDice2;
    const total = d1 + d2;

    // Log the Alchemy play
    const cardMeta = getCardMetadata('alchemist');
    addLog(state, `played ${cardMeta.name} and chose ${d1} + ${d2} = ${total}`, playerId);

    // Set the dice roll
    state.diceRoll = { d1, d2, total };

    // Import dice and resource utilities (static imports at top)

    // Resolve the event die result that was revealed and locked before selection.
    if (state.gameMode === 'cities_and_knights') {
      const eventDieResult = pendingAlchemy.eventDieFace;
      processEventDieRoll(state, eventDieResult, d1);

      if (eventDieResult !== 'ship') {
        const category = getCategoryFromColor(eventDieResult);
        const eligiblePlayerIds = getEligiblePlayersForCardDraw(state, category, d1);
        eligiblePlayerIds.forEach((id: string) => {
          drawProgressCard(state, id, category);
        });
      }
    }
    state.pendingAlchemy = undefined;

    // Handle robber (7)
    state.discardContext = undefined;
    if (total === 7) {
      const playersToDiscard = state.players.filter((p) => {
        const threshold = getRobberDiscardThreshold(state, p.id);
        return (getTotalResources(p) + getTotalCommodities(p)) > threshold;
      });

      if (playersToDiscard.length > 0) {
        state.discardContext = { type: 'robber' };
        state.phase = 'discarding';
        state.logs.push({
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          message: 'Players exceeding their hand limit must discard half',
        });
      } else {
        if (state.gameMode === 'cities_and_knights' && !state.hasBarbariansAttacked) {
          state = setPhase(state, 'main_phase');
          state.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: '7 rolled, but the robber stays in the desert until the first barbarian attack.',
          });
        } else {
          state.phase = 'robber_placement';
          state.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `${player.name} must move the robber`,
          });
        }
      }
    } else {
      // Snapshot resources/commodities for Aqueduct check
      const initialTotals: Record<string, number> = {};
      state.players.forEach((p) => {
        initialTotals[p.id] = getTotalResources(p) + getTotalCommodities(p);
      });

      // Distribute resources and commodities
      const resourceDistribution = distributeResources(state, total);
      const commodityDistribution = distributeCommodities(state, total);
      logDistribution(state, resourceDistribution, commodityDistribution);

      // Check for Aqueduct trigger
      if (state.gameMode === 'cities_and_knights') {
        const eligibleForAqueduct: string[] = [];
        state.players.forEach((p) => {
          if ((p.improvements?.science || 0) >= 3) {
            const currentTotal = getTotalResources(p) + getTotalCommodities(p);
            if (currentTotal === initialTotals[p.id]) {
              eligibleForAqueduct.push(p.id);
            }
          }
        });

        if (eligibleForAqueduct.length > 0) {
          state.pendingAqueduct = eligibleForAqueduct;
          const names = eligibleForAqueduct
            .map((id) => state.players.find((p) => p.id === id)?.name)
            .join(', ');
          state.logs.push({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            message: `Aqueduct triggered! ${names} can choose a resource.`,
          });
        }
      }

      if (state.phase === 'waiting_for_roll') {
        state = setPhase(state, 'main_phase');
      }
    }

    return state;
  }
}
