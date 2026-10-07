FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json   ./packages/shared/
RUN pnpm install --frozen-lockfile \
      --filter @watchtower/database... \
      --filter @watchtower/shared...

COPY tsconfig.base.json ./
COPY packages/shared    ./packages/shared
COPY packages/database  ./packages/database

WORKDIR /app/packages/database

# DATABASE_URL is injected at runtime via docker-compose env
CMD ["npx", "prisma", "migrate", "deploy"]
