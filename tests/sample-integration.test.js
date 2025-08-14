/**
 * PlantUML Editor 統合テストサンプル
 * Jest/Playwright動作確認用
 */

describe('PlantUML Editor Integration Test Sample', () => {
  describe('基本的な数値計算テスト', () => {
    test('加算が正しく動作する', () => {
      expect(2 + 2).toBe(4);
    });

    test('配列操作が正しく動作する', () => {
      const arr = [1, 2, 3];
      arr.push(4);
      expect(arr).toHaveLength(4);
      expect(arr).toContain(4);
    });
  });

  describe('非同期処理テスト', () => {
    test('Promiseが正しく解決される', async () => {
      const promise = Promise.resolve('success');
      await expect(promise).resolves.toBe('success');
    });

    test('タイムアウト処理が動作する', async () => {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('モックテスト', () => {
    test('関数モックが動作する', () => {
      const mockFn = jest.fn();
      mockFn('test', 123);
      
      expect(mockFn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledWith('test', 123);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('モジュールモックが動作する', () => {
      const mockModule = {
        getData: jest.fn().mockReturnValue({ id: 1, name: 'test' })
      };
      
      const result = mockModule.getData();
      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('PlantUML特有のテスト', () => {
    test('PlantUML構文の基本検証', () => {
      const plantUML = `@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml`;
      
      expect(plantUML).toContain('@startuml');
      expect(plantUML).toContain('@enduml');
      expect(plantUML).toMatch(/Alice\s*->\s*Bob/);
    });

    test('アクター抽出の簡易テスト', () => {
      const text = 'ユーザーがシステムにログインする';
      const actors = text.match(/ユーザー|システム/g);
      
      expect(actors).toContain('ユーザー');
      expect(actors).toContain('システム');
    });
  });
});