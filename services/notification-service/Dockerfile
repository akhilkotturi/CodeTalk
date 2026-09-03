FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/notification-service/package.json ./services/notification-service/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/notification-service/ ./services/notification-service/
COPY shared/ ./shared/

RUN npm run build -w services/notification-service

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4003

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/notification-service/dist ./dist

EXPOSE 4003
CMD ["node", "dist/index.js"]
