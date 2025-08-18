/**
 * Sprint4 デバイス特化設定
 * レスポンシブデザイン対応テスト
 */

export const DeviceConfiguration = {
  // デスクトップ設定
  desktop: {
    standard: {
      name: 'Desktop Standard',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      features: {
        hover: true,
        keyboard: true,
        mouse: true,
        touchscreen: false,
        orientation: 'landscape'
      },
      performance: {
        cpu: 'high',
        memory: 'high',
        network: 'fast'
      }
    },
    compact: {
      name: 'Desktop Compact',
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      features: {
        hover: true,
        keyboard: true,
        mouse: true,
        touchscreen: false,
        orientation: 'landscape'
      },
      performance: {
        cpu: 'medium',
        memory: 'medium',
        network: 'medium'
      }
    },
    ultrawide: {
      name: 'Desktop Ultrawide',
      viewport: { width: 2560, height: 1080 },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      features: {
        hover: true,
        keyboard: true,
        mouse: true,
        touchscreen: false,
        orientation: 'landscape'
      },
      performance: {
        cpu: 'high',
        memory: 'high',
        network: 'fast'
      }
    }
  },

  // タブレット設定
  tablet: {
    ipadPro: {
      name: 'iPad Pro',
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'high',
        memory: 'high',
        network: 'fast'
      }
    },
    ipad: {
      name: 'iPad',
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'medium',
        memory: 'medium',
        network: 'medium'
      }
    },
    androidTablet: {
      name: 'Android Tablet',
      viewport: { width: 800, height: 1280 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'medium',
        memory: 'medium',
        network: 'medium'
      }
    }
  },

  // モバイル設定
  mobile: {
    iphone13: {
      name: 'iPhone 13',
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'high',
        memory: 'medium',
        network: 'medium'
      }
    },
    iphone13Pro: {
      name: 'iPhone 13 Pro',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'high',
        memory: 'high',
        network: 'fast'
      }
    },
    androidLarge: {
      name: 'Android Large',
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.6,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'high',
        memory: 'medium',
        network: 'medium'
      }
    },
    androidCompact: {
      name: 'Android Compact',
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36',
      features: {
        hover: false,
        keyboard: false,
        mouse: false,
        touchscreen: true,
        orientation: 'both'
      },
      performance: {
        cpu: 'medium',
        memory: 'low',
        network: 'slow'
      }
    }
  }
};

/**
 * 日本語入力対応設定
 */
export const JapaneseInputConfiguration = {
  inputMethods: {
    ime: {
      enabled: true,
      languages: ['ja-JP'],
      keyboards: ['hiragana', 'katakana', 'romaji'],
      compositions: true
    },
    hardware: {
      japanese109: {
        layout: 'jp-109',
        specialKeys: ['半角/全角', '変換', '無変換', 'カタカナ'],
        imeToggle: 'Alt+`'
      }
    }
  },

  textInputPatterns: {
    hiragana: 'ひらがなのテスト入力',
    katakana: 'カタカナのテスト入力',
    kanji: '漢字のテスト入力',
    mixed: 'ひらがなとカタカナと漢字のMixed入力',
    business: 'システムがデータベースにアクセスする',
    technical: 'APIエンドポイントから認証トークンを取得',
    special: '①②③！？（）「」【】～',
    emoji: '😀😃😄😁🚀🔧📊💡'
  },

  inputValidation: {
    encoding: 'UTF-8',
    maxLength: 1000,
    prohibitedChars: ['<', '>', '"', "'", '&'],
    sanitization: true
  }
};

/**
 * パフォーマンステスト設定
 */
