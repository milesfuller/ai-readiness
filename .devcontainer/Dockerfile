# Use the official Node.js devcontainer image
FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y \
    # Dependencies for Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    # Dependencies for Firefox
    libxtst6 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    # Dependencies for WebKit
    libwoff1 \
    libopus0 \
    libwebp6 \
    libwebpdemux2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    # Media codecs
    libvpx6 \
    # Additional useful tools
    postgresql-client \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install latest npm and pnpm globally
RUN npm install -g npm@latest pnpm@latest

# Set environment variables for better Playwright performance
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV PLAYWRIGHT_BROWSERS_PATH=/home/node/pw-browsers

# Create browser directory with proper permissions
RUN mkdir -p /home/node/pw-browsers && chown -R node:node /home/node/pw-browsers

# Switch to node user
USER node

# Pre-install Playwright browsers to speed up first run
RUN npm init -y && \
    npm install @playwright/test@^1.54.2 && \
    npx playwright install chromium firefox webkit && \
    rm -rf node_modules package*.json

# Switch back to root for any additional setup
USER root
