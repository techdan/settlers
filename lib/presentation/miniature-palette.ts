import type { TerrainType } from '@/core/rules/board-constants';
import { TT, shade } from '@/themes/tabletop/palette';
import { playerPieceColor } from './piece-style';

type MaterialPaint = { color: string; roughness?: number };

// A local 3D experiment: preserve each resource's hue and sculpted facets while
// reducing pigment intensity. The Classic palette and incidental props stay intact.
const TERRAIN_PAINT: Record<TerrainType, [string, string][]> = {
    forest: [
        [TT.terrain.forest.base, '#52785a'], [TT.terrain.forest.under, '#5a7d60'],
        [TT.terrain.forest.canopyDark, '#35503d'], [TT.terrain.forest.canopy, '#41634a'],
        [TT.terrain.forest.canopyLight, '#527c5b'],
    ],
    hill: [
        [TT.terrain.hill.base, '#b57b58'], [TT.terrain.hill.ground, '#c18b64'],
        [TT.terrain.hill.brick, '#a96d4d'], [TT.terrain.hill.brickDark, '#956047'],
        [TT.terrain.hill.mortar, '#79533e'],
    ],
    pasture: [
        [TT.terrain.pasture.base, '#9bae7b'], [TT.terrain.pasture.patchLight, '#a8b988'],
        [TT.terrain.pasture.patchDark, '#8d9f6b'],
    ],
    field: [
        [TT.terrain.field.base, '#c3a264'], [TT.terrain.field.furrowDark, '#a98b50'],
        [TT.terrain.field.furrowLight, '#d5b77b'], [TT.terrain.field.stalk, '#897044'],
    ],
    mountain: [
        [TT.terrain.mountain.base, '#8e887f'], [TT.terrain.mountain.scree, '#99948a'],
        [TT.terrain.mountain.peakDark, '#605e58'], [TT.terrain.mountain.peak, '#706d66'],
        [TT.terrain.mountain.peakMid, '#7a756b'], [TT.terrain.mountain.facetLight, '#858177'],
        [TT.terrain.mountain.facetLight2, '#8b887e'], [TT.terrain.mountain.snow, '#d5d3c7'],
    ],
    desert: [
        [TT.terrain.desert.base, '#beaa88'], [TT.terrain.desert.dune, '#ad9472'],
        [TT.terrain.desert.sun, '#d0ba90'],
    ],
};

// Match the generator's small rock and cliff-facet variations as well as its
// primary swatches, so different GLB variants receive the same treatment.
const TERRAIN_MATERIALS = new Map<TerrainType, Map<string, string>>(
    (Object.entries(TERRAIN_PAINT) as [TerrainType, [string, string][]][]).map(([terrain, colors]) => [
        terrain,
        new Map(colors.flatMap(([source, target]) => [1, .95, 1.03, 1.07, 1.1].map(factor => [
            `paint-${shade(source, factor).slice(1)}`, shade(target, factor),
        ] as [string, string]))),
    ]),
);

const FOUNDATION_STONE: Record<string, string> = {
    'paint-a09884': '#7e7c70', // Bottom bevel.
    'paint-e8dcc0': '#969080', // Native cardboard side.
    'paint-efe3c6': '#a09a89', // Narrow upper rim.
};
const IVORY_BUILDING_DETAILS: Record<string, string> = {
    'paint-c8bda5': '#7e837a', // Existing stone base; no additional geometry.
    'paint-966d44': '#81745e', // Roof ribs.
    'paint-7c5a38': '#776a55', // Timber/eave and window bars.
    'paint-514733': '#5d655f', // Door recesses.
    'paint-e8dcc0': '#c7c9bc', // Window panes and existing stone trim.
};
const IVORY_KNIGHT_DETAILS: Record<string, string> = {
    'paint-bdb9a8': '#8b9590', // Steel helmet against ivory plume/shoulders.
    'paint-514733': '#58635e', // Existing visor.
    'paint-7c5a38': '#776a55', // Spear shaft.
    'paint-c9973f': '#ad8549', // Active bronze base, shield marks and spear tip.
    'paint-8e8a7d': '#85877e', // Inactive pewter details remain distinct.
};
const IVORY = playerPieceColor('white');

/** Return only local material edits; callers clone before applying this paint. */
export function miniatureMaterialPaint(model: string, material: string, ownerColor?: string): MaterialPaint | undefined {
    const terrain = /^(terrain|foundation)-(forest|hill|pasture|field|mountain|desert)(?:-[01])?$/.exec(model);
    if (terrain) {
        const stone = terrain[1] === 'foundation' ? FOUNDATION_STONE[material] : undefined;
        const color = stone ?? TERRAIN_MATERIALS.get(terrain[2] as TerrainType)?.get(material);
        return color ? { color } : undefined;
    }

    if (!ownerColor) return undefined;
    const vertexPiece = model.startsWith('building-') || model.startsWith('knight-') || model === 'city-wall';
    const ivory = vertexPiece && ownerColor.toLowerCase() === IVORY;
    if (material.startsWith('owner-paint')) {
        return { color: ownerColor, ...(ivory ? { roughness: .58 } : {}) };
    }
    if (model.startsWith('building-')) {
        if (material === 'paint-6c4e31') return { color: ownerColor, roughness: ivory ? .62 : .72 };
        const color = ivory ? IVORY_BUILDING_DETAILS[material] : undefined;
        return color ? { color } : undefined;
    }
    if (model.startsWith('knight-')) {
        const color = ivory ? IVORY_KNIGHT_DETAILS[material] : undefined;
        return color ? { color } : undefined;
    }
    return undefined;
}
