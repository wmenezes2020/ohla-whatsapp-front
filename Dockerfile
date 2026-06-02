# ============================================================================
#  PlataformaFallback — Frontend (Next.js) — production image for Coolify
# ============================================================================

# ---- Stage 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public build-time vars (override at build in Coolify if needed)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/es || exit 1

CMD ["node", "server.js"]
