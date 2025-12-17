-- Chat Feature Migration
-- Run this SQL in your Supabase SQL Editor

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    player_id TEXT REFERENCES players(id),
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'player',
    client_message_id TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
ON chat_messages(room_id, created_at);

-- Optional: Create index for deduplication lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id
ON chat_messages(room_id, player_id, client_message_id)
WHERE client_message_id IS NOT NULL;
