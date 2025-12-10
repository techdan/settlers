# Lobby Service DB Operations

## Current DB operations in lobby-service.ts

### Room operations
- [x] Line 135: `db.query.rooms.findFirst({ where: eq(rooms.id, roomId) })`
- [x] Line 148: `db.update(rooms).set({ metadata: JSON.stringify(state) }).where(eq(rooms.id, roomId))`

### Player operations
- [x] Line 41: `db.query.players.findMany({ where: eq(players.roomId, roomId), orderBy: asc(joinedAt) })`
- [x] Line 72: `db.update(players).set({ color }).where(eq(players.id, update.id))` (normalize colors)
- [x] Line 108: `db.update(players).set({ isHost }).where(eq(players.id, update.id))` (normalize host)
- [x] Line 279: `db.update(players).set({ color: normalizedColor }).where(eq(players.id, playerId))`

### Join operations
- [ ] None (room/player fetched separately; no explicit joins)

## Repository methods needed

Based on the above operations:
- [ ] getPlayersByRoomIdOrdered(roomId: string)
- [ ] updatePlayerColors(updates: Array<{ id: string; color: PlayerColor }>)
- [ ] updatePlayerHostFlags(updates: Array<{ id: string; isHost: boolean }>)
- [ ] getRoomById(roomId: string)
- [ ] updateRoomMetadata(roomId: string, metadata: string)
- [ ] setPlayerColor(playerId: string, color: PlayerColor)
