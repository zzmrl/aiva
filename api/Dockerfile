FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN pnpm i --prod --frozen-lockfile

COPY /app ./app

EXPOSE 3000

# Start the application
CMD ["node", "app/index.js"]
