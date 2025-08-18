/**
 * Test Data Fixtures
 * Sprint2 E2E Test Foundation Framework
 */

export const TestData = {
  // 基本的な日本語→PlantUML変換テストデータ
  basicConversions: {
    simple: {
      japanese: 'AさんがBさんにメッセージを送る',
      expectedContains: ['A', 'B', '->', '@startuml', '@enduml'],
      diagramType: 'sequence'
    },
    complex: {
      japanese: '管理者が認証システムを通じてユーザーデータベースにアクセスし、新規ユーザーを作成する',
      expectedContains: ['管理者', '認証システム', 'ユーザーデータベース', '新規ユーザー'],
      diagramType: 'sequence'
    },
    usecase: {
      japanese: 'ユーザーがシステムにログインする',
      expectedContains: ['ユーザー', 'システム', 'ログイン', 'usecase'],
      diagramType: 'usecase'
    },
    activity: {
      japanese: '処理を開始して、検証を行い、完了する',
      expectedContains: ['start', 'stop', '処理', '検証'],
      diagramType: 'activity'
    }
  },

  // 文字種別テストデータ
  characterTypes: {
    hiragana: {
      input: 'ひらがなのてすと',
      description: 'ひらがな文字のテスト'
    },
    katakana: {
      input: 'カタカナのテスト',
      description: 'カタカナ文字のテスト'
    },
    kanji: {
      input: '漢字の処理テスト',
      description: '漢字文字のテスト'
    },
    mixed: {
      input: 'システムAがDBサーバーにアクセスして情報を取得',
      description: '混合文字（ひらがな、カタカナ、漢字、英語）のテスト'
    },
    english: {
      input: 'System A sends message to System B',
      description: '英語文字のテスト'
    },
    numbers: {
      input: 'ユーザー123が管理者456にメッセージを送信',
      description: '数字を含む文字のテスト'
    },
    symbols: {
      input: 'システム（管理）が処理！完了？',
      description: '記号を含む文字のテスト'
    }
  },

  // 図表タイプ別テストデータ
  diagramTypes: {
    sequence: {
      basic: 'AさんがBさんにメッセージを送る',
      complex: 'クライアントがAPIサーバーにリクエストを送信し、APIサーバーがデータベースにクエリを実行して、結果をクライアントに返す',
      withCondition: 'ユーザーがログイン試行し、認証が成功した場合はホーム画面を表示する'
    },
    usecase: {
      basic: 'ユーザーがシステムにログインする',
      complex: 'ユーザーが商品を検索し、カートに追加して、決済を完了する',
      withActor: '管理者がユーザー情報を管理し、レポートを生成する'
    },
    class: {
      basic: 'ユーザークラスが名前と年齢を持つ',
      complex: 'ユーザークラスが個人情報を持ち、注文クラスが商品情報を管理する',
      withRelation: 'ユーザーが複数の注文を持ち、注文が複数の商品を含む'
    },
    activity: {
      basic: '処理を開始して終了する',
      complex: '入力を受け取り、バリデーションを行い、データベースに保存して、結果を返す',
      withCondition: 'ログイン情報を確認し、正しい場合はホーム画面、間違いの場合はエラー画面を表示'
    },
    state: {
      basic: 'アイドル状態から実行状態に遷移する',
      complex: '初期状態から開始し、ログイン状態、作業状態を経て終了状態に至る',
      withTransition: '待機中からイベント発生で処理中に移行し、完了時に待機中に戻る'
    }
  },

  // パフォーマンステストデータ
  performance: {
    quick: {
      input: '短いテスト',
      expectedTime: 50 // 50ms以下
    },
    medium: {
      input: '中程度の長さのテキストでパフォーマンスを測定する',
      expectedTime: 100 // 100ms以下
    },
    long: {
      input: '非常に長いテキストでのパフォーマンステストを実行し、システムが適切に応答することを確認し、メモリ使用量やCPU使用率が許容範囲内であることを検証する',
      expectedTime: 200 // 200ms以下
    },
    veryLong: {
      input: '極めて長いテキストによる負荷テストで、大量のデータ処理時のシステム動作を検証し、メモリリークやパフォーマンス劣化が発生しないこと、およびリアルタイム同期機能が継続して正常に動作することを総合的に確認する包括的なテストシナリオ',
      expectedTime: 500 // 500ms以下
    }
  },

  // エラーテストデータ
  errorCases: {
    empty: {
      input: '',
      description: '空文字入力のテスト'
    },
    specialCharacters: {
      input: '<script>alert("test")</script>',
      description: 'スクリプト注入攻撃のテスト'
    },
    longText: {
      input: 'A'.repeat(10000),
      description: '極端に長いテキストのテスト'
    },
    invalidCharacters: {
      input: '\x00\x01\x02\x03',
      description: '制御文字のテスト'
    },
    unicodeCharacters: {
      input: '🚀🌟💻🎯📊',
      description: 'Unicode絵文字のテスト'
    }
  },

  // アクセシビリティテストデータ
  accessibility: {
    keyboardNavigation: {
      description: 'キーボードナビゲーションのテスト',
      keys: ['Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown']
    },
    screenReader: {
      description: 'スクリーンリーダーサポートのテスト',
      ariaLabels: ['input', 'output', 'button', 'link']
    }
  },

  // セキュリティテストデータ
  security: {
    xss: {
      input: '<img src="x" onerror="alert(\'XSS\')">',
      description: 'XSS攻撃のテスト'
    },
    sqlInjection: {
      input: "'; DROP TABLE users; --",
      description: 'SQL注入攻撃のテスト'
    },
    pathTraversal: {
      input: '../../../etc/passwd',
      description: 'パストラバーサル攻撃のテスト'
    }
  },

  // 統合テストデータ
  integration: {
    apiEndpoints: {
      convert: '/api/convert',
      save: '/api/save',
      load: '/api/load',
      export: '/api/export'
    },
    mockResponses: {
      success: {
        status: 200,
        data: { success: true, result: '@startuml\n...\n@enduml' }
      },
      error: {
        status: 500,
        data: { success: false, error: 'Internal server error' }
      },
      timeout: {
        delay: 30000 // 30秒遅延
      }
    }
  },

  // ブラウザ別テストデータ
  browsers: {
    chrome: {
      name: 'Chromium',
      userAgent: 'Chrome',
      features: ['webgl', 'canvas', 'localStorage']
    },
    firefox: {
      name: 'Firefox',
      userAgent: 'Firefox',
      features: ['webgl', 'canvas', 'localStorage']
    },
    webkit: {
      name: 'WebKit',
      userAgent: 'Safari',
      features: ['canvas', 'localStorage']
    },
    edge: {
      name: 'Edge',
      userAgent: 'Edge',
      features: ['webgl', 'canvas', 'localStorage']
    }
  },

  // モバイルテストデータ
  mobile: {
    devices: {
      phone: {
        viewport: { width: 375, height: 667 },
        userAgent: 'iPhone'
      },
      tablet: {
        viewport: { width: 768, height: 1024 },
        userAgent: 'iPad'
      }
    },
    touchGestures: {
      tap: { type: 'tap' },
      swipe: { type: 'swipe', direction: 'left' },
      pinch: { type: 'pinch', scale: 1.5 }
    }
  },

  // 国際化テストデータ
  i18n: {
    languages: {
      japanese: {
        code: 'ja',
        text: '日本語のテスト',
        direction: 'ltr'
      },
      english: {
        code: 'en',
        text: 'English test',
        direction: 'ltr'
      },
      chinese: {
        code: 'zh',
        text: '中文测试',
        direction: 'ltr'
      },
      arabic: {
        code: 'ar',
        text: 'اختبار عربي',
        direction: 'rtl'
      }
    }
  }
};

