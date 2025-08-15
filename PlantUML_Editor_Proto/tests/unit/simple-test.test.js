/**
 * 単純なテスト - Jest環境確認用
 * Sprint 1 - テスト環境検証
 */

describe('Jest Environment Test', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('DOM environment is available', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  test('DOM manipulation works', () => {
    const testDiv = document.createElement('div');
    testDiv.id = 'test-element';
    testDiv.textContent = 'Test Content';
    
    document.body.appendChild(testDiv);
    
    const foundElement = document.getElementById('test-element');
    expect(foundElement).toBeDefined();
    expect(foundElement.textContent).toBe('Test Content');
    
    // クリーンアップ
    document.body.removeChild(testDiv);
  });

  test('Basic JavaScript functionality', () => {
    const testArray = [1, 2, 3];
    const doubled = testArray.map(x => x * 2);
    
    expect(doubled).toEqual([2, 4, 6]);
  });

  test('Promise handling works', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('async-result'), 10);
    });
    
    const result = await promise;
    expect(result).toBe('async-result');
  });
});