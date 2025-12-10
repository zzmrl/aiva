# AIVA API

Express TypeScript API for the Automate.It Virtual Assistant.

Used bun for development but will likely work with other runtimes and package managers

## Development

In order to receive webhook requests during development, you will need to use a service like [ngrok](https://ngrok.com/).

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

## Docker

### Build with Docker Compose
```bash
docker compose build api
```

### Run with Docker Compose
```bash
docker compose up api
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PASSWORD_FILE` - Path to secret file containing database password
- `DATABASE_USER_FILE` - Path to secret file containing database user
- `DATABASE_NAME_FILE` - Path to secret file containing database name
- `DATABASE_HOST` - Database host (default: localhost)
- `DATABASE_PORT` - Database port (default: 5432)
