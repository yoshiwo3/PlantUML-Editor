/**
 * Allure Framework Configuration for PlantUML Editor E2E Tests
 * Playwright + Jest対応の包括的レポート設定
 */

module.exports = {
  reportDir: 'allure-results',
  resultsDir: 'allure-results',
  
  // カスタムカテゴリ定義
  categories: [
    {
      name: 'Product defects',
      description: 'プロダクト関連の不具合',
      matchedStatuses: ['failed'],
      messageRegex: '.*Error.*|.*Exception.*|.*Assertion.*'
    },
    {
      name: 'Test defects',
      description: 'テスト実装の問題',
      matchedStatuses: ['broken'],
      messageRegex: '.*Test.*Error.*|.*Setup.*|.*Teardown.*'
    },
    {
      name: 'Flaky tests',
      description: '不安定なテスト',
      matchedStatuses: ['flaky'],
      messageRegex: '.*timeout.*|.*network.*|.*connection.*'
    },
    {
      name: 'Security Issues',
      description: 'セキュリティ関連の問題',
      matchedStatuses: ['failed', 'broken'],
      messageRegex: '.*XSS.*|.*SQL.*|.*CSRF.*|.*Auth.*'
    },
    {
      name: 'Performance Issues',
      description: 'パフォーマンス関連の問題',
      matchedStatuses: ['failed'],
      messageRegex: '.*timeout.*|.*slow.*|.*performance.*|.*memory.*'
    },
    {
      name: 'Cross-browser Issues',
      description: 'ブラウザ互換性の問題',
      matchedStatuses: ['failed'],
      messageRegex: '.*webkit.*|.*firefox.*|.*edge.*|.*browser.*'
    }
  ],

  // 環境情報設定
  environmentInfo: {
    Browser: process.env.BROWSER || 'chromium',
    Platform: process.env.OS || 'linux',
    Version: process.env.VERSION || 'latest',
    Node_Version: process.env.NODE_VERSION || '20.18.0',
    Playwright_Version: '1.48.0',
    Application_URL: process.env.BASE_URL || 'http://localhost:8086',
    Test_Environment: process.env.TEST_ENV || 'docker',
    Docker_Image: process.env.DOCKER_IMAGE || 'plantuml-e2e-permanent:latest',
    Test_Suite: process.env.TEST_SUITE || 'complete',
    Execution_Mode: process.env.EXECUTION_MODE || 'headless'
  },

  // Playwright統合設定
  playwright: {
    reporter: [
      ['allure-playwright', { 
        outputFolder: 'allure-results',
        suiteTitle: 'PlantUML Editor E2E Tests',
        categories: './allure/categories.json',
        environmentInfo: './allure/environment.properties',
        detail: true,
        links: [
          {
            name: 'GitHub Repository',
            url: 'https://github.com/your-org/plantuml-editor-proto'
          },
          {
            name: 'Test Documentation',
            url: 'https://docs.example.com/testing'
          }
        ]
      }],
      ['html'],
      ['json', { outputFile: 'test-results/results.json' }],
      ['junit', { outputFile: 'test-results/junit.xml' }]
    ]
  },

  // Jest統合設定
  jest: {
    reporters: [
      'default',
      ['jest-allure-reporter', {
        resultsDir: 'allure-results',
        categories: './allure/categories.json',
        environment: './allure/environment.properties'
      }]
    ]
  },

  // レポート生成設定
  generate: {
    cleanResults: true,
    copyHistory: true,
    openReport: false,
    reportPath: 'allure-report',
    historyPath: 'allure-history',
    trendsLimit: 20
  },

  // GitHub Pages公開設定
  publish: {
    githubPages: {
      enabled: true,
      branch: 'gh-pages',
      folder: 'allure-report',
      commitMessage: 'Update Allure Report [skip ci]'
    },
    s3: {
      enabled: false,
      bucket: 'plantuml-test-reports',
      region: 'us-east-1',
      prefix: 'allure-reports/'
    }
  },

  // 履歴トレンド設定
  trends: {
    enabled: true,
    maxBuilds: 50,
    metrics: [
      'total',
      'passed',
      'failed',
      'broken',
      'skipped',
      'unknown',
      'duration'
    ]
  },

  // カスタムラベル設定
  labels: {
    default: {
      severity: 'normal',
      testType: 'functional',
      framework: 'playwright'
    },
    mapping: {
      'critical-path': { severity: 'critical', testType: 'smoke' },
      'performance': { severity: 'minor', testType: 'performance' },
      'security': { severity: 'major', testType: 'security' },
      'integration': { severity: 'normal', testType: 'integration' },
      'unit': { severity: 'trivial', testType: 'unit' }
    }
  }
};