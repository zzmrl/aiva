FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
# RUN bun --bun run test
RUN bun run check
RUN bun run build

FROM nginx:alpine AS release
COPY --from=prerelease /app/build /usr/share/nginx/html
