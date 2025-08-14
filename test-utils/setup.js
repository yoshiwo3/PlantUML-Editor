/**
 * 共通テストセットアップファイル - PlantUMLプロジェクト
 * 
 * このファイルは以下の機能を提供します:
 * - Jest/Playwright共通のテスト環境設定
 * - MCP統合テスト対応
 * - 日本語テスト環境設定
 * - カスタムマッチャー登録
 * - テストユーティリティ関数提供
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// 環境変数設定
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TZ = 'Asia/Tokyo';

// タイムアウト値を設定
const DEFAULT_TIMEOUT = 30000;
const EXTENDED_TIMEOUT = 60000;

/**
 * テスト環境の初期化
 */
class TestSetup {
  constructor() {
    this.servers = new Map();
    this.testData = new Map();
    this.setupCompleted = false;
  }

  /**
   * 全体的なセットアップを実行
   */
  async initialize() {
    if (this.setupCompleted) return;

    console.log('🚀 テスト環境を初期化中...');
    
    try {
      // 1. テスト用ディレクトリの準備
      await this.prepareTestDirectories();
      
      // 2. テストデータの準備
      await this.prepareTestData();
      
      // 3. カスタムマッチャーの登録
      this.registerCustomMatchers();
      
      // 4. グローバルヘルパーの設定
      this.setupGlobalHelpers();
      
      // 5. コンソール出力の設定
      this.setupConsoleOutput();
      
      this.setupCompleted = true;
      console.log('✅ テスト環境の初期化が完了しました');
      
    } catch (error) {
      console.error('❌ テスト環境の初期化に失敗しました:', error);
      throw error;
    }
  }

