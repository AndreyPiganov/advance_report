FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine AS development
COPY infra/nginx/development.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

FROM nginx:stable-alpine AS production
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
EXPOSE 80
