/**
 * Board structure types
 */

import type { TerrainType } from '@/core/rules/board-constants';
import type { Hex } from '@/lib/hex';

export type PortType =
    | "generic"
    | "wood"
    | "brick"
    | "sheep"
    | "wheat"
    | "ore";

export interface Port {
    id: string;
    type: PortType;
    position: { x: number; y: number }; // pixel coords
    angle: number; // direction toward board center (degrees)
    vertices?: { x: number; y: number }[]; // optional vertices for rendering connections
}

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

export interface BoardHex {
    hex: Hex;
    terrain: TerrainType;
    numberToken: number | null;
    id: string;
    pips?: number;
}

export interface BoardState {
    hexes: BoardHex[];
    vertices: Record<string, Vertex>;
    edges: Record<string, Edge>;
}
