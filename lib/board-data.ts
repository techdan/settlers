/**
 * @deprecated This file is being refactored.
 * Import from '@/core/engine/board' instead.
 * This file remains for backward compatibility during migration.
 */

// Re-export from new locations
export type { ResourceType, TileType, HexTileData } from '@/core/engine/board/board-generator';
export { generateStandardBoard, getDesertHexId } from '@/core/engine/board/board-generator';
export type { PortType } from '@/core/engine/board/port-generator';
export { getPortForVertex, getTradeRatio, getBestTradeRatio } from '@/core/engine/board/port-generator';
