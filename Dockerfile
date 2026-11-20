# Production image for Pablo. Dokku builds this on the server on every `git push dokku main`.
# Locally: docker build -t pablo . && docker run -p 3100:5000 -v pablo-data:/app/data pablo

# ---- 1. Install dependencies (cached until package-lock.json changes)
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build the Next.js app into .next/standalone
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Small runtime image: only the standalone server and its files
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    # Dokku sends traffic to port 5000 in the container (no EXPOSE needed).
    PORT=5000 \
    HOSTNAME=0.0.0.0 \
    # The SQLite file lives in /app/data, which is mounted from the server's disk.
    DATABASE_PATH=/app/data/pablo.sqlite \
    # node:sqlite still prints an "experimental" warning on start; hide it.
    NODE_OPTIONS=--disable-warning=ExperimentalWarning

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# For `npm run user:create` inside the container (creating accounts).
COPY --chown=node:node lib/db-core.ts ./lib/db-core.ts
COPY --chown=node:node scripts/create-user.ts ./scripts/create-user.ts
RUN mkdir -p /app/data && chown node:node /app/data

# Run as the unprivileged "node" user (uid 1000), not root.
USER node
CMD ["node", "server.js"]
