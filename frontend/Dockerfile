# Production image: builds the static Vite bundle and serves it via nginx,
# instead of running the Vite dev server. Local dev uses Dockerfile.dev
# instead (see root docker-compose.yml).
#
# VITE_API_BASE is baked in at build time -- a static bundle can't read
# process.env at container start the way the dev server does. Set it via
# the VITE_API_BASE repository variable, passed as a build-arg in
# .github/workflows/cd.yml.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
