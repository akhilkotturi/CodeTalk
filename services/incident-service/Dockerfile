FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/incident-service/package.json ./services/incident-service/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/incident-service/ ./services/incident-service/
COPY shared/ ./shared/

RUN npm run build -w services/incident-service

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/incident-service/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
