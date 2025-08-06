# Start from the TypeScript Node devcontainer base image
FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

# Switch to root for system installations
USER root

# Install PostgreSQL client and other system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    # Playwright system dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
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
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    # Additional useful tools
    curl \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch to node user for npm operations
USER node

# Set working directory
WORKDIR /tmp/playwright-setup

# Install Playwright and browsers at build time
# We create a temporary package.json just for Playwright installation
RUN echo '{"name":"playwright-setup","version":"1.0.0"}' > package.json && \
    npm install playwright@latest && \
    npx playwright install chromium firefox webkit && \
    npx playwright install-deps && \
    # Clean up
    cd / && \
    rm -rf /tmp/playwright-setup

# Set environment variables
ENV DOCKER_BUILDKIT=1 \
    NODE_OPTIONS=--max-old-space-size=4096 \
    PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright

# Ensure the browsers are accessible
RUN npx playwright --version && \
    echo "Playwright browsers installed at: $PLAYWRIGHT_BROWSERS_PATH" && \
    ls -la $PLAYWRIGHT_BROWSERS_PATH/

# Switch back to working directory
WORKDIR /workspaces

# Final message
RUN echo "Container build complete with Playwright browsers pre-installed"