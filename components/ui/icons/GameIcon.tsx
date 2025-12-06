import React from 'react';
import { ColoredSvgIcon } from './ColoredSvgIcon';

/**
 * Color-coded icon system for Settlers of Catan: Cities & Knights
 *
 * Design Philosophy: Medieval illuminated manuscript aesthetic
 * - Resources: Natural, earthy tones
 * - Commodities: Rich, refined colors
 * - Knights: Bronze → Silver → Gold progression
 * - Improvements: Category-specific (Science green, Trade gold, Politics blue)
 */

// Type definitions
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';
export type CommodityType = 'paper' | 'cloth' | 'coin';
export type StructureType = 'settlement' | 'city' | 'metropolis' | 'road' | 'city-wall';
export type KnightLevel = 'basic' | 'strong' | 'mighty';
export type ImprovementType = 'science' | 'trade' | 'politics';
export type SpecialType = 'robber' | 'merchant' | 'barbarian-ship' | 'dice';

export type IconType =
  | ResourceType
  | CommodityType
  | StructureType
  | KnightLevel
  | ImprovementType
  | SpecialType;

interface GameIconProps {
  type: IconType;
  size?: number;
  className?: string;
  playerColor?: string; // For structures owned by players
  active?: boolean; // For knights (active/inactive)
  style?: React.CSSProperties;
  backgroundColor?: string; // For terrain-colored backgrounds
}

/**
 * Color palette - Matches icons.md specification
 */
const ICON_COLORS = {
  // Resources (foreground colors from icons.md)
  wood: '#634336', // Wood brown
  brick: '#ea7955', // Brick (with stroke #891E21)
  sheep: '#ded7bc', // Sheep beige
  wheat: '#db8b1f', // Wheat goldenrod
  ore: '#4f4a3c', // Ore slate gray

  // Commodities (foreground colors from icons.md)
  paper: '#e8c4a4', // Paper parchment
  cloth: '#ecd998', // Cloth yellow
  coin: '#707c79', // Coin grey

  // City Improvements (category colors from icons.md)
  science: '#6bb97f', // Science green
  trade: '#c6daa4', // Trade light green/yellow
  politics: '#d7dfd1', // Politics light grey/blue

  // Knights (martial progression)
  basic: '#CD7F32', // Bronze
  strong: '#C0C0C0', // Silver
  mighty: '#FFD700', // Gold

  // Special pieces
  robber: '#1a1a1a', // Near black (menacing)
  merchant: '#16a34a', // Green (trade)
  'barbarian-ship': '#ffffff', // White foreground
  dice: '#1e293b', // Slate-900 (neutral)

  // Structures (use player color, these are fallbacks)
  settlement: '#8B4513',
  city: '#4B5563',
  metropolis: '#9333ea',
  road: '#6B4423',
  'city-wall': '#57534e',
};

/**
 * Background colors for resources and commodities (hex tile colors from icons.md)
 */
const ICON_BACKGROUNDS = {
  // Resources (hex tile backgrounds from icons.md)
  wood: '#006636', // Forest (produce wood)
  brick: '#ca7728', // Hills (produce brick)
  sheep: '#84b83f', // Pasture (produce sheep)
  wheat: '#f9e26f', // Fields (produce wheat)
  ore: '#666d63', // Mountain (produce ore)

  // Commodities (hex tile backgrounds from icons.md)
  paper: '#006636', // Forest green (paper from forest)
  cloth: '#84b83f', // Pasture green (cloth from pasture)
  coin: '#666d63', // Mountain grey (coin from ore)
};

/**
 * Icon path mapping
 * For resources and commodities, we try -colored versions first
 */
const ICON_PATHS: Record<IconType, string> = {
  // Resources (try -colored versions first)
  wood: '/icons/wood-pile-colored.svg',
  brick: '/icons/brick-pile-colored.svg',
  sheep: '/icons/sheep-colored.svg',
  wheat: '/icons/wheat-colored.svg',
  ore: '/icons/stone-pile-colored.svg',

  // Commodities (try -colored versions first)
  paper: '/icons/scroll-unfurled-colored.svg',
  cloth: '/icons/rolled-cloth-colored.svg',
  coin: '/icons/two-coins-colored.svg',

  // Structures
  settlement: '/icons/village.svg',
  city: '/icons/city.svg',
  metropolis: '/icons/metropolis.svg',
  road: '/icons/road.svg',
  'city-wall': '/icons/city-wall.svg',

  // Knights
  basic: '/icons/knight-basic.svg',
  strong: '/icons/black-knight-helm.svg',
  mighty: '/icons/mounted-knight.svg',

  // Improvements
  science: '/icons/freemasonry-colored.svg',
  trade: '/icons/scales-colored.svg',
  politics: '/icons/shaking-hands-colored.svg',

  // Special
  robber: '/icons/robber.svg',
  merchant: '/icons/merchant.svg',
  'barbarian-ship': '/icons/drakkar-colored.svg',
  dice: '/icons/dice.svg',
};

