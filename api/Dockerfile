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
CMD ["run", "dev"]

FROM dev AS test
RUN NODE_ENV=test bun run test
RUN bun run type-check

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY app/ app/
COPY tsconfig.json package.json ./

USER bun
EXPOSE 3274
ENTRYPOINT ["bun"]
CMD ["run", "start"]
