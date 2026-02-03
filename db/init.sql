-- Initialize database schema for AIVA
-- This script runs automatically when the PostgreSQL container is first created

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(20) NOT NULL,
    receiver VARCHAR(20) NOT NULL,
    body TEXT NOT NULL,
    direction VARCHAR(8) NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created);
