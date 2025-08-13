#!/usr/bin/env node
/**
 * ポート自動検索スクリプト
 * 利用可能なポートを自動的に見つけて環境変数に設定
 */

import net from 'net';
import { spawn } from 'child_process';

const DEFAULT_PORTS = [8080, 3000, 3001, 8000, 8001, 9000, 9001];
const MAX_PORT = 65535;

/**
 * ポートが利用可能かチェック
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * 利用可能なポートを検索
 */
async function findAvailablePort(startPort = 8080) {
  // まずデフォルトポートを試行
  for (const port of DEFAULT_PORTS) {
    if (await checkPort(port)) {
      return port;
    }
  }
  
  // デフォルトポートが使用中の場合、シーケンシャル検索
  for (let port = startPort; port <= MAX_PORT; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  
  throw new Error('No available ports found');
}

/**
 * サーバーを起動
 */
async function startServer() {
  try {
    const port = await findAvailablePort();
    console.log(`🚀 Starting server on port ${port}...`);
    
    // 環境変数に設定
    process.env.PORT = port;
    
    // Pythonサーバーを起動
    const server = spawn('python', ['-m', 'http.server', port.toString()], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`✅ Server running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop the server');
    
    // 終了処理
    process.on('SIGINT', () => {
      console.log('\n📝 Shutting down server...');
      server.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  }
}

// CLIから直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { findAvailablePort, checkPort };