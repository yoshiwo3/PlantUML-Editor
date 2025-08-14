# Node.js v20 with Playwright
FROM node:20.18.0-bookworm

# Install dependencies for Playwright
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
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm packages
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Copy all files
COPY . .

# Set Playwright to skip browser download (already installed)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Default command
CMD ["npm", "run", "test:all"]