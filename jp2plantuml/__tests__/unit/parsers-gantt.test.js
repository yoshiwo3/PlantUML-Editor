/**
 * 単体テスト: ガント図パーサー
 * jp2plantuml/src/parsers/gantt.js のテスト
 */

const { parseGantt } = require('../../src/parsers/gantt');

describe('parseGantt', () => {
  describe('セミ構造化データのパース', () => {
    test('基本的なプロジェクト情報とタスクを解析する', () => {
      const input = `プロジェクト名: テストプロジェクト
開始日: 2025-08-13
タスク: 要件定義; 2025-08-13 〜 2025-08-20
タスク: 設計; 2025-08-21 〜 2025-08-31`;
      
      const result = parseGantt(input);
      
      expect(result).toHaveProperty('plantuml');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('meta');
      
      expect(result.plantuml).toContain('@startgantt');
      expect(result.plantuml).toContain('@endgantt');
      expect(result.plantuml).toContain('Project starts 2025-08-13');
      expect(result.plantuml).toContain('[要件定義]');
      expect(result.plantuml).toContain('[設計]');
      expect(result.plantuml).toContain('starts 2025-08-13 and lasts');
      expect(result.plantuml).toContain('starts 2025-08-21 and lasts');
    });

    test('担当者、進捗、依存関係を含む複雑なタスクを解析する', () => {
      const input = `プロジェクト名: 複雑プロジェクト
開始日: 2025-08-13
タスク: 基本設計; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 75%; 依存: -
タスク: 詳細設計; 2025-08-21 〜 2025-08-31; 担当: 佐藤; 進捗: 25%; 依存: 基本設計`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('T1 is 75% completed');
      expect(result.plantuml).toContain('T2 is 25% completed');
      expect(result.plantuml).toContain('note right of T1: 担当 田中');
      expect(result.plantuml).toContain('note right of T2: 担当 佐藤');
      expect(result.plantuml).toContain('T1 -> T2');
      
      expect(result.meta.project.tasks).toHaveLength(2);
      expect(result.meta.project.tasks[0]).toMatchObject({
        name: '基本設計',
        start: '2025-08-13',
        end: '2025-08-20',
        owner: '田中',
        progress: 75,
        dep: null
      });
      expect(result.meta.project.tasks[1]).toMatchObject({
        name: '詳細設計',
        start: '2025-08-21',
        end: '2025-08-31',
        owner: '佐藤',
        progress: 25,
        dep: '基本設計'
      });
    });

    test('部門セクションを含むタスクを解析する', () => {
      const input = `プロジェクト名: 部門別プロジェクト
開始日: 2025-08-13
部門: 開発部
タスク: コーディング; 2025-08-13 〜 2025-08-20
部門: テスト部
タスク: 単体テスト; 2025-08-21 〜 2025-08-25`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('-- 開発部 --');
      expect(result.plantuml).toContain('-- テスト部 --');
      expect(result.meta.project.tasks[0].dept).toBe('開発部');
      expect(result.meta.project.tasks[1].dept).toBe('テスト部');
    });
  });

  describe('日付解析テスト', () => {
    test('様々な日付フォーマットを正しく解析する', () => {
      const input = `タスク: テスト1; 2025/08/13 〜 2025-08-20
タスク: テスト2; 2025-8-13 〜 2025/8/20`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('starts 2025-08-13');
      expect(result.plantuml).toContain('starts 2025-08-13');
    });

    test('全角数字と区切り文字を半角に変換する', () => {
      const input = `タスク: 全角テスト; ２０２５－０８－１３ 〜 ２０２５／０８／２０`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('starts 2025-08-13');
    });

    test('無効な日付フォーマットで警告を出力する', () => {
      const input = `プロジェクト名: テスト
開始日: 無効な日付
タスク: テスト; 2025-08-13 〜 2025-08-20`;
      
      const result = parseGantt(input);
      
      expect(result.warnings).toContain('開始日の日付形式を解釈できませんでした');
    });
  });

  describe('互換性モードテスト', () => {
    test('legacy互換性モードで依存関係と進捗を無視する', () => {
      const input = `タスク: テスト; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 50%; 依存: -`;
      
      const result = parseGantt(input, 'auto', { compat: 'legacy' });
      
      expect(result.plantuml).not.toContain('is 50% completed');
      expect(result.plantuml).not.toContain('note right');
      expect(result.plantuml).not.toContain('->');
      expect(result.plantuml).toContain('[テスト] starts 2025-08-13 and lasts');
      
      expect(result.warnings).toContain('互換モードでは進捗表示を出力しません');
      expect(result.warnings).toContain('互換モードでは担当者ノートを出力しません');
    });

    test('latest互換性モードで全機能を有効にする', () => {
      const input = `タスク: テスト; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 50%`;
      
      const result = parseGantt(input, 'auto', { compat: 'latest' });
      
      expect(result.plantuml).toContain('T1 is 50% completed');
      expect(result.plantuml).toContain('note right of T1: 担当 田中');
      expect(result.plantuml).toContain('[テスト] as T1 starts');
    });
  });

  describe('フリーフォームパース', () => {
    test('構造化されていないテキストからタスクを抽出する', () => {
      const input = `開発作業 2025-08-13 から 2025-08-20 まで
テスト作業 2025/08/21-2025/08/25`;
      
      const result = parseGantt(input, 'auto');
      
      expect(result.plantuml).toContain('[開発作業');
      expect(result.plantuml).toContain('[テスト作業');
      expect(result.plantuml).toContain('starts 2025-08-13');
      expect(result.plantuml).toContain('starts 2025-08-21');
    });

    test('タスクが見つからない場合に警告を出力する', () => {
      const input = `これはタスクではありません`;
      
      const result = parseGantt(input);
      
      expect(result.warnings).toContain('タスク行を検出できませんでした');
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseGantt('');
      
      expect(result.plantuml).toContain('@startgantt');
      expect(result.plantuml).toContain('@endgantt');
      expect(result.warnings).toContain('タスク行を検出できませんでした');
    });

    test('プロジェクト名のみの入力を処理する', () => {
      const input = `プロジェクト名: テストプロジェクト`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('@startgantt');
      expect(result.plantuml).toContain('@endgantt');
      expect(result.meta.project.name).toBe('テストプロジェクト');
    });
  });

  describe('モード指定テスト', () => {
    test('semi モードを強制指定できる', () => {
      const input = `タスク: テスト; 2025-08-13 〜 2025-08-20`;
      
      const result = parseGantt(input, 'semi');
      
      expect(result.plantuml).toContain('[テスト]');
      expect(result.plantuml).toContain('starts 2025-08-13');
    });

    test('auto モードでタスク形式を自動検出する', () => {
      const input = `タスク: 自動検出; 2025-08-13 〜 2025-08-20`;
      
      const result = parseGantt(input, 'auto');
      
      expect(result.plantuml).toContain('[自動検出]');
    });
  });

  describe('日数計算テスト', () => {
    test('開始日から終了日までの日数を正しく計算する', () => {
      const input = `タスク: 7日間タスク; 2025-08-13 〜 2025-08-19`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('lasts 7 days');
    });

    test('同日の場合は1日として計算する', () => {
      const input = `タスク: 1日タスク; 2025-08-13 〜 2025-08-13`;
      
      const result = parseGantt(input);
      
      expect(result.plantuml).toContain('lasts 1 days');
    });
  });
});