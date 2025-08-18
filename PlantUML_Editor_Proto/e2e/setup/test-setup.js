/**
 * E2Eテスト共通セットアップファイル
 * Sprint2 E2Eテスト実行前の初期化処理
 */

import fs from 'fs/promises';
import path from 'path';
import { TestDataGenerator } from '../utils/test-data-generator.js';
import { EnvironmentConfigHelper } from '../config/test-environment.config.js';

/**
 * グローバルセットアップクラス
 */
export class TestSetup {
  constructor() {
    this.startTime = Date.now();
    this.environment = EnvironmentConfigHelper.getCurrentEnvironment();
    this.config = EnvironmentConfigHelper.getConfig(this.environment);
  }

  /**
   * セットアップ実行
   */
  async setup() {
    console.log('🚀 E2Eテストセットアップ開始...');
    console.log(`📍 環境: ${this.environment}`);
    console.log(`🔗 ベースURL: ${this.config.baseURL}`);

    try {
      // 1. 環境検証
      await this.validateEnvironment();

      // 2. ディレクトリ準備
      await this.prepareDirectories();

      // 3. テストデータ生成
      await this.generateTestData();

      // 4. 認証設定
      await this.setupAuthentication();

      // 5. パフォーマンス監視設定
      await this.setupPerformanceMonitoring();

      // 6. ブラウザキャッシュクリア
      await this.clearBrowserCache();

      const setupTime = Date.now() - this.startTime;
      console.log(`✅ セットアップ完了 (${setupTime}ms)`);

      // セットアップ情報をファイルに保存
      await this.saveSetupInfo();

    } catch (error) {
      console.error('❌ セットアップエラー:', error);
      throw error;
    }
  }

  /**
   * 環境検証
   */
  async validateEnvironment() {
    console.log('🔍 環境検証中...');

    const validation = await EnvironmentConfigHelper.validateEnvironment(this.environment);
    
    if (validation.status !== 'ready') {
      throw new Error(`環境が利用できません: ${validation.baseURL} (${validation.status})`);
    }

    console.log(`✅ 環境検証完了: ${validation.baseURL}`);
    
    if (validation.apiReachable) {
      console.log('✅ API接続確認完了');
    } else {
      console.log('⚠️  API接続未確認（ヘルスチェックエンドポイントなし）');
    }
  }

  /**
   * 必要なディレクトリの作成
   */
  async prepareDirectories() {
    console.log('📁 ディレクトリ準備中...');

    const directories = [
      'test-results',
      'test-results/screenshots',
      'test-results/videos',
      'test-results/traces',
      'reports',
      'reports/html',
      'reports/json',
      'reports/junit',
      'reports/allure-results',
      'reports/allure-reports',
      'fixtures',
      'fixtures/data',
      'fixtures/files',
      'fixtures/images',
      'fixtures/exports',
      'auth',
      'temp'
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // ディレクトリが既に存在する場合は無視
        if (error.code !== 'EEXIST') {
          console.warn(`ディレクトリ作成警告: ${dir} - ${error.message}`);
        }
      }
    }

