import { GameState, PlayerState } from '@/lib/types';
import { Knight } from '@/lib/types/player';

/**
 * Determine if a knight can be promoted given the player's improvements.
 * - Basic -> Strong: always allowed
 * - Strong -> Mighty: requires Politics level 3 (Fortress)
 * - Mighty: cannot be promoted
 */
export function isKnightPromotable(knight: Knight, player: PlayerState): boolean {
    if (knight.level === 'mighty') return false;

    if (knight.level === 'strong') {
        const politicsLevel = player.improvements?.politics ?? 0;
        return politicsLevel >= 3;
    }

    return true;
}

/**
 * Get all promotable knights for a player.
 */
export function getPromotableKnights(gameState: GameState, playerId: string): Knight[] {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.knights) return [];

    return player.knights.filter(knight => isKnightPromotable(knight, player));
}
