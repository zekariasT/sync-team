# Use Node.js as base image
FROM node:22-slim

# Install system dependencies for Bun or other tools if needed, 
# although we'll use npm for simplicity in the Dockerfile
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the API port
EXPOSE 3001

# Run the application
CMD ["npm", "run", "start:prod"]
