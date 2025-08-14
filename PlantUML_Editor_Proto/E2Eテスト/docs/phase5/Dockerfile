# Node.js v20 with Playwright - Phase 5 Testing Environment
FROM node:20.18.0-bookworm

# Install system dependencies for Playwright and testing tools
RUN apt-get update && apt-get install -y \
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
    fonts-liberation \
    libgtk-3-0 \
    xvfb \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm packages
RUN npm install

# Install Playwright with all browsers and dependencies
RUN npx playwright install --with-deps chromium firefox webkit msedge

# Create necessary directories
RUN mkdir -p /app/test-results /app/coverage /app/logs /app/reports

# Copy test files and configurations
COPY . .

# Set environment variables
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=test
ENV COVERAGE_DIR=/app/coverage
ENV TEST_RESULTS_DIR=/app/test-results

# Set up Jest environment for unit/integration tests
RUN npm install --save-dev jest-environment-jsdom

# Create Jest setup file
RUN echo 'global.document = require("jsdom").jsdom();\nglobal.window = document.defaultView;\nglobal.navigator = window.navigator;' > jest.setup.js

# Default command
CMD ["npm", "run", "test:all"]