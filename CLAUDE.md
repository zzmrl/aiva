# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIVA (Automate.It Virtual Assistant) is a virtual assistant application that processes phone calls and text messages via Twilio webhooks, stores them in PostgreSQL, and provides a web interface to view messages. The system integrates with Venice AI for LLM-powered SMS responses.

## Architecture

### Three-tier Docker Compose Stack

1. **API Backend** (`api/`)
   - Express + TypeScript server handling Twilio webhooks
   - Runs on Bun runtime
   - Connects to Venice AI API for LLM completions
   - Database interactions via Bun's native SQL client
   - Routes: `/voice`, `/voiceTranscribe`, `/sms`, `/messages`, `/health`

2. **Database** (`database` service)
   - PostgreSQL 18 Alpine
   - Initialized via `db/init.sql` (creates `messages` table with indexes)
   - Credentials managed via Docker secrets in `secrets/` directory

3. **Web UI** (`webui/`)
   - SvelteKit 2 + Tailwind CSS 4 + DaisyUI
   - Static build served by NGINX
   - Displays messages fetched from API `/messages` endpoint

### Key Data Flow

**SMS Flow**: Twilio webhook → `/sms` endpoint → insert user message → Venice AI completion → insert assistant response → return TwiML response

**Voice Flow**: Twilio webhook → `/voice` endpoint → return TwiML to record → transcription sent to `/voiceTranscribe` → insert message

### Database Layer

- Uses Bun's native `SQL` client (not an ORM)
- Database connection configured via environment variables pointing to secret files
- Entity pattern: `api/app/entity/messages.ts` exports typed functions (`insertMessage`, `getAllMessages`, `getMessageById`, `getMessagesByPhone`, `getConversation`)
- All credentials read from Docker secrets files at runtime

### LLM Integration

- Venice AI client in `api/app/llm/client.ts` (OpenAI-compatible API)
- Model: `venice-uncensored`
- `smsCompletion()` function includes Venice-specific parameter `enable_web_search: "auto"`
- API key loaded from `VENICE_API_KEY_FILE` secret

## Development Commands

### Local Development (Recommended)

Requires: Bun, Docker/Docker Compose

```bash
# Start database + both dev servers (from root)
scripts/dev

# Or manually:
docker compose up -d database
cd api && bun dev          # API dev server with --watch
cd webui && bun dev        # Vite dev server
```

### API Development

```bash
cd api
bun install           # Install dependencies
bun dev              # Dev server with hot reload (DEBUG=api for verbose logs)
bun test             # Run all tests
bun test:watch       # Watch mode tests
bun run build        # TypeScript compilation
bun type-check       # Type check without emitting
bun lint             # ESLint
```

### WebUI Development

```bash
cd webui
bun install           # Install dependencies
bun dev              # Vite dev server
bun run build        # Production build
bun check            # Svelte type checking
bun check:watch      # Watch mode
bun lint             # ESLint + Prettier
bun format           # Prettier write
bun test             # Run all tests (unit + e2e)
bun test:unit        # Vitest unit tests
bun test:e2e         # Playwright tests
```

### Production Build

```bash
# Build and run entire stack
docker compose up

# Build individual services
docker compose build api
docker compose build web
```

### Testing

- **API**: Tests in `api/test/` using Bun's test runner. Set `VENICE_API_KEY=test-key` for tests.
- **WebUI**: Unit tests with Vitest, E2E with Playwright in `webui/tests/`

## Required Secrets

Before running, ensure these files exist in `secrets/`:
- `postgres_password`
- `postgres_user`
- `postgres_db` (note: `compose.yaml` has typo mapping `postgres_db` secret to `postgres_user` file)
- `venice_api_key`

## Environment Variables

### API
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PASSWORD_FILE`, `DATABASE_USER_FILE`, `DATABASE_NAME_FILE` - Paths to secret files
- `DATABASE_HOST` - Database host (default: localhost)
- `DATABASE_PORT` - Database port (default: 5432)
- `VENICE_API_KEY_FILE` - Path to Venice API key secret

### WebUI
- `PUBLIC_API_HOST` - API backend URL (default: http://localhost:3000)

## Development Notes

### Webhook Testing
Use ngrok or similar tunneling service to expose local API for Twilio webhook delivery during development.

### Database Schema
Single `messages` table with columns: `id`, `sender`, `receiver`, `body`, `created`. Indexed on sender, receiver, and created timestamp.

### Twilio Integration
Voice calls are recorded and transcribed. SMS messages trigger LLM completions via Venice AI. Both store messages with sender/receiver phone numbers.
