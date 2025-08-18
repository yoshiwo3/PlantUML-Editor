/**
 * ブラウザ設定ファイル
 * Sprint2 E2Eテスト用のブラウザ固有設定を管理
 */

/**
 * ブラウザ固有設定
 */
export const BrowserConfigs = {
  // Chrome/Chromium設定
  chromium: {
    name: 'chromium',
    channel: 'chromium',
    launchOptions: {
      headless: process.env.CI === 'true',
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-iframes-during-capture',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--enable-logging',
        '--log-level=0',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--memory-pressure-off',
        '--max-old-space-size=4096'
      ]
    },
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      permissions: ['clipboard-read', 'clipboard-write']
    },
    features: {
      svg: true,
      canvas: true,
      webgl: true,
      localStorage: true,
      indexedDB: true,
      serviceWorker: true,
      webWorkers: true,
      fileAPI: true,
      dragAndDrop: true
    },
    performance: {
      expectedLoadTime: 2000,
      expectedSyncTime: 50,
      memoryLimit: 200
    }
  },

  // Firefox設定
  firefox: {
    name: 'firefox',
    launchOptions: {
      headless: process.env.CI === 'true',
      firefoxUserPrefs: {
        'dom.webnotifications.enabled': false,
        'dom.push.enabled': false,
        'browser.sessionstore.resume_from_crash': false,
        'browser.cache.disk.enable': false,
        'browser.cache.memory.enable': false,
        'network.http.use-cache': false,
        'intl.accept_languages': 'ja,en-US,en'
      }
    },
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      permissions: ['clipboard-read', 'clipboard-write']
    },
    features: {
      svg: true,
      canvas: true,
      webgl: true,
      localStorage: true,
      indexedDB: true,
      serviceWorker: true,
      webWorkers: true,
      fileAPI: true,
      dragAndDrop: true
    },
    performance: {
      expectedLoadTime: 2500,
      expectedSyncTime: 75,
      memoryLimit: 250
    }
  },

  // WebKit/Safari設定
  webkit: {
    name: 'webkit',
    launchOptions: {
      headless: process.env.CI === 'true'
    },
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      permissions: ['clipboard-read', 'clipboard-write']
    },
    features: {
      svg: true,
      canvas: true,
      webgl: false, // WebKitではWebGL制限あり
      localStorage: true,
      indexedDB: true,
      serviceWorker: false, // WebKitではService Worker制限あり
      webWorkers: true,
      fileAPI: true,
      dragAndDrop: true
    },
    performance: {
      expectedLoadTime: 3000,
      expectedSyncTime: 100,
      memoryLimit: 300
    },
    limitations: [
      'WebGLサポート制限',
      'Service Workerサポート制限',
      'ファイルAPIの一部制限'
    ]
  },

  // Microsoft Edge設定
  edge: {
    name: 'msedge',
    channel: 'msedge',
    launchOptions: {
      headless: process.env.CI === 'true',
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-extensions',
        '--enable-logging',
        '--log-level=0',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    },
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      permissions: ['clipboard-read', 'clipboard-write']
    },
    features: {
      svg: true,
      canvas: true,
      webgl: true,
      localStorage: true,
      indexedDB: true,
      serviceWorker: true,
      webWorkers: true,
      fileAPI: true,
      dragAndDrop: true
    },
    performance: {
      expectedLoadTime: 2000,
      expectedSyncTime: 50,
      memoryLimit: 200
    }
  }
};

/**
 * モバイルブラウザ設定
 */
export const MobileBrowserConfigs = {
  // Chrome Mobile (Android)
  chromeAndroid: {
    name: 'chrome-android',
    device: 'Pixel 5',
    contextOptions: {
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    },
    features: {
      svg: true,
      canvas: true,
      webgl: true,
      localStorage: true,
      indexedDB: true,
      serviceWorker: true,
      webWorkers: true,
      fileAPI: false, // モバイルでは制限
      dragAndDrop: false // モバイルでは制限
    },
    performance: {
      expectedLoadTime: 5000,
      expectedSyncTime: 200,
      memoryLimit: 150
    }
  },

  // Safari Mobile (iOS)
  safariIOS: {
    name: 'safari-ios',
    device: 'iPhone 12',
    contextOptions: {
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    },
    features: {
      svg: true,
      canvas: true,
      webgl: false,
      localStorage: true,
      indexedDB: true,
      serviceWorker: false,
      webWorkers: true,
      fileAPI: false,
      dragAndDrop: false
    },
    performance: {
      expectedLoadTime: 6000,
      expectedSyncTime: 300,
      memoryLimit: 100
    }
  }
};

/**
 * パフォーマンステスト用設定
 */
