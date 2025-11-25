import { HexTileData } from '@/core/engine/board/board-generator';
import { PlayerColor } from './player';

export interface LobbyPlayer {
    id: string;
    name: string;
    color: PlayerColor;
    isHost: boolean;
    isReady: boolean;
}

export interface LobbyState {
    roomId: string;
    hostId: string;
    players: LobbyPlayer[];
    boardPreview: HexTileData[] | null;
    fairMode: boolean;
    pendingRequests: string[]; // List of player IDs requesting a new board
}
