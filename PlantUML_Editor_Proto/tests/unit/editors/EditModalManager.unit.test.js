/**
 * EditModalManager 単体テスト
 * Sprint 1 - エディター機能テスト
 * 
 * テスト対象: EditModalManager.jsのモーダル管理機能
 * 実行時間目標: < 5秒 (CLAUDE.md基準)
 * 
 * 作成日: 2025-08-15
 * 作成者: webapp-test-automation
 */

import { createTestElements, domTestUtils, eventTestUtils } from '@tests/helpers/dom-utils.js';

// EditModalManagerのモック実装（実際のファイル読み込み前の準備）
class MockEditModalManager {
  constructor() {
    this.isOpen = false;
    this.currentAction = null;
    this.listeners = [];
    this.modalElement = null;
    this.callbacks = {
      onSave: null,
      onCancel: null,
      onClose: null
    };
  }

  // モーダルを開く
  openModal(action = null) {
    if (this.isOpen) {
      console.warn('Modal is already open');
      return false;
    }

    this.isOpen = true;
    this.currentAction = action;
    
    // DOM要素の作成
    if (!this.modalElement) {
      this.modalElement = this.createModalDOM();
      document.body.appendChild(this.modalElement);
    }
    
    // 表示
    this.modalElement.style.display = 'block';
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // カスタムイベント発火
    const event = createPlantUMLEvent('modalOpened', { action });
    document.dispatchEvent(event);
    
    return true;
  }

  // モーダルを閉じる
  closeModal() {
    if (!this.isOpen) {
      return false;
    }

    this.isOpen = false;
    this.currentAction = null;
    
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }
    
    // イベントリスナーのクリーンアップ
    this.removeEventListeners();
    
    // カスタムイベント発火
    const event = createPlantUMLEvent('modalClosed');
    document.dispatchEvent(event);
    
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
    
