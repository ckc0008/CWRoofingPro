FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

RUN mkdir -p /data/uploads
ENV DATABASE_PATH=/data/data.db
ENV UPLOADS_DIR=/data/uploads

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
