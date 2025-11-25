import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name'),
    email: text('email'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const rooms = pgTable('rooms', {
    id: text('id').primaryKey(), // 4-letter code
    status: text('status').notNull().default('waiting'), // waiting, playing, finished
    createdAt: timestamp('created_at').defaultNow(),
    metadata: text('metadata'), // JSON string of LobbyState
});

export const players = pgTable('players', {
    id: text('id').primaryKey(), // UUID
    roomId: text('room_id').references(() => rooms.id),
    name: text('name').notNull(),
    color: text('color'),
    isHost: boolean('is_host').default(false).notNull(),
    clerkUserId: text('clerk_user_id'), // Stub for Clerk integration
    joinedAt: timestamp('joined_at').defaultNow(),
});

export const games = pgTable('games', {
    id: text('id').primaryKey(), // UUID
    roomId: text('room_id').references(() => rooms.id).notNull(),
    state: text('state').notNull(), // JSON string of GameState
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
