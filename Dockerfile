# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.19.0-slim
ARG NPM_VERSION=12.0.2

FROM node:${NODE_VERSION} AS base
ARG NPM_VERSION
RUN npm install -g npm@${NPM_VERSION}
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run build:tsc

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/src ./dist
USER node
ENTRYPOINT ["node", "--enable-source-maps", "dist/index.js"]