    console.log('✅ ディレクトリ準備完了');
  }

  /**
   * テストデータ生成
   */
  async generateTestData() {
    console.log('📊 テストデータ生成中...');

    try {
      const generator = new TestDataGenerator();
      await generator.generateAllTestData();
      console.log('✅ テストデータ生成完了');
    } catch (error) {
      console.warn('⚠️  テストデータ生成エラー:', error.message);
      console.warn('既存のテストデータを使用します');
    }
  }

  /**
   * 認証設定
   */
  async setupAuthentication() {
    const authConfig = EnvironmentConfigHelper.getAuthConfig(this.environment);
    
    if (!authConfig || !authConfig.required) {
      console.log('ℹ️  認証設定: 不要');
      return;
    }

    console.log('🔐 認証設定中...');

    try {
      if (authConfig.method === 'oauth') {
        await this.setupOAuthAuthentication(authConfig);
      } else if (authConfig.method === 'apikey') {
        await this.setupAPIKeyAuthentication(authConfig);
      }

      console.log('✅ 認証設定完了');
    } catch (error) {
      console.error('❌ 認証設定エラー:', error);
      throw error;
    }
  }

  /**
   * OAuth認証設定
   */
  async setupOAuthAuthentication(authConfig) {
    const authData = {
      username: authConfig.credentials.username,
      password: authConfig.credentials.password,
      timestamp: new Date().toISOString(),
      environment: this.environment
    };

    await fs.writeFile(
      'auth/oauth.json',
      JSON.stringify(authData, null, 2)
    );
  }

  /**
   * APIキー認証設定
   */
  async setupAPIKeyAuthentication(authConfig) {
    const authData = {
      apiKey: authConfig.credentials.apiKey,
      timestamp: new Date().toISOString(),
      environment: this.environment
    };

    await fs.writeFile(
      'auth/apikey.json',
      JSON.stringify(authData, null, 2)
    );
  }

  /**
   * パフォーマンス監視設定
   */
  async setupPerformanceMonitoring() {
    const monitoringConfig = EnvironmentConfigHelper.getMonitoringConfig(this.environment);
    
    if (!monitoringConfig.performance) {
      console.log('ℹ️  パフォーマンス監視: 無効');
      return;
    }

    console.log('📊 パフォーマンス監視設定中...');

    const perfConfig = {
      enabled: true,
      thresholds: EnvironmentConfigHelper.getPerformanceThresholds(this.environment),
      monitoring: monitoringConfig,
      startTime: this.startTime,
      environment: this.environment
    };

    await fs.writeFile(
      'temp/performance-config.json',
      JSON.stringify(perfConfig, null, 2)
    );

    console.log('✅ パフォーマンス監視設定完了');
  }

  /**
   * ブラウザキャッシュクリア設定
   */
  async clearBrowserCache() {
    console.log('🧹 ブラウザキャッシュクリア設定...');

    const cacheConfig = {
      clearCache: true,
      clearCookies: true,
      clearLocalStorage: true,
      clearSessionStorage: true,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(
      'temp/cache-config.json',
      JSON.stringify(cacheConfig, null, 2)
    );

    console.log('✅ キャッシュクリア設定完了');
  }

  /**
   * セットアップ情報保存
   */
  async saveSetupInfo() {
    const setupInfo = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      config: this.config,
      setupTime: Date.now() - this.startTime,
      version: '2.0.0',
      nodeVersion: process.version,
      platform: process.platform
    };

    await fs.writeFile(
      'temp/setup-info.json',
      JSON.stringify(setupInfo, null, 2)
    );
  }

  /**
   * クリーンアップ（テスト終了後）
   */
  async cleanup() {
    console.log('🧹 テスト環境クリーンアップ中...');

    try {
      // 一時ファイルの削除
      const tempFiles = [
        'temp/performance-config.json',
        'temp/cache-config.json',
        'temp/setup-info.json'
      ];

      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // ファイルが存在しない場合は無視
          if (error.code !== 'ENOENT') {
            console.warn(`一時ファイル削除警告: ${file} - ${error.message}`);
          }
        }
      }

      // ブラウザデータクリーンアップ
      await this.cleanupBrowserData();

      console.log('✅ クリーンアップ完了');
    } catch (error) {
      console.warn('⚠️  クリーンアップ警告:', error.message);
    }
  }

  /**
   * ブラウザデータクリーンアップ
   */
  async cleanupBrowserData() {
    // 認証ファイルの削除（環境によって）
    if (this.environment === 'development' || this.environment === 'ci') {
      const authFiles = [
        'auth/oauth.json',
        'auth/apikey.json'
      ];

      for (const file of authFiles) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // ファイルが存在しない場合は無視
          if (error.code !== 'ENOENT') {
            console.warn(`認証ファイル削除警告: ${file}`);
          }
        }
      }
    }
  }
}

/**
 * ヘルスチェック関数
 */
export async function healthCheck() {
  console.log('🔍 システムヘルスチェック実行中...');

  const environment = EnvironmentConfigHelper.getCurrentEnvironment();
  const validation = await EnvironmentConfigHelper.validateEnvironment(environment);

  if (validation.status === 'ready') {
    console.log('✅ システム正常');
    return true;
  } else {
    console.error('❌ システム異常:', validation);
    return false;
  }
}

/**
 * テストデータ生成のみ実行
 */
export async function generateTestDataOnly() {
  console.log('📊 テストデータ生成のみ実行...');

  try {
    const generator = new TestDataGenerator();
    await generator.generateAllTestData();
    console.log('✅ テストデータ生成完了');
  } catch (error) {
    console.error('❌ テストデータ生成エラー:', error);
    throw error;
  }
}

/**
 * 環境情報表示
 */
export async function showEnvironmentInfo() {
  const environment = EnvironmentConfigHelper.getCurrentEnvironment();
  const config = EnvironmentConfigHelper.getConfig(environment);
  const thresholds = EnvironmentConfigHelper.getPerformanceThresholds(environment);

  console.log('\n📋 環境情報:');
  console.log(`  環境名: ${environment}`);
  console.log(`  ベースURL: ${config.baseURL}`);
  console.log(`  並列実行数: ${config.parallel.workers}`);
  console.log(`  リトライ回数: ${config.retry.count}`);
  console.log(`  ページロード閾値: ${thresholds.pageLoad}ms`);
  console.log(`  同期処理閾値: ${thresholds.syncTime}ms`);
  console.log(`  メモリ制限: ${thresholds.memoryUsage}MB`);
  console.log('');
}

// CLI実行サポート
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'health':
      await healthCheck();
      break;
    case 'data':
      await generateTestDataOnly();
      break;
    case 'info':
      await showEnvironmentInfo();
      break;
    case 'setup':
    default:
      const setup = new TestSetup();
      await setup.setup();
      break;
  }
}

export default TestSetup;