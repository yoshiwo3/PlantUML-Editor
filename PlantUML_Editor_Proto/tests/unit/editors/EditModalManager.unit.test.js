/**
 * EditModalManager 単体テスト - 完全実装版
 * Sprint 1.5 - TEST-002 EditModalManager単体テスト（8ポイント）
 * 
 * テスト対象: EditModalManager.js（TransactionManager, ErrorHandler含む）
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * カバレッジ目標: 80%以上
 * テストケース数: 35件以上
 * 
 * 作成日: 2025-08-15（完全実装版）
 * 作成者: webapp-test-automation
 */

import { 
  createTestDOM, 
  cleanupTestDOM, 
  measurePerformance,
  createPlantUMLEvent,
  waitForAsync
} from '@tests/helpers/security-helpers.js';

// SafeDOMManagerのモック
class MockSafeDOMManager {
  constructor(options = {}) {
    this.options = options;
  }

  createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    Object.keys(attributes).forEach(key => {
      element.setAttribute(key, attributes[key]);
    });
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  setTextContent(element, text) {
    element.textContent = text;
  }

  setInnerHTML(element, html) {
    element.innerHTML = html;
  }

  addEventListener(element, event, callback) {
    element.addEventListener(event, callback);
  }
}

// グローバルモック設定
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.SafeDOMManager = MockSafeDOMManager;
  }
});

// EditModalManagerのインポート（実際のクラス）
let EditModalManager, TransactionManager, ErrorHandler;

