FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./

FROM base AS dependencies
RUN npm ci --no-audit --no-fund

FROM dependencies AS development
COPY backend/ ./
RUN npm run prisma:generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM development AS build
RUN npm run build

FROM build AS migration
CMD ["node", "dist/database/migrate.js"]

FROM base AS production-dependencies
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