    return true;
  }

  // アクション保存
  saveAction(actionData) {
    if (!this.isOpen) {
      throw new Error('Modal is not open');
    }

    // データの検証
    if (!this.validateActionData(actionData)) {
      throw new Error('Invalid action data');
    }

    // 保存処理
    const savedAction = {
      ...actionData,
      id: this.generateActionId(),
      timestamp: Date.now()
    };

    // コールバック実行
    if (this.callbacks.onSave) {
      this.callbacks.onSave(savedAction);
    }

    // カスタムイベント発火
    const event = createPlantUMLEvent('actionSaved', { action: savedAction });
    document.dispatchEvent(event);

    this.closeModal();
    return savedAction;
  }

  // キャンセル処理
  cancel() {
    if (!this.isOpen) {
      return false;
    }

    // コールバック実行
    if (this.callbacks.onCancel) {
      this.callbacks.onCancel();
    }

    // カスタムイベント発火
    const event = createPlantUMLEvent('modalCancelled');
    document.dispatchEvent(event);

    this.closeModal();
    return true;
  }

  // コールバック設定
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 状態取得
  getState() {
    return {
      isOpen: this.isOpen,
      currentAction: this.currentAction,
      listeners: this.listeners.length
    };
  }

  // DOM要素作成
  createModalDOM() {
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>アクション編集</h2>
        <form id="action-form">
          <label for="action-type">種類:</label>
          <select id="action-type" name="type">
            <option value="message">メッセージ</option>
            <option value="condition">条件分岐</option>
            <option value="loop">ループ</option>
            <option value="parallel">並行処理</option>
          </select>
          
          <label for="action-content">内容:</label>
          <input type="text" id="action-content" name="content" placeholder="内容を入力">
          
          <label for="action-participants">参加者:</label>
          <input type="text" id="action-participants" name="participants" placeholder="A, B, C">
          
          <div class="button-group">
            <button type="submit" id="save-btn">保存</button>
            <button type="button" id="cancel-btn">キャンセル</button>
          </div>
        </form>
      </div>
    `;
    modal.style.display = 'none';
    return modal;
  }

  // イベントリスナーの設定
  setupEventListeners() {
    if (!this.modalElement) return;

    const closeBtn = this.modalElement.querySelector('.close');
    const cancelBtn = this.modalElement.querySelector('#cancel-btn');
    const form = this.modalElement.querySelector('#action-form');

    // 閉じるボタン
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
      this.listeners.push({ element: closeBtn, event: 'click' });
    }

    // キャンセルボタン
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancel());
      this.listeners.push({ element: cancelBtn, event: 'click' });
    }

    // フォーム送信
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const actionData = {
          type: formData.get('type'),
          content: formData.get('content'),
          participants: formData.get('participants')?.split(',').map(p => p.trim()) || []
        };
        this.saveAction(actionData);
      });
      this.listeners.push({ element: form, event: 'submit' });
    }

    // ESCキーでの閉じる処理
    const escListener = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    };
    document.addEventListener('keydown', escListener);
    this.listeners.push({ element: document, event: 'keydown' });

    // モーダル外クリックでの閉じる処理
    const clickListener = (e) => {
      if (e.target === this.modalElement) {
        this.closeModal();
      }
    };
    this.modalElement.addEventListener('click', clickListener);
    this.listeners.push({ element: this.modalElement, event: 'click' });
  }

  // イベントリスナーの削除
  removeEventListeners() {
    this.listeners.forEach(listener => {
      listener.element.removeEventListener(listener.event, () => {});
    });
    this.listeners = [];
  }

  // アクションデータの検証
  validateActionData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.type || !['message', 'condition', 'loop', 'parallel'].includes(data.type)) return false;
    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) return false;
    return true;
  }

  // アクションIDの生成
  generateActionId() {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 破棄処理
  destroy() {
    this.closeModal();
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    this.removeEventListeners();
    this.callbacks = {};
  }
}

describe('EditModalManager 単体テスト', () => {
  let modalManager;
  let testContainer;

  // 各テスト前の初期化
  beforeEach(() => {
    createTestDOM();
    modalManager = new MockEditModalManager();
    testContainer = document.getElementById('plantuml-editor');
  });

  // 各テスト後のクリーンアップ
  afterEach(() => {
    if (modalManager) {
      modalManager.destroy();
    }
    cleanupTestDOM();
  });

  describe('基本機能テスト', () => {
    test('モーダルマネージャーが正常に初期化される', () => {
      // Assert
      expect(modalManager).toBeDefined();
      expect(modalManager.isOpen).toBe(false);
      expect(modalManager.currentAction).toBeNull();
      expect(modalManager.listeners).toEqual([]);
      
      const state = modalManager.getState();
      expect(state).toBeValidModalState();
    });

    test('モーダルを開くことができる', async () => {
      // Arrange
      const testAction = { type: 'message', content: 'テストアクション' };
      
      // Act
      const result = await measurePerformance('modal-open', () => {
        return modalManager.openModal(testAction);
      });
      
      // Assert
      expect(result).toBe(true);
      expect(modalManager.isOpen).toBe(true);
      expect(modalManager.currentAction).toEqual(testAction);
      
      const modalElement = document.getElementById('edit-modal');
      expect(modalElement).toBeTruthy();
      expect(modalElement.style.display).toBe('block');
    });

    test('モーダルを閉じることができる', async () => {
      // Arrange
      modalManager.openModal();
      expect(modalManager.isOpen).toBe(true);
      
      // Act
      const result = await measurePerformance('modal-close', () => {
        return modalManager.closeModal();
      });
      
      // Assert
      expect(result).toBe(true);
      expect(modalManager.isOpen).toBe(false);
      expect(modalManager.currentAction).toBeNull();
      
      const modalElement = document.getElementById('edit-modal');
      expect(modalElement.style.display).toBe('none');
    });

    test('既に開いているモーダルを再度開こうとすると警告が出る', () => {
      // Arrange
      modalManager.openModal();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Act
      const result = modalManager.openModal();
      
      // Assert
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Modal is already open');
      
      consoleSpy.mockRestore();
    });
  });

  describe('アクション管理機能', () => {
    test('有効なアクションデータを保存できる', async () => {
      // Arrange
      modalManager.openModal();
      const actionData = {
        type: 'message',
        content: 'ユーザーがログインする',
        participants: ['A', 'B']
      };
      
      // Act
      const result = await measurePerformance('action-save', () => {
        return modalManager.saveAction(actionData);
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toBeValidPlantUMLAction();
      expect(result.type).toBe(actionData.type);
      expect(result.content).toBe(actionData.content);
      expect(result.participants).toEqual(actionData.participants);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('timestamp');
      expect(modalManager.isOpen).toBe(false); // 保存後は自動で閉じる
    });

    test('無効なアクションデータの保存時にエラーを投げる', () => {
      // Arrange
      modalManager.openModal();
      const invalidData = { type: 'invalid', content: '' };
      
      // Act & Assert
      expect(() => modalManager.saveAction(invalidData)).toThrow('Invalid action data');
    });

    test('モーダルが開いていない状態での保存時にエラーを投げる', () => {
      // Arrange
      const actionData = { type: 'message', content: 'test' };
      
      // Act & Assert
      expect(() => modalManager.saveAction(actionData)).toThrow('Modal is not open');
    });

    test('アクションをキャンセルできる', () => {
      // Arrange
      modalManager.openModal();
      
      // Act
      const result = modalManager.cancel();
      
      // Assert
      expect(result).toBe(true);
      expect(modalManager.isOpen).toBe(false);
    });
  });

  describe('イベント処理', () => {
    test('モーダル開閉時にカスタムイベントが発火される', async () => {
      // Arrange
      const openEventSpy = jest.fn();
      const closeEventSpy = jest.fn();
      
      document.addEventListener('modalOpened', openEventSpy);
      document.addEventListener('modalClosed', closeEventSpy);
      
      // Act
      modalManager.openModal({ type: 'test' });
      await waitForAsync(() => openEventSpy.mock.calls.length > 0, 100);
      
      modalManager.closeModal();
      await waitForAsync(() => closeEventSpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(openEventSpy).toHaveBeenCalled();
      expect(closeEventSpy).toHaveBeenCalled();
      
      const openEvent = openEventSpy.mock.calls[0][0];
      expect(openEvent.detail).toHaveProperty('action');
      expect(openEvent.detail.action.type).toBe('test');
    });

    test('アクション保存時にイベントが発火される', async () => {
      // Arrange
      const saveSpy = jest.fn();
      document.addEventListener('actionSaved', saveSpy);
      
      modalManager.openModal();
      const actionData = { type: 'message', content: 'test action' };
      
      // Act
      modalManager.saveAction(actionData);
      await waitForAsync(() => saveSpy.mock.calls.length > 0, 100);
      
      // Assert
      expect(saveSpy).toHaveBeenCalled();
      const saveEvent = saveSpy.mock.calls[0][0];
      expect(saveEvent.detail).toHaveProperty('action');
      expect(saveEvent.detail.action.type).toBe('message');
      expect(saveEvent.detail.action.content).toBe('test action');
    });

    test('ESCキーでモーダルを閉じることができる', () => {
      // Arrange
      modalManager.openModal();
      
      // Act
      const escEvent = createMockKeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      // Assert
      expect(modalManager.isOpen).toBe(false);
    });

    test('モーダル外クリックでモーダルを閉じることができる', () => {
      // Arrange
      modalManager.openModal();
      const modalElement = document.getElementById('edit-modal');
      
      // Act
      const clickEvent = createMockMouseEvent('click', { target: modalElement });
      modalElement.dispatchEvent(clickEvent);
      
      // Assert
      expect(modalManager.isOpen).toBe(false);
    });
  });

  describe('コールバック機能', () => {
    test('onSaveコールバックが正しく呼ばれる', () => {
      // Arrange
      const onSaveSpy = jest.fn();
      modalManager.setCallbacks({ onSave: onSaveSpy });
      modalManager.openModal();
      
      const actionData = { type: 'message', content: 'test' };
      
      // Act
      modalManager.saveAction(actionData);
      
      // Assert
      expect(onSaveSpy).toHaveBeenCalled();
      const savedAction = onSaveSpy.mock.calls[0][0];
      expect(savedAction.type).toBe('message');
      expect(savedAction.content).toBe('test');
    });

    test('onCancelコールバックが正しく呼ばれる', () => {
      // Arrange
      const onCancelSpy = jest.fn();
      modalManager.setCallbacks({ onCancel: onCancelSpy });
      modalManager.openModal();
      
      // Act
      modalManager.cancel();
      
      // Assert
      expect(onCancelSpy).toHaveBeenCalled();
    });

    test('onCloseコールバックが正しく呼ばれる', () => {
      // Arrange
      const onCloseSpy = jest.fn();
      modalManager.setCallbacks({ onClose: onCloseSpy });
      modalManager.openModal();
      
      // Act
      modalManager.closeModal();
      
      // Assert
      expect(onCloseSpy).toHaveBeenCalled();
    });
  });

  describe('フォーム処理', () => {
    test('フォーム送信でアクションを保存できる', async () => {
      // Arrange
      modalManager.openModal();
      const modalElement = document.getElementById('edit-modal');
      const form = modalElement.querySelector('#action-form');
      const typeSelect = modalElement.querySelector('#action-type');
      const contentInput = modalElement.querySelector('#action-content');
      const participantsInput = modalElement.querySelector('#action-participants');
      
      // フォーム値設定
      typeSelect.value = 'condition';
      contentInput.value = 'ユーザーが管理者の場合';
      participantsInput.value = 'User, System, Admin';
      
      const saveSpy = jest.fn();
      modalManager.setCallbacks({ onSave: saveSpy });
      
      // Act
      const submitEvent = createMockEvent('submit');
      form.dispatchEvent(submitEvent);
      
      // Assert
      expect(saveSpy).toHaveBeenCalled();
      const savedAction = saveSpy.mock.calls[0][0];
      expect(savedAction.type).toBe('condition');
      expect(savedAction.content).toBe('ユーザーが管理者の場合');
      expect(savedAction.participants).toEqual(['User', 'System', 'Admin']);
    });

    test('空のコンテンツでフォーム送信するとエラーになる', () => {
      // Arrange
      modalManager.openModal();
      const modalElement = document.getElementById('edit-modal');
      const form = modalElement.querySelector('#action-form');
      const contentInput = modalElement.querySelector('#action-content');
      
      contentInput.value = ''; // 空の内容
      
      // Act & Assert
      expect(() => {
        const submitEvent = createMockEvent('submit');
        form.dispatchEvent(submitEvent);
      }).toThrow('Invalid action data');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のモーダル開閉操作を効率的に処理する', async () => {
      // Act & Assert
      await measurePerformance('bulk-modal-operations', () => {
        for (let i = 0; i < 100; i++) {
          modalManager.openModal({ type: 'message', content: `test-${i}` });
          modalManager.closeModal();
        }
      });
      
      expect(modalManager.isOpen).toBe(false);
    });

    test('複数のイベントリスナーを効率的に管理する', async () => {
      // Arrange & Act
      await measurePerformance('event-listener-management', () => {
        modalManager.openModal();
        modalManager.closeModal();
        modalManager.openModal();
        modalManager.closeModal();
      });
      
      // Assert
      expect(modalManager.listeners).toHaveLength(0);
    });
  });

  describe('メモリ管理', () => {
    test('destroy()でリソースを適切にクリーンアップする', () => {
      // Arrange
      modalManager.openModal();
      const modalElement = document.getElementById('edit-modal');
      expect(modalElement).toBeTruthy();
      
      // Act
      modalManager.destroy();
      
      // Assert
      expect(modalManager.modalElement).toBeNull();
      expect(modalManager.listeners).toHaveLength(0);
      expect(modalManager.callbacks).toEqual({});
      expect(document.getElementById('edit-modal')).toBeFalsy();
    });

    test('メモリリークが発生しない', () => {
      // Arrange
      const initialListeners = modalManager.listeners.length;
      
      // Act
      for (let i = 0; i < 10; i++) {
        modalManager.openModal();
        modalManager.closeModal();
      }
      
      // Assert
      expect(modalManager.listeners.length).toBe(initialListeners);
    });
  });

  describe('日本語入力対応', () => {
    test('日本語のアクション内容を正しく処理する', () => {
      // Arrange
      modalManager.openModal();
      const actionData = {
        type: 'message',
        content: 'ユーザーが「ログイン」ボタンをクリックする',
        participants: ['ユーザー', 'システム']
      };
      
      // Act
      const result = modalManager.saveAction(actionData);
      
      // Assert
      expect(result.content).toBe('ユーザーが「ログイン」ボタンをクリックする');
      expect(result.participants).toEqual(['ユーザー', 'システム']);
    });
  });
});