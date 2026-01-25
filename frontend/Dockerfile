FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build is skipped in dev mode, but useful for checking
# RUN npm run build

# Command is set in docker-compose
