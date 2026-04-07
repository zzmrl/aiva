# Build WebUI static files
FROM oven/bun:1-alpine AS webui-build
WORKDIR /webui
COPY webui/package.json webui/bun.lock ./
RUN bun install --frozen-lockfile
COPY webui/ ./
RUN bun --bun run check && bun --bun run build

# Install API production deps
FROM oven/bun:1-alpine AS api-install
WORKDIR /api
COPY api/package.json api/bun.lock ./
RUN bun install --frozen-lockfile --production

# Final release image
FROM oven/bun:1-alpine AS release
WORKDIR /api

# dbmate binary for running migrations
COPY --from=ghcr.io/amacneil/dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate

# API
COPY --from=api-install /api/node_modules ./node_modules
COPY api/app/ ./app/
COPY api/package.json ./

# WebUI static files served by the API
COPY --from=webui-build /webui/build ./public/

# Database migrations
COPY db/migrations/ ./db/migrations/

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER bun
EXPOSE 3274
ENTRYPOINT ["./entrypoint.sh"]
