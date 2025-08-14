// Jest Setup File
// DOM環境のセットアップとグローバル設定

// TextEncoderとTextDecoderの設定（jsdom環境用）
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// LocalStorageのモック
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  
  getItem(key) {
    return this.store[key] || null;
  }
  
  setItem(key, value) {
    this.store[key] = value.toString();
  }
  
  removeItem(key) {
    delete this.store[key];
  }
  
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

// カスタムマッチャー
expect.extend({
  toBeValidAction(received) {
    const pass = received && 
                 received.type && 
                 received.content &&
                 ['message', 'condition', 'loop', 'parallel'].includes(received.type);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid action`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid action with type and content`,
        pass: false
      };
    }
  }
});

// グローバルモック
global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn();
global.prompt = jest.fn();

// コンソール警告の抑制（テスト時）
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});