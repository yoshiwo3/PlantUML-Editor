/**
 * Playwright統合テスト グローバルセットアップ
 * E2Eテスト実行前の環境準備とMCP統合設定
 * @version 1.0.0
 */

const { chromium } = require('@playwright/test');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * グローバルセットアップ処理
 */
module.exports = async (config) => {
  console.log('🚀 Playwright統合テスト環境 - グローバルセットアップ開始');
  
  // 1. 環境変数の設定
  process.env.PLAYWRIGHT_TEST = 'true';
  process.env.NODE_ENV = 'test';
  
  // MCP統合の確認
  const mcpIntegration = process.env.MCP_INTEGRATION !== 'false';
  console.log(`🔧 MCP統合: ${mcpIntegration ? '有効' : '無効'}`);
  
  // 2. 必要なディレクトリの作成
  const testDirs = [
    'test-results',
    'test-results/videos',
    'test-results/screenshots',
    'test-results/traces',
    'test-results/artifacts',
    'playwright-report',
    'playwright-report/integrated',
    'tests/snapshots'
  ];
  
  testDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ ディレクトリ作成: ${dir}`);
    }
  });
  
  // 3. アプリケーションサーバーの起動確認
  const baseUrl = process.env.BASE_URL || 'http://localhost:8086';
  console.log(`🌐 アプリケーションURL: ${baseUrl}`);
  
  try {
    await checkServerAvailability(baseUrl);
    console.log('✓ アプリケーションサーバー接続確認済み');
  } catch (error) {
    console.log('⚠ アプリケーションサーバーを起動します...');
    await startApplicationServer();
  }
  
  // 4. ブラウザの事前起動とウォームアップ
  if (!process.env.CI) {
    await warmupBrowsers();
  }
  
  // 5. MCP統合テスト環境の準備
  if (mcpIntegration) {
    await setupMCPIntegration();
  }
  
  // 6. テスト用モックサーバーの起動
  if (process.env.MOCK_SERVER !== 'false') {
    await startMockServer();
  }
  
  // 7. パフォーマンス監視の開始
  global.__PLAYWRIGHT_START_TIME__ = Date.now();
  
  console.log('✅ Playwrightグローバルセットアップ完了\n');
};

/**
 * サーバーの利用可能性をチェック
 */
async function checkServerAvailability(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

/**
 * アプリケーションサーバーの起動
 */
async function startApplicationServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 アプリケーションサーバー起動中...');
    
    const serverProcess = spawn('npm', ['start'], {
      cwd: path.join(process.cwd(), 'jp2plantuml'),
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '8086'
      }
    });
    
    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running') || output.includes('listening')) {
        console.log('✓ アプリケーションサーバー起動完了');
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.warn('サーバー警告:', data.toString());
    });
    
    serverProcess.on('error', (error) => {
      console.error('サーバー起動エラー:', error);
      reject(error);
    });
    
    // タイムアウト設定
    setTimeout(() => {
      console.log('✓ サーバー起動待機完了（タイムアウト）');
      resolve();
    }, 30000);
    
    // プロセス終了時のクリーンアップを登録
    global.__SERVER_PROCESS__ = serverProcess;
  });
}

/**
 * ブラウザのウォームアップ
 */
async function warmupBrowsers() {
  console.log('🔥 ブラウザウォームアップ開始...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.close();
    await browser.close();
    console.log('✓ Chromiumウォームアップ完了');
  } catch (error) {
    console.warn('⚠ ブラウザウォームアップエラー:', error.message);
  }
}

/**
 * MCP統合環境のセットアップ
 */
async function setupMCPIntegration() {
  console.log('🔧 MCP統合環境セットアップ開始...');
  
  try {
    // MCP設定ファイルの確認
    const mcpConfigPath = path.join(process.cwd(), 'tests', 'mcp-config.json');
    if (!fs.existsSync(mcpConfigPath)) {
      // デフォルトMCP設定の作成
      const defaultMCPConfig = {
        endpoint: process.env.MCP_ENDPOINT || 'http://localhost:3000/mcp',
        timeout: 30000,
        retries: 3,
        integration: {
          playwright: true,
          screenshots: true,
          performance: true,
          accessibility: true
        }
      };
      
      fs.writeFileSync(mcpConfigPath, JSON.stringify(defaultMCPConfig, null, 2));
      console.log('✓ デフォルトMCP設定ファイル作成');
    }
    
    // MCPレポーターの確認
    const mcpReporterPath = path.join(process.cwd(), 'tests', 'reporters', 'mcp-reporter.js');
    if (!fs.existsSync(path.dirname(mcpReporterPath))) {
      fs.mkdirSync(path.dirname(mcpReporterPath), { recursive: true });
    }
    
    if (!fs.existsSync(mcpReporterPath)) {
      // MCPレポーターの作成
      const mcpReporterCode = `
/**
 * MCP統合レポーター
 */
class MCPReporter {
  constructor(options = {}) {
    this.options = options;
  }
  
  onBegin(config, suite) {
    console.log('🔧 MCPレポーター開始');
  }
  
  onTestEnd(test, result) {
    if (result.status === 'failed') {
      console.log(\`❌ MCPテスト失敗: \${test.title}\`);
    }
  }
  
  onEnd(result) {
    console.log('✅ MCPレポーター完了');
  }
}

module.exports = MCPReporter;
`;
      fs.writeFileSync(mcpReporterPath, mcpReporterCode);
      console.log('✓ MCPレポーター作成');
    }
    
    console.log('✓ MCP統合環境セットアップ完了');
  } catch (error) {
    console.warn('⚠ MCP統合セットアップエラー:', error.message);
  }
}

/**
 * モックサーバーの起動
 */
async function startMockServer() {
  console.log('🔧 モックサーバー起動中...');
  
  try {
    // 簡易モックサーバーの作成
    const mockServerPath = path.join(process.cwd(), 'tests', 'mock-server');
    if (!fs.existsSync(mockServerPath)) {
      fs.mkdirSync(mockServerPath, { recursive: true });
      
      // package.jsonの作成
      const mockPackageJson = {
        name: 'test-mock-server',
        version: '1.0.0',
        scripts: {
          start: 'node server.js'
        },
        dependencies: {
          express: '^4.18.2'
        }
      };
      
      fs.writeFileSync(
        path.join(mockServerPath, 'package.json'),
        JSON.stringify(mockPackageJson, null, 2)
      );
      
      // モックサーバーコードの作成
      const mockServerCode = `
const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// テスト用エンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/mock-kroki', (req, res) => {
  // モックKroki APIレスポンス
  res.json({ 
    success: true, 
    mockData: 'test-svg-content',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(\`モックサーバー起動: http://localhost:\${port}\`);
});
`;
      
      fs.writeFileSync(path.join(mockServerPath, 'server.js'), mockServerCode);
      console.log('✓ モックサーバーファイル作成');
    }
    
    // 依存関係のインストール
    try {
      execSync('npm install', { 
        cwd: mockServerPath, 
        stdio: 'pipe' 
      });
      console.log('✓ モックサーバー依存関係インストール完了');
    } catch (error) {
      console.warn('⚠ モックサーバー依存関係インストールエラー');
    }
    
  } catch (error) {
    console.warn('⚠ モックサーバーセットアップエラー:', error.message);
  }
}