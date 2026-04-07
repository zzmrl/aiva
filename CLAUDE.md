# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIVA (Automate.It Virtual Assistant) is a virtual assistant application that processes phone calls and text messages via Twilio webhooks, stores them in PostgreSQL, and provides a web interface to view messages. The system integrates with Venice AI for LLM-powered SMS and voice responses.

## Architecture

### Three-tier Docker Compose Stack

1. **API Backend** (`api/`)
   - Express 5 + TypeScript server handling Twilio webhooks
   - Runs on Bun runtime
   - Connects to Venice AI API for LLM completions and TTS
   - Database interactions via Bun's native `SQL` client using `DATABASE_URL`
   - Routes: `GET /health`, `GET|POST /messages`, `GET /messages/conversations`, `GET /messages/:id`, `POST /twilio/voice`, `POST /twilio/transcription-events`, `POST /twilio/sms`
   - WebSocket endpoint at `/twilio/stream` for Twilio Media Streams

2. **Database** (`database` service)
   - PostgreSQL 18 Alpine
   - Schema managed via dbmate migrations in `db/migrations/`
   - `db/init.sql` seeds schema on first container creation
   - Credentials via `DB_USER` and `DB_PASSWORD` env vars (user also serves as database name)

3. **Web UI** (`webui/`)
   - SvelteKit 2 + Tailwind CSS 4 + DaisyUI
   - Static build served by NGINX (prod) or Vite dev server (dev)
   - Displays messages fetched from API `/messages` endpoint

4. **NGINX** (`nginx/`)
   - Reverse proxy for prod — serves static WebUI files and proxies API requests
   - Custom config in `nginx/conf.d/`

### Docker Compose Files

- **`compose.yaml`**: `database` (base, always included)
- **`compose.dev.yaml`**: `api-dev`, `webui-dev`, `ngrok`
- **`compose.prod.yaml`**: `api`, `webui`, `nginx`

```bash
# Dev (all services in Docker)
docker compose -f compose.yaml -f compose.dev.yaml up

# Prod
docker compose -f compose.yaml -f compose.prod.yaml up
```

### Key Data Flow

**SMS Flow**: Twilio webhook → `POST /twilio/sms` → insert user message → Venice AI SMS completion → insert assistant response → return TwiML response

**Voice Flow**: Twilio webhook → `POST /twilio/voice` → return TwiML to start Transcription + connect Media Stream WebSocket → `POST /twilio/transcription-events` fires with transcribed text → LLM streaming completion → Venice TTS (`tts-kokoro`, voice `af_sky`) → PCM→mu-law conversion → audio sent back over WebSocket → on call end, messages saved to DB

### Module Structure

```
api/app/
├── config.ts           # Zod-validated env config (reads _FILE secrets too)
├── factory.ts          # Express app factory
├── server.ts           # Entry point: starts server, attaches WebSocket, starts session cleanup
├── index.ts            # Re-exports server
├── modules/
│   ├── llm/            # Venice AI client, defineCompletion(), smsCompletion, defaultCompletion
│   ├── message/        # CRUD routes/controller/service/repository for messages
│   └── twilio/         # Webhook handlers, Media Streams WebSocket, TTS, session store
└── shared/
    ├── database/       # Bun SQL client (DATABASE_URL)
    ├── errors/         # AppError class
    └── middleware/     # Rate limiting, request validation
```

### Database Layer

- Uses Bun's native `SQL` client (not an ORM), connected via `DATABASE_URL`
- `api/app/shared/database/client.ts` exports the SQL instance
- `api/app/modules/message/repository.ts` contains typed DB functions
- Schema managed by dbmate; run `scripts/migrate up` to apply migrations

### LLM Integration

- Venice AI client in `api/app/modules/llm/client.ts` (OpenAI-compatible API)
- `defineCompletion()` factory creates reusable completions with `.create()` and `.stream()` methods
- `smsCompletion` — concise SMS responses
- `defaultCompletion` — voice call responses (streaming)
- Both use model `venice-uncensored` with `enable_web_search: "auto"`
- TTS via Venice `tts-kokoro` model in `api/app/modules/twilio/tts.ts`

