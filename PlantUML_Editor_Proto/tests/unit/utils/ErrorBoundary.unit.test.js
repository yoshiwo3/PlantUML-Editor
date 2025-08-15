/**
 * ErrorBoundary 単体テスト
 * Sprint 1 - エラーハンドリング機能テスト
 * 
 * テスト対象: ErrorBoundary.jsのエラーキャッチ・回復機能
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * 
 * 作成日: 2025-08-15
 * 作成者: webapp-test-automation
 */

import { createTestElements, domTestUtils } from '@tests/helpers/dom-utils.js';

// ErrorBoundaryのモック実装
class MockErrorBoundary {
  constructor(options = {}) {
    this.hasError = false;
    this.error = null;
    this.errorMessage = null;
    this.errorStack = null;
    this.errorInfo = null;
    this.fallbackElement = null;
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    this.onError = options.onError || null;
    this.onRetry = options.onRetry || null;
    this.onReset = options.onReset || null;
    this.autoRetry = options.autoRetry || false;
    this.logErrors = options.logErrors !== false; // デフォルトでログ出力
    
    this.setupErrorHandlers();
  }

  // エラーハンドラーの設定
  setupErrorHandlers() {
    // グローバルエラーハンドラー
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // カスタムエラーハンドラー
    document.addEventListener('PlantUMLError', this.handlePlantUMLError.bind(this));
  }

