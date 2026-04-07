# AIVA WebUI

SvelteKit 2 + Tailwind CSS 4 + DaisyUI frontend. Displays conversations and messages fetched from the API. See the [project README](../README.md) for full setup and environment details.

## Directory Structure

```
webui/
├── src/
│   ├── lib/              # Shared components and utilities
│   │   ├── api.ts        # API client (types + fetch helpers)
│   │   ├── utils.ts      # Shared utilities
│   │   ├── ChatBubble.svelte
│   │   ├── ConversationList.svelte
│   │   ├── ConversationView.svelte
│   │   └── ThemeSwap.svelte
│   └── routes/           # SvelteKit pages
│       ├── +layout.svelte
│       ├── +layout.ts
│       └── +page.svelte  # Main conversations view
├── tests/                # Playwright E2E tests
└── static/               # Static assets
```

## Development

```bash
bun install       # Install dependencies
bun dev           # Vite dev server (port 5173)
bun run build     # Production build
bun check         # Svelte type checking
bun lint          # ESLint + Prettier check
bun format        # Format code
bun test          # Run all tests
bun test:unit     # Unit tests (Vitest)
bun test:e2e      # E2E tests (Playwright)
```
