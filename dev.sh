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
  echo -e "Example: DATABASE_URL=\"mysql://root:password@localhost:3306/sync_team\""
fi

# Function to kill background processes on exit
cleanup() {
  echo -e "\n${BLUE}Shutting down services...${NC}"
  kill $(jobs -p)
  exit
}

trap cleanup SIGINT SIGTERM

# Start Backend in background
echo -e "${GREEN}Starting Backend on port 3001...${NC}"
(cd backend && bun run start:dev) &

# Give backend a moment to start
sleep 2

# Start Frontend in background
echo -e "${GREEN}Starting Frontend on port 3000...${NC}"
(cd frontend && bun run dev) &

# Start Prisma Studio in background
echo -e "${GREEN}Starting Prisma Studio on port 5555...${NC}"
(cd backend && npx prisma studio) &

# Keep script running
wait
