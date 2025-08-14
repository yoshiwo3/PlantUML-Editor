/**
 * 単体テスト: アクティビティ図パーサー
 * jp2plantuml/src/parsers/activity.js のテスト
 */

const { parseActivity } = require('../../src/parsers/activity');

describe('parseActivity', () => {
  describe('セミ構造化データのパース', () => {
    test('基本的なアクティビティフローを解析する', () => {
      const input = `開始
アクティビティ: ユーザー認証
アクティビティ: データ取得
アクティビティ: 処理実行
終了`;
      
      const result = parseActivity(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
      expect(result).toContain(': ユーザー認証;');
      expect(result).toContain(': データ取得;');
      expect(result).toContain(': 処理実行;');
    });

    test('分岐を含むアクティビティフローを解析する', () => {
      const input = `開始
アクティビティ: ログイン試行
分岐: 認証成功 -> メイン画面 / 認証失敗 -> エラー画面
終了`;
      
      const result = parseActivity(input);
      
      expect(result).toContain('if (条件) then (yes)');
      expect(result).toContain(': 認証成功;');
      expect(result).toContain(': メイン画面;');
      expect(result).toContain(': 認証失敗;');
      expect(result).toContain(': エラー画面;');
      expect(result).toContain('endif');
    });

    test('分岐が一行として処理される場合のテスト', () => {
      const input = `分岐: 条件A -> 処理A / 条件B -> 処理B / 条件C -> 処理C`;
      
      const result = parseActivity(input);
      
      // 分岐が一行として処理される場合の実際の動作をテスト
      expect(result).toContain('@startuml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
      expect(result).toContain('@enduml');
    });

    test('開始と終了が明示的に指定されていない場合でも適切に処理する', () => {
      const input = `アクティビティ: データ処理
アクティビティ: 結果出力`;
      
      const result = parseActivity(input);
      
      expect(result).toContain('start');
      expect(result).toContain('stop');
      expect(result).toContain(': データ処理;');
      expect(result).toContain(': 結果出力;');
    });
  });

  describe('フリーフォームのパース', () => {
    test('自然な日本語からアクティビティを抽出する', () => {
      const input = `ユーザーが入力を行う
システムがデータを検証する
結果を表示する`;
      
      const result = parseActivity(input);
      
      expect(result).toContain(': ユーザーが入力を行う;');
      expect(result).toContain(': システムがデータを検証する;');
      expect(result).toContain(': 結果を表示する;');
    });

    test('開始と終了キーワードを含む文を適切に処理する', () => {
      const input = `処理を開始します
データ処理を実行
処理を終了します`;
      
      const result = parseActivity(input);
      
      // "開始"を含む行はスキップされる
      expect(result).not.toContain(': 処理を開始します;');
      expect(result).toContain(': データ処理を実行;');
      // "終了"を含む行でstopが追加される
      expect(result).toContain('stop');
    });

    test('空行を適切にスキップする', () => {
      const input = `処理1

処理2


処理3`;
      
      const result = parseActivity(input);
      
      expect(result).toContain(': 処理1;');
      expect(result).toContain(': 処理2;');
      expect(result).toContain(': 処理3;');
    });
  });

  describe('モード指定テスト', () => {
    test('semi モードを強制指定した場合の動作', () => {
      const input = `データ処理
結果表示`;
      
      const result = parseActivity(input, 'semi');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
      expect(result).toContain('@enduml');
    });

    test('auto モードでセミ構造化を自動検出する', () => {
      const input = `開始
アクティビティ: テスト処理
終了`;
      
      const result = parseActivity(input, 'auto');
      
      expect(result).toContain(': テスト処理;');
    });

    test('auto モードでフリーフォームを選択する', () => {
      const input = `一般的な処理内容
別の処理内容`;
      
      const result = parseActivity(input, 'auto');
      
      expect(result).toContain(': 一般的な処理内容;');
      expect(result).toContain(': 別の処理内容;');
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseActivity('');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
    });

    test('空行のみの入力を処理する', () => {
      const result = parseActivity('\n\n\n');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
    });

    test('不正な分岐フォーマットでも基本構造を保持する', () => {
      const input = `分岐: 不正なフォーマット`;
      
      const result = parseActivity(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('start');
      expect(result).toContain('stop');
    });
  });

  describe('複雑なシナリオテスト', () => {
    test('複雑な業務フローを解析する', () => {
      const input = `開始
アクティビティ: 申請書受理
アクティビティ: 内容確認
分岐: 承認 -> 承認処理 / 差戻し -> 差戻し処理 / 却下 -> 却下処理
アクティビティ: 結果通知
終了`;
      
      const result = parseActivity(input);
      
      expect(result).toContain(': 申請書受理;');
      expect(result).toContain(': 内容確認;');
      expect(result).toContain('if (条件) then (yes)');
      expect(result).toContain(': 承認;');
      expect(result).toContain(': 承認処理;');
      expect(result).toContain(': 差戻し;');
      expect(result).toContain(': 差戻し処理;');
      expect(result).toContain(': 却下;');
      expect(result).toContain(': 却下処理;');
      expect(result).toContain('endif');
      expect(result).toContain(': 結果通知;');
    });

    test('日本語の自然な業務記述を処理する', () => {
      const input = `利用者がシステムにログインする
システムが認証情報を確認する
認証に成功した場合はメイン画面を表示する
認証に失敗した場合はエラーメッセージを表示する`;
      
      const result = parseActivity(input);
      
      expect(result).toContain(': 利用者がシステムにログインする;');
      expect(result).toContain(': システムが認証情報を確認する;');
      expect(result).toContain(': 認証に成功した場合はメイン画面を表示する;');
      expect(result).toContain(': 認証に失敗した場合はエラーメッセージを表示する;');
    });
  });

  describe('PlantUML出力形式テスト', () => {
    test('正しいPlantUML構文を生成する', () => {
      const input = `アクティビティ: テスト`;
      
      const result = parseActivity(input);
      
      // PlantUML の基本構造をチェック
      const lines = result.split('\n');
      expect(lines[0]).toBe('@startuml');
      expect(lines[1]).toBe('start');
      expect(lines[lines.length - 1]).toBe('@enduml');
      expect(lines[lines.length - 2]).toBe('stop');
    });

    test('アクティビティの正しい構文形式', () => {
      const input = `アクティビティ: データ処理`;
      
      const result = parseActivity(input);
      
      expect(result).toContain(': データ処理;');
    });
  });
});