/**
 * テスト環境設定ファイル
 * Sprint2 E2Eテスト用の環境固有設定を管理
 */

/**
 * 環境設定
 */
export const EnvironmentConfigs = {
  // 開発環境
  development: {
    name: 'development',
    baseURL: 'http://localhost:8086',
    apiBaseURL: 'http://localhost:8086/api',
    timeout: {
      navigation: 30000,
      action: 10000,
      assertion: 5000
    },
    retry: {
      count: 1,
      delay: 1000
    },
    parallel: {
      workers: 4,
      fullyParallel: true
    },
    monitoring: {
      performance: true,
      memory: true,
      console: true,
      network: true
    },
    debug: {
      slowMo: 0,
      headless: false,
      devtools: false,
      trace: 'on-first-retry',
      video: 'retain-on-failure',
      screenshot: 'only-on-failure'
    }
  },

  // ステージング環境
  staging: {
    name: 'staging',
    baseURL: 'https://staging.plantuml-editor.example.com',
    apiBaseURL: 'https://staging.plantuml-editor.example.com/api',
    timeout: {
      navigation: 45000,
      action: 15000,
      assertion: 8000
    },
    retry: {
      count: 2,
      delay: 2000
    },
    parallel: {
      workers: 2,
      fullyParallel: false
    },
    monitoring: {
      performance: true,
      memory: true,
      console: true,
      network: true
    },
    debug: {
      slowMo: 100,
      headless: true,
      devtools: false,
      trace: 'on-first-retry',
      video: 'retain-on-failure',
      screenshot: 'only-on-failure'
    },
    auth: {
      required: true,
      method: 'oauth',
      credentials: {
        username: process.env.STAGING_USERNAME,
        password: process.env.STAGING_PASSWORD
      }
    }
  },

  // 本番環境
  production: {
    name: 'production',
    baseURL: 'https://plantuml-editor.example.com',
    apiBaseURL: 'https://api.plantuml-editor.example.com',
    timeout: {
      navigation: 60000,
      action: 20000,
      assertion: 10000
    },
    retry: {
      count: 3,
      delay: 3000
    },
    parallel: {
      workers: 1,
      fullyParallel: false
    },
    monitoring: {
      performance: true,
      memory: false,
      console: false,
      network: true
    },
    debug: {
      slowMo: 200,
      headless: true,
      devtools: false,
      trace: 'off',
      video: 'off',
      screenshot: 'off'
    },
    auth: {
      required: true,
      method: 'apikey',
      credentials: {
        apiKey: process.env.PROD_API_KEY
      }
    },
    restrictions: {
      readOnly: true,
      limitedFeatures: ['save', 'export'],
      maxTestDuration: 300000 // 5分
    }
  },

  // CI/CD環境
  ci: {
    name: 'ci',
    baseURL: process.env.CI_BASE_URL || 'http://localhost:8086',
    apiBaseURL: process.env.CI_API_URL || 'http://localhost:8086/api',
    timeout: {
      navigation: 120000, // CI環境では長めに設定
      action: 30000,
      assertion: 15000
    },
    retry: {
      count: 2,
      delay: 5000
    },
    parallel: {
      workers: process.env.CI_WORKERS ? parseInt(process.env.CI_WORKERS) : 2,
      fullyParallel: true
    },
    monitoring: {
      performance: true,
      memory: true,
      console: true,
      network: true
    },
    debug: {
      slowMo: 0,
      headless: true,
      devtools: false,
      trace: 'on-first-retry',
      video: 'retain-on-failure',
      screenshot: 'only-on-failure'
    },
    reporting: {
      junit: true,
      allure: true,
      html: true,
      json: true
    },
    artifacts: {
      retention: 30, // 30日
      uploadToS3: process.env.CI_UPLOAD_ARTIFACTS === 'true'
    }
  },

  // Docker環境
  docker: {
    name: 'docker',
    baseURL: 'http://host.docker.internal:8086',
    apiBaseURL: 'http://host.docker.internal:8086/api',
    timeout: {
      navigation: 60000,
      action: 20000,
      assertion: 10000
    },
    retry: {
      count: 2,
      delay: 2000
    },
    parallel: {
      workers: 2,
      fullyParallel: true
    },
    monitoring: {
      performance: true,
      memory: true,
      console: true,
      network: true
    },
    debug: {
      slowMo: 0,
      headless: true,
      devtools: false,
      trace: 'on-first-retry',
      video: 'retain-on-failure',
      screenshot: 'only-on-failure'
    },
    docker: {
      network: 'plantuml_network',
      volumes: [
        './test-results:/app/test-results',
        './reports:/app/reports'
      ]
    }
  }
};

/**
 * パフォーマンス閾値設定
 */
export const PerformanceThresholds = {
  // 開発環境用閾値
  development: {
    pageLoad: 3000,
    firstPaint: 2000,
    firstContentfulPaint: 2500,
    domContentLoaded: 3000,
    syncTime: 100,
    conversionTime: 500,
    previewRender: 1000,
    memoryUsage: 200, // MB
    cpuUsage: 80 // %
  },

  // 本番環境用閾値（より厳格）
  production: {
    pageLoad: 2000,
    firstPaint: 1500,
    firstContentfulPaint: 2000,
    domContentLoaded: 2500,
    syncTime: 50,
    conversionTime: 300,
    previewRender: 800,
    memoryUsage: 150, // MB
    cpuUsage: 60 // %
  },

  // CI環境用閾値（余裕を持たせる）
  ci: {
    pageLoad: 5000,
    firstPaint: 3000,
    firstContentfulPaint: 4000,
    domContentLoaded: 5000,
    syncTime: 200,
    conversionTime: 1000,
    previewRender: 1500,
    memoryUsage: 300, // MB
    cpuUsage: 90 // %
  }
};

