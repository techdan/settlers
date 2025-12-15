# Port Vertex Mapping Reference

This document lists all port vertices for the Settlers of Catan board.

## Port Locations

Each port connects to exactly 2 vertices. Any settlement or city on these vertices can use that port.

### Resource-Specific Ports (2:1 ratio)

**Wood Port (🌲)**
- Edge 12 (Hex 2,0 Edge 1)
- Vertex: `1,1,5`
- Vertex: `2,0,0`

**Brick Port (🧱)**
- Edge 9 (Hex 2,-1 Edge 0)
- Vertex: `2,-1,5`
- Vertex: `2,-1,0`

**Sheep Port (🐑)**
- Edge 29 (Hex -1,-1 Edge 4)
- Vertex: `-1,-2,0`
- Vertex: `-2,-1,5`

**Wheat Port (🌾)**
- Edge 19 (Hex -1,2 Edge 2)
- Vertex: `-2,2,0`
- Vertex: `-2,3,5`

**Ore Port (🪨)**
- Edge 23 (Hex -2,1 Edge 2)
- Vertex: `-3,1,0`
- Vertex: `-3,2,5`

### Generic Ports (3:1 ratio)

**Generic Port #1**
- Edge 3 (Hex 1,-2 Edge 4)
- Vertex: `1,-3,0`
- Vertex: `0,-2,5`

**Generic Port #2**
- Edge 6 (Hex 2,-2 Edge 5)
- Vertex: `2,-3,0`
- Vertex: `2,-2,5`

**Generic Port #3**
- Edge 16 (Hex 0,2 Edge 1)
- Vertex: `-1,3,5`
- Vertex: `0,2,0`

**Generic Port #4**
- Edge 26 (Hex -2,0 Edge 3)
- Vertex: `-3,0,5`
- Vertex: `-3,0,0`

## Implementation Details

Ports are defined in `core/engine/board/port-generator.ts`:

- `PORT_INDICES` array maps port types to coastline edge indices
- `COASTLINE_EDGES` array defines the outer ring of the board
- Each edge connects two vertices (corners)
- Edge `d` connects Corner `(d+5)%6` and Corner `d` (matching `lib/hex.ts` `getEdgeEndpoints`)
- The `getPortForVertex(vertexId)` function returns the port type for a given vertex
- The `getBestTradeRatio(vertexIds, resourceType)` function finds the best available ratio

## Vertex ID Format

Vertex IDs use the format `q,r,d` where:
- `q` and `r` are axial hex coordinates
- `d` is the corner index (0-5, starting East and going counter-clockwise)

Corner angles from hex center:
- Corner 0: 30°
- Corner 1: 90°  
- Corner 2: 150°
- Corner 3: 210°
- Corner 4: 270°
- Corner 5: 330°

The `getCanonicalVertexId` function returns the lexicographically smallest representation among the up to 3 hexes sharing that vertex, ensuring vertex IDs are stable.

## Testing

Run `npm test -- verify-all-ports` to verify all port mappings are correct.

Run `npm test -- port-generator` to test the port generation and trading logic.
