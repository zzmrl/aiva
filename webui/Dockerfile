FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS dev
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "--bun", "run", "dev", "--host"]

FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun --bun run check && bun --bun run build

# Minimal image that just holds the static files
FROM alpine:latest AS release
COPY --from=build /app/build /app/build
CMD ["sh", "-c", "cp -r /app/build/* /output/ && echo 'Static files copied'"]
