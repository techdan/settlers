/**
 * @deprecated This file is being refactored.
 * Import validators from '@/core/validation' instead.
 * Import algorithms from '@/core/engine/scoring' instead.
 * This file remains for backward compatibility during migration.
 */

// Re-export validators from new location
export { isValidSetupSettlement } from '@/core/validation/setup-validator';
export {
    isValidSetupRoad,
    isValidMainPhaseRoad,
    isValidMainPhaseSettlement,
    isValidMainPhaseCity
} from '@/core/validation/building-validator';

// Re-export algorithms from new location
export { calculateLongestRoad } from '@/core/engine/scoring/longest-road';
