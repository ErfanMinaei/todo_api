FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV DATABASE_URL=mysql://dummy:dummy@dummy:3306/dummy

RUN npm install --ignore-scripts
ENV PRISMA_CLIENT_ENGINE_TYPE=library
ENV PRISMA_CLIENT_OUTPUT_DIR=./node_modules/@prisma/client
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .
RUN npm run build

FROM node:22-slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]