#!/bin/bash

# A simple script to run both frontend and backend concurrently for local development.

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Sync Team Development Environment...${NC}"

# Check for .env in backend
if [ ! -f backend/.env ]; then
  echo -e "${RED}Warning: backend/.env file not found.${NC}"
  echo -e "The backend requires a DATABASE_URL to run. Please create backend/.env with your MariaDB connection string."
fi

# Run all services concurrently with clean, color-coded logs
concurrently \
  --kill-others \
  --prefix "[{name}]" \
  --names "BACKEND,FRONTEND,STUDIO" \
  --prefix-colors "blue,green,magenta" \
  "cd backend && bun run start:dev" \
  "cd frontend && bun run dev" \
  "cd backend && npx prisma studio"