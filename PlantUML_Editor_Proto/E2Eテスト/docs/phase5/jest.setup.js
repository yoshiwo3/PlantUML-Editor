/**
 * Jest Setup Configuration for Phase 5
 * 
 * Jest実行環境の設定とモック
 * 
 * @version 1.0.0
 * @date 2025-08-14
 */

// JSDOM環境のセットアップ
require('jsdom-global')();

// グローバルなテスト用の設定
global.console = {
    ...console,
    // テスト中のログ出力を制御
    log: jest.fn(),
    debug: jest.fn(),
    info: console.info,
    warn: console.warn,
    error: console.error,
};

// LocalStorageのモック
const localStorageMock = {
    data: {},
    getItem: jest.fn((key) => localStorageMock.data[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.data[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.data = {};
    }),
    get length() {
        return Object.keys(localStorageMock.data).length;
    },
    key: jest.fn((index) => {
        const keys = Object.keys(localStorageMock.data);
        return keys[index] || null;
    })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// グローバルなDOM要素のモック
document.body.innerHTML = `
    <div id="app">
        <div id="visual-editor">
            <div id="steps-container"></div>
            <button id="addFirstStepBtn">ステップを追加</button>
        </div>
        <div id="plantuml-output">
            <textarea id="plantumlCode" readonly></textarea>
        </div>
        <div id="modal-container"></div>
    </div>
`;

// EditModalManagerのモック（必要に応じて）
global.mockEditModalManager = {
    registerModal: jest.fn(),
    openModal: jest.fn(),
    closeModal: jest.fn(),
    saveWithTransaction: jest.fn()
};

// テスト実行前の共通処理
beforeEach(() => {
    // LocalStorageのクリア
    localStorageMock.clear();
    
    // DOMのリセット
    document.getElementById('modal-container').innerHTML = '';
    document.getElementById('steps-container').innerHTML = '';
    document.getElementById('plantumlCode').value = '';
    
    // モックのリセット
    jest.clearAllMocks();
});

// テスト実行後の共通処理
afterEach(() => {
    // 非同期処理の完了待ち
    return new Promise(resolve => setTimeout(resolve, 100));
});

// テスト用のユーティリティ関数
global.testUtils = {
    // DOM要素の存在確認
    elementExists: (selector) => {
        return document.querySelector(selector) !== null;
    },
    
    // イベントのシミュレート
    fireEvent: (element, eventType, eventInit = {}) => {
        const event = new Event(eventType, eventInit);
        element.dispatchEvent(event);
    },
    
    // 非同期処理の待機
    waitFor: (conditionFn, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkCondition = () => {
                if (conditionFn()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(checkCondition, 100);
                }
            };
            checkCondition();
        });
    }
};

console.log('Jest setup completed for Phase 5 tests');