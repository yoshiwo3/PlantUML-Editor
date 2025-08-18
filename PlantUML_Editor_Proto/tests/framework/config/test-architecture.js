/**
 * Test Architecture Configuration
 * Sprint3 Hybrid Object Model Framework
 * 
 * Jest 29.7.0 + Playwright 1.48.0 統合アーキテクチャ
 * Docker Swarm 並列実行対応、Allure + Grafana レポート統合
 */

export const TEST_ARCHITECTURE = {
  // フレームワーク基本情報
  framework: {
    name: 'PlantUML Editor Hybrid Test Framework',
    version: '3.0.0',
    runner: 'Jest 29.7.0',
    e2e: 'Playwright 1.48.0',
    structure: 'Hybrid Object Model (POM + COM + FOM)',
    parallelization: 'Docker Swarm',
    reporting: ['Allure', 'Grafana', 'HTML', 'JUnit']
  },

  // テスト層定義
  testLayers: {
    unit: {
      description: '単体テスト - 個別コンポーネント・関数検証',
      framework: 'Jest',
      coverage: 85,
      timeout: 5000,
      parallel: true,
      files: ['**/*.unit.test.js', '**/unit/**/*.test.js']
    },
    integration: {
      description: '統合テスト - コンポーネント間連携検証',
      framework: 'Jest + DOM Testing Library',
      coverage: 70,
      timeout: 15000,
      parallel: true,
      files: ['**/*.integration.test.js', '**/integration/**/*.test.js']
    },
    e2e: {
      description: 'E2Eテスト - エンドユーザーシナリオ検証',
      framework: 'Playwright',
      coverage: '主要シナリオ100%',
      timeout: 90000,
      parallel: 'limited',
      files: ['**/*.spec.js', '**/e2e/**/*.test.js']
    },
    security: {
      description: 'セキュリティテスト - OWASP Top 10準拠',
      framework: 'Playwright + OWASP ZAP',
      coverage: 'OWASP基準',
      timeout: 120000,
      parallel: false,
      files: ['**/security/**/*.test.js']
    },
    performance: {
      description: 'パフォーマンステスト - Lighthouse 90+',
      framework: 'Playwright + Lighthouse CI',
      coverage: '主要パス100%',
      timeout: 180000,
      parallel: false,
      files: ['**/performance/**/*.test.js']
    }
  },

  // Hybrid Object Model 構成
  objectModel: {
    pageObjects: {
      description: 'ページ単位の操作・検証',
      baseClass: 'BasePage',
      location: 'tests/framework/pages/',
      naming: '*Page.js',
      features: ['navigation', 'security', 'performance', 'accessibility']
    },
    componentObjects: {
      description: 'UIコンポーネント単位の操作・検証',
      baseClass: 'BaseComponent',
      location: 'tests/framework/components/',
      naming: '*Component.js',
      features: ['interaction', 'validation', 'state', 'accessibility']
    },
    flowObjects: {
      description: 'ビジネスフロー単位の操作・検証',
      baseClass: 'BaseFlow',
      location: 'tests/framework/flows/',
      naming: '*Flow.js',
      features: ['orchestration', 'retry', 'parallel', 'conditional']
    }
  },

  // Docker並列実行設定
  dockerConfiguration: {
    swarm: {
      enabled: true,
      nodes: process.env.CI ? 2 : 4,
      services: {
        'test-runner-unit': {
          image: 'plantuml-test-unit:latest',
          replicas: 4,
          resources: { memory: '512MB', cpu: '0.5' }
        },
        'test-runner-integration': {
          image: 'plantuml-test-integration:latest',
          replicas: 2,
          resources: { memory: '1GB', cpu: '1.0' }
        },
        'test-runner-e2e': {
          image: 'plantuml-test-e2e:latest',
          replicas: 1,
          resources: { memory: '2GB', cpu: '2.0' }
        }
      }
    },
    compose: {
      version: '3.8',
      services: {
        app: {
          build: '.',
          ports: ['8086:8086'],
          environment: {
            NODE_ENV: 'test',
            E2E_MODE: 'enabled'
          }
        },
        playwright: {
          image: 'mcr.microsoft.com/playwright:v1.48.0-focal',
          volumes: ['./:/workspace'],
          working_dir: '/workspace',
          depends_on: ['app']
        }
      }
    }
  },

  // レポート統合設定
  reporting: {
    allure: {
      enabled: true,
      outputDir: 'reports/allure-results',
      historyDir: 'reports/allure-history',
      features: ['screenshots', 'videos', 'traces', 'metrics']
    },
    grafana: {
      enabled: process.env.GRAFANA_ENABLED === 'true',
      dashboard: 'plantuml-test-metrics',
      metrics: ['execution_time', 'success_rate', 'coverage', 'performance'],
      alerting: {
        failure_rate: 10, // 10%以上で警告
        performance_degradation: 20 // 20%以上で警告
      }
    },
    html: {
      enabled: true,
      outputDir: 'reports/html',
      template: 'modern',
      features: ['interactive', 'responsive', 'search']
    },
    junit: {
      enabled: true,
      outputFile: 'reports/junit/results.xml',
      features: ['test_suites', 'error_details', 'timing']
    }
  },

  // 品質ゲート設定
  qualityGates: {
    unit: {
      coverage: 85,
      success_rate: 100,
      max_duration: 300000 // 5分
    },
    integration: {
      coverage: 70,
      success_rate: 95,
      max_duration: 900000 // 15分
    },
    e2e: {
      success_rate: 90,
      max_duration: 1800000, // 30分
      performance_threshold: {
        lighthouse_score: 90,
        load_time: 3000,
        memory_usage: 100
      }
    },
    security: {
      vulnerabilities: 0,
      csp_violations: 0,
      xss_risks: 0
    }
  },

  // セキュリティテスト設定
  security: {
    owasp: {
      enabled: true,
      categories: [
        'A01:2021-Broken_Access_Control',
        'A02:2021-Cryptographic_Failures', 
        'A03:2021-Injection',
        'A04:2021-Insecure_Design',
        'A05:2021-Security_Misconfiguration',
        'A06:2021-Vulnerable_Components',
        'A07:2021-Identity_Authentication_Failures',
        'A08:2021-Software_Data_Integrity_Failures',
        'A09:2021-Security_Logging_Monitoring_Failures',
        'A10:2021-Server_Side_Request_Forgery'
      ]
    },
    csp: {
      enabled: true,
      policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      violations_threshold: 0
    },
    xss: {
      enabled: true,
      payloads: 'tests/framework/security/xss-payloads.json',
      detection_patterns: [
        'script', 'javascript:', 'onload', 'onerror', 'eval'
      ]
    }
  },

  // パフォーマンステスト設定
  performance: {
    lighthouse: {
      enabled: true,
      config: 'tests/framework/config/lighthouse.config.js',
      thresholds: {
        performance: 90,
        accessibility: 100,
        'best-practices': 90,
        seo: 90
      }
    },
    webVitals: {
      enabled: true,
      thresholds: {
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        FID: 100,   // First Input Delay
        CLS: 0.1    // Cumulative Layout Shift
      }
    },
    memory: {
      enabled: true,
      thresholds: {
        heap_size: 104857600, // 100MB
        dom_nodes: 5000,
        event_listeners: 1000
      }
    }
  },

  // 日本語対応設定
  localization: {
    enabled: true,
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    encoding: 'UTF-8',
    ime_support: true,
    test_data: {
      hiragana: 'ひらがなテスト',
      katakana: 'カタカナテスト',
      kanji: '漢字テスト',
      mixed: 'ミックス漢字ひらがなTest123'
    }
  },

  // 環境設定
  environments: {
    development: {
      baseURL: 'http://localhost:8086',
      debug: true,
      headless: false,
      slowMo: 100
    },
    ci: {
      baseURL: 'http://localhost:8086',
      debug: false,
      headless: true,
      slowMo: 0,
      workers: 2
    },
    staging: {
      baseURL: process.env.STAGING_URL,
      debug: false,
      headless: true,
      slowMo: 0,
      auth: true
    },
    production: {
      baseURL: process.env.PRODUCTION_URL,
      debug: false,
      headless: true,
      slowMo: 0,
      auth: true,
      monitoring: true
    }
  },

  // 実行戦略
  executionStrategy: {
    parallel: {
      unit: 'full',        // 完全並列
      integration: 'partial', // 部分並列
      e2e: 'limited',      // 制限付き並列
      security: 'serial',  // 順次実行
      performance: 'serial' // 順次実行
    },
    retry: {
      unit: 0,
      integration: 1,
      e2e: 2,
      security: 1,
      performance: 1
    },
    timeout: {
      unit: 5000,
      integration: 15000,
      e2e: 90000,
      security: 120000,
      performance: 180000
    }
  },

  // データ管理
  dataManagement: {
    fixtures: {
      location: 'tests/fixtures/',
      formats: ['json', 'yaml', 'csv'],
      categories: ['users', 'plantuml', 'scenarios', 'security']
    },
    testData: {
      generation: 'dynamic',
      cleanup: 'automatic',
      isolation: true
    },
    screenshots: {
      enabled: true,
      location: 'test-results/screenshots/',
      format: 'png',
      quality: 90
    },
    videos: {
      enabled: false, // CIでは無効
      location: 'test-results/videos/',
      format: 'webm'
    }
  }
};

