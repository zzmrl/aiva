# AIVA API

Express TypeScript API for the Automate.It Virtual Assistant.

Used bun for development but will likely work with other runtimes and package managers

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
- `TELNYX_APP_ID`: Telnyx application ID
- `TELNYX_API_KEY`: Telnyx API key
- `TELNYX_PUBLIC_KEY`: Telnyx public key for validation

### Either DB URL or Individual Settings

- `DATABASE_URL`: Database connection URL

Or

- `DATABASE_USER`: Database user
- `DATABASE_PASSWORD`: Database password
- `DATABASE_NAME`: Database name
- `DATABASE_HOST`: Database host (default: localhost)
- `DATABASE_PORT`: Database port (default: 5432)

### `_FILE` suffixed env variables

This application checks each `_FILE` suffixed variable, reads the file if it exists, 
and falls back to the regular environment variable otherwise. For example, if 
`DATABASE_PASSWORD_FILE` is set, it will read the password from the file specified 
by the variable.

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
