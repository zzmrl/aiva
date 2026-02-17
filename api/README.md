# AIVA API

Express + TypeScript API running on Bun. See the [project README](../README.md) for full setup and environment details.

## Directory Structure

```
api/
├── modules/              # Feature modules
│   ├── llm/              # Venice AI integration (completions)
│   ├── message/          # Message CRUD and conversation handling
│   └── twilio/           # Twilio webhook handlers (SMS/voice)
├── shared/               # Cross-cutting infrastructure
│   ├── database/         # PostgreSQL client (Bun SQL)
│   ├── errors/           # Error types and handling
│   └── middleware/       # Express middleware (rate limiting, validation)
├── test/                 # Integration tests
├── config.ts             # Environment validation (Zod)
├── factory.ts            # Express app factory
├── server.ts             # Server bootstrap
└── index.ts              # Entrypoint
```

## Development

```bash
bun install       # Install dependencies
bun dev           # Dev server with hot reload
bun test          # Run tests
bun lint          # Lint
bun type-check    # Type check
```

Use [ngrok](https://ngrok.com/) or similar to receive Twilio webhooks locally.

## Module Structure

| File       | Responsibility                                        |
| ---------- | ----------------------------------------------------- |
| controller | HTTP layer — parse requests, call services, format responses |
| service    | Business logic, orchestration, domain errors          |
| repository | Data access, query building, no business logic        |
| routes     | Route definitions, middleware wiring                  |
| validation | Request schema definitions                            |
