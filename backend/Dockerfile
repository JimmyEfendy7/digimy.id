# Use official Node.js runtime as base image
FROM node:18-slim

# Install system dependencies for Puppeteer and Google Chrome
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    ca-certificates \
    procps \
    fonts-liberation \
    fonts-noto-color-emoji \
    chromium \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxkbcommon0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxshmfence1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    wget -q -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get update && apt-get install -y /tmp/google-chrome.deb || (apt-get -fy install && apt-get install -y /tmp/google-chrome.deb) && \
    # Create symlink for easier discovery by apps
    ln -sf /opt/google/chrome/google-chrome /usr/bin/google-chrome-stable || true && \
    ln -sf /opt/google/chrome/google-chrome /usr/bin/google-chrome || true && \
    # Ensure chromium alias exists if binary name differs
    ln -sf /usr/bin/chromium /usr/bin/chromium-browser || true && \
    rm -f /tmp/google-chrome.deb && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories for uploads and cache
RUN mkdir -p public/products public/stores public/reviews public/addons public/qrcodes && \
    mkdir -p .wwebjs_auth .wwebjs_cache && \
    chmod -R 755 public .wwebjs_auth .wwebjs_cache

# Verify assets were copied and list contents for debugging
RUN echo "=== Verifying asset directories ===" && \
    ls -la public/ && \
    echo "Products directory:" && ls -la public/products/ | head -10 && \
    echo "Reviews directory:" && ls -la public/reviews/ | head -5 && \
    echo "Stores directory:" && ls -la public/stores/ | head -5

# Create a non-root user for security with proper home directory
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash -d /home/appuser -m appuser && \
    mkdir -p /home/appuser/.local/share/applications && \
    mkdir -p /home/appuser/.cache && \
    mkdir -p /home/appuser/.config && \
    chown -R appuser:appuser /app /home/appuser

# Set HOME environment variable
ENV HOME=/home/appuser

# Switch to non-root user
USER appuser

# Expose port (adjust if your app uses a different port)
EXPOSE 5000

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-accelerated-2d-canvas,--no-first-run,--no-zygote,--disable-gpu"
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["pnpm", "start"]
