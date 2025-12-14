# Port Vertex Mapping Reference

This document lists all port vertices for the Settlers of Catan board.

## Port Locations

Each port connects to exactly 2 vertices. Any settlement or city on these vertices can use that port.

### Resource-Specific Ports (2:1 ratio)

**Wood Port (🌲)**
- Vertex: `1,1,5`
- Vertex: `1,0,0`

**Brick Port (🧱)**
- Vertex: `2,-1,0`
- Vertex: `1,0,5`

**Sheep Port (🐑)**
- Vertex: `-1,-2,0`
- Vertex: `-1,-1,5`

**Wheat Port (🌾)**
- Vertex: `-2,2,0`
- Vertex: `-2,2,5`

**Ore Port (🪨)**
- Vertex: `-3,1,0`
- Vertex: `-3,1,5`

### Generic Ports (3:1 ratio)

**Generic Port #1**
- Vertex: `1,-3,0`
- Vertex: `1,-2,5`

**Generic Port #2**
- Vertex: `2,-2,5`
- Vertex: `2,-2,0`

**Generic Port #3**
- Vertex: `-1,3,5`
- Vertex: `-1,2,0`

**Generic Port #4**
- Vertex: `-3,0,5`
- Vertex: `-2,-1,0`

## Implementation Details

Ports are defined in `core/engine/board/port-generator.ts`:

- `PORT_INDICES` array maps port types to coastline edge indices
- `COASTLINE_EDGES` array defines the outer ring of the board
- Each edge connects two vertices (corners)
- The `getPortForVertex(vertexId)` function returns the port type for a given vertex
- The `getBestTradeRatio(vertexIds, resourceType)` function finds the best available ratio

## Testing

Run `npm test -- verify-all-ports` to verify all port mappings are correct.

Run `npm test -- port-generator` to test the port generation and trading logic.
