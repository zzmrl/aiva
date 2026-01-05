# Automate.It Virtual Assistant (AIVA)

A virtual assistant application that processes phone calls and text messages via Twilio webhooks, featuring AI-powered conversational SMS responses through Venice AI integration.

## Features

- **Voice Call Handling**: Records and transcribes incoming phone calls via Twilio
- **Conversational SMS**: AI-powered text message responses using Venice AI LLM with web search capabilities
- **Message Storage**: PostgreSQL database for persistent message history
- **Web Interface**: Modern SvelteKit UI to view and manage messages
- **RESTful API**: Express/TypeScript backend for message management

## Architecture

### Three-Tier Docker Stack

1. **API Backend** (`api/`)
   - Express + TypeScript server on Bun runtime
   - Twilio webhook handlers for voice and SMS
   - Venice AI integration for LLM completions
   - PostgreSQL database interactions

2. **Database**
   - PostgreSQL 18 Alpine
   - Message storage with indexed queries
   - Docker secrets-based credential management

3. **Web UI** (`webui/`)
   - SvelteKit 2 + Tailwind CSS 4 + DaisyUI
   - NGINX-served static build
   - Real-time message viewing

### Tech Stack

- **Runtime**: Bun
- **Backend**: Express, TypeScript
- **Frontend**: SvelteKit 2, Tailwind CSS 4, DaisyUI
- **Database**: PostgreSQL 18
- **AI**: Venice AI (OpenAI-compatible API)
- **Telephony**: Twilio Voice & SMS
- **Infrastructure**: Docker Compose

## Requirements

- Docker and Docker Compose
- Bun (for local development)
- Twilio account with phone number
- Venice AI API key

### Required Secret Files

Create these files in `./secrets/` directory:

- `postgres_password` - Database password
- `postgres_user` - Database username
- `venice_api_key` - Venice AI API key

## Quick Start

### Production

```bash
# Start complete stack
docker compose up
```

The API will be available at `http://localhost:3000` and the web UI at `http://localhost:8080`.

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

Configure your Twilio phone number to use the ngrok URL for voice and SMS webhooks.

## API Endpoints

- `POST /voice` - Twilio voice webhook handler
- `POST /voiceTranscribe` - Voice transcription callback
- `POST /sms` - Twilio SMS webhook handler
- `GET /messages` - Retrieve all messages
- `GET /messages/:id` - Get message by ID
- `GET /health` - Health check

## Environment Variables

### API

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_HOST` - Database host (default: localhost)
- `DATABASE_PORT` - Database port (default: 5432)
- `DATABASE_PASSWORD_FILE` - Path to database password secret
- `DATABASE_USER_FILE` - Path to database user secret
- `DATABASE_NAME_FILE` - Path to database name secret
- `VENICE_API_KEY_FILE` - Path to Venice API key secret

### Web UI

- `PUBLIC_API_HOST` - API backend URL (default: http://localhost:3000)

## Project Structure

```
.
├── api/                # Express API backend
│   ├── app/
│   │   ├── entity/    # Database entity functions
│   │   ├── llm/       # Venice AI client
│   │   └── routes/    # API route handlers
│   └── test/          # API tests
├── webui/             # SvelteKit frontend
│   ├── src/
│   │   ├── routes/    # SvelteKit pages
│   │   └── lib/       # Components and utilities
│   └── tests/         # UI tests
├── db/                # Database initialization scripts
├── secrets/           # Secret files (gitignored)
└── scripts/           # Development scripts
```

## Resources

- [Twilio Voice Recording Tutorial](https://www.twilio.com/docs/voice/tutorials/how-to-record-phone-calls/node)
- [Twilio SMS Tutorial](https://www.twilio.com/docs/messaging/tutorials/how-to-receive-and-reply/node-js)
- [Venice AI Documentation](https://docs.venice.ai/)

## Considerations

### Legal Compliance

Recording voice calls requires legal compliance that varies by jurisdiction. Ensure you:
- Implement proper consent mechanisms
- Follow state/country-specific recording laws
- Provide clear disclosure to callers

### Cost Management

- Twilio call transcriptions incur per-call costs
- Venice AI API usage is metered
- Consider implementing per-user limits or cost offset strategies

## License

[Add your license here]
