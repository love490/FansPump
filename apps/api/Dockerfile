# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/database/package.json packages/database/
COPY packages/database/prisma packages/database/prisma
COPY packages/database/src packages/database/src
COPY packages/database/tsconfig.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY packages/shared/tsconfig.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @iopn/api...

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/packages /app/packages
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web/src apps/web/src
COPY apps/web/tsconfig.json apps/web/tsconfig.json
RUN pnpm db:generate && pnpm --filter @iopn/api build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/api/src /app/apps/api/src
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/tsconfig.json /app/apps/api/tsconfig.json
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /app/apps/web/src /app/apps/web/src
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
