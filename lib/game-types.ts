import { ResourceType } from './board-data';

export type PlayerColor = 'red' | 'blue' | 'white' | 'orange';

export interface PlayerState {
    id: string;
    name: string;
    color: PlayerColor;
    resources: Record<ResourceType, number>;
    devCards: Record<string, number>; // To be defined later
    settlementsRemaining: number;
    citiesRemaining: number;
    roadsRemaining: number;
    victoryPoints: number;
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
    | 'main_game'
    | 'main_game'
    | 'game_over';

export interface GameLogEntry {
    id: string;
    timestamp: number;
    message: string;
    playerId?: string; // Optional: associate log with a player
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
    logs: GameLogEntry[];
}
