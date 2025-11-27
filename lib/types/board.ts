/**
 * Board structure types
 */

export interface Vertex {
    id: string; // Canonical ID
    q: number;
    r: number;
    d: number; // 0-5, corner index
    owner: string | null; // Player ID
    structure: 'settlement' | 'city' | 'metropolis' | null;
    hasCityWall?: boolean; // Cities & Knights: city wall (only for cities/metropolises)
    // Cities & Knights: metropolis type is stored in GameState.metropolises
    // Knights are stored in PlayerState.knights with vertexId reference
}

export interface Edge {
    id: string; // Canonical ID
    q: number;
    r: number;
    d: number; // 0-5, edge index
    owner: string | null; // Player ID
    structure: 'road' | null;
}

export interface BoardState {
    hexes: any[]; // HexTileData
    vertices: Record<string, Vertex>;
    edges: Record<string, Edge>;
}
