import { ResourceType } from './board-data';

export type PlayerColor = 'red' | 'blue' | 'white' | 'orange';

export type DevCardType = 'knight' | 'victory_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

export interface PlayerState {
    id: string;
    name: string;
    color: PlayerColor;
    resources: Record<ResourceType, number>;
    devCards: Record<DevCardType, number>;
    settlementsRemaining: number;
    citiesRemaining: number;
    roadsRemaining: number;
    victoryPoints: number;
    discardedThisTurn?: boolean;
}

export interface Vertex {
    id: string; // Canonical ID
    q: number;
    r: number;
    d: number; // 0-5, corner index
    owner: string | null; // Player ID
    structure: 'settlement' | 'city' | null;
}

export interface Edge {
    id: string; // Canonical ID
    q: number;
    r: number;
    d: number; // 0-5, edge index
    owner: string | null; // Player ID
    structure: 'road' | null;
}

export type GamePhase =
    | 'setup_round_1_settlement'
    | 'setup_round_1_road'
    | 'setup_round_2_settlement'
    | 'setup_round_2_road'
    | 'waiting_for_roll'
    | 'main_phase'
    | 'discarding'
    | 'robber_placement'
    | 'stealing'
    | 'road_building_1'
    | 'road_building_2'
    | 'game_over';

export interface GameLogEntry {
    id: string;
    timestamp: number;
    message: string;
    playerId?: string; // Optional: associate log with a player
}

export interface TradeOffer {
    id: string;
    initiator: string;
    give: Record<ResourceType, number>;
    get: Record<ResourceType, number>;
    status: 'open' | 'accepted' | 'cancelled';
    acceptedBy?: string;
}

export interface GameState {
    id: string;
    roomId: string;
    players: PlayerState[];
    board: {
        hexes: any[]; // HexTileData
        vertices: Record<string, Vertex>;
        edges: Record<string, Edge>;
    };
    currentTurn: string; // Player ID
    turnOrder: string[]; // Array of Player IDs
    phase: GamePhase;
    winner: string | null;
    lastPlacedSettlementId: string | null; // For setup phase road validation
    robberHexId: string | null; // ID of the hex where the robber is
    diceRoll?: {
        d1: number;
        d2: number;
        total: number;
    };
    devCardDeck: DevCardType[];
    tradeOffer?: TradeOffer | null;
    longestRoadOwner: string | null;
    longestRoadLength: number;
    logs: GameLogEntry[];
}
