FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json             ./apps/api/
COPY packages/shared/package.json      ./packages/shared/
COPY packages/database/package.json    ./packages/database/
RUN pnpm install --frozen-lockfile \
      --filter @watchtower/api... \
      --filter @watchtower/shared... \
      --filter @watchtower/database...

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared    ./packages/shared
COPY packages/database  ./packages/database
COPY apps/api           ./apps/api
RUN pnpm --filter @watchtower/database generate
RUN pnpm --filter @watchtower/shared build
RUN pnpm --filter @watchtower/api build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser

COPY --from=build --chown=apiuser:nodejs /app/node_modules                  ./node_modules
COPY --from=build --chown=apiuser:nodejs /app/apps/api/node_modules         ./apps/api/node_modules
COPY --from=build --chown=apiuser:nodejs /app/apps/api/dist                 ./apps/api/dist
COPY --from=build --chown=apiuser:nodejs /app/apps/api/package.json        ./apps/api/package.json
COPY --from=build --chown=apiuser:nodejs /app/packages/shared/dist        ./packages/shared/dist
COPY --from=build --chown=apiuser:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=apiuser:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build --chown=apiuser:nodejs /app/packages/database             ./packages/database

USER apiuser
EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
