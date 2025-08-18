# PlantUML Editor E2E Test Environment - Multi-Stage Optimized Build
# Optimized for size reduction, parallel execution, and performance

# ========================================
# Stage 1: Dependencies and Playwright installation
# ========================================
FROM node:20.18.0-alpine AS dependencies

# Install system dependencies for browsers
RUN apk add --no-cache \
    # Core dependencies
    chromium \
    firefox \
    webkit2gtk \
    # Additional browser dependencies
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dbus \
    # Build tools
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set environment variables for Alpine
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV FIREFOX_PATH=/usr/bin/firefox

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production --no-audit --no-fund

# ========================================
# Stage 2: Playwright with optimized browsers
# ========================================
FROM mcr.microsoft.com/playwright:v1.48.0-focal AS playwright-base

# Install additional optimization dependencies
RUN apt-get update && apt-get install -y \
    # Performance monitoring tools
    htop \
    iotop \
    nethogs \
    # Additional WebKit dependencies for stability
    libwoff1 \
    libopus0 \
    libwebp7 \
    libwebpdemux2 \
    libenchant-2-2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    libvpx7 \
    # Size optimization: remove unnecessary packages
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Playwright with version locking
RUN npm ci --only=production --no-audit --no-fund

# Install and optimize browsers with version locking
RUN npx playwright install chromium firefox webkit msedge && \
    npx playwright install-deps && \
    # Browser optimization: Remove unnecessary files
    find /root/.cache/ms-playwright -name "*.tmp" -delete && \
    find /root/.cache/ms-playwright -name "*.log" -delete

# ========================================
# Stage 3: Final optimized E2E test image
# ========================================
FROM playwright-base AS final

# Set optimized environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV DOCKER_ENV=true
ENV NODE_ENV=test
ENV CI=true

# Performance optimization settings
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV PLAYWRIGHT_WORKERS=4
ENV PLAYWRIGHT_TIMEOUT=30000
ENV PLAYWRIGHT_RETRIES=2

# Resource limits configuration
ENV PLAYWRIGHT_CPU_LIMIT=2
ENV PLAYWRIGHT_MEMORY_LIMIT=2048

# Copy application files (optimized copying)
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Create optimized test scripts directory
RUN mkdir -p /app/tests /app/scripts /app/results /app/screenshots

# Create performance monitoring script
RUN echo '#!/bin/bash\n\
echo "========================================"\n\
echo "Docker Container Resource Monitoring"\n\
echo "========================================"\n\
echo "Memory Usage:"\n\
free -h\n\
echo ""\n\
echo "CPU Usage:"\n\
top -bn1 | grep "Cpu(s)"\n\
echo ""\n\
echo "Disk Usage:"\n\
df -h /\n\
echo ""\n\
echo "Browser Installations:"\n\
ls -la /root/.cache/ms-playwright/\n\
echo ""\n\
echo "Playwright Version:"\n\
npx playwright --version\n\
echo "========================================"\n' > /monitor-resources.sh && \
chmod +x /monitor-resources.sh

# Create browser verification script with enhanced checks
RUN echo '#!/bin/bash\n\
echo "========================================"\n\
echo "Enhanced Browser Verification"\n\
echo "========================================"\n\
\n\
# Function to check browser executable\n\
check_browser() {\n\
    local browser=$1\n\
    local path="/root/.cache/ms-playwright/$browser"*\n\
    \n\
    if ls $path 1> /dev/null 2>&1; then\n\
        echo "✅ $browser: Found"\n\
        ls -la $path | head -3\n\
        # Try to get version\n\
        case $browser in\n\
            "chromium")\n\
                timeout 5 $path/chrome --version 2>/dev/null || echo "   Version check timeout"\n\
                ;;\n\
            "firefox")\n\
                timeout 5 $path/firefox --version 2>/dev/null || echo "   Version check timeout"\n\
                ;;\n\
            "webkit")\n\
                echo "   WebKit binary verified"\n\
                ;;\n\
            "msedge")\n\
                timeout 5 $path/msedge --version 2>/dev/null || echo "   Version check timeout"\n\
                ;;\n\
        esac\n\
    else\n\
        echo "❌ $browser: Not Found"\n\
        return 1\n\
    fi\n\
    echo ""\n\
}\n\
\n\
# Check all browsers\n\
check_browser "chromium"\n\
check_browser "firefox"\n\
check_browser "webkit"\n\
check_browser "msedge"\n\
\n\
echo "Browser verification completed"\n\
echo "========================================"\n' > /verify-browsers.sh && \
chmod +x /verify-browsers.sh

