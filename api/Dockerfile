FROM oven/bun:1-alpine AS base
WORKDIR /api

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
USER bun
CMD ["bun", "--watch", "app/index.ts"]

FROM dev AS test
USER root
RUN NODE_ENV=test bun run test && bun run type-check

# Release stage depends on test passing
FROM base AS release
COPY --from=test /dev/null /dev/null
COPY --from=install /temp/prod/node_modules node_modules
COPY app/ app/
COPY package.json ./

USER bun
EXPOSE 3274
ENTRYPOINT ["bun", "--sql-preconnect"]
CMD ["app/index.ts"]