/**
 * Fallback paths if -colored version doesn't exist
 */
const ICON_FALLBACKS: Partial<Record<IconType, string>> = {
  sheep: '/icons/sheep.svg',
  wheat: '/icons/wheat.svg',
  ore: '/icons/stone-pile.svg',
  paper: '/icons/folded-paper.svg',
  cloth: '/icons/cloth.svg',
  coin: '/icons/coin.svg',
  science: '/icons/freemasonry.svg',
  trade: '/icons/scales.svg',
  politics: '/icons/shaking-hands.svg',
  'barbarian-ship': '/icons/drakkar.svg',
};

/**
 * GameIcon Component
 *
 * Renders SVG icons with color coding and optional effects
 */
export const GameIcon: React.FC<GameIconProps> = ({
  type,
  size = 24,
  className = '',
  playerColor,
  active = true,
  style = {},
  backgroundColor,
}) => {
  const iconPath = ICON_PATHS[type];
  const fallbackPath = ICON_FALLBACKS[type];
  const baseColor = ICON_COLORS[type];

  // Use player color for structures, otherwise use icon's base color
  const isStructure = ['settlement', 'city', 'metropolis', 'road', 'city-wall'].includes(type);
  const fillColor = isStructure && playerColor ? playerColor : baseColor;

  // Get background color from ICON_BACKGROUNDS if not explicitly provided
  const bgColor = backgroundColor || (ICON_BACKGROUNDS as any)[type];

  // Inactive knights have reduced opacity
  const isKnight = ['basic', 'strong', 'mighty'].includes(type);
  const opacity = isKnight && !active ? 0.4 : 1;

  return (
    <ColoredSvgIcon
      src={iconPath}
      fallbackSrc={fallbackPath}
      color={fillColor}
      backgroundColor={bgColor}
      size={size}
      className={className}
      alt={type}
      style={{
        opacity,
        filter: `
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))
          ${isKnight && active ? 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.5))' : ''}
        `,
        ...style,
      }}
    />
  );
};

/**
 * Specialized Resource Icon Component
 */
export const ResourceIcon: React.FC<{
  type: ResourceType;
  size?: number;
  className?: string;
  count?: number;
  showCount?: boolean;
}> = ({ type, size = 20, className = '', count, showCount = false }) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <GameIcon type={type} size={size} />
      {showCount && count !== undefined && (
        <span className="font-mono text-sm font-bold tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
};

/**
 * Specialized Commodity Icon Component
 */
export const CommodityIcon: React.FC<{
  type: CommodityType;
  size?: number;
  className?: string;
  count?: number;
  showCount?: boolean;
}> = ({ type, size = 20, className = '', count, showCount = false }) => {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <GameIcon type={type} size={size} />
      {showCount && count !== undefined && (
        <span className="font-mono text-sm font-bold tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
};

/**
 * Specialized Knight Icon Component
 */
export const KnightIcon: React.FC<{
  level: KnightLevel;
  size?: number;
  className?: string;
  active?: boolean;
  playerColor?: string;
}> = ({ level, size = 24, className = '', active = true, playerColor }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      <GameIcon
        type={level}
        size={size}
        className={className}
        active={active}
        playerColor={playerColor}
      />
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-red-600 rotate-45 transform scale-110" />
        </div>
      )}
    </div>
  );
};

/**
 * Specialized Structure Icon Component
 */
export const StructureIcon: React.FC<{
  type: StructureType;
  size?: number;
  className?: string;
  playerColor: string;
}> = ({ type, size = 24, className = '', playerColor }) => {
  return (
    <GameIcon
      type={type}
      size={size}
      className={className}
      playerColor={playerColor}
    />
  );
};

/**
 * Improvement Track Icon with Level Indicator
 */
export const ImprovementIcon: React.FC<{
  type: ImprovementType;
  level: number;
  maxLevel?: number;
  size?: number;
  className?: string;
}> = ({ type, level, maxLevel = 5, size = 20, className = '' }) => {
  const color = ICON_COLORS[type];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <GameIcon type={type} size={size} />

      {/* Progress bar */}
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${(level / maxLevel) * 100}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>

      {/* Level number */}
      <span className="font-mono text-xs font-bold tabular-nums min-w-[24px] text-right">
        {level}/{maxLevel}
      </span>
    </div>
  );
};

export default GameIcon;
