FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV DATABASE_URL=mysql://dummy:dummy@dummy:3306/dummy

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:22-slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV DATABASE_URL=mysql://dummy:dummy@dummy:3306/dummy

RUN npm ci --only=production && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/src ./src

RUN mkdir -p /app/dist/generated/prisma && \
    cp -r /app/generated/prisma/* /app/dist/generated/prisma/

ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/dist/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]