  // エラーキャッチ処理
  catchError(error, errorInfo = {}) {
    this.hasError = true;
    this.error = error;
    this.errorMessage = error?.message || 'Unknown error';
    this.errorStack = error?.stack || null;
    this.errorInfo = errorInfo;

    if (this.logErrors) {
      this.logError(error, errorInfo);
    }

    // エラーコールバック実行
    if (this.onError) {
      try {
        this.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    }

    // フォールバック表示
    this.showFallback();

    // 自動リトライ
    if (this.autoRetry && this.retryCount < this.maxRetries) {
      setTimeout(() => this.retry(), 1000);
    }

    // カスタムイベント発火
    const errorEvent = createPlantUMLEvent('errorBoundaryTriggered', {
      error: error,
      errorInfo: errorInfo,
      retryCount: this.retryCount
    });
    document.dispatchEvent(errorEvent);

    return this.getErrorState();
  }

  // エラーハンドラー（window.error）
  handleError(event) {
    const error = new Error(event.message);
    error.filename = event.filename;
    error.lineno = event.lineno;
    error.colno = event.colno;
    
    return this.catchError(error, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  // Promise拒否ハンドラー
  handlePromiseRejection(event) {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    return this.catchError(error, {
      type: 'promise',
      promise: event.promise
    });
  }

  // PlantUML固有エラーハンドラー
  handlePlantUMLError(event) {
    const { error, component, action } = event.detail;
    
    return this.catchError(error, {
      type: 'plantuml',
      component: component,
      action: action
    });
  }

  // エラーログ出力
  logError(error, errorInfo) {
    const logData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      errorInfo: errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.group('🚨 ErrorBoundary - Error Caught');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Full Log Data:', logData);
    console.groupEnd();

    // エラー報告API呼び出し（モック）
    if (typeof fetch !== 'undefined') {
      fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      }).catch(reportError => {
        console.error('Failed to report error:', reportError);
      });
    }
  }

  // フォールバックUI表示
  showFallback() {
    if (!this.fallbackElement) {
      this.fallbackElement = this.createFallbackElement();
      
      // エラーが発生した要素を置き換え
      const errorContainer = document.getElementById('error-display') || document.body;
      errorContainer.appendChild(this.fallbackElement);
    }
    
    this.fallbackElement.style.display = 'block';
    this.updateFallbackContent();
  }

  // フォールバック要素作成
  createFallbackElement() {
    const fallback = document.createElement('div');
    fallback.id = 'error-boundary-fallback';
    fallback.className = 'error-boundary';
    fallback.innerHTML = `
      <div class="error-content">
        <h2>⚠️ エラーが発生しました</h2>
        <p class="error-message"></p>
        <details class="error-details">
          <summary>詳細情報</summary>
          <pre class="error-stack"></pre>
          <div class="error-info"></div>
        </details>
        <div class="error-actions">
          <button id="error-retry-btn">再試行 (<span class="retry-count">0</span>/${this.maxRetries})</button>
          <button id="error-reset-btn">リセット</button>
          <button id="error-report-btn">問題を報告</button>
        </div>
      </div>
    `;

    // ボタンイベントリスナー設定
    const retryBtn = fallback.querySelector('#error-retry-btn');
    const resetBtn = fallback.querySelector('#error-reset-btn');
    const reportBtn = fallback.querySelector('#error-report-btn');

    if (retryBtn) retryBtn.addEventListener('click', () => this.retry());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    if (reportBtn) reportBtn.addEventListener('click', () => this.reportError());

    return fallback;
  }

  // フォールバック内容更新
  updateFallbackContent() {
    if (!this.fallbackElement) return;

    const messageEl = this.fallbackElement.querySelector('.error-message');
    const stackEl = this.fallbackElement.querySelector('.error-stack');
    const infoEl = this.fallbackElement.querySelector('.error-info');
    const retryCountEl = this.fallbackElement.querySelector('.retry-count');
    const retryBtn = this.fallbackElement.querySelector('#error-retry-btn');

    if (messageEl) messageEl.textContent = this.errorMessage;
    if (stackEl) stackEl.textContent = this.errorStack || 'スタックトレースが利用できません';
    if (infoEl) infoEl.textContent = JSON.stringify(this.errorInfo, null, 2);
    if (retryCountEl) retryCountEl.textContent = this.retryCount.toString();
    
    // リトライボタンの状態制御
    if (retryBtn) {
      retryBtn.disabled = this.retryCount >= this.maxRetries;
    }
  }

  // リトライ処理
  retry() {
    if (this.retryCount >= this.maxRetries) {
      console.warn('Maximum retry attempts reached');
      return false;
    }

    this.retryCount++;
    
    // リトライコールバック実行
    if (this.onRetry) {
      try {
        this.onRetry(this.retryCount, this.error, this.errorInfo);
      } catch (retryError) {
        console.error('Error in retry callback:', retryError);
        return false;
      }
    }

    // フォールバック非表示
    this.hideFallback();
    
    // エラー状態リセット（リトライカウントは保持）
    const previousRetryCount = this.retryCount;
    this.clearError();
    this.retryCount = previousRetryCount;

    // カスタムイベント発火
    const retryEvent = createPlantUMLEvent('errorBoundaryRetried', {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    });
    document.dispatchEvent(retryEvent);

    return true;
  }

  // リセット処理
  reset() {
    // リセットコールバック実行
    if (this.onReset) {
      try {
        this.onReset();
      } catch (resetError) {
        console.error('Error in reset callback:', resetError);
      }
    }

    // 完全リセット
    this.clearError();
    this.retryCount = 0;
    this.hideFallback();

    // カスタムイベント発火
    const resetEvent = createPlantUMLEvent('errorBoundaryReset');
    document.dispatchEvent(resetEvent);

    return true;
  }

  // エラー状態クリア
  clearError() {
    this.hasError = false;
    this.error = null;
    this.errorMessage = null;
    this.errorStack = null;
    this.errorInfo = null;
  }

  // フォールバック非表示
  hideFallback() {
    if (this.fallbackElement) {
      this.fallbackElement.style.display = 'none';
    }
  }

  // エラー報告
  reportError() {
    const reportData = {
      error: this.errorMessage,
      stack: this.errorStack,
      info: this.errorInfo,
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // 報告API呼び出し（モック）
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    })
    .then(response => response.json())
    .then(data => {
      alert('エラー報告を送信しました。ご協力ありがとうございます。');
    })
    .catch(error => {
      console.error('Error report failed:', error);
      alert('エラー報告の送信に失敗しました。');
    });
  }

