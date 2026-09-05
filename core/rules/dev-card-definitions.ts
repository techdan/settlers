import type { DevCardType } from '@/lib/types/player';

export const DEV_CARD_DEFINITIONS: Record<DevCardType, { name: string; description: string }> = {
    knight: {
        name: 'Knight (Soldier)',
        description: 'Move the robber. Steal 1 random resource from a player with a settlement or city adjacent to the hex you move it to.'
    },
    victory_point: {
        name: 'Victory Point',
        description: 'Counts as 1 victory point toward the 10 needed to win. Reveal to claim your victory!'
    },
    road_building: {
        name: 'Road Building',
        description: 'Place 2 roads for free as if you had just built them.'
    },
    year_of_plenty: {
        name: 'Year of Plenty',
        description: 'Take any 2 resource cards from the bank (of your choice).'
    },
    monopoly: {
        name: 'Monopoly',
        description: 'Name a resource type. All other players give you all their cards of that type.'
    }
};

