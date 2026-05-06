FROM node:22-slim AS builder
WORKDIR /app

# Install OpenSSL (required by Prisma 6 on slim images)
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:22-slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production

# Generate Prisma Client (placeholder URL works)
RUN DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npx prisma generate

# Copy built NestJS app
COPY --from=builder /app/dist ./dist

# --- Prisma client path fix (matches your compiled code expectations) ---
RUN mkdir -p /app/dist/generated/prisma && \
    mv /app/generated/prisma /app/dist/generated/prisma/client

# Tell Prisma exactly where the query engine binary is (discovered automatically after move)
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/dist/generated/prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

# --- FIX: Copy GraphQL schema files (and any other static assets) ---
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]