// 環境別設定取得
export function getTestConfig(environment = 'development') {
  const baseConfig = TEST_ARCHITECTURE;
  const envConfig = baseConfig.environments[environment] || baseConfig.environments.development;
  
  return {
    ...baseConfig,
    currentEnvironment: environment,
    ...envConfig
  };
}

// Docker Swarm設定生成
export function generateDockerSwarmConfig() {
  return {
    version: '3.8',
    services: TEST_ARCHITECTURE.dockerConfiguration.swarm.services,
    networks: {
      'test-network': {
        driver: 'overlay',
        attachable: true
      }
    },
    deploy: {
      replicas: TEST_ARCHITECTURE.dockerConfiguration.swarm.nodes,
      placement: {
        constraints: ['node.role == worker']
      }
    }
  };
}

// Grafana ダッシュボード設定生成
export function generateGrafanaDashboard() {
  return {
    dashboard: {
      title: 'PlantUML Editor Test Metrics',
      panels: [
        {
          title: 'Test Success Rate',
          type: 'stat',
          targets: [
            { expr: 'test_success_rate', legendFormat: 'Success Rate' }
          ],
          thresholds: [90, 95, 100]
        },
        {
          title: 'Execution Time Trends',
          type: 'graph',
          targets: [
            { expr: 'test_execution_time', legendFormat: 'Execution Time' }
          ]
        },
        {
          title: 'Coverage Metrics',
          type: 'graph',
          targets: [
            { expr: 'test_coverage_unit', legendFormat: 'Unit Coverage' },
            { expr: 'test_coverage_integration', legendFormat: 'Integration Coverage' }
          ]
        },
        {
          title: 'Performance Metrics',
          type: 'graph',
          targets: [
            { expr: 'lighthouse_performance_score', legendFormat: 'Lighthouse Score' },
            { expr: 'page_load_time', legendFormat: 'Load Time' }
          ]
        }
      ]
    }
  };
}

export default TEST_ARCHITECTURE;