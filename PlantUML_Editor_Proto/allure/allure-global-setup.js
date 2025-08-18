/**
 * Allure Global Setup
 * テスト実行前の環境準備とメタデータ設定
 */

const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Allure Global Setup開始');

  // Allure結果ディレクトリの準備
  const allureResultsDir = path.join(process.cwd(), 'allure-results');
  const allureReportDir = path.join(process.cwd(), 'allure-report');
  
  // 既存の結果をクリーンアップ
  if (fs.existsSync(allureResultsDir)) {
    fs.rmSync(allureResultsDir, { recursive: true, force: true });
  }
  
  // 新しいディレクトリを作成
  fs.mkdirSync(allureResultsDir, { recursive: true });
  fs.mkdirSync(allureReportDir, { recursive: true });

  // 環境情報の動的生成
  const environmentInfo = generateEnvironmentInfo();
  const environmentPath = path.join(allureResultsDir, 'environment.properties');
  fs.writeFileSync(environmentPath, environmentInfo);

  // カテゴリ情報のコピー
  const categoriesSource = path.join(process.cwd(), 'allure', 'categories.json');
  const categoriesTarget = path.join(allureResultsDir, 'categories.json');
  if (fs.existsSync(categoriesSource)) {
    fs.copyFileSync(categoriesSource, categoriesTarget);
  }

  // Executor情報の生成
  const executorInfo = generateExecutorInfo();
  const executorPath = path.join(allureResultsDir, 'executor.json');
  fs.writeFileSync(executorPath, JSON.stringify(executorInfo, null, 2));

  // テスト開始時刻の記録
  const testRun = {
    uuid: generateUUID(),
    name: `PlantUML Editor E2E Tests - ${new Date().toISOString()}`,
    start: new Date().getTime(),
    environment: process.env.TEST_ENV || 'docker',
    browser: process.env.BROWSER || 'chromium'
  };
  
  const testRunPath = path.join(allureResultsDir, 'test-run.json');
  fs.writeFileSync(testRunPath, JSON.stringify(testRun, null, 2));

  console.log('✅ Allure Global Setup完了');
  console.log(`📁 Results Directory: ${allureResultsDir}`);
  console.log(`📊 Report Directory: ${allureReportDir}`);
}

/**
 * 動的環境情報の生成
 */
function generateEnvironmentInfo() {
  const now = new Date();
  
  return `# Dynamic Environment Information
# Generated at: ${now.toISOString()}

# Runtime Information
Runtime.Timestamp=${now.getTime()}
Runtime.Date=${now.toLocaleDateString('ja-JP')}
Runtime.Time=${now.toLocaleTimeString('ja-JP')}
Runtime.Timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}

# System Information
System.Platform=${process.platform}
System.Architecture=${process.arch}
System.NodeJS.Version=${process.version}
System.Memory.Total=${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB
System.Memory.Used=${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

# Test Configuration
Test.Environment=${process.env.TEST_ENV || 'docker'}
Test.Browser=${process.env.BROWSER || 'chromium'}
Test.BaseURL=${process.env.BASE_URL || 'http://localhost:8086'}
Test.Parallel.Workers=${process.env.WORKERS || '4'}
Test.Retry.Count=${process.env.RETRIES || '2'}

# CI Information
CI.Enabled=${process.env.CI || 'false'}
CI.Provider=${process.env.CI_PROVIDER || 'local'}
CI.Build.Number=${process.env.BUILD_NUMBER || 'local-build'}
CI.Commit.SHA=${process.env.COMMIT_SHA || 'unknown'}
CI.Branch=${process.env.BRANCH || 'unknown'}

# Docker Information
Docker.Image=${process.env.DOCKER_IMAGE || 'plantuml-e2e-permanent:latest'}
Docker.Container.ID=${process.env.HOSTNAME || 'local'}
Docker.Network=${process.env.DOCKER_NETWORK || 'e2e-network'}

# Application Information
App.Version=${getPackageVersion()}
App.Port=${process.env.PORT || '8086'}
App.Protocol=${process.env.PROTOCOL || 'http'}
`;
}

/**
 * Executor情報の生成
 */
function generateExecutorInfo() {
  return {
    name: 'Playwright Docker Runner',
    type: 'docker',
    url: process.env.CI_BUILD_URL || 'http://localhost',
    buildOrder: parseInt(process.env.BUILD_NUMBER) || 1,
    buildName: `Build #${process.env.BUILD_NUMBER || 'local'}`,
    buildUrl: process.env.CI_BUILD_URL || 'http://localhost',
    reportName: 'PlantUML Editor E2E Test Report',
    reportUrl: process.env.REPORT_URL || 'http://localhost/allure-report'
  };
}

/**
 * パッケージバージョンの取得
 */
function getPackageVersion() {
  try {
    const packagePath = path.join(process.cwd(), '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version || '1.0.0';
    }
  } catch (error) {
    console.warn('パッケージバージョンの取得に失敗:', error.message);
  }
  return '1.0.0';
}

/**
 * UUIDの生成
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = globalSetup;