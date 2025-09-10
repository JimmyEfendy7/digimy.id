# Simplified single-stage Dockerfile for EasyPanel
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DISABLE_ESLINT_PLUGIN=true
ENV PORT=3000
ENV HOST=0.0.0.0

# Build the application
RUN pnpm build

# Create non-root user
RUN useradd -m -s /bin/bash app && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