export const PerformanceConfigs = {
  // 高パフォーマンス設定
  highPerformance: {
    launchOptions: {
      args: [
        '--enable-precise-memory-info',
        '--enable-gpu-benchmarking',
        '--enable-threaded-compositing',
        '--max-old-space-size=8192'
      ]
    },
    contextOptions: {
      recordVideo: {
        dir: 'test-results/videos/performance',
        size: { width: 1920, height: 1080 }
      }
    }
  },

  // メモリ制限設定
  memoryConstrained: {
    launchOptions: {
      args: [
        '--memory-pressure-off',
        '--max-old-space-size=512'
      ]
    }
  },

  // CPU制限設定
  cpuConstrained: {
    launchOptions: {
      args: [
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    }
  }
};

/**
 * セキュリティテスト用設定
 */
export const SecurityConfigs = {
  // セキュリティテスト設定
  security: {
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--allow-running-insecure-content',
        '--disable-site-isolation-trials'
      ]
    },
    contextOptions: {
      bypassCSP: true,
      ignoreHTTPSErrors: true
    }
  },

  // 厳格なセキュリティ設定
  strict: {
    launchOptions: {
      args: [
        '--enable-strict-powerful-feature-restrictions',
        '--enable-strict-mixed-content-checking'
      ]
    },
    contextOptions: {
      bypassCSP: false,
      ignoreHTTPSErrors: false
    }
  }
};

/**
 * アクセシビリティテスト用設定
 */
export const AccessibilityConfigs = {
  // 高コントラスト設定
  highContrast: {
    launchOptions: {
      args: ['--force-high-contrast']
    },
    contextOptions: {
      forcedColors: 'active'
    }
  },

  // 大きなフォント設定
  largeFont: {
    contextOptions: {
      deviceScaleFactor: 2
    }
  },

  // 色覚異常シミュレーション
  colorBlind: {
    launchOptions: {
      args: ['--simulate-color-blindness']
    }
  }
};

/**
 * ブラウザ設定取得ヘルパー
 */
export class BrowserConfigHelper {
  /**
   * 基本ブラウザ設定取得
   * @param {string} browserName - ブラウザ名
   */
  static getBasicConfig(browserName) {
    return BrowserConfigs[browserName] || BrowserConfigs.chromium;
  }

  /**
   * パフォーマンステスト用設定取得
   * @param {string} browserName - ブラウザ名
   * @param {string} perfType - パフォーマンスタイプ
   */
  static getPerformanceConfig(browserName, perfType = 'highPerformance') {
    const baseConfig = this.getBasicConfig(browserName);
    const perfConfig = PerformanceConfigs[perfType];

    return this.mergeConfigs(baseConfig, perfConfig);
  }

  /**
   * セキュリティテスト用設定取得
   * @param {string} browserName - ブラウザ名
   * @param {string} secType - セキュリティタイプ
   */
  static getSecurityConfig(browserName, secType = 'security') {
    const baseConfig = this.getBasicConfig(browserName);
    const secConfig = SecurityConfigs[secType];

    return this.mergeConfigs(baseConfig, secConfig);
  }

  /**
   * アクセシビリティテスト用設定取得
   * @param {string} browserName - ブラウザ名
   * @param {string} a11yType - アクセシビリティタイプ
   */
  static getAccessibilityConfig(browserName, a11yType = 'highContrast') {
    const baseConfig = this.getBasicConfig(browserName);
    const a11yConfig = AccessibilityConfigs[a11yType];

    return this.mergeConfigs(baseConfig, a11yConfig);
  }

  /**
   * モバイル設定取得
   * @param {string} device - デバイス名
   */
  static getMobileConfig(device) {
    return MobileBrowserConfigs[device] || MobileBrowserConfigs.chromeAndroid;
  }

  /**
   * 設定マージ
   * @param {Object} baseConfig - 基本設定
   * @param {Object} overrideConfig - 上書き設定
   */
  static mergeConfigs(baseConfig, overrideConfig) {
    const merged = JSON.parse(JSON.stringify(baseConfig));

    if (overrideConfig.launchOptions) {
      merged.launchOptions = {
        ...merged.launchOptions,
        ...overrideConfig.launchOptions,
        args: [
          ...(merged.launchOptions.args || []),
          ...(overrideConfig.launchOptions.args || [])
        ]
      };
    }

    if (overrideConfig.contextOptions) {
      merged.contextOptions = {
        ...merged.contextOptions,
        ...overrideConfig.contextOptions
      };
    }

    return merged;
  }

  /**
   * ブラウザ機能サポート確認
   * @param {string} browserName - ブラウザ名
   * @param {string} feature - 機能名
   */
  static supportsFeature(browserName, feature) {
    const config = this.getBasicConfig(browserName);
    return config.features[feature] || false;
  }

  /**
   * 全ブラウザでサポートされている機能の取得
   */
  static getUniversalFeatures() {
    const allBrowsers = Object.keys(BrowserConfigs);
    const allFeatures = Object.keys(BrowserConfigs.chromium.features);

    return allFeatures.filter(feature =>
      allBrowsers.every(browser =>
        this.supportsFeature(browser, feature)
      )
    );
  }

  /**
   * ブラウザ固有の制限事項取得
   * @param {string} browserName - ブラウザ名
   */
  static getLimitations(browserName) {
    const config = this.getBasicConfig(browserName);
    return config.limitations || [];
  }
}

export default BrowserConfigs;