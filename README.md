# Automate.It Virtual Assistant (AIVA)

A virtual assistant application that processes phone calls and text messages via Twilio webhooks, featuring AI-powered conversational responses through Venice AI integration.

## Features

- **Conversational Voice Chat**: Real-time bidirectional voice calls with speech-to-text transcription, LLM responses, and text-to-speech audio streaming via WebSocket
- **Conversational SMS**: AI-powered text message responses using Venice AI LLM with web search capabilities
- **Message Storage**: PostgreSQL database for persistent conversation history
- **Web Interface**: Modern SvelteKit UI with chat-style conversation views
- **RESTful API**: Express/TypeScript backend for message management

## Architecture

### Three-Tier Docker Stack

1. **API Backend** (`api/`)
   - Express + TypeScript server on Bun runtime
   - Twilio webhook handlers for voice and SMS
   - WebSocket server for real-time voice streaming
   - Venice AI integration for LLM completions
   - Text-to-speech for voice responses

2. **Database**
   - PostgreSQL 18 Alpine
   - Message storage with indexed queries
   - Conversation tracking by phone number

3. **Web UI** (`webui/`)
   - SvelteKit 2 + Tailwind CSS 4 + DaisyUI
   - NGINX-served static build
   - Chat-style conversation interface

### Tech Stack

- **Runtime**: Bun
- **Backend**: Express, TypeScript, WebSocket (ws)
- **Frontend**: SvelteKit 2, Tailwind CSS 4, DaisyUI
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

The API will be available at `http://localhost:3000` and the web UI at `http://localhost`.

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
bun install           # Install dependencies
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
bun install           # Install dependencies
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

Use ngrok or a similar tunneling service to expose your local API for Twilio webhook delivery:

```bash
ngrok http 3000
```

Set the `PUBLIC_HOST` environment variable to your ngrok hostname (without the `https://` prefix):

```bash
export PUBLIC_HOST=your-subdomain.ngrok.io
```

Configure your Twilio phone number webhooks:
- **Voice URL**: `https://your-subdomain.ngrok.io/twilio/voice`
- **SMS URL**: `https://your-subdomain.ngrok.io/twilio/sms`

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

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production/test)
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgres://user:pass@host:5432/db`)
- `PUBLIC_HOST` - Public hostname for Twilio webhooks (e.g., `your-app.ngrok.io`)
- `VENICE_API_KEY` - Venice AI API key

### Web UI

- `PUBLIC_API_HOST` - API backend URL (default: http://localhost:3000)

## Project Structure

```
.
├── api/                    # Express API backend
│   ├── app/
│   │   ├── modules/
│   │   │   ├── llm/       # Venice AI client and repository
│   │   │   ├── message/   # Message CRUD operations
│   │   │   └── twilio/    # Voice, SMS, and WebSocket handlers
│   │   └── shared/        # Database, middleware, errors
│   └── test/              # API tests
├── webui/                  # SvelteKit frontend
│   ├── src/
│   │   ├── routes/        # SvelteKit pages
│   │   └── lib/           # Components and utilities
│   └── tests/             # UI tests
├── db/                     # Database initialization scripts
└── scripts/                # Development scripts
```

## Resources

- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [Twilio Real-Time Transcription](https://www.twilio.com/docs/voice/twiml/connect/transcription)
- [Twilio SMS Tutorial](https://www.twilio.com/docs/messaging/tutorials/how-to-receive-and-reply/node-js)
- [Venice AI Documentation](https://docs.venice.ai/)

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