// テストデータ生成ユーティリティ
export class TestDataFactory {
  /**
   * ランダムな日本語テキストの生成
   */
  static generateRandomJapaneseText(length = 20) {
    const hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
    const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const kanji = '日本語漢字文字変換処理システム管理者ユーザーデータベース';
    
    const allChars = hiragana + katakana + kanji;
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return result;
  }

  /**
   * テストシナリオの生成
   */
  static generateTestScenario(type, complexity = 'basic') {
    const scenarios = TestData.diagramTypes[type];
    return scenarios ? scenarios[complexity] : null;
  }

  /**
   * パフォーマンステストケースの生成
   */
  static generatePerformanceTestCase(size = 'medium') {
    return TestData.performance[size] || TestData.performance.medium;
  }

  /**
   * ブラウザ固有テストデータの取得
   */
  static getBrowserTestData(browserName) {
    return TestData.browsers[browserName.toLowerCase()] || TestData.browsers.chrome;
  }

  /**
   * エラーテストケースの生成
   */
  static generateErrorTestCase(errorType) {
    return TestData.errorCases[errorType] || TestData.errorCases.empty;
  }

  /**
   * セキュリティテストケースの生成
   */
  static generateSecurityTestCase(attackType) {
    return TestData.security[attackType] || TestData.security.xss;
  }
}