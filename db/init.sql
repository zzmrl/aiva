-- Initialize database schema for AIVA
-- This script runs automatically when the PostgreSQL container is first created

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_phone_number ON messages(phone_number);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
