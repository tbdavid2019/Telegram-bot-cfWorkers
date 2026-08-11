# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder

ARG PNPM_VERSION=9.15.4
WORKDIR /app

RUN corepack enable \
    && corepack install --global pnpm@${PNPM_VERSION}

# Install dependencies before copying the source so Docker can reuse this layer.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY build.js ./
COPY src ./src
RUN pnpm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker/wrangler.preview.toml ./docker/wrangler.preview.toml

EXPOSE 8787

# This image runs a local Wrangler preview. Cloudflare production deployment
# remains `wrangler deploy`, because Cloudflare Workers are not Docker hosts.
CMD ["./node_modules/.bin/wrangler", "dev", "--config", "/app/docker/wrangler.preview.toml", "--local", "--ip", "0.0.0.0", "--port", "8787"]
