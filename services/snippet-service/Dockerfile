FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/snippet-service/package.json ./services/snippet-service/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/snippet-service/ ./services/snippet-service/
COPY shared/ ./shared/

RUN npm run build -w services/snippet-service

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/snippet-service/dist ./dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
