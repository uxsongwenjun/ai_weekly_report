# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build (produces .next/standalone)
RUN npm run build

# ─── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Persist SQLite database outside the container
RUN mkdir -p data

# Copy only what's needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/tools ./tools

# libsql uses dynamic require() for platform-specific native binaries.
# Next.js standalone trace cannot detect them — copy explicitly.
COPY --from=builder /app/node_modules/libsql ./node_modules/libsql
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql

EXPOSE 3000

CMD ["node", "server.js"]