  /**
   * テスト用ディレクトリの準備
   */
  async prepareTestDirectories() {
    const directories = [
      'test-results',
      'test-results/screenshots',
      'test-results/artifacts',
      'coverage/combined',
      'coverage/integration',
      'temp/test-data'
    ];

    for (const dir of directories) {
      const fullPath = path.resolve(__dirname, '..', dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * テストデータの準備
   */
  async prepareTestData() {
    // 基本的なテストデータを設定
    this.testData.set('sampleJapaneseText', {
      simple: 'ユーザーがログインします',
      complex: 'システム管理者が新しいユーザーアカウントを作成し、初期設定を行います',
      activity: `開始
タスク1を実行
条件分岐:
  条件Aの場合:
    処理Aを実行
  それ以外:
    処理Bを実行
終了`,
      sequence: `ユーザー -> システム: ログイン要求
システム -> データベース: 認証情報確認
データベース -> システム: 認証結果
システム -> ユーザー: ログイン完了`,
      usecase: `(ユーザー登録) as UC1
(ログイン) as UC2
(データ閲覧) as UC3

:ユーザー: --> UC1
:ユーザー: --> UC2
:ユーザー: --> UC3`
    });

    // 期待されるPlantUML出力
    this.testData.set('expectedPlantUML', {
      simple: '@startuml\nユーザー -> システム: ログインします\n@enduml',
      activity: '@startuml\nstart\n:タスク1を実行;\nif (条件A?) then (yes)\n  :処理Aを実行;\nelse (no)\n  :処理Bを実行;\nendif\nstop\n@enduml'
    });

    // テスト用のAPI応答
    this.testData.set('mockApiResponses', {
      convertSuccess: {
        status: 'success',
        plantuml: '@startuml\n:テスト処理;\n@enduml',
        diagramType: 'activity'
      },
      convertError: {
        status: 'error',
        message: '変換に失敗しました',
        code: 'CONVERSION_ERROR'
      }
    });
  }

  /**
   * カスタムマッチャーの登録
   */
  registerCustomMatchers() {
    // Jest用のカスタムマッチャー
    if (typeof expect !== 'undefined' && expect.extend) {
      expect.extend({
        /**
         * PlantUMLコードの検証
         */
        toBeValidPlantUML(received) {
          const pass = received && 
                      received.includes('@startuml') && 
                      received.includes('@enduml');
          
          return {
            message: () => pass 
              ? `期待: 有効なPlantUMLコードではない\n受信: ${received}`
              : `期待: 有効なPlantUMLコード\n受信: ${received}`,
            pass
          };
        },

        /**
         * 日本語テキストの検証
         */
        toContainJapanese(received) {
          const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
          const pass = japaneseRegex.test(received);
          
          return {
            message: () => pass 
              ? `期待: 日本語を含まない\n受信: ${received}`
              : `期待: 日本語を含む\n受信: ${received}`,
            pass
          };
        },

        /**
         * レスポンス時間の検証
         */
        toRespondWithin(received, expectedTime) {
          const pass = received <= expectedTime;
          
          return {
            message: () => pass 
              ? `期待: ${expectedTime}ms以内に応答しない\n実際: ${received}ms`
              : `期待: ${expectedTime}ms以内に応答\n実際: ${received}ms`,
            pass
          };
        }
      });
    }
  }

  /**
   * グローバルヘルパーの設定
   */
  setupGlobalHelpers() {
    // グローバルヘルパー関数を設定
    global.testHelpers = {
      /**
       * テストデータを取得
       */
      getTestData: (category, key) => {
        const categoryData = this.testData.get(category);
        return key ? categoryData?.[key] : categoryData;
      },

      /**
       * テスト用のディレイ
       */
      delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

      /**
       * ランダムなテストIDを生成
       */
      generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

      /**
       * 日本語テキストのサニタイズ
       */
      sanitizeJapaneseText: (text) => {
        return text
          .replace(/\s+/g, ' ')
          .trim()
          .normalize('NFKC');
      },

      /**
       * テスト用のHTTPクライアント
       */
      createTestClient: async (baseURL = 'http://localhost:8086') => {
        const fetch = await import('node-fetch');
        return {
          get: async (path, options = {}) => {
            const response = await fetch.default(`${baseURL}${path}`, {
              method: 'GET',
              ...options
            });
            return response;
          },
          post: async (path, data, options = {}) => {
            const response = await fetch.default(`${baseURL}${path}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              body: JSON.stringify(data),
              ...options
            });
            return response;
          }
        };
      },

      /**
       * MCP統合テスト用のヘルパー
       */
      mcpTestHelpers: {
        /**
         * MCP接続の検証
         */
        verifyMcpConnection: async () => {
          // MCP接続の検証ロジック
          return true;
        },

        /**
         * Playwright MCPの初期化
         */
        initializePlaywrightMcp: async () => {
          // Playwright MCP初期化ロジック
          return {
            browser: null,
            page: null
          };
        }
      }
    };

    // タイムアウト設定
    global.TEST_TIMEOUTS = {
      DEFAULT: DEFAULT_TIMEOUT,
      EXTENDED: EXTENDED_TIMEOUT,
      API: 10000,
      E2E: 60000
    };

    // テスト環境情報
    global.TEST_ENV = {
      IS_CI: process.env.CI === 'true',
      IS_DEBUG: process.env.DEBUG === 'true',
      BASE_URL: process.env.BASE_URL || 'http://localhost:8086',
      MCP_ENABLED: process.env.MCP_INTEGRATION === 'true'
    };
  }

  /**
   * コンソール出力の設定
   */
  setupConsoleOutput() {
    // テスト実行時のコンソール出力を制御
    if (process.env.NODE_ENV === 'test' && !process.env.DEBUG) {
      // テスト時は不要なログを抑制
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      
      console.log = (...args) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('🧪')) {
          originalConsoleLog(...args);
        }
      };
      
      console.warn = (...args) => {
        if (args[0] && typeof args[0] === 'string' && 
            (args[0].includes('警告') || args[0].includes('WARNING'))) {
          originalConsoleWarn(...args);
        }
      };
    }
  }

  /**
   * クリーンアップ処理
   */
  async cleanup() {
    console.log('🧹 テスト環境をクリーンアップ中...');
    
    // 起動したサーバーを停止
    for (const [name, server] of this.servers) {
      try {
        if (server && server.kill) {
          server.kill();
        }
      } catch (error) {
        console.warn(`サーバー ${name} の停止に失敗:`, error.message);
      }
    }
    
    this.servers.clear();
    this.testData.clear();
    this.setupCompleted = false;
    
    console.log('✅ テスト環境のクリーンアップが完了しました');
  }
}

// シングルトンインスタンスを作成
const testSetup = new TestSetup();

// テスト開始時に自動初期化
beforeAll(async () => {
  await testSetup.initialize();
}, EXTENDED_TIMEOUT);

// テスト終了時に自動クリーンアップ
afterAll(async () => {
  await testSetup.cleanup();
}, DEFAULT_TIMEOUT);

// 各テストケース後のクリーンアップ
afterEach(async () => {
  // テスト固有のクリーンアップ処理
  if (global.currentTestPage) {
    await global.currentTestPage.close?.();
    global.currentTestPage = null;
  }
});

// モジュールエクスポート
module.exports = {
  testSetup,
  TestSetup,
  DEFAULT_TIMEOUT,
  EXTENDED_TIMEOUT
};

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 未処理のPromise拒否:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 未捕捉の例外:', error);
  process.exit(1);
});