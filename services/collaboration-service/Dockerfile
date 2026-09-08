FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/collaboration-service/package.json ./services/collaboration-service/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/collaboration-service/ ./services/collaboration-service/

RUN npm run build -w services/collaboration-service

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4005

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/collaboration-service/dist ./dist

EXPOSE 4005
CMD ["node", "dist/index.js"]