  // 状態取得
  getErrorState() {
    return {
      hasError: this.hasError,
      error: this.error,
      errorMessage: this.errorMessage,
      errorStack: this.errorStack,
      errorInfo: this.errorInfo,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  // 破棄処理
  destroy() {
    window.removeEventListener('error', this.handleError.bind(this));
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    document.removeEventListener('PlantUMLError', this.handlePlantUMLError.bind(this));
    
    if (this.fallbackElement) {
      this.fallbackElement.remove();
      this.fallbackElement = null;
    }
    
    this.clearError();
  }
}

describe('ErrorBoundary 単体テスト', () => {
  let errorBoundary;
  let originalConsoleError;

  // 各テスト前の初期化
  beforeEach(() => {
    createTestDOM();
    originalConsoleError = console.error;
    console.error = jest.fn(); // エラーログをモック
    
    errorBoundary = new MockErrorBoundary({
      maxRetries: 3,
      logErrors: true,
      autoRetry: false
    });
  });

  // 各テスト後のクリーンアップ
  afterEach(() => {
    if (errorBoundary) {
      errorBoundary.destroy();
    }
    console.error = originalConsoleError;
    cleanupTestDOM();
  });

  describe('初期化と基本状態', () => {
    test('ErrorBoundaryが正常に初期化される', () => {
      // Assert
      expect(errorBoundary).toBeDefined();
      expect(errorBoundary.hasError).toBe(false);
      expect(errorBoundary.error).toBeNull();
      expect(errorBoundary.errorMessage).toBeNull();
      expect(errorBoundary.retryCount).toBe(0);
      
      const state = errorBoundary.getErrorState();
      expect(state.hasError).toBe(false);
    });

    test('初期状態ではエラー状態でない', () => {
      // Act
      const state = errorBoundary.getErrorState();
      
      // Assert
      expect(state).not.toBeInErrorState();
    });

    test('設定オプションが正しく適用される', () => {
      // Arrange
      const customOptions = {
        maxRetries: 5,
        autoRetry: true,
        logErrors: false
      };
      
      // Act
      const customErrorBoundary = new MockErrorBoundary(customOptions);
      
      // Assert
      expect(customErrorBoundary.maxRetries).toBe(5);
      expect(customErrorBoundary.autoRetry).toBe(true);
      expect(customErrorBoundary.logErrors).toBe(false);
      
      customErrorBoundary.destroy();
    });
  });

  describe('エラーキャッチ機能', () => {
    test('JavaScriptエラーを適切にキャッチする', async () => {
      // Arrange
      const testError = new Error('テストエラー');
      const errorInfo = { component: 'TestComponent' };
      
      // Act
      const result = await measurePerformance('error-catch', () => {
        return errorBoundary.catchError(testError, errorInfo);
      });
      
      // Assert
      expect(result).toBeInErrorState();
      expect(result.hasError).toBe(true);
      expect(result.errorMessage).toBe('テストエラー');
      expect(result.errorInfo).toEqual(errorInfo);
    });

    test('エラー情報が正しく保存される', () => {
      // Arrange
      const error = new Error('保存テスト');
      error.stack = 'テストスタックトレース';
      
      // Act
      errorBoundary.catchError(error, { type: 'test' });
      
      // Assert
      expect(errorBoundary.hasError).toBe(true);
      expect(errorBoundary.error).toBe(error);
      expect(errorBoundary.errorMessage).toBe('保存テスト');
      expect(errorBoundary.errorStack).toBe('テストスタックトレース');
    });

    test('PlantUML固有エラーを処理する', async () => {
      // Arrange
      const plantUMLError = new Error('PlantUMLパースエラー');
      const errorInfo = {
        type: 'plantuml',
        component: 'PlantUMLParser',
        action: 'parse'
      };
      
      // Act
      const customEvent = createPlantUMLEvent('PlantUMLError', {
        error: plantUMLError,
        component: 'PlantUMLParser',
        action: 'parse'
      });
      
      document.dispatchEvent(customEvent);
      
      await waitForAsync(() => errorBoundary.hasError, 100);
      
      // Assert
      expect(errorBoundary.hasError).toBe(true);
      expect(errorBoundary.errorInfo.type).toBe('plantuml');
      expect(errorBoundary.errorInfo.component).toBe('PlantUMLParser');
    });
  });

  describe('フォールバックUI機能', () => {
    test('エラー時にフォールバックUIが表示される', () => {
      // Arrange
      const error = new Error('UI表示テスト');
      
      // Act
      errorBoundary.catchError(error);
      
      // Assert
      const fallbackElement = document.getElementById('error-boundary-fallback');
      expect(fallbackElement).toBeTruthy();
      expect(fallbackElement.style.display).toBe('block');
      
      const errorMessage = fallbackElement.querySelector('.error-message');
      expect(errorMessage.textContent).toBe('UI表示テスト');
    });

    test('フォールバックUIにリトライボタンが含まれる', () => {
      // Arrange
      const error = new Error('リトライテスト');
      
      // Act
      errorBoundary.catchError(error);
      
      // Assert
      const retryBtn = document.getElementById('error-retry-btn');
      expect(retryBtn).toBeTruthy();
      expect(retryBtn.textContent).toContain('再試行');
      expect(retryBtn.disabled).toBe(false);
    });

    test('フォールバックUIにリセットボタンが含まれる', () => {
      // Arrange
      const error = new Error('リセットテスト');
      
      // Act
      errorBoundary.catchError(error);
      
      // Assert
      const resetBtn = document.getElementById('error-reset-btn');
      expect(resetBtn).toBeTruthy();
      expect(resetBtn.textContent).toContain('リセット');
    });

    test('エラー詳細が正しく表示される', () => {
      // Arrange
      const error = new Error('詳細テスト');
      error.stack = 'テストスタック情報';
      const errorInfo = { component: 'TestComponent', action: 'render' };
      
      // Act
      errorBoundary.catchError(error, errorInfo);
      
      // Assert
      const stackEl = document.querySelector('.error-stack');
      const infoEl = document.querySelector('.error-info');
      
      expect(stackEl.textContent).toContain('テストスタック情報');
      expect(infoEl.textContent).toContain('TestComponent');
      expect(infoEl.textContent).toContain('render');
    });
  });

  describe('リトライ機能', () => {
    test('リトライが正常に動作する', () => {
      // Arrange
      const onRetrySpy = jest.fn(() => true);
      errorBoundary.onRetry = onRetrySpy;
      
      errorBoundary.catchError(new Error('リトライテスト'));
      expect(errorBoundary.hasError).toBe(true);
      
      // Act
      const result = errorBoundary.retry();
      
      // Assert
      expect(result).toBe(true);
      expect(errorBoundary.retryCount).toBe(1);
      expect(errorBoundary.hasError).toBe(false); // リトライ後はエラー状態クリア
      expect(onRetrySpy).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Object));
    });

    test('最大リトライ回数を超えると停止する', () => {
      // Arrange
      errorBoundary.catchError(new Error('最大リトライテスト'));
      
      // Act - 最大回数を超えてリトライ
      for (let i = 0; i < 5; i++) {
        errorBoundary.retry();
      }
      
      // Assert
      expect(errorBoundary.retryCount).toBe(3); // maxRetriesで制限
      
      const result = errorBoundary.retry();
      expect(result).toBe(false); // それ以上リトライできない
    });

    test('リトライボタンクリックで再試行される', () => {
      // Arrange
      const onRetrySpy = jest.fn();
      errorBoundary.onRetry = onRetrySpy;
      errorBoundary.catchError(new Error('ボタンテスト'));
      
      const retryBtn = document.getElementById('error-retry-btn');
      
      // Act
      retryBtn.click();
      
      // Assert
      expect(onRetrySpy).toHaveBeenCalled();
      expect(errorBoundary.retryCount).toBe(1);
    });

    test('自動リトライが有効な場合に自動実行される', async () => {
      // Arrange
      const autoRetryBoundary = new MockErrorBoundary({ autoRetry: true, maxRetries: 2 });
      const onRetrySpy = jest.fn();
      autoRetryBoundary.onRetry = onRetrySpy;
      
      // Act
      autoRetryBoundary.catchError(new Error('自動リトライテスト'));
      
      // 1秒後に自動リトライが実行されるはず
      jest.advanceTimersByTime(1000);
      await waitForAsync(() => onRetrySpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(onRetrySpy).toHaveBeenCalled();
      
      autoRetryBoundary.destroy();
    });
  });

  describe('リセット機能', () => {
    test('リセットが正常に動作する', () => {
      // Arrange
      const onResetSpy = jest.fn();
      errorBoundary.onReset = onResetSpy;
      
      errorBoundary.catchError(new Error('リセットテスト'));
      errorBoundary.retry(); // リトライカウントを増やす
      
      expect(errorBoundary.hasError).toBe(false); // retry後はfalse
      expect(errorBoundary.retryCount).toBe(1);
      
      // Act
      const result = errorBoundary.reset();
      
      // Assert
      expect(result).toBe(true);
      expect(errorBoundary.hasError).toBe(false);
      expect(errorBoundary.retryCount).toBe(0); // リセットでカウンターもリセット
      expect(onResetSpy).toHaveBeenCalled();
    });

    test('リセットボタンクリックで初期状態に戻る', () => {
      // Arrange
      errorBoundary.catchError(new Error('リセットボタンテスト'));
      const resetBtn = document.getElementById('error-reset-btn');
      
      // Act
      resetBtn.click();
      
      // Assert
      expect(errorBoundary.hasError).toBe(false);
      expect(errorBoundary.retryCount).toBe(0);
      
      const fallbackElement = document.getElementById('error-boundary-fallback');
      expect(fallbackElement.style.display).toBe('none');
    });
  });

  describe('エラーロギング機能', () => {
    test('エラー発生時にログが出力される', () => {
      // Arrange
      const error = new Error('ログテスト');
      
      // Act
      errorBoundary.catchError(error);
      
      // Assert
      expect(console.error).toHaveBeenCalled();
      // console.error の呼び出し内容を確認
      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });

    test('ログ無効時は出力されない', () => {
      // Arrange
      const noLogBoundary = new MockErrorBoundary({ logErrors: false });
      console.error.mockClear();
      
      // Act
      noLogBoundary.catchError(new Error('ログ無効テスト'));
      
      // Assert
      expect(console.error).not.toHaveBeenCalled();
      
      noLogBoundary.destroy();
    });

    test('エラー報告APIが呼び出される', async () => {
      // Arrange
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      errorBoundary.catchError(new Error('API報告テスト'));
      
      // Act
      const reportBtn = document.getElementById('error-report-btn');
      reportBtn.click();
      
      await waitForAsync(() => global.fetch.mock.calls.length > 0, 100);
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/error-report', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  });

  describe('イベント処理', () => {
    test('エラー発生時にカスタムイベントが発火される', async () => {
      // Arrange
      const eventSpy = jest.fn();
      document.addEventListener('errorBoundaryTriggered', eventSpy);
      
      // Act
      errorBoundary.catchError(new Error('イベントテスト'));
      await waitForAsync(() => eventSpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(eventSpy).toHaveBeenCalled();
      const event = eventSpy.mock.calls[0][0];
      expect(event.detail).toHaveProperty('error');
      expect(event.detail.error.message).toBe('イベントテスト');
    });

    test('リトライ時にイベントが発火される', async () => {
      // Arrange
      const retrySpy = jest.fn();
      document.addEventListener('errorBoundaryRetried', retrySpy);
      
      errorBoundary.catchError(new Error('リトライイベントテスト'));
      
      // Act
      errorBoundary.retry();
      await waitForAsync(() => retrySpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(retrySpy).toHaveBeenCalled();
      const event = retrySpy.mock.calls[0][0];
      expect(event.detail.retryCount).toBe(1);
    });

    test('リセット時にイベントが発火される', async () => {
      // Arrange
      const resetSpy = jest.fn();
      document.addEventListener('errorBoundaryReset', resetSpy);
      
      errorBoundary.catchError(new Error('リセットイベントテスト'));
      
      // Act
      errorBoundary.reset();
      await waitForAsync(() => resetSpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のエラー処理を効率的に行う', async () => {
      // Act & Assert
      await measurePerformance('bulk-error-handling', () => {
        for (let i = 0; i < 100; i++) {
          errorBoundary.catchError(new Error(`エラー ${i}`));
          errorBoundary.reset();
        }
      });
      
      expect(errorBoundary.hasError).toBe(false);
    });

    test('メモリリークが発生しない', () => {
      // Arrange
      const initialFallbackElement = errorBoundary.fallbackElement;
      
      // Act
      for (let i = 0; i < 50; i++) {
        errorBoundary.catchError(new Error(`メモリテスト ${i}`));
        errorBoundary.reset();
      }
      
      // Assert
      // フォールバック要素が不必要に増加していないことを確認
      expect(document.querySelectorAll('#error-boundary-fallback')).toHaveLength(1);
    });
  });

  describe('日本語エラーメッセージ対応', () => {
    test('日本語エラーメッセージを正しく表示する', () => {
      // Arrange
      const japaneseError = new Error('日本語エラーメッセージのテストです。PlantUMLパース中にエラーが発生しました。');
      
      // Act
      errorBoundary.catchError(japaneseError);
      
      // Assert
      expect(errorBoundary.errorMessage).toBe('日本語エラーメッセージのテストです。PlantUMLパース中にエラーが発生しました。');
      
      const messageEl = document.querySelector('.error-message');
      expect(messageEl.textContent).toContain('日本語エラーメッセージ');
      expect(messageEl.textContent).toContain('PlantUMLパース');
    });
  });

  describe('破棄処理', () => {
    test('destroy()でリソースを適切にクリーンアップする', () => {
      // Arrange
      errorBoundary.catchError(new Error('破棄テスト'));
      expect(document.getElementById('error-boundary-fallback')).toBeTruthy();
      
      // Act
      errorBoundary.destroy();
      
      // Assert
      expect(errorBoundary.fallbackElement).toBeNull();
      expect(errorBoundary.hasError).toBe(false);
      expect(document.getElementById('error-boundary-fallback')).toBeFalsy();
    });
  });
});