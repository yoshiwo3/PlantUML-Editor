// Sample Jest Test for Environment Verification
describe('Jest Environment Test', () => {
  // 基本的な算術テスト
  test('basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(3 * 4).toBe(12);
  });
  
  // 配列操作テスト
  test('array operations', () => {
    const array = [1, 2, 3];
    expect(array).toHaveLength(3);
    expect(array).toContain(2);
    array.push(4);
    expect(array).toHaveLength(4);
  });
  
  // オブジェクト比較テスト
  test('object comparison', () => {
    const data = { name: 'PlantUML', type: 'Editor' };
    expect(data).toEqual({ name: 'PlantUML', type: 'Editor' });
    expect(data).toHaveProperty('name', 'PlantUML');
  });
  
  // 非同期処理テスト
  test('async operations', async () => {
    const fetchData = () => Promise.resolve('data');
    const data = await fetchData();
    expect(data).toBe('data');
  });
  
  // カスタムマッチャーテスト（jest.setup.jsで定義）
  test('custom matcher - toBeValidAction', () => {
    const validAction = {
      type: 'message',
      content: 'User → System: Login'
    };
    
    const invalidAction = {
      type: 'unknown',
      content: ''
    };
    
    expect(validAction).toBeValidAction();
    expect(invalidAction).not.toBeValidAction();
  });
});

// PlantUML Editor特有のテスト
describe('PlantUML Editor Specific Tests', () => {
  // アクション構造のテスト
  test('action structure validation', () => {
    const conditionAction = {
      type: 'condition',
      name: 'ログイン確認',
      trueBranch: [],
      falseBranch: []
    };
    
    expect(conditionAction.type).toBe('condition');
    expect(conditionAction).toHaveProperty('trueBranch');
    expect(conditionAction).toHaveProperty('falseBranch');
  });
  
  // モックLocalStorageテスト
  test('localStorage mock functionality', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    
    localStorage.removeItem('test');
    expect(localStorage.getItem('test')).toBeNull();
    
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    localStorage.clear();
    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('key2')).toBeNull();
  });
  
  // エラーハンドリングテスト
  test('error handling', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    
    expect(throwError).toThrow('Test error');
    expect(throwError).toThrow(Error);
  });
});