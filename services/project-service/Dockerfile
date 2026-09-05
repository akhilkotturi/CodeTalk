FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/project-service/package.json ./services/project-service/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/project-service/ ./services/project-service/

RUN npm run build -w services/project-service

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4004

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/project-service/dist ./dist

EXPOSE 4004
CMD ["node", "dist/index.js"]
