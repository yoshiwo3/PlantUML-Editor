#!/bin/bash
# Browser installation script for Docker container

echo "Installing Playwright browsers..."
npx playwright install chromium --with-deps
npx playwright install firefox --with-deps
npx playwright install webkit --with-deps
npx playwright install msedge --with-deps

echo "Browser installation complete!"
echo "Checking installations:"
ls -la /ms-playwright/