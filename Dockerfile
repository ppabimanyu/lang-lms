# ==============================================================================
# Lingua LMS - Unified Multi-Stage Dockerfile
#
# Targets:
#   1. frontend -> Nginx Alpine serving compiled Vue 3 SPA (Port 80)
#   2. backend  -> Node.js 20 Express + Drizzle ORM runtime (Port 3000)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Image (Node.js 20 Alpine)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies (Cached Layer)
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 3: Frontend Builder (Vue 3 + Vite Compilation)
# ------------------------------------------------------------------------------
FROM base AS frontend-builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Target 1: Frontend Production Runtime (Nginx Alpine)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS frontend

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from frontend-builder
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Expose internal HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ------------------------------------------------------------------------------
# Target 2: Backend Production Runtime (Node.js 20 + Express)
# ------------------------------------------------------------------------------
FROM base AS backend

# Install postgresql-client (for pg_isready healthcheck in entrypoint), bash, and curl
RUN apk add --no-cache postgresql-client bash curl

# Copy installed dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Setup entrypoint script
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

# Expose backend port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["/usr/local/bin/backend-entrypoint.sh"]
CMD ["npm", "run", "server:prod"]
