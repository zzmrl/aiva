# AIVA API

Express TypeScript API for the Automate.It Virtual Assistant.

Used bun for development but will likely work with other runtimes and package managers

## Directory Structure

```
api/
├── app/                    # Application source code
│   ├── modules/            # Feature modules with domain logic
│   │   ├── llm/            # Venice AI integration (completions)
│   │   ├── message/        # Message CRUD and conversation handling
│   │   ├── telnyx/         # Telnyx webhook handlers (SMS/voice)
│   │   └── twilio/         # Twilio webhook handlers (SMS/voice)
│   ├── shared/             # Cross-cutting infrastructure
│   │   ├── database/       # PostgreSQL client (Bun SQL)
│   │   ├── errors/         # Error types and handling
│   │   ├── middleware/     # Express middleware (validation)
│   │   └── redis/          # Redis client (Bun Redis)
│   ├── config.ts           # Environment validation (Zod)
│   ├── factory.ts          # Express app factory
│   ├── index.ts            # App exports
│   └── server.ts           # Server bootstrap
├── test/                   # Integration tests
├── index.ts                # Entrypoint
└── package.json
```

## Development

In order to receive webhook requests during development, 
a service like [ngrok](https://ngrok.com/) is required.

### Install dependencies

```bash
bun install
```

### Run in development mode

```bash
bun dev
```

### Build

```bash
bun run build
```

### Run production build

```bash
bun start
```

### Type checking

```bash
bun type-check
```

### Linting

```bash
bun lint
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment [development/production/test]
- `VENICE_API_KEY`: Venice AI API key
- `TELNYX_APP_ID`: Telnyx application ID
- `TELNYX_API_KEY`: Telnyx API key
- `TELNYX_PUBLIC_KEY`: Telnyx public key for validation
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)
- `DATABASE_URL`: Database connection URL

### `_FILE` suffixed env variables

This application checks each `_FILE` suffixed variable, reads the file if it exists, 
and falls back to the original environment variable otherwise. 

For example, if `VENICE_API_KEY_FILE` is set, the application will set `VENICE_API_KEY` from
the file specified. Otherwise, it will use the value of `VENICE_API_KEY` environment variable.

## Module Structure

This is the standard structure for modules

|File|Responsibility|
|--|--|
|controller|HTTP layer—parse requests, call services, format responses|
|service|Business logic, orchestration, domain errors|
|repository|Data access, query building, no business logic|
|routes|Route definitions, middleware wiring|
|validation|Request schema definitions|
|test|Unit tests focused on the service layer|
