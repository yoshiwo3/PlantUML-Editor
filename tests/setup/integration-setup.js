/**
 * 統合テスト環境セットアップ
 * 統合テスト・パフォーマンステスト用の環境初期化
 * @version 1.0.0
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 統合テストセットアップ処理
 */
beforeAll(async () => {
  console.log('🔧 統合テスト環境セットアップ開始...');
  
  // タイムアウトを延長（統合テストは時間がかかる）
  jest.setTimeout(30000);
  
  // 1. 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.TEST_TYPE = 'integration';
  process.env.API_BASE_URL = 'http://localhost:8086';
  
  // 2. テスト用データディレクトリの作成
  const testDataDirs = [
    'test-results/integration',
    'test-results/performance',
    'coverage/integration'
  ];
  
  testDataDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // 3. アプリケーションサーバーの起動確認
  try {
    await checkServerAvailability();
    console.log('✓ アプリケーションサーバー接続確認済み');
  } catch (error) {
    console.log('⚠ アプリケーションサーバーを起動します...');
    await startTestServer();
  }
  
  // 4. テスト用データベースの準備（必要に応じて）
  await setupTestDatabase();
  
  // 5. 外部依存関係のモック設定
  await setupExternalMocks();
  
  console.log('✅ 統合テスト環境セットアップ完了');
}, 60000); // 60秒のタイムアウト

/**
 * 統合テストクリーンアップ処理
 */
afterAll(async () => {
  console.log('🧹 統合テスト環境クリーンアップ開始...');
  
  // 1. テストサーバーの停止
  if (global.__TEST_SERVER_PROCESS__) {
    global.__TEST_SERVER_PROCESS__.kill();
  }
  
  // 2. 一時ファイルのクリーンアップ
  cleanupTempFiles();
  
  // 3. メモリのクリーンアップ
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ 統合テスト環境クリーンアップ完了');
});

/**
 * 各テスト前の共通処理
 */
beforeEach(async () => {
  // テストごとのタイムスタンプを記録
  global.__TEST_START_TIME__ = Date.now();
  
  // メモリ使用量の記録
  global.__TEST_START_MEMORY__ = process.memoryUsage();
});

/**
 * 各テスト後の共通処理
 */
afterEach(async () => {
  const testDuration = Date.now() - (global.__TEST_START_TIME__ || Date.now());
  const endMemory = process.memoryUsage();
  const startMemory = global.__TEST_START_MEMORY__ || endMemory;
  
  const memoryDiff = {
    heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // MB
    heapTotal: (endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024,
    external: (endMemory.external - startMemory.external) / 1024 / 1024
  };
  
  // パフォーマンス情報をログ出力（詳細モード時）
  if (process.env.VERBOSE_TESTS === 'true') {
    console.log(`⏱ テスト実行時間: ${testDuration}ms`);
    console.log(`💾 メモリ変化: ${memoryDiff.heapUsed.toFixed(2)}MB`);
  }
  
  // メモリリークの警告
  if (memoryDiff.heapUsed > 50) { // 50MB以上の増加
    console.warn(`⚠ メモリ使用量大幅増加: ${memoryDiff.heapUsed.toFixed(2)}MB`);
  }
});

/**
 * サーバーの利用可能性チェック
 */
async function checkServerAvailability() {
  const maxRetries = 5;
  const retryDelay = 2000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Node.js環境での fetch は node-fetch が必要
      const response = await fetch('http://localhost:8086/health');
      if (response.ok) {
        return true;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`サーバー接続失敗: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * テストサーバーの起動
 */
async function startTestServer() {
  return new Promise((resolve, reject) => {
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
    const timeout = setTimeout(() => {
      reject(new Error('サーバー起動タイムアウト'));
    }, 30000);
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running') || output.includes('listening')) {
        clearTimeout(timeout);
        console.log('✓ テストサーバー起動完了');
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.warn('サーバー警告:', data.toString());
    });
    
    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    // プロセス管理のためグローバルに保存
    global.__TEST_SERVER_PROCESS__ = serverProcess;
  });
}

/**
 * テスト用データベースのセットアップ
 */
async function setupTestDatabase() {
  // 現在のプロジェクトはファイルベースなので、テスト用の一時ディレクトリを作成
  const testDataDir = path.join(process.cwd(), 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // テスト用のサンプルデータファイルを作成
  const sampleTestData = {
    simpleTest: 'A -> B: テストメッセージ',
    complexTest: `
@startuml
actor ユーザー
participant システム
database データベース

ユーザー -> システム: リクエスト
システム -> データベース: データ取得
データベース -> システム: データ返却
システム -> ユーザー: レスポンス
@enduml
    `.trim(),
    errorTest: '無効な構文でテスト'
  };
  
  const testDataFile = path.join(testDataDir, 'test-cases.json');
  fs.writeFileSync(testDataFile, JSON.stringify(sampleTestData, null, 2));
  
  console.log('✓ テスト用データ準備完了');
}

/**
 * 外部依存関係のモック設定
 */
async function setupExternalMocks() {
  // Kroki API のモック設定
  global.__KROKI_MOCK__ = {
    enabled: process.env.MOCK_EXTERNAL_APIS !== 'false',
    responses: {
      '/svg/plantuml': '<svg>Mock PlantUML SVG</svg>',
      '/png/plantuml': 'Mock PNG Data'
    }
  };
  
  // HTTP クライアントのモック（必要に応じて）
  if (global.__KROKI_MOCK__.enabled) {
    console.log('✓ 外部API モック設定完了');
  }
}

/**
 * 一時ファイルのクリーンアップ
 */
function cleanupTempFiles() {
  const tempPaths = [
    'test-data',
    'test-results/temp',
    'coverage/temp'
  ];
  
  tempPaths.forEach(tempPath => {
    const fullPath = path.join(process.cwd(), tempPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✓ クリーンアップ: ${tempPath}`);
      } catch (error) {
        console.warn(`⚠ クリーンアップ失敗: ${tempPath} - ${error.message}`);
      }
    }
  });
}

/**
 * 統合テスト用のヘルパー関数
 */
global.testHelpers = {
  /**
   * API エンドポイントへのテストリクエスト
   */
  async makeTestRequest(endpoint, data = {}, options = {}) {
    const url = `${process.env.API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify(data)
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    return response;
  },
  
  /**
   * テスト用のタイムアウト待機
   */
  async waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * メモリ使用量の測定
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };
  },
  
  /**
   * テスト実行時間の測定
   */
  measureExecutionTime(fn) {
    return async (...args) => {
      const start = process.hrtime.bigint();
      const result = await fn(...args);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // nanoseconds to milliseconds
      
      return { result, duration };
    };
  }
};

console.log('📋 統合テストセットアップ設定完了');