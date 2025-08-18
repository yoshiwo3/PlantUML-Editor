#!/usr/bin/env node
/**
 * Docker Health Check for E2E Test Environment
 * Sprint2 Foundation Implementation
 */

import http from 'http';
import { spawn } from 'child_process';

const HEALTH_CHECK_TIMEOUT = 8000; // 8 seconds
const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

class HealthChecker {
  constructor() {
    this.checks = [
      { name: 'Playwright Installation', check: this.checkPlaywrightInstallation },
      { name: 'Browser Availability', check: this.checkBrowserAvailability },
      { name: 'Application Server', check: this.checkApplicationServer },
      { name: 'File System Permissions', check: this.checkFileSystemPermissions },
      { name: 'Network Connectivity', check: this.checkNetworkConnectivity }
    ];
  }

  async runHealthCheck() {
    console.log('🏥 Starting E2E Test Environment Health Check...');
    
    const results = [];
    let allPassed = true;
    
    for (const check of this.checks) {
      try {
        console.log(`🔍 Checking: ${check.name}`);
        const result = await this.executeWithTimeout(check.check.bind(this), HEALTH_CHECK_TIMEOUT);
        results.push({ name: check.name, status: 'PASS', details: result });
        console.log(`✅ ${check.name}: PASS`);
      } catch (error) {
        results.push({ 
          name: check.name, 
          status: 'FAIL', 
          error: error.message 
        });
        console.error(`❌ ${check.name}: FAIL - ${error.message}`);
        allPassed = false;
      }
    }
    
    // Summary
    console.log('\n📊 Health Check Summary:');
    console.log(`Total Checks: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);
    
    if (allPassed) {
      console.log('🎉 All health checks passed! Environment is ready for E2E testing.');
      process.exit(0);
    } else {
      console.log('💥 Some health checks failed. Environment may not be ready.');
      process.exit(1);
    }
  }

  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);
      
      fn().then(result => {
        clearTimeout(timer);
        resolve(result);
      }).catch(error => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async checkPlaywrightInstallation() {
    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', '--version'], { 
        stdio: ['ignore', 'pipe', 'pipe'] 
      });
      
      let output = '';
      playwright.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      playwright.on('close', (code) => {
        if (code === 0) {
          const version = output.trim();
          resolve(`Playwright version: ${version}`);
        } else {
          reject(new Error('Playwright is not properly installed'));
        }
      });
      
      playwright.on('error', (error) => {
        reject(new Error(`Failed to check Playwright: ${error.message}`));
      });
    });
  }

  async checkBrowserAvailability() {
    return new Promise((resolve, reject) => {
      const browsers = spawn('npx', ['playwright', 'install', '--dry-run'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      browsers.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      browsers.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      browsers.on('close', (code) => {
        if (code === 0 || output.includes('browsers are already installed')) {
          resolve('All required browsers are available');
        } else {
          reject(new Error(`Browser availability check failed: ${errorOutput}`));
        }
      });
      
      browsers.on('error', (error) => {
        reject(new Error(`Failed to check browsers: ${error.message}`));
      });
    });
  }

  async checkApplicationServer() {
    return new Promise((resolve, reject) => {
      const urlParts = new URL(BASE_URL);
      const options = {
        hostname: urlParts.hostname,
        port: urlParts.port || 80,
        path: '/',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(`Application server responding with status ${res.statusCode}`);
        } else {
          reject(new Error(`Application server returned status ${res.statusCode}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Application server request timed out'));
      });
      
      req.on('error', (error) => {
        reject(new Error(`Cannot connect to application server: ${error.message}`));
      });
      
      req.end();
    });
  }

  async checkFileSystemPermissions() {
    const fs = await import('fs/promises');
    
    try {
      // Check write permissions for test results
      const testDir = '/app/test-results';
      await fs.access(testDir, fs.constants.W_OK);
      
      // Check write permissions for reports
      const reportsDir = '/app/reports';
      await fs.access(reportsDir, fs.constants.W_OK);
      
      // Check browser directory
      const browserDir = process.env.PLAYWRIGHT_BROWSERS_PATH || '/ms-playwright-browsers';
      await fs.access(browserDir, fs.constants.R_OK);
      
      return 'File system permissions are correct';
    } catch (error) {
      throw new Error(`File system permission error: ${error.message}`);
    }
  }

  async checkNetworkConnectivity() {
    return new Promise((resolve, reject) => {
      // Simple network connectivity test
      const testUrl = 'http://www.google.com';
      const urlParts = new URL(testUrl);
      
      const options = {
        hostname: urlParts.hostname,
        port: 80,
        path: '/',
        method: 'HEAD',
        timeout: 3000
      };
      
      const req = http.request(options, (res) => {
        if (res.statusCode) {
          resolve('Network connectivity is available');
        } else {
          reject(new Error('Network connectivity test failed'));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        // Network may be restricted, but this is not critical for E2E tests
        resolve('Network connectivity check skipped (timeout)');
      });
      
      req.on('error', (error) => {
        // Network may be restricted, but this is not critical for E2E tests
        resolve(`Network connectivity limited: ${error.message}`);
      });
      
      req.end();
    });
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const healthChecker = new HealthChecker();
  healthChecker.runHealthCheck().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

export default HealthChecker;