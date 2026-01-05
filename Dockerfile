# 1. PRUNE STAGE
# This isolates only the "server" app and the local packages it depends on (e.g. packages/db)
FROM oven/bun:1 AS pruner
WORKDIR /app
COPY . .
# This creates a folder "out" with only the necessary files
RUN bun x turbo prune --scope=server --docker

# 2. INSTALL & BUILD STAGE
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy lockfile and package.jsons from the pruned stage
# This creates a cached layer. If package.json didn't change, we skip install.
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock* ./

RUN bun install --frozen-lockfile

# Copy source code ONLY for the specific app and its internal dependencies
COPY --from=pruner /app/out/full/ .

# Build the project
RUN bun run build --filter=server

# 3. RUNNER STAGE (Production)
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security (Debian/Ubuntu syntax)
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --shell /bin/false appuser

# Copy the build artifacts and necessary node_modules
# Note: In Bun, you might run the source directly or a compiled file depending on setup
COPY --from=builder --chown=appuser:nodejs /app .

USER appuser
EXPOSE 3000

# Start command specific to Elysia/Bun
CMD ["bun", "apps/server/src/index.ts"]