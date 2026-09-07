# ==========================================
# 🐳 Production Dockerfile for IT Service Management (ITSM)
# ==========================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl libc6-compat netcat-openbsd

# 1. Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 2. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 3. Production runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy needed files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure execution permissions for entrypoint
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
EXPOSE 3443

ENTRYPOINT ["./docker-entrypoint.sh"]