# Create parallel test execution script
RUN echo '#!/bin/bash\n\
echo "========================================"\n\
echo "Parallel E2E Test Execution"\n\
echo "========================================"\n\
\n\
# Resource monitoring in background\n\
/monitor-resources.sh &\n\
\n\
# Function to run test with timeout and retry\n\
run_test_with_retry() {\n\
    local test_command=$1\n\
    local max_retries=3\n\
    local retry_count=0\n\
    \n\
    while [ $retry_count -lt $max_retries ]; do\n\
        echo "Running: $test_command (Attempt $((retry_count + 1))/$max_retries)"\n\
        \n\
        timeout 300 $test_command\n\
        local exit_code=$?\n\
        \n\
        if [ $exit_code -eq 0 ]; then\n\
            echo "✅ Test passed: $test_command"\n\
            return 0\n\
        elif [ $exit_code -eq 124 ]; then\n\
            echo "⏰ Test timeout: $test_command"\n\
        else\n\
            echo "❌ Test failed: $test_command (Exit code: $exit_code)"\n\
        fi\n\
        \n\
        retry_count=$((retry_count + 1))\n\
        if [ $retry_count -lt $max_retries ]; then\n\
            echo "Retrying in 5 seconds..."\n\
            sleep 5\n\
        fi\n\
    done\n\
    \n\
    echo "❌ Test failed after $max_retries attempts: $test_command"\n\
    return 1\n\
}\n\
\n\
# Verify browsers first\n\
/verify-browsers.sh\n\
\n\
# Run tests based on available commands\n\
if [ "$1" = "parallel" ]; then\n\
    echo "Running tests in parallel mode..."\n\
    # Run multiple test suites in parallel\n\
    run_test_with_retry "npm run test:chromium" &\n\
    run_test_with_retry "npm run test:firefox" &\n\
    run_test_with_retry "npm run test:webkit" &\n\
    wait\n\
else\n\
    echo "Running tests in sequential mode..."\n\
    run_test_with_retry "npm run test:all"\n\
fi\n\
\n\
echo "========================================"\n\
echo "Test execution completed"\n\
echo "========================================"\n' > /run-parallel-tests.sh && \
chmod +x /run-parallel-tests.sh

# Create cleanup script for optimization
RUN echo '#!/bin/bash\n\
echo "Performing container cleanup..."\n\
# Clean npm cache\n\
npm cache clean --force 2>/dev/null || true\n\
# Clean temporary files\n\
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true\n\
# Clean browser cache\n\
find /root/.cache -name "*.tmp" -delete 2>/dev/null || true\n\
find /root/.cache -name "*.log" -delete 2>/dev/null || true\n\
echo "Cleanup completed"\n' > /cleanup.sh && \
chmod +x /cleanup.sh

# Create volume directories with proper permissions
RUN mkdir -p /app/screenshots /app/test-results /app/coverage && \
    chmod 755 /app/screenshots /app/test-results /app/coverage

# Optimize image size: Clean unnecessary files
RUN /cleanup.sh && \
    # Remove development dependencies that are not needed in production
    npm prune --production && \
    # Remove package manager cache
    rm -rf ~/.npm && \
    # Remove any unnecessary files from the build context
    find /app -name "*.md" -not -path "*/node_modules/*" -delete && \
    find /app -name "README*" -not -path "*/node_modules/*" -delete

# Health check for container
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /verify-browsers.sh | grep -q "Browser verification completed" || exit 1

# Default command with enhanced execution
CMD ["/bin/bash", "-c", "/verify-browsers.sh && /run-parallel-tests.sh"]

# Labels for maintenance and optimization tracking
LABEL version="2.0"
LABEL description="Optimized PlantUML Editor E2E Test Environment"
LABEL maintainer="PlantUML Editor Team"
LABEL playwright.version="1.48.0"
LABEL node.version="20.18.0"
LABEL optimization.level="high"
LABEL browsers="chromium,firefox,webkit,msedge"
LABEL parallel.support="true"
LABEL size.optimization="true"