/**
 * テストデータ設定
 */
export const TestDataConfigs = {
  // テストデータのサイズ制限
  limits: {
    maxInputLength: 10000,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxConcurrentUsers: 100
  },

  // サンプルデータパス
  paths: {
    fixtures: './fixtures',
    data: './fixtures/data',
    files: './fixtures/files',
    images: './fixtures/images',
    exports: './fixtures/exports'
  },

  // データ生成設定
  generation: {
    japanese: {
      charSets: ['hiragana', 'katakana', 'kanji', 'mixed'],
      lengths: [10, 100, 1000, 5000],
      complexity: ['simple', 'moderate', 'complex']
    },
    plantuml: {
      types: ['sequence', 'class', 'usecase', 'activity', 'state', 'entity'],
      sizes: ['small', 'medium', 'large', 'xlarge'],
      complexity: ['basic', 'intermediate', 'advanced']
    }
  }
};

/**
 * セキュリティ設定
 */
export const SecurityConfigs = {
  // XSS対策テスト
  xss: {
    payloads: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '${alert("xss")}',
      '{{alert("xss")}}',
      '<iframe src="javascript:alert(1)"></iframe>'
    ],
    expectedBehavior: 'sanitized'
  },

  // CSRF対策テスト
  csrf: {
    endpoints: ['/api/save', '/api/export', '/api/settings'],
    tokenValidation: true,
    originValidation: true
  },

  // 入力値検証テスト
  inputValidation: {
    maxLength: 10000,
    forbiddenPatterns: [
      '../',
      '..\\',
      '/etc/',
      'C:\\',
      '<script',
      'javascript:',
      'vbscript:',
      'onload=',
      'onerror='
    ]
  }
};

/**
 * 環境設定ヘルパー
 */
export class EnvironmentConfigHelper {
  /**
   * 現在の環境取得
   */
  static getCurrentEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const isCI = process.env.CI === 'true';
    const isDocker = process.env.DOCKER === 'true';

    if (isCI) return 'ci';
    if (isDocker) return 'docker';
    return env;
  }

  /**
   * 環境設定取得
   * @param {string} environment - 環境名
   */
  static getConfig(environment = null) {
    const env = environment || this.getCurrentEnvironment();
    return EnvironmentConfigs[env] || EnvironmentConfigs.development;
  }

  /**
   * パフォーマンス閾値取得
   * @param {string} environment - 環境名
   */
  static getPerformanceThresholds(environment = null) {
    const env = environment || this.getCurrentEnvironment();
    return PerformanceThresholds[env] || PerformanceThresholds.development;
  }

  /**
   * 環境固有のPlaywright設定生成
   * @param {string} environment - 環境名
   */
  static generatePlaywrightConfig(environment = null) {
    const config = this.getConfig(environment);
    const thresholds = this.getPerformanceThresholds(environment);

    return {
      use: {
        baseURL: config.baseURL,
        actionTimeout: config.timeout.action,
        navigationTimeout: config.timeout.navigation,
        ...config.debug
      },
      timeout: config.timeout.assertion,
      retries: config.retry.count,
      workers: config.parallel.workers,
      fullyParallel: config.parallel.fullyParallel,
      metadata: {
        environment: config.name,
        thresholds
      }
    };
  }

  /**
   * テストフィルタリング
   * @param {string} environment - 環境名
   * @param {Array} testCategories - テストカテゴリ配列
   */
  static filterTestsForEnvironment(environment, testCategories) {
    const config = this.getConfig(environment);
    
    // 本番環境では制限付きテストのみ
    if (config.restrictions?.readOnly) {
      return testCategories.filter(category => 
        !['stress', 'security', 'error'].includes(category)
      );
    }

    return testCategories;
  }

  /**
   * 認証設定取得
   * @param {string} environment - 環境名
   */
  static getAuthConfig(environment = null) {
    const config = this.getConfig(environment);
    return config.auth || null;
  }

  /**
   * モニタリング設定取得
   * @param {string} environment - 環境名
   */
  static getMonitoringConfig(environment = null) {
    const config = this.getConfig(environment);
    return config.monitoring || {};
  }

  /**
   * 環境の準備状況確認
   * @param {string} environment - 環境名
   */
  static async validateEnvironment(environment = null) {
    const config = this.getConfig(environment);
    
    try {
      // ベースURLの疎通確認
      const response = await fetch(config.baseURL);
      const isReachable = response.ok;

      // API URLの疎通確認
      let apiReachable = false;
      try {
        const apiResponse = await fetch(`${config.apiBaseURL}/health`);
        apiReachable = apiResponse.ok;
      } catch {
        // API ヘルスチェックエンドポイントがない場合は無視
      }

      return {
        environment: config.name,
        baseURL: config.baseURL,
        reachable: isReachable,
        apiReachable,
        status: isReachable ? 'ready' : 'unavailable'
      };
    } catch (error) {
      return {
        environment: config.name,
        baseURL: config.baseURL,
        reachable: false,
        apiReachable: false,
        status: 'error',
        error: error.message
      };
    }
  }
}

export default EnvironmentConfigs;