export const PerformanceConfiguration = {
  metrics: {
    core: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift'
    ],
    custom: [
      'plantuml-parse-time',
      'diagram-render-time',
      'edit-response-time',
      'export-generation-time'
    ]
  },

  thresholds: {
    desktop: {
      fcp: 1500,  // 1.5s
      lcp: 2500,  // 2.5s
      fid: 100,   // 100ms
      cls: 0.1,   // 0.1
      parseTime: 200,    // 200ms
      renderTime: 500,   // 500ms
      editResponse: 100, // 100ms
      exportTime: 3000   // 3s
    },
    tablet: {
      fcp: 2000,  // 2s
      lcp: 3000,  // 3s
      fid: 150,   // 150ms
      cls: 0.15,  // 0.15
      parseTime: 300,    // 300ms
      renderTime: 800,   // 800ms
      editResponse: 150, // 150ms
      exportTime: 5000   // 5s
    },
    mobile: {
      fcp: 2500,  // 2.5s
      lcp: 4000,  // 4s
      fid: 200,   // 200ms
      cls: 0.2,   // 0.2
      parseTime: 500,    // 500ms
      renderTime: 1200,  // 1.2s
      editResponse: 200, // 200ms
      exportTime: 8000   // 8s
    }
  },

  networkConditions: {
    fast3g: {
      downloadSpeed: 1.5 * 1024 * 1024 / 8,
      uploadSpeed: 750 * 1024 / 8,
      latency: 150
    },
    slow3g: {
      downloadSpeed: 500 * 1024 / 8,
      uploadSpeed: 500 * 1024 / 8,
      latency: 400
    },
    offline: {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0
    }
  }
};

/**
 * デバイス設定ユーティリティ
 */
export class DeviceConfigurationManager {
  constructor() {
    this.devices = DeviceConfiguration;
    this.japanese = JapaneseInputConfiguration;
    this.performance = PerformanceConfiguration;
  }

  /**
   * デバイスタイプ別設定取得
   */
  getDevicesByType(type) {
    return this.devices[type] || {};
  }

  /**
   * 特定デバイス設定取得
   */
  getDevice(type, name) {
    const devices = this.getDevicesByType(type);
    return devices[name] || null;
  }

  /**
   * Playwright用デバイス設定生成
   */
  generatePlaywrightDevice(type, name) {
    const device = this.getDevice(type, name);
    if (!device) {
      throw new Error(`Device ${type}/${name} not found`);
    }

    return {
      name: device.name,
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      userAgent: device.userAgent,
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      hasTouch: device.features.touchscreen,
      isMobile: type === 'mobile'
    };
  }

  /**
   * パフォーマンス閾値取得
   */
  getPerformanceThresholds(deviceType) {
    return this.performance.thresholds[deviceType] || this.performance.thresholds.desktop;
  }

  /**
   * 日本語入力設定取得
   */
  getJapaneseInputConfig() {
    return this.japanese;
  }

  /**
   * レスポンシブテスト用ビューポート一覧
   */
  getResponsiveViewports() {
    const viewports = [];
    
    Object.values(this.devices).forEach(deviceType => {
      Object.values(deviceType).forEach(device => {
        viewports.push({
          name: device.name,
          width: device.viewport.width,
          height: device.viewport.height,
          deviceScaleFactor: device.deviceScaleFactor
        });
      });
    });

    return viewports.sort((a, b) => a.width - b.width);
  }

  /**
   * タッチデバイス一覧
   */
  getTouchDevices() {
    const touchDevices = [];
    
    Object.entries(this.devices).forEach(([type, devices]) => {
      Object.entries(devices).forEach(([name, device]) => {
        if (device.features.touchscreen) {
          touchDevices.push({
            type,
            name,
            config: device
          });
        }
      });
    });

    return touchDevices;
  }

  /**
   * 低性能デバイス一覧
   */
  getLowPerformanceDevices() {
    const lowPerfDevices = [];
    
    Object.entries(this.devices).forEach(([type, devices]) => {
      Object.entries(devices).forEach(([name, device]) => {
        if (device.performance.cpu === 'low' || device.performance.memory === 'low') {
          lowPerfDevices.push({
            type,
            name,
            config: device
          });
        }
      });
    });

    return lowPerfDevices;
  }

  /**
   * テスト統計情報
   */
  getDeviceStats() {
    const stats = {
      total: 0,
      byType: {},
      byPerformance: {},
      touchEnabled: 0,
      desktopOnly: 0
    };

    Object.entries(this.devices).forEach(([type, devices]) => {
      const deviceCount = Object.keys(devices).length;
      stats.total += deviceCount;
      stats.byType[type] = deviceCount;

      Object.values(devices).forEach(device => {
        // パフォーマンス統計
        const perfKey = `${device.performance.cpu}-${device.performance.memory}`;
        stats.byPerformance[perfKey] = (stats.byPerformance[perfKey] || 0) + 1;

        // タッチ・デスクトップ統計
        if (device.features.touchscreen) {
          stats.touchEnabled++;
        } else {
          stats.desktopOnly++;
        }
      });
    });

    return stats;
  }
}

export default DeviceConfiguration;