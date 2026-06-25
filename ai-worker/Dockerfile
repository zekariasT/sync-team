# AI Worker — headless NestJS microservice (no HTTP surface).
FROM node:22-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build
# DEBUG: confirm the emitted layout
RUN ls -R dist

# This service has no exposed port — it consumes from RabbitMQ.
CMD ["node", "dist/main.js"]
