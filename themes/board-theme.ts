import { BarbarianRoute } from './tabletop/BarbarianRoute'
import { HexTile } from './tabletop/HexTile'
import { Merchant } from './tabletop/Merchant'
import { NumberToken } from './tabletop/NumberToken'
import {
    City,
    CityWall,
    KnightPiece,
    Metropolis,
    Road,
    Settlement,
} from './tabletop/pieces'
import { Port } from './tabletop/Port'
import { Robber } from './tabletop/Robber'
import { BOARD_VIEWBOX, SeaFrame } from './tabletop/SeaFrame'
import { StatusGlyph } from './tabletop/glyphs'
import { TT } from './tabletop/palette'

/**
 * The rendering contract between board orchestration and its visual theme.
 *
 * Board components consume this object instead of importing concrete artwork,
 * so a future theme can replace the visuals without changing game interaction
 * wiring. Component references are created once at module scope and remain
 * stable across renders.
 */
export interface BoardTheme {
    readonly name: string
    readonly viewBox: string
    readonly palette: {
        readonly sea: string
    }
    readonly HexTile: typeof HexTile
    readonly Port: typeof Port
    readonly NumberToken: typeof NumberToken
    readonly Robber: typeof Robber
    readonly Merchant: typeof Merchant
    readonly SeaFrame: typeof SeaFrame
    readonly BarbarianRoute: typeof BarbarianRoute
    readonly StatusGlyph: typeof StatusGlyph
    readonly pieces: {
        readonly Road: typeof Road
        readonly Settlement: typeof Settlement
        readonly City: typeof City
        readonly Metropolis: typeof Metropolis
        readonly CityWall: typeof CityWall
        readonly Knight: typeof KnightPiece
    }
}

export const boardTheme = {
    name: 'tabletop',
    viewBox: BOARD_VIEWBOX,
    palette: TT,
    HexTile,
    Port,
    NumberToken,
    Robber,
    Merchant,
    SeaFrame,
    BarbarianRoute,
    StatusGlyph,
    pieces: {
        Road,
        Settlement,
        City,
        Metropolis,
        CityWall,
        Knight: KnightPiece,
    },
} satisfies BoardTheme
