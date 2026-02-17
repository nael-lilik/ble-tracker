# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root configurations (if using monorepo)
# In this case, we'll focus on the backend folder
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src/

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Scripts for migration and start
CMD ["sh", "-c", "npx prisma db push && npm run start"]
