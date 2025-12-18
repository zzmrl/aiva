-- Initialize database schema for AIVA
-- This script runs automatically when the PostgreSQL container is first created

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    to VARCHAR(20) NOT NULL,
    from VARCHAR(20) NOT NULL,
    body TEXT NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to);

CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created);
