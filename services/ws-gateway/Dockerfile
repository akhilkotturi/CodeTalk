FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/ws-gateway/package.json ./services/ws-gateway/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/ws-gateway/ ./services/ws-gateway/
COPY shared/ ./shared/

RUN npm run build -w services/ws-gateway

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4002

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/ws-gateway/dist ./dist

EXPOSE 4002
CMD ["node", "dist/index.js"]
