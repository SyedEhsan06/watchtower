FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json        ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile \
      --filter @watchtower/web... \
      --filter @watchtower/shared...

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json        ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY --from=deps /app/node_modules                 ./node_modules
COPY --from=deps /app/apps/web/node_modules        ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY tsconfig.base.json ./
COPY packages/shared    ./packages/shared
COPY apps/web           ./apps/web

# Baked into the client JS bundle at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @watchtower/shared build
RUN pnpm --filter @watchtower/web build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Limit heap to keep memory predictable on a shared server
ENV NODE_OPTIONS="--max-old-space-size=256"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public          ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
