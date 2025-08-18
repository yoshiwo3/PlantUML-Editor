/**
 * Sprint4 ブラウザマトリックス設定
 * 4ブラウザ × 複数デバイス対応
 */

export const BrowserMatrix = {
  // 対応ブラウザ定義
  browsers: {
    chromium: {
      name: 'Chrome',
      version: '120+',
      engine: 'V8',
      features: {
        webWorkers: true,
        modernES: true,
        webGL: true,
        webAssembly: true
      },
      channel: 'chrome'
    },
    firefox: {
      name: 'Firefox',
      version: '120+',
      engine: 'Gecko',
      features: {
        webWorkers: true,
        modernES: true,
        webGL: true,
        webAssembly: true
      },
      channel: 'firefox'
    },
    webkit: {
      name: 'Safari',
      version: '17+',
      engine: 'WebKit',
      features: {
        webWorkers: true,
        modernES: true,
        webGL: true,
        webAssembly: false // Safari制限
      },
      channel: 'webkit'
    },
    msedge: {
      name: 'Edge',
      version: '120+',
      engine: 'Chromium',
      features: {
        webWorkers: true,
        modernES: true,
        webGL: true,
        webAssembly: true
      },
      channel: 'msedge'
    }
  },

  // デバイス設定
  devices: {
    desktop: [
      {
        name: 'Desktop 1920x1080',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        userAgent: 'desktop'
      },
      {
        name: 'Desktop 1366x768',
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
        userAgent: 'desktop'
      }
    ],
    tablet: [
      {
        name: 'iPad Pro',
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 2,
        userAgent: 'tablet'
      },
      {
        name: 'iPad',
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        userAgent: 'tablet'
      }
    ],
    mobile: [
      {
        name: 'iPhone 13',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 3,
        userAgent: 'mobile'
      },
      {
        name: 'Android Large',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.6,
        userAgent: 'mobile'
      }
    ]
  },

  // テスト実行設定
  execution: {
    parallel: true,
    maxWorkers: 4,
    retries: 2,
    timeout: 30000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },

  // ブラウザ固有設定
  browserConfigs: {
    chromium: {
      args: [
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    },
    firefox: {
      prefs: {
        'dom.webdriver.enabled': false,
        'security.tls.insecure_fallback_hosts': 'localhost'
      }
    },
    webkit: {
      args: ['--disable-web-security']
    },
    msedge: {
      args: [
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--no-sandbox'
      ]
    }
  },

  // 日本語対応設定
  localization: {
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    encoding: 'UTF-8',
    fonts: [
      'Noto Sans CJK JP',
      'Yu Gothic',
      'Hiragino Sans',
      'MS Gothic'
    ]
  },

  // テストシナリオグループ
  testGroups: {
    critical: {
      browsers: ['chromium', 'firefox', 'webkit', 'msedge'],
      devices: ['desktop'],
      priority: 'high'
    },
    crossBrowser: {
      browsers: ['chromium', 'firefox', 'webkit', 'msedge'],
      devices: ['desktop', 'tablet'],
      priority: 'medium'
    },
    mobile: {
      browsers: ['chromium', 'webkit'],
      devices: ['mobile'],
      priority: 'medium'
    },
    compatibility: {
      browsers: ['webkit', 'firefox'],
      devices: ['desktop'],
      priority: 'low'
    }
  }
};

/**
 * ブラウザマトリックス生成関数
 */
export class BrowserMatrixGenerator {
  constructor(config = BrowserMatrix) {
    this.config = config;
  }

  /**
   * 指定されたテストグループの組み合わせを生成
   */
  generateMatrix(groupName) {
    const group = this.config.testGroups[groupName];
    if (!group) {
      throw new Error(`Test group "${groupName}" not found`);
    }

    const combinations = [];
    
    for (const browserName of group.browsers) {
      const browser = this.config.browsers[browserName];
      if (!browser) continue;

      for (const deviceType of group.devices) {
        const devices = this.config.devices[deviceType];
        if (!devices) continue;

        for (const device of devices) {
          combinations.push({
            browser: {
              name: browser.name,
              channel: browser.channel,
              engine: browser.engine,
              config: this.config.browserConfigs[browserName] || {}
            },
            device: {
              ...device,
              type: deviceType
            },
            execution: this.config.execution,
            localization: this.config.localization,
            priority: group.priority
          });
        }
      }
    }

    return combinations;
  }

  /**
   * 全組み合わせ生成
   */
  generateFullMatrix() {
    const fullMatrix = {};
    
    for (const groupName of Object.keys(this.config.testGroups)) {
      fullMatrix[groupName] = this.generateMatrix(groupName);
    }

    return fullMatrix;
  }

  /**
   * Playwright設定生成
   */
  generatePlaywrightConfig(groupName) {
    const matrix = this.generateMatrix(groupName);
    
    const projects = matrix.map((combination, index) => ({
      name: `${combination.browser.name}-${combination.device.name}`,
      use: {
        ...combination.device.viewport ? { viewport: combination.device.viewport } : {},
        deviceScaleFactor: combination.device.deviceScaleFactor,
        locale: combination.localization.locale,
        timezoneId: combination.localization.timezone,
        screenshot: combination.execution.screenshot,
        video: combination.execution.video,
        trace: combination.execution.trace,
        ...combination.browser.config
      },
      testDir: './tests/scenarios',
      timeout: combination.execution.timeout,
      retries: combination.execution.retries
    }));

    return {
      projects,
      workers: this.config.execution.maxWorkers,
      reporter: [
        ['html'],
        ['json', { outputFile: 'test-results.json' }],
        ['junit', { outputFile: 'test-results.xml' }]
      ]
    };
  }

  /**
   * 並列実行グループ分割
   */
  splitForParallelExecution(groupName, workerCount = 4) {
    const matrix = this.generateMatrix(groupName);
    const chunks = [];
    const chunkSize = Math.ceil(matrix.length / workerCount);

    for (let i = 0; i < matrix.length; i += chunkSize) {
      chunks.push(matrix.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * ブラウザ互換性チェック
   */
  checkCompatibility(feature) {
    const compatibility = {};
    
    for (const [browserName, browser] of Object.entries(this.config.browsers)) {
      compatibility[browserName] = {
        supported: browser.features[feature] || false,
        version: browser.version,
        engine: browser.engine
      };
    }

    return compatibility;
  }

  /**
   * 実行統計情報
   */
  getExecutionStats(groupName) {
    const matrix = this.generateMatrix(groupName);
    
    const stats = {
      totalCombinations: matrix.length,
      browsers: {},
      devices: {},
      estimatedTime: 0
    };

    matrix.forEach(combination => {
      // ブラウザ統計
      const browserName = combination.browser.name;
      stats.browsers[browserName] = (stats.browsers[browserName] || 0) + 1;

      // デバイス統計
      const deviceType = combination.device.type;
      stats.devices[deviceType] = (stats.devices[deviceType] || 0) + 1;

      // 推定実行時間（30秒/組み合わせと仮定）
      stats.estimatedTime += 30;
    });

    // 並列実行考慮
    stats.estimatedTimeParallel = Math.ceil(stats.estimatedTime / this.config.execution.maxWorkers);

    return stats;
  }
}

// デフォルトエクスポート
export default BrowserMatrix;