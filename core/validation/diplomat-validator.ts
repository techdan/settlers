import { GameState } from '@/lib/types';
import { getAdjacentEdgesForVertex, getEdgeEndpoints } from '@/lib/hex';

/**
 * Determine if a road is "open" for Diplomat.
 * A road is open if at least one endpoint has no same-color pieces
 * (roads, settlements/cities/metropolis, or knights) connected to it.
 */
export function isOpenRoad(gameState: GameState, edgeId: string): boolean {
    const edge = gameState.board.edges[edgeId];
    if (!edge || edge.structure !== 'road' || !edge.owner) return false;

    const ownerId = edge.owner;
    const [q, r, d] = edgeId.split(',').map(Number);
    const endpoints = getEdgeEndpoints(q, r, d);

    if (!endpoints || endpoints.length !== 2) return false;

    const isEndOpen = (vertexId: string): boolean => {
        const vertex = gameState.board.vertices[vertexId];
        if (!vertex) return false;

        // Same-color building/metropolis blocks the end
        if (vertex.owner === ownerId && vertex.structure) {
            return false;
        }

        // Same-color knight blocks the end
        const knight = gameState.players
            .flatMap(p => p.knights || [])
            .find(k => k.vertexId === vertexId);
        if (knight && knight.playerId === ownerId) {
            return false;
        }

        // Same-color roads on other adjacent edges block the end
        const [vq, vr, vd] = vertexId.split(',').map(Number);
        const adjacentEdges = getAdjacentEdgesForVertex(vq, vr, vd);
        const otherRoads = adjacentEdges.filter(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const e = gameState.board.edges[adjEdgeId];
            return e && e.owner === ownerId && e.structure === 'road';
        });

        return otherRoads.length === 0;
    };

    const [vertex1Id, vertex2Id] = endpoints;
    return isEndOpen(vertex1Id) || isEndOpen(vertex2Id);
}

export function getOpenRoadIds(gameState: GameState): string[] {
    return Object.values(gameState.board.edges)
        .filter(edge => edge.structure === 'road' && edge.owner)
        .map(edge => edge.id)
        .filter(edgeId => isOpenRoad(gameState, edgeId));
}
