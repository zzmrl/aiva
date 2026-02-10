# Automate.It Virtual Assistant (AIVA)

A virtual assistant application that processes phone calls and text messages via Twilio webhooks, featuring AI-powered conversational responses through Venice AI integration.

## Features

- **Conversational Voice Chat**: Real-time bidirectional voice calls with speech-to-text transcription, LLM responses, and text-to-speech audio streaming via WebSocket
- **Conversational SMS**: AI-powered text message responses using Venice AI LLM with web search capabilities
- **Message Storage**: PostgreSQL database for persistent conversation history
- **Web Interface**: Modern SvelteKit UI with chat-style conversation views
- **RESTful API**: Express/TypeScript backend for message management

## Architecture

### Docker Stack

```
┌──────────────────────────────────────────────────────┐
│                  nginx (:80/:443)                    │
│  ┌────────────────────────────────────────────────┐  │
│  │  /            → static files (from webui)      │  │
│  │  /messages/*  → proxy to api                   │  │
│  │  /health      → proxy to api                   │  │
│  │  /twilio/*    → proxy to api (+ WebSocket)     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
        ▲                            │
        │                            ▼
   ┌────┴────┐                ┌─────────────┐      ┌──────────┐
   │  webui  │                │     api     │ ──── │ database │
   │ (build) │                │  (internal) │      │          │
   └────┬────┘                └─────────────┘      └──────────┘
        │
        ▼
  static_files
    (volume)
```

1. **NGINX** (`nginx/`)
   - Reverse proxy and static file server
   - Routes API and WebSocket traffic to backend
   - Serves static frontend assets
   - SSL termination (when configured)

2. **API Backend** (`api/`)
   - Express + TypeScript server on Bun runtime
   - Twilio webhook handlers for voice and SMS
   - WebSocket server for real-time voice streaming
   - Venice AI integration for LLM completions

3. **Web UI** (`webui/`)
   - SvelteKit 2 + Tailwind CSS 4 + DaisyUI
   - Builds static files to shared volume
   - Chat-style conversation interface

4. **Database**
   - PostgreSQL 18 Alpine
   - Message storage with indexed queries

### Tech Stack

- **Runtime**: Bun
- **Backend**: Express, TypeScript, WebSocket (ws)
- **Frontend**: SvelteKit 2, Tailwind CSS 4, DaisyUI
- **Proxy**: NGINX
- **Database**: PostgreSQL 18
- **AI**: Venice AI (OpenAI-compatible API)
- **Telephony**: Twilio Voice & SMS with Media Streams
- **Infrastructure**: Docker Compose

## Requirements

- Docker and Docker Compose
- Bun (for local development)
- Twilio account with phone number
- Venice AI API key
- Public host URL (ngrok or similar for development)

## Quick Start

### Production

```bash
# Start complete stack
docker compose up
```

Everything is available at `http://localhost` - nginx routes to the appropriate service.

### Development

Requires Bun and Docker installed.

```bash
# Start database + both dev servers
./scripts/dev
```

Or run manually:

```bash
# Start database
docker compose up -d database

# Terminal 1: API dev server
cd api && bun dev

# Terminal 2: Web UI dev server
cd webui && bun dev
```

## Development

### API Development

```bash
cd api
bun install          # Install dependencies
bun dev              # Dev server with hot reload
bun test             # Run tests
bun test:watch       # Watch mode
bun run build        # Build for production
bun type-check       # Type checking
bun lint             # Lint code
```

### Web UI Development

```bash
cd webui
bun install          # Install dependencies
bun dev              # Vite dev server
bun run build        # Production build
bun check            # Svelte type checking
bun check:watch      # Watch mode
bun lint             # ESLint + Prettier
bun format           # Format code
bun test             # Run all tests
bun test:unit        # Unit tests (Vitest)
bun test:e2e         # E2E tests (Playwright)
```

## Testing Webhooks

ngrok is included in the Docker Compose stack for development. To use it:

### 1. Set up ngrok account

1. Sign up at https://ngrok.com (free tier works)
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Claim a free static domain at https://dashboard.ngrok.com/domains

### 2. Add to your `.env` file

```bash
PUBLIC_HOST=your-static-domain.ngrok-free.app
```

### 3. Run with dev profile

```bash
# Start full stack with ngrok tunnel
docker compose --profile dev up

# Or start just ngrok alongside existing services
docker compose --profile dev up ngrok
```

The ngrok web UI is available at http://localhost:4040 to inspect requests.

### 4. Configure Twilio webhooks

Set your Twilio phone number webhooks to:
- **Voice URL**: `https://your-static-domain.ngrok-free.app/twilio/voice`
- **SMS URL**: `https://your-static-domain.ngrok-free.app/twilio/sms`

## API Endpoints

### Twilio Webhooks
- `POST /twilio/voice` - Incoming call handler (initiates transcription and WebSocket stream)
- `POST /twilio/sms` - SMS webhook handler with AI responses
- `POST /twilio/transcription-events` - Real-time transcription callback
- `WSS /twilio/stream` - WebSocket for bidirectional audio streaming

### Messages
- `GET /messages` - List messages (with optional filters)
- `GET /messages/conversations` - List conversations grouped by phone number
- `GET /messages/:id` - Get message by ID
- `POST /messages` - Create a message

### System
- `GET /health` - Health check

## Environment Variables

### API

- `PORT` - Server port (default: 3274)
- `NODE_ENV` - Environment (development/production/test)
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgres://user:pass@host:5432/db`)
- `PUBLIC_HOST` - Public hostname for Twilio webhooks (e.g., `your-app.ngrok.io`)
- `VENICE_API_KEY` - Venice AI API key

### Database

- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

### Web UI (local development only)

- `PUBLIC_API_HOST` - API backend URL (default: http://localhost:3274)

### ngrok (dev profile)

- `NGROK_AUTHTOKEN` - (optional) Auth token from ngrok dashboard

## Project Structure

```
.
├── api/                   # Express API backend
│   ├── app/
│   │   ├── modules/
│   │   │   ├── llm/       # Venice AI client and repository
│   │   │   ├── message/   # Message CRUD operations
│   │   │   └── twilio/    # Voice, SMS, and WebSocket handlers
│   │   └── shared/        # Database, middleware, errors
│   └── test/              # API tests
├── nginx/                 # Reverse proxy
│   ├── conf.d/            # Server configuration
│   └── Dockerfile
├── webui/                 # SvelteKit frontend (builds to volume)
│   ├── src/
│   │   ├── routes/        # SvelteKit pages
│   │   └── lib/           # Components and utilities
│   └── tests/             # UI tests
├── db/                    # Database initialization scripts
└── scripts/               # Development scripts
```

## Resources

- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [Twilio Real-Time Transcription](https://www.twilio.com/docs/voice/twiml/connect/transcription)
- [Twilio SMS Tutorial](https://www.twilio.com/docs/messaging/tutorials/how-to-receive-and-reply/node-js)
- [Venice AI Documentation](https://docs.venice.ai/)
- [ngrok Documentation](https://ngrok.com/docs)

## Considerations

### Legal Compliance

Voice transcription and AI-powered responses may have legal requirements that vary by jurisdiction. Ensure you:
- Implement proper consent mechanisms
- Follow applicable privacy and recording laws
- Provide clear disclosure to callers about AI assistance

### Cost Management

- Twilio real-time transcription incurs per-minute costs
- Twilio Media Streams are billed per minute
- Venice AI API usage is metered
- Consider implementing usage limits or cost tracking

## License

[Add your license here]
