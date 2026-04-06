# Use Node.js as base image
FROM node:22-slim

# Install OpenSSL for Prisma (needed on slim images)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# IMPORTANT: Generate Prisma Client (REQUIRED for the build to find the 'db' models)
RUN npx prisma generate

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build
# DEBUG: This will show us exactly what was built in the logs
RUN ls -R dist
# Expose the API port
EXPOSE 3001
# Start using the found path (most likely dist/src/main.js in ESM mode)
CMD ["node", "dist/src/main.js"]
