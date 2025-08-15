/**
 * DOM操作テストユーティリティ
 * PlantUMLエディターのDOM関連テストをサポート
 */

/**
 * テスト用DOM要素作成ヘルパー
 */
export const createTestElements = {
  /**
   * PlantUMLエディターのメイン要素を作成
   */
  createEditorContainer() {
    const container = document.createElement('div');
    container.id = 'plantuml-editor';
    container.innerHTML = `
      <div id="japanese-input-section">
        <textarea id="japanese-input" placeholder="日本語でシーケンス図を記述してください"></textarea>
      </div>
      <div id="plantuml-output-section">
        <textarea id="plantuml-output" readonly></textarea>
      </div>
      <div id="action-buttons">
        <button id="add-action-btn">アクション追加</button>
        <button id="edit-mode-btn">編集モード</button>
      </div>
      <div id="modal-container"></div>
      <div id="error-display" style="display: none;"></div>
    `;
    return container;
  },

  /**
   * EditModalManagerテスト用モーダル要素
   */
  createModalElements() {
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>アクション編集</h2>
        <form id="action-form">
          <select id="action-type">
            <option value="message">メッセージ</option>
            <option value="condition">条件分岐</option>
            <option value="loop">ループ</option>
            <option value="parallel">並行処理</option>
          </select>
          <input type="text" id="action-content" placeholder="内容を入力">
          <button type="submit">保存</button>
          <button type="button" id="cancel-btn">キャンセル</button>
        </form>
      </div>
    `;
    return modal;
  },

  /**
   * ErrorBoundaryテスト用エラー表示要素
   */
  createErrorBoundaryElements() {
    const errorContainer = document.createElement('div');
    errorContainer.id = 'error-boundary';
    errorContainer.innerHTML = `
      <div id="error-fallback" style="display: none;">
        <h2>エラーが発生しました</h2>
        <pre id="error-details"></pre>
        <button id="retry-btn">再試行</button>
        <button id="reset-btn">リセット</button>
      </div>
    `;
    return errorContainer;
  }
};

/**
 * DOM操作テストユーティリティ
 */
export const domTestUtils = {
  /**
   * DOM要素の存在確認
   */
  elementExists(selector) {
    return document.querySelector(selector) !== null;
  },

  /**
   * 要素のテキスト取得
   */
  getElementText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent : null;
  },

  /**
   * 入力要素の値設定
   */
  setInputValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      // 変更イベントを発火
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },

  /**
   * ボタンクリックシミュレーション
   */
  clickButton(selector) {
    const button = document.querySelector(selector);
    if (button) {
      button.click();
    }
  },

  /**
   * モーダル表示状態確認
   */
  isModalVisible(modalSelector) {
    const modal = document.querySelector(modalSelector);
    return modal && window.getComputedStyle(modal).display !== 'none';
  },

  /**
   * エラー表示確認
   */
  hasErrorMessage(selector) {
    const errorElement = document.querySelector(selector);
    return errorElement && errorElement.textContent.trim().length > 0;
  },

  /**
   * フォーム送信シミュレーション
   */
  submitForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  },

  /**
   * DOMクリーンアップ
   */
  cleanup() {
    // テスト後のDOM要素削除
    const testElements = [
      '#plantuml-editor',
      '#edit-modal', 
      '#error-boundary',
      '.test-element'
    ];
    
    testElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });
  }
};

/**
 * イベント操作ユーティリティ
 */
export const eventTestUtils = {
  /**
   * カスタムイベント作成
   */
  createCustomEvent(eventName, detail = {}) {
    return new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      detail
    });
  },

  /**
   * キーボードイベント作成
   */
  createKeyboardEvent(type, keyCode, options = {}) {
    return new KeyboardEvent(type, {
      keyCode,
      bubbles: true,
      cancelable: true,
      ...options
    });
  },

  /**
   * マウスイベント作成
   */
  createMouseEvent(type, options = {}) {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...options
    });
  },

  /**
   * 非同期操作の待機
   */
  async waitForCondition(conditionFn, timeout = 1000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return false;
  }
};

/**
 * セキュリティテストユーティリティ
 */
export const securityTestUtils = {
  /**
   * XSS攻撃パターン
   */
  xssPatterns: [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '&lt;script&gt;alert("XSS")&lt;/script&gt;'
  ],

  /**
   * SQLインジェクションパターン  
   */
  sqlInjectionPatterns: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1' UNION SELECT * FROM users--"
  ],

  /**
   * 危険なHTMLパターン
   */
  dangerousHtmlPatterns: [
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<object data="javascript:alert(\'XSS\')"></object>',
    '<embed src="javascript:alert(\'XSS\')">',
    '<form><button formaction="javascript:alert(\'XSS\')">Submit</button></form>'
  ],

  /**
   * サニタイズテスト
   */
  testSanitization(input, expectedOutput, sanitizeFn) {
    const result = sanitizeFn(input);
    return result === expectedOutput;
  }
};

/**
 * テストデータジェネレーター
 */
export const testDataGenerator = {
  /**
   * ランダム文字列生成
   */
  randomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * テスト用日本語文字列
   */
  japaneseTestStrings: [
    'ユーザーがログインする',
    'システムがデータを取得する',
    '管理者が設定を変更する',
    'エラーが発生した場合の処理',
    'データベースにアクセスして情報を保存'
  ],

  /**
   * テスト用PlantUMLアクション
   */
  sampleActions: [
    { type: 'message', content: 'ユーザー -> システム: ログイン要求' },
    { type: 'condition', content: 'alt 認証成功' },
    { type: 'loop', content: 'loop 5回まで' },
    { type: 'parallel', content: 'par データ取得' }
  ]
};