/**
 * Test Data Cleanup Utility
 * Sprint2 Foundation Implementation
 */

import fs from 'fs/promises';
import path from 'path';

export class TestDataCleanup {
  constructor() {
    this.cleanupPaths = [
      'test-results',
      'reports/html',
      'reports/json',
      'reports/junit',
      'auth/state.json'
    ];
  }

  async cleanupAll() {
    console.log('🧹 Starting test data cleanup...');
    
    for (const cleanupPath of this.cleanupPaths) {
      try {
        await this.cleanupPath(cleanupPath);
        console.log(`✅ Cleaned: ${cleanupPath}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean ${cleanupPath}: ${error.message}`);
      }
    }
    
    console.log('✅ Test data cleanup completed');
  }

  async cleanupPath(targetPath) {
    const fullPath = path.resolve(targetPath);
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleanup = new TestDataCleanup();
  cleanup.cleanupAll().catch(console.error);
}