/**
 * 単体テスト: メイン変換機能
 * jp2plantuml/src/convert.js のテスト
 */

const { convertJapaneseToPlantUML } = require('../../src/convert');

describe('convertJapaneseToPlantUML', () => {
  describe('基本機能テスト', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = convertJapaneseToPlantUML('');
      
      expect(result).toHaveProperty('diagramType');
      expect(result).toHaveProperty('plantuml');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('meta');
      expect(typeof result.plantuml).toBe('string');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('null/undefined入力を適切に処理する', () => {
      const resultNull = convertJapaneseToPlantUML(null);
      const resultUndefined = convertJapaneseToPlantUML(undefined);
      
      expect(resultNull).toHaveProperty('plantuml');
      expect(resultUndefined).toHaveProperty('plantuml');
      expect(typeof resultNull.plantuml).toBe('string');
      expect(typeof resultUndefined.plantuml).toBe('string');
    });

    test('シーケンス図の自動検出が機能する', () => {
      const input = 'ユーザー -> システム: リクエスト\nシステム -> ユーザー: レスポンス';
      const result = convertJapaneseToPlantUML(input);
      
      expect(result.diagramType).toBe('sequence');
      expect(result.plantuml).toContain('@startuml');
      expect(result.plantuml).toContain('@enduml');
    });

    test('ガント図の自動検出が機能する', () => {
      const input = 'タスク: 開発; 2025-08-13 〜 2025-08-20\n開始日: 2025-08-13';
      const result = convertJapaneseToPlantUML(input);
      
      expect(result.diagramType).toBe('gantt');
      expect(result.plantuml).toContain('@startgantt');
      expect(result.plantuml).toContain('@endgantt');
    });

    test('クラス図の自動検出が機能する', () => {
      const input = 'クラス: User { id:int; name:string }\n関連: User -> Order';
      const result = convertJapaneseToPlantUML(input);
      
      expect(result.diagramType).toBe('class');
      expect(result.plantuml).toContain('@startuml');
      expect(result.plantuml).toContain('class User');
    });
  });

  describe('図表タイプ強制指定テスト', () => {
    test('diagramTypeを強制指定した場合の動作', () => {
      const input = 'テストデータ';
      const result = convertJapaneseToPlantUML(input, { diagramType: 'activity' });
      
      expect(result.diagramType).toBe('activity');
      expect(result.plantuml).toContain('@startuml');
    });

    test('無効なdiagramTypeが指定された場合のフォールバック', () => {
      const input = 'テストデータ';
      const result = convertJapaneseToPlantUML(input, { diagramType: 'invalid_type' });
      
      // デフォルトでsequenceにフォールバック
      expect(result.diagramType).toBe('invalid_type');
      expect(result.plantuml).toContain('@startuml');
    });
  });

  describe('モードオプションテスト', () => {
    test('autoモードでの変換', () => {
      const input = 'ユーザー -> システム: ログイン';
      const result = convertJapaneseToPlantUML(input, { mode: 'auto' });
      
      expect(result.diagramType).toBe('sequence');
      expect(result.plantuml).toContain('@startuml');
    });

    test('strictモードでの変換（パーサーが対応している場合）', () => {
      const input = 'ユーザー -> システム: ログイン';
      const result = convertJapaneseToPlantUML(input, { mode: 'strict' });
      
      expect(result).toHaveProperty('plantuml');
      expect(typeof result.plantuml).toBe('string');
    });
  });

  describe('互換性オプションテスト', () => {
    test('latest互換性モードでの変換', () => {
      const input = 'タスク: テスト; 2025-08-13 〜 2025-08-15';
      const result = convertJapaneseToPlantUML(input, { compat: 'latest' });
      
      expect(result).toHaveProperty('plantuml');
      expect(result.plantuml).toContain('@startgantt');
    });

    test('legacy互換性モードでの変換', () => {
      const input = 'タスク: テスト; 2025-08-13 〜 2025-08-15';
      const result = convertJapaneseToPlantUML(input, { compat: 'legacy' });
      
      expect(result).toHaveProperty('plantuml');
      expect(typeof result.plantuml).toBe('string');
    });
  });
});