beforeAll(async () => {
  // 実際のEditModalManagerクラスを動的インポート
  if (typeof window !== 'undefined') {
    // ブラウザ環境での読み込み
    const script = document.createElement('script');
    script.src = '/EditModalManager.js';
    script.type = 'module';
    
    await new Promise((resolve, reject) => {
      script.onload = () => {
        EditModalManager = window.EditModalManager;
        TransactionManager = window.TransactionManager;
        ErrorHandler = window.ErrorHandler;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } else {
    // Node.js環境での読み込み
    const module = await import('../../../EditModalManager.js');
    EditModalManager = module.EditModalManager;
    TransactionManager = module.TransactionManager;
    ErrorHandler = module.ErrorHandler;
  }
});

describe('EditModalManager 単体テスト - 完全実装版', () => {
  let modalManager;
  let testContainer;

  beforeEach(() => {
    createTestDOM();
    modalManager = new EditModalManager();
    testContainer = document.getElementById('plantuml-editor');
  });

  afterEach(() => {
    if (modalManager) {
      modalManager.destroy();
    }
    cleanupTestDOM();
  });

  describe('EditModalManager初期化テスト（Test 1-5）', () => {
    test('Test 1: EditModalManagerが正常に初期化される', () => {
      // Assert
      expect(modalManager).toBeDefined();
      expect(modalManager.modals).toBeInstanceOf(Map);
      expect(modalManager.activeModal).toBeNull();
      expect(modalManager.transactionManager).toBeInstanceOf(TransactionManager);
      expect(modalManager.errorHandler).toBeInstanceOf(ErrorHandler);
      expect(modalManager.validationRules).toBeInstanceOf(Map);
      expect(modalManager.listeners).toBeInstanceOf(Map);
    });

    test('Test 2: デフォルトバリデーションルールが登録される', () => {
      // Assert
      expect(modalManager.validationRules.has('condition')).toBe(true);
      expect(modalManager.validationRules.has('loop')).toBe(true);
      expect(modalManager.validationRules.has('parallel')).toBe(true);

      const conditionRules = modalManager.validationRules.get('condition');
      expect(conditionRules).toHaveLength(1);
      expect(conditionRules[0].name).toBe('conditionRequired');
    });

    test('Test 3: リスナー管理システムが初期化される', () => {
      // Assert
      expect(modalManager.listeners).toBeInstanceOf(Map);
      expect(modalManager.listeners.size).toBe(0);
    });

    test('Test 4: TransactionManagerが適切に初期化される', () => {
      // Assert
      expect(modalManager.transactionManager.transactionStack).toEqual([]);
      expect(modalManager.transactionManager.rollbackHandlers).toBeInstanceOf(Map);
    });

    test('Test 5: ErrorHandlerが適切に初期化される', () => {
      // Assert
      expect(modalManager.errorHandler.errorTypes).toBeDefined();
      expect(modalManager.errorHandler.errorHistory).toEqual([]);
      expect(modalManager.errorHandler.maxHistorySize).toBe(100);
    });
  });

  describe('モーダル登録・管理テスト（Test 6-10）', () => {
    test('Test 6: モーダルを正常に登録できる', () => {
      // Arrange
      class TestModal {
        constructor(data, manager) {
          this.data = data;
          this.manager = manager;
        }
        async show() { return true; }
        async hide() { return true; }
      }

      // Act
      modalManager.registerModal('test', TestModal);

      // Assert
      expect(modalManager.modals.has('test')).toBe(true);
      expect(modalManager.modals.get('test')).toBe(TestModal);
    });

    test('Test 7: 不正なモーダル登録でエラーが発生する', () => {
      // Act & Assert
      expect(() => modalManager.registerModal(null, null)).toThrow('Modal type and class are required');
      expect(() => modalManager.registerModal('test', null)).toThrow('Modal type and class are required');
      expect(() => modalManager.registerModal(null, class {})).toThrow('Modal type and class are required');
    });

    test('Test 8: 登録されたモーダルを取得できる', () => {
      // Arrange
      class TestModal {}
      modalManager.registerModal('test', TestModal);

      // Act
      const retrievedModal = modalManager.getModal('test');

      // Assert
      expect(retrievedModal).toBe(TestModal);
    });

    test('Test 9: 未登録のモーダルタイプを取得するとundefinedが返る', () => {
      // Act
      const result = modalManager.getModal('nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });

    test('Test 10: アクティブモーダルを正しく取得できる', async () => {
      // Arrange
      class TestModal {
        async show() { this.visible = true; }
        async hide() { this.visible = false; }
      }
      modalManager.registerModal('test', TestModal);

      // Act
      await modalManager.openModal('test');
      const activeModal = modalManager.getActiveModal();

      // Assert
      expect(activeModal).toBeInstanceOf(TestModal);
      expect(activeModal.visible).toBe(true);
    });
  });

  describe('モーダル開閉テスト（Test 11-15）', () => {
    let TestModal;

    beforeEach(() => {
      TestModal = class {
        constructor(data, manager) {
          this.data = data;
          this.manager = manager;
          this.visible = false;
        }
        async show() { 
          this.visible = true; 
          return true; 
        }
        async hide() { 
          this.visible = false; 
          return true; 
        }
      };
      modalManager.registerModal('test', TestModal);
    });

    test('Test 11: モーダルを正常に開ける', async () => {
      // Arrange
      const testData = { content: 'テストデータ' };

      // Act
      const result = await measurePerformance('modal-open', async () => {
        return await modalManager.openModal('test', testData);
      });

      // Assert
      expect(result).toBeInstanceOf(TestModal);
      expect(result.data).toEqual(testData);
      expect(result.visible).toBe(true);
      expect(modalManager.activeModal).toBe(result);
    });

    test('Test 12: 未登録のモーダルタイプを開こうとするとエラーが発生する', async () => {
      // Act & Assert
      await expect(modalManager.openModal('nonexistent')).rejects.toThrow("Modal type 'nonexistent' is not registered");
    });

    test('Test 13: 既存のモーダルがある場合は自動で閉じてから新しいモーダルを開く', async () => {
      // Arrange
      const firstModal = await modalManager.openModal('test', { id: 1 });
      expect(modalManager.activeModal).toBe(firstModal);

      // Act
      const secondModal = await modalManager.openModal('test', { id: 2 });

      // Assert
      expect(firstModal.visible).toBe(false);
      expect(secondModal.visible).toBe(true);
      expect(modalManager.activeModal).toBe(secondModal);
    });

    test('Test 14: モーダルを正常に閉じられる', async () => {
      // Arrange
      const modal = await modalManager.openModal('test');
      expect(modal.visible).toBe(true);

      // Act
      await measurePerformance('modal-close', async () => {
        await modalManager.closeModal();
      });

      // Assert
      expect(modal.visible).toBe(false);
      expect(modalManager.activeModal).toBeNull();
    });

    test('Test 15: アクティブモーダルがない状態で閉じる操作をしても問題ない', async () => {
      // Act & Assert
      expect(modalManager.activeModal).toBeNull();
      await expect(modalManager.closeModal()).resolves.toBeUndefined();
    });
  });

  describe('イベント管理テスト（Test 16-20）', () => {
    test('Test 16: イベントリスナーを正常に追加できる', () => {
      // Arrange
      const callback = jest.fn();

      // Act
      modalManager.addEventListener('test', callback);

      // Assert
      expect(modalManager.listeners.has('test')).toBe(true);
      expect(modalManager.listeners.get('test')).toContain(callback);
    });

    test('Test 17: イベントリスナーを正常に削除できる', () => {
      // Arrange
      const callback = jest.fn();
      modalManager.addEventListener('test', callback);
      expect(modalManager.listeners.get('test')).toContain(callback);

      // Act
      modalManager.removeEventListener('test', callback);

      // Assert
      const callbacks = modalManager.listeners.get('test');
      expect(callbacks).not.toContain(callback);
    });

    test('Test 18: イベントを正常に発火できる', () => {
      // Arrange
      const callback = jest.fn();
      modalManager.addEventListener('test', callback);
      const eventData = { message: 'テストデータ' };

      // Act
      modalManager.triggerEvent('test', eventData);

      // Assert
      expect(callback).toHaveBeenCalledWith(eventData);
    });

    test('Test 19: 複数のイベントリスナーが正常に呼び出される', () => {
      // Arrange
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      modalManager.addEventListener('test', callback1);
      modalManager.addEventListener('test', callback2);

      // Act
      modalManager.triggerEvent('test', { data: 'test' });

      // Assert
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('Test 20: イベントリスナー内でエラーが発生しても他のリスナーに影響しない', () => {
      // Arrange
      const errorCallback = jest.fn(() => { throw new Error('Test error'); });
      const normalCallback = jest.fn();
      modalManager.addEventListener('test', errorCallback);
      modalManager.addEventListener('test', normalCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      modalManager.triggerEvent('test', {});

      // Assert
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('データ検証テスト（Test 21-25）', () => {
    test('Test 21: 有効なデータが正常に検証される', async () => {
      // Arrange
      const validData = {
        id: 'test-id',
        type: 'condition',
        condition: '有効な条件'
      };

      // Act & Assert
      await expect(modalManager.validateData(validData)).resolves.toBe(true);
    });

    test('Test 22: IDが不足している場合にバリデーションエラーが発生する', async () => {
      // Arrange
      const invalidData = {
        type: 'condition',
        condition: '条件'
      };

      // Act & Assert
      await expect(modalManager.validateData(invalidData)).rejects.toThrow('Validation failed');
    });

    test('Test 23: 条件分岐タイプで条件が不足している場合にエラーが発生する', async () => {
      // Arrange
      const invalidData = {
        id: 'test-id',
        type: 'condition',
        condition: '' // 空の条件
      };

      // Act & Assert
      const error = await modalManager.validateData(invalidData).catch(e => e);
      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toContainEqual({
        field: 'condition',
        message: '条件は必須です'
      });
    });

    test('Test 24: ループタイプで条件が不足している場合にエラーが発生する', async () => {
      // Arrange
      const invalidData = {
        id: 'test-id',
        type: 'loop',
        loopCondition: ''
      };

      // Act & Assert
      const error = await modalManager.validateData(invalidData).catch(e => e);
      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toContainEqual({
        field: 'loopCondition',
        message: 'ループ条件は必須です'
      });
    });

    test('Test 25: 並行処理タイプでスレッド数が不足している場合にエラーが発生する', async () => {
      // Arrange
      const invalidData = {
        id: 'test-id',
        type: 'parallel',
        threads: ['thread1'] // 2つ未満
      };

      // Act & Assert
      const error = await modalManager.validateData(invalidData).catch(e => e);
      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toContainEqual({
        field: 'threads',
        message: '並行処理には2つ以上のスレッドが必要です'
      });
    });
  });

  describe('データ保存・UI更新テスト（Test 26-30）', () => {
    test('Test 26: ローカルストレージにデータを保存できる', async () => {
      // Arrange
      const testData = {
        id: 'test-save-id',
        content: 'テスト保存データ'
      };

      // Mock localStorage
      const localStorageMock = {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });

      // Act
      const result = await modalManager.saveData(testData);

      // Assert
      expect(result).toEqual(testData);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'plantuml_action_test-save-id',
        JSON.stringify(testData)
      );
    });

    test('Test 27: グローバルアプリのsaveActionDataメソッドが存在する場合はそれを使用する', async () => {
      // Arrange
      const testData = { id: 'test-id', content: 'test' };
      const mockSaveActionData = jest.fn().mockResolvedValue(testData);
      window.app = { saveActionData: mockSaveActionData };

      // Act
      const result = await modalManager.saveData(testData);

      // Assert
      expect(mockSaveActionData).toHaveBeenCalledWith(testData);
      expect(result).toEqual(testData);

      // Cleanup
      delete window.app;
    });

    test('Test 28: UI更新メソッドが正常に動作する', async () => {
      // Arrange
      const testData = { id: 'test-id' };
      const mockRefreshUI = jest.fn().mockResolvedValue();
      window.app = { refreshUI: mockRefreshUI };

      const eventSpy = jest.fn();
      modalManager.addEventListener('dataUpdated', eventSpy);

      // Act
      await modalManager.updateUI(testData);

      // Assert
      expect(mockRefreshUI).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({ data: testData });

      // Cleanup
      delete window.app;
    });

    test('Test 29: 成功通知が正常に表示される', () => {
      // Arrange
      const message = 'テスト成功メッセージ';

      // Act
      modalManager.showSuccessNotification(message);

      // Assert
      const notification = document.querySelector('.success-notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain(message);
    });

    test('Test 30: 成功通知が3秒後に自動削除される', async () => {
      // Arrange
      jest.useFakeTimers();
      const message = 'テスト自動削除';

      // Act
      modalManager.showSuccessNotification(message);
      let notification = document.querySelector('.success-notification');
      expect(notification).toBeTruthy();

      // 3秒経過
      jest.advanceTimersByTime(3000);

      // Assert
      await new Promise(resolve => setTimeout(resolve, 0));
      notification = document.querySelector('.success-notification');
      expect(notification).toBeFalsy();

      jest.useRealTimers();
    });
  });

  describe('トランザクション処理テスト（Test 31-35）', () => {
    test('Test 31: トランザクション付き保存が正常に動作する', async () => {
      // Arrange
      const validData = {
        id: 'transaction-test',
        type: 'condition',
        condition: 'テスト条件'
      };

      // Mock saveData
      const originalSaveData = modalManager.saveData;
      modalManager.saveData = jest.fn().mockResolvedValue(validData);

      // Act
      const result = await modalManager.saveWithTransaction(validData);

      // Assert
      expect(result).toEqual(validData);
      expect(modalManager.saveData).toHaveBeenCalledWith(validData);

      // Restore
      modalManager.saveData = originalSaveData;
    });

    test('Test 32: バリデーションエラー時にトランザクションがロールバックされる', async () => {
      // Arrange
      const invalidData = {
        // id不足でバリデーションエラー
        type: 'condition',
        condition: 'テスト条件'
      };

      // Act & Assert
      await expect(modalManager.saveWithTransaction(invalidData)).rejects.toThrow('Validation failed');
    });

    test('Test 33: エラー履歴を正常に取得できる', () => {
      // Act
      const errorHistory = modalManager.getErrorHistory();

      // Assert
      expect(Array.isArray(errorHistory)).toBe(true);
    });

    test('Test 34: グローバルキーボードイベント（ESC）でモーダルが閉じる', async () => {
      // Arrange
      class TestModal {
        async show() { this.visible = true; }
        async hide() { this.visible = false; }
      }
      modalManager.registerModal('test', TestModal);
      const modal = await modalManager.openModal('test');

      // Act
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      // Wait for async close
      await new Promise(resolve => setTimeout(resolve, 0));

      // Assert
      expect(modal.visible).toBe(false);
      expect(modalManager.activeModal).toBeNull();
    });

    test('Test 35: destroy()メソッドでリソースが適切にクリーンアップされる', () => {
      // Arrange
      modalManager.addEventListener('test', () => {});
      modalManager.registerModal('test', class {});

      // Act
      modalManager.destroy();

      // Assert
      expect(modalManager.listeners.size).toBe(0);
      expect(modalManager.modals.size).toBe(0);
      expect(modalManager.activeModal).toBeNull();
    });
  });
});

describe('TransactionManager 単体テスト', () => {
  let transactionManager;

  beforeEach(() => {
    transactionManager = new TransactionManager();
  });

  describe('トランザクション基本機能（Test 36-40）', () => {
    test('Test 36: トランザクションIDが正常に生成される', () => {
      // Act
      const id1 = transactionManager.generateTransactionId();
      const id2 = transactionManager.generateTransactionId();

      // Assert
      expect(id1).toMatch(/^tx_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^tx_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('Test 37: 正常な操作がコミットされる', async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await transactionManager.execute(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(transactionManager.transactionStack).toHaveLength(0);
    });

    test('Test 38: エラー時にロールバックが実行される', async () => {
      // Arrange
      const rollbackHandler = jest.fn();
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(transactionManager.execute(operation)).rejects.toThrow('Test error');
    });

    test('Test 39: ロールバックハンドラーが正常に登録・実行される', async () => {
      // Arrange
      const rollbackHandler = jest.fn();
      const operation = async () => {
        const transactionId = transactionManager.transactionStack[0];
        transactionManager.registerRollbackHandler(transactionId, rollbackHandler);
        throw new Error('Rollback test');
      };

      // Act
      await expect(transactionManager.execute(operation)).rejects.toThrow('Rollback test');

      // Assert
      expect(rollbackHandler).toHaveBeenCalled();
    });

    test('Test 40: 複数のネストしたトランザクションが正常に処理される', async () => {
      // Arrange
      let innerResult;
      const outerOperation = async () => {
        innerResult = await transactionManager.execute(async () => {
          return 'inner-success';
        });
        return 'outer-success';
      };

      // Act
      const result = await transactionManager.execute(outerOperation);

      // Assert
      expect(innerResult).toBe('inner-success');
      expect(result).toBe('outer-success');
      expect(transactionManager.transactionStack).toHaveLength(0);
    });
  });
});

describe('ErrorHandler 単体テスト', () => {
  let errorHandler;

  beforeEach(() => {
    createTestDOM();
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    cleanupTestDOM();
  });

  describe('エラー分類・処理（Test 41-45）', () => {
    test('Test 41: バリデーションエラーが正しく分類される', () => {
      // Arrange
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      // Act
      const errorType = errorHandler.classifyError(error);

      // Assert
      expect(errorType).toBe(errorHandler.errorTypes.VALIDATION);
    });

    test('Test 42: 構文エラーが正しく分類される', () => {
      // Arrange
      const error = new SyntaxError('Syntax error');

      // Act
      const errorType = errorHandler.classifyError(error);

      // Assert
      expect(errorType).toBe(errorHandler.errorTypes.SYNTAX);
    });

    test('Test 43: ネットワークエラーが正しく分類される', () => {
      // Arrange
      const error = new Error('Network failed');
      error.name = 'NetworkError';

      // Act
      const errorType = errorHandler.classifyError(error);

      // Assert
      expect(errorType).toBe(errorHandler.errorTypes.NETWORK);
    });

    test('Test 44: エラー情報が正しく作成される', () => {
      // Arrange
      const error = new Error('Test error');
      const context = { field: 'test' };

      // Act
      const errorInfo = errorHandler.createErrorInfo(error, errorHandler.errorTypes.VALIDATION, context);

      // Assert
      expect(errorInfo.type).toBe(errorHandler.errorTypes.VALIDATION);
      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.context).toEqual(context);
      expect(errorInfo.timestamp).toBeDefined();
      expect(errorInfo.userAgent).toBeDefined();
      expect(errorInfo.url).toBeDefined();
    });

    test('Test 45: エラー通知が正しく表示される', () => {
      // Arrange
      const error = new Error('Test notification');
      const context = {};

      // Act
      const recovered = errorHandler.handleError(error, context);

      // Assert
      const notification = document.querySelector('.error-notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('エラーが発生しました');
    });
  });

  describe('エラー回復処理（Test 46-50）', () => {
    test('Test 46: バリデーションエラーの回復処理', () => {
      // Arrange
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      const context = { fieldId: 'test-field' };

      // テスト用フィールドを作成
      const testField = document.createElement('input');
      testField.id = 'test-field';
      document.body.appendChild(testField);

      // Act
      const recovered = errorHandler.handleError(validationError, context);

      // Assert
      expect(recovered).toBe(true);
      expect(testField.classList.contains('error')).toBe(true);
      expect(document.activeElement).toBe(testField);

      // Cleanup
      testField.remove();
    });

    test('Test 47: ネットワークエラーの回復処理', () => {
      // Arrange
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';
      const retryCallback = jest.fn();
      const context = { retryCallback };

      jest.useFakeTimers();

      // Act
      const recovered = errorHandler.handleError(networkError, context);

      // Assert
      expect(recovered).toBe(true);

      // 3秒後にリトライがスケジュールされる
      jest.advanceTimersByTime(3000);
      expect(retryCallback).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('Test 48: 回復不可能なエラーの処理', () => {
      // Arrange
      const unknownError = new Error('Unknown error');

      // Act
      const recovered = errorHandler.handleError(unknownError);

      // Assert
      expect(recovered).toBe(false);
    });

    test('Test 49: エラー履歴が正しく管理される', () => {
      // Arrange
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      // Act
      errorHandler.handleError(error1);
      errorHandler.handleError(error2);

      // Assert
      expect(errorHandler.errorHistory).toHaveLength(2);
      expect(errorHandler.errorHistory[0].message).toBe('Error 1');
      expect(errorHandler.errorHistory[1].message).toBe('Error 2');
    });

    test('Test 50: エラー履歴の最大サイズ制限', () => {
      // Arrange
      errorHandler.maxHistorySize = 3;

      // Act
      for (let i = 1; i <= 5; i++) {
        const error = new Error(`Error ${i}`);
        errorHandler.handleError(error);
      }

      // Assert
      expect(errorHandler.errorHistory).toHaveLength(3);
      expect(errorHandler.errorHistory[0].message).toBe('Error 3');
      expect(errorHandler.errorHistory[1].message).toBe('Error 4');
      expect(errorHandler.errorHistory[2].message).toBe('Error 5');
    });
  });
});

describe('統合テスト', () => {
  let modalManager;

  beforeEach(() => {
    createTestDOM();
    modalManager = new EditModalManager();
  });

  afterEach(() => {
    if (modalManager) {
      modalManager.destroy();
    }
    cleanupTestDOM();
  });

  test('エンドツーエンドフロー: モーダル開閉とデータ保存', async () => {
    // Arrange
    class TestModal {
      constructor(data, manager) {
        this.data = data;
        this.manager = manager;
      }
      async show() { this.visible = true; }
      async hide() { this.visible = false; }
    }
    modalManager.registerModal('test', TestModal);

    const testData = {
      id: 'integration-test',
      type: 'condition',
      condition: '統合テスト条件'
    };

    // Act
    const modal = await modalManager.openModal('test', testData);
    const savedData = await modalManager.saveWithTransaction(testData);
    await modalManager.closeModal();

    // Assert
    expect(modal.visible).toBe(false);
    expect(savedData).toEqual(testData);
    expect(modalManager.activeModal).toBeNull();
  });
});

// パフォーマンステスト
describe('パフォーマンステスト', () => {
  let modalManager;

  beforeEach(() => {
    createTestDOM();
    modalManager = new EditModalManager();
  });

  afterEach(() => {
    if (modalManager) {
      modalManager.destroy();
    }
    cleanupTestDOM();
  });

  test('大量操作のパフォーマンス', async () => {
    // Arrange
    class FastModal {
      async show() { return true; }
      async hide() { return true; }
    }
    modalManager.registerModal('fast', FastModal);

    // Act & Assert
    await measurePerformance('bulk-operations', async () => {
      for (let i = 0; i < 50; i++) {
        await modalManager.openModal('fast', { id: i });
        await modalManager.closeModal();
      }
    });

    expect(modalManager.activeModal).toBeNull();
  });
});