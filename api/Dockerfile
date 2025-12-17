FROM oven/bun:1-alpine AS base
WORKDIR /api

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
# RUN bun test
# RUN bun run type-check

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /api/app app
COPY --from=prerelease /api/package.json /api/index.ts ./

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "start"]
