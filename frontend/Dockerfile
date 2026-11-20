# JobEscape frontend (Next.js). Multi-stage so the final image has no build cache or source clutter.
ARG NODE_VERSION=22

# ---- 1. install dependencies (cached until package*.json changes) ----
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. build ----
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
# NEXT_PUBLIC_* values are baked into the JavaScript at BUILD time, so this must be the address
# your BROWSER uses to reach the backend (not the Docker-internal name).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Note: next/font downloads the Inter font from Google Fonts once, here at build time (needs internet).
RUN npm run build

# ---- 3. run ----
FROM node:${NODE_VERSION}-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# Full node_modules is kept on purpose: next.config.ts is loaded at start-up and needs TypeScript.
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.ts ./
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]