# ── Stage 1: Build the Vite frontend ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install root (frontend) deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server

# Expose the port Fly routes to
EXPOSE 3001

CMD ["node", "server/index.js"]
