# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Build stage: install the whole workspace, build all packages, bundle the API.
# ----------------------------------------------------------------------------
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g pnpm@11.10.0

WORKDIR /repo

# Copy manifests first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/osi-schema/package.json ./packages/osi-schema/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Copy sources and build everything (schema → api/web), then bundle the API to
# a single self-contained file.
COPY . .
RUN pnpm build \
 && pnpm --filter @osi-editor/api bundle

# ----------------------------------------------------------------------------
# Runtime stage: nginx serves the SPA and proxies /api to the Node API server.
# ----------------------------------------------------------------------------
FROM node:22-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Self-contained API bundle (no node_modules needed at runtime).
COPY --from=build /repo/apps/api/dist/server.mjs /app/server.mjs
# Built SPA static assets.
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# nginx config + process supervisor entrypoint.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true \
 && chmod +x /entrypoint.sh

ENV PORT=3001
EXPOSE 8080
CMD ["/entrypoint.sh"]
