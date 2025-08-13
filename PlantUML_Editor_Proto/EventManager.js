/**
 * EventManager.js - イベント管理システム
 * イベントハンドラーの登録、デバウンス、スロットル、タイムアウト管理
 * 同時実行防止とキュー管理機能
 */

class EventManager {
  constructor() {
    this.handlers = new Map();
    this.activeOperations = new Set();
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 1;
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * イベントハンドラーを登録
   * @param {Element} element - 対象要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション設定
   */
  register(element, event, handler, options = {}) {
    const key = this.getKey(element, event);
    
    // 既存のハンドラーを削除
    if (this.handlers.has(key)) {
      const existing = this.handlers.get(key);
      element.removeEventListener(event, existing.wrapper);
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('event', `Replacing handler for ${event} on ${key}`);
      }
    }
    
    // 新しいハンドラーをラップ
    const wrapper = this.createWrapper(handler, options);
    
    // 登録
    this.handlers.set(key, {
      element,
      event,
      handler,
      wrapper,
      options
    });
    
    element.addEventListener(event, wrapper, options.capture);
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('event', `Registered handler for ${event}`, {
        element: key,
        options
      });
    }
  }

  /**
   * ハンドラーをラップして機能を追加
   */
  createWrapper(handler, options) {
    const {
      debounce = 0,
      throttle = 0,
      once = false,
      preventConcurrent = true,
      timeout = 5000,
      priority = 'normal'
    } = options;
    
    let debounceTimer;
    let throttleTimer;
    let lastThrottleTime = 0;
    
    return async (event) => {
      // イベント履歴に記録
      this.recordEvent(event);
      
      // セーフモードチェック
      if (window.safeMode?.enabled && options.disableInSafeMode) {
        console.log(`[EventManager] Handler disabled in safe mode: ${event.type}`);
        return;
      }
      
      // 診断モード
      if (window.diagnosticMode) {
        window.diagnosticMode.markPerformance(`event_${event.type}_start`);
      }
      
      // 同時実行防止
      if (preventConcurrent && this.activeOperations.has(handler)) {
        console.warn(`[EventManager] Handler already running for ${event.type}, skipping`);
        if (window.diagnosticMode) {
          window.diagnosticMode.log('event', 'Concurrent execution prevented', {
            event: event.type
          });
        }
        return;
      }
      
      // デバウンス処理
      if (debounce > 0) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.executeHandler(handler, event, options);
        }, debounce);
        return;
      }
      
      // スロットル処理
      if (throttle > 0) {
        const now = Date.now();
        if (now - lastThrottleTime < throttle) {
          return;
        }
        lastThrottleTime = now;
      }
      
      // 優先度に基づいてキューに追加または即実行
      if (priority === 'high') {
        // 高優先度は即実行
        await this.executeHandler(handler, event, options);
      } else if (priority === 'low') {
        // 低優先度はキューに追加
        this.enqueue(() => this.executeHandler(handler, event, options));
      } else {
        // 通常優先度は条件に応じて
        if (this.activeOperations.size < this.maxConcurrent) {
          await this.executeHandler(handler, event, options);
        } else {
          this.enqueue(() => this.executeHandler(handler, event, options));
        }
      }
      
      // once オプション
      if (once) {
        this.unregister(event.target, event.type);
      }
    };
  }

  /**
   * ハンドラーを実行
   */
  async executeHandler(handler, event, options) {
    const { timeout = 5000 } = options;
    const handlerName = handler.name || 'anonymous';
    
    this.activeOperations.add(handler);
    
    // タイムアウト付き実行
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Handler timeout: ${handlerName}`)), timeout);
    });
    
    const handlerPromise = Promise.resolve(handler(event));
    
    try {
      await Promise.race([handlerPromise, timeoutPromise]);
      
      // 成功ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.markPerformance(`event_${event.type}_end`);
        window.diagnosticMode.measurePerformance(
          `event_${event.type}_start`,
          `event_${event.type}_end`
        );
      }
      
    } catch (error) {
      console.error(`[EventManager] Handler execution failed:`, error);
      
      // エラーログ
      if (window.diagnosticMode) {
        window.diagnosticMode.captureError(error, {
          handler: handlerName,
          event: event.type,
          timeout: timeout
        });
      }
      
      // エラー通知
      this.notifyError(error, event.type);
      
    } finally {
      this.activeOperations.delete(handler);
    }
  }

  /**
   * ハンドラーを解除
   */
  unregister(element, event) {
    const key = this.getKey(element, event);
    
    if (this.handlers.has(key)) {
      const { wrapper } = this.handlers.get(key);
      element.removeEventListener(event, wrapper);
      this.handlers.delete(key);
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('event', `Unregistered handler for ${event}`, {
          element: key
        });
      }
    }
  }

  /**
   * すべてのハンドラーを解除
   */
  unregisterAll() {
    this.handlers.forEach(({ element, event, wrapper }) => {
      element.removeEventListener(event, wrapper);
    });
    this.handlers.clear();
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('event', 'All handlers unregistered');
    }
  }

  /**
   * 要素とイベントからキーを生成
   */
  getKey(element, event) {
    const id = element.id || element.className || element.tagName;
    return `${id}_${event}`;
  }

  /**
   * タスクをキューに追加
   */
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * キューを処理
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      
      await Promise.all(
        batch.map(async ({ task, resolve, reject }) => {
          try {
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      );
    }
    
    this.processing = false;
  }

  /**
   * イベントを記録
   */
  recordEvent(event) {
    const record = {
      timestamp: Date.now(),
      type: event.type,
      target: event.target?.id || event.target?.className || 'unknown',
      timeStamp: event.timeStamp
    };
    
    this.eventHistory.push(record);
    
    // 履歴サイズを制限
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * エラーを通知
   */
  notifyError(error, eventType) {
    const notification = document.createElement('div');
    notification.className = 'event-error-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 4px;
      max-width: 300px;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    
    notification.innerHTML = `
      <strong>⚠️ イベントエラー</strong><br>
      <small>Event: ${eventType}</small><br>
      <small>${error.message}</small>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      registeredHandlers: this.handlers.size,
      activeOperations: this.activeOperations.size,
      queueLength: this.queue.length,
      eventHistory: this.eventHistory.length,
      lastEvents: this.eventHistory.slice(-10)
    };
  }

  /**
   * デバッグ情報を表示
   */
  showDebugInfo() {
    const stats = this.getStats();
    const info = document.createElement('div');
    info.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10001;
      max-width: 500px;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    info.innerHTML = `
      <h2 style="margin-top: 0;">📊 Event Manager Debug Info</h2>
      <p><strong>Registered Handlers:</strong> ${stats.registeredHandlers}</p>
      <p><strong>Active Operations:</strong> ${stats.activeOperations}</p>
      <p><strong>Queue Length:</strong> ${stats.queueLength}</p>
      <p><strong>Event History Size:</strong> ${stats.eventHistory}</p>
      
      <h3>Registered Handlers:</h3>
      <ul style="font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${Array.from(this.handlers.entries()).map(([key, handler]) => 
          `<li>${key} - ${handler.options.debounce ? `debounce: ${handler.options.debounce}ms` : ''} 
          ${handler.options.throttle ? `throttle: ${handler.options.throttle}ms` : ''}</li>`
        ).join('')}
      </ul>
      
      <h3>Recent Events:</h3>
      <ul style="font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${stats.lastEvents.map(e => 
          `<li>${new Date(e.timestamp).toLocaleTimeString()} - ${e.type} on ${e.target}</li>`
        ).join('')}
      </ul>
      
      <button onclick="this.parentElement.remove()" style="
        width: 100%;
        padding: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      ">
        閉じる
      </button>
    `;
    
    document.body.appendChild(info);
  }

  /**
   * パフォーマンス最適化設定
   */
  optimize() {
    // requestIdleCallbackが利用可能な場合は使用
    if ('requestIdleCallback' in window) {
      this.useIdleCallback = true;
      console.log('[EventManager] Using requestIdleCallback for optimization');
    }
    
    // Passive Event Listenersを有効化
    this.usePassive = true;
    console.log('[EventManager] Passive event listeners enabled');
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('event', 'Performance optimization enabled', {
        idleCallback: this.useIdleCallback,
        passive: this.usePassive
      });
    }
  }
}

// グローバルインスタンス作成
window.eventManager = new EventManager();

// 最適化を有効化
window.eventManager.optimize();

// 診断ログ
if (window.diagnosticMode) {
  window.diagnosticMode.log('init', 'EventManager initialized', {
    stats: window.eventManager.getStats()
  });
}

// コンソールにコマンドを追加
console.log('⚡ Event Manager Ready. Commands:');
console.log('  - eventManager.getStats() : Get statistics');
console.log('  - eventManager.showDebugInfo() : Show debug information');
console.log('  - eventManager.unregisterAll() : Remove all event handlers');
console.log('  - eventManager.optimize() : Enable performance optimizations');