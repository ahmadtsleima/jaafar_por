# ── Stage 1: Build the Vite frontend ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install root (frontend) deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server

# Expose the port Railway routes to
EXPOSE 8080

ENV PORT=8080

CMD ["node", "server/index.js"]