## Development Commands

### Local Development (Recommended)

Requires: Bun, Docker/Docker Compose, a `.env` file (see `.env.example`)

```bash
docker compose up -d database
scripts/migrate up
cd api && bun dev          # API dev server with --watch
cd webui && bun dev        # Vite dev server
```

### API Development

```bash
cd api
bun install           # Install dependencies
bun dev              # Dev server with hot reload
DEBUG=api bun dev    # With verbose debug logs (or: bun run debug)
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
bun lint             # ESLint + Prettier check
bun format           # Prettier write
bun test             # Run all tests (unit + e2e)
bun test:unit        # Vitest unit tests
bun test:e2e         # Playwright tests
```

### Database Management

```bash
scripts/migrate up       # Apply pending migrations
scripts/migrate down     # Roll back last migration
scripts/psql             # Open psql shell in running database container
```

Migrations use [dbmate](https://github.com/amacneil/dbmate) and live in `db/migrations/`.

### Production Build

```bash
# Build and run entire stack (prod)
docker compose -f compose.yaml -f compose.prod.yaml up

# Build individual services
docker compose build api
docker compose build web
```

### Testing

- **API**: Tests in `api/test/` using Bun's test runner.
- **WebUI**: Unit tests with Vitest, E2E with Playwright in `webui/tests/`

## Environment Setup

Copy `.env.example` to `.env` and fill in values:

```bash
# Application
NODE_ENV=development

# Database
DB_USER=aiva
DB_PASSWORD=changeme
DATABASE_URL=postgres://aiva:changeme@database:5432/aiva

# API
PUBLIC_HOST=your-domain.ngrok-free.app
VENICE_API_KEY=your-venice-api-key
TWILIO_AUTH_TOKEN=your-twilio-auth-token  # Optional; disables signature validation if unset

# Ngrok (dev profile only)
NGROK_AUTHTOKEN=your-ngrok-auth-token

# WebUI
PUBLIC_API_HOST=http://localhost:3274
```

The `secrets/` directory contains plain-text secret files (`postgres_password`, `postgres_user`, `venice_api_key`) that are read by `config.ts` via the `_FILE` env var suffix pattern.

## Environment Variables

### API
- `PORT` - Server port (default: 3274)
- `NODE_ENV` - Environment (`development`/`production`/`test`)
- `DATABASE_URL` - PostgreSQL connection string
- `PUBLIC_HOST` - Public hostname used to build Twilio callback URLs
- `VENICE_API_KEY` (or `VENICE_API_KEY_FILE`) - Venice AI API key
- `TWILIO_AUTH_TOKEN` (optional) - Enables Twilio webhook signature validation

### WebUI
- `PUBLIC_HOST` - Public hostname
- `API_HOST` - Internal API hostname (dev: `api-dev`)

## Code Style

All code must conform to the Prettier defaults used by `api/.prettierrc.json` (empty config = all defaults):

- **Print width**: 80
- **Tab width**: 2 spaces
- **Semicolons**: yes
- **Quotes**: double quotes for strings
- **Trailing commas**: all (ES5+: objects, arrays, function params)
- **Bracket spacing**: yes (`{ foo }`)
- **Arrow function parens**: always (`(x) => x`)

## Development Notes

### Webhook Testing
The `dev` compose profile includes an ngrok service that tunnels to `api-dev` using a static domain (`PUBLIC_HOST`). Set `NGROK_AUTHTOKEN` and `PUBLIC_HOST` in `.env`.

### Database Schema
`messages` table columns: `id`, `sender`, `receiver`, `body`, `direction` (`inbound`|`outbound`), `created`. Indexed on sender, receiver, and created timestamp.

### Twilio Integration
- **Voice**: Uses Twilio Transcription + Media Streams for real-time STT and TTS audio playback
- **SMS**: Triggers Venice AI LLM completion; response returned as TwiML
- Both flows store messages with `sender`/`receiver` phone numbers and `direction`
- Twilio webhook signature validation is enabled when `TWILIO_AUTH_TOKEN` is set
