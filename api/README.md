# AIVA API

Express TypeScript API for the Automate.It Virtual Assistant.

## Development

### Install dependencies
```bash
pnpm install
```

### Run in development mode
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

### Run production build
```bash
pnpm start
```

### Type checking
```bash
pnpm type-check
```

### Linting
```bash
pnpm lint
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
- `DATABASE_URL` - PostgreSQL connection string
