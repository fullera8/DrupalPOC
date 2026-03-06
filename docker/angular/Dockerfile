# =============================================================================
# Angular SPA — Student/Faculty Training UI
# =============================================================================
# Multi-stage build: Node (build) → Nginx (serve)
# POC scope: training module viewer, quiz UI, basic dashboard
#
# Image: ghcr.io/fullera8/drupalpoc-angular:latest
# Port:  80
# =============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files and install (layer caching)
COPY src/angular/package*.json ./
RUN npm ci

# Copy source and build production bundle
COPY src/angular/ ./
RUN npx ng build --configuration=production

# --- Stage 2: Serve ---
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA routing
COPY docker/angular/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app from build stage
# Angular 19 outputs to dist/<project-name>/browser/
COPY --from=build /app/dist/drupalpoc-angular/browser/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
