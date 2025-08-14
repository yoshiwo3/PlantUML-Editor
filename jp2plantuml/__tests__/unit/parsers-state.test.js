/**
 * 単体テスト: ステート図パーサー
 * jp2plantuml/src/parsers/state.js のテスト
 */

const { parseState } = require('../../src/parsers/state');

describe('parseState', () => {
  describe('セミ構造化データのパース', () => {
    test('基本的な状態定義を解析する', () => {
      const input = `状態: 初期
状態: 処理中
状態: 完了
状態: エラー`;
      
      const result = parseState(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('state 初期');
      expect(result).toContain('state 処理中');
      expect(result).toContain('state 完了');
      expect(result).toContain('state エラー');
    });

    test('状態遷移を解析する', () => {
      const input = `状態: 待機
状態: 実行中
遷移: 待機 -> 実行中 : 開始
遷移: 実行中 -> 完了 : 終了`;
      
      const result = parseState(input);
      
      expect(result).toContain('state 待機');
      expect(result).toContain('state 実行中');
      expect(result).toContain('state 完了');
      expect(result).toContain('待機 --> 実行中 : 開始');
      expect(result).toContain('実行中 --> 完了 : 終了');
    });

    test('ラベルなしの遷移を解析する', () => {
      const input = `遷移: 初期 -> 実行中
遷移: 実行中 -> 終了`;
      
      const result = parseState(input);
      
      expect(result).toContain('初期 --> 実行中 :');
      expect(result).toContain('実行中 --> 終了 :');
    });

    test('複雑な状態遷移システムを解析する', () => {
      const input = `状態: ログイン画面
状態: 認証中
状態: メイン画面
状態: エラー画面
遷移: ログイン画面 -> 認証中 : ログイン要求
遷移: 認証中 -> メイン画面 : 認証成功
遷移: 認証中 -> エラー画面 : 認証失敗
遷移: エラー画面 -> ログイン画面 : 再試行`;
      
      const result = parseState(input);
      
      expect(result).toContain('state ログイン画面');
      expect(result).toContain('state 認証中');
      expect(result).toContain('state メイン画面');
      expect(result).toContain('state エラー画面');
      expect(result).toContain('ログイン画面 --> 認証中 : ログイン要求');
      expect(result).toContain('認証中 --> メイン画面 : 認証成功');
      expect(result).toContain('認証中 --> エラー画面 : 認証失敗');
      expect(result).toContain('エラー画面 --> ログイン画面 : 再試行');
    });
  });

  describe('フリーフォーム自然言語のパース', () => {
    test('自然な日本語から状態遷移を抽出する', () => {
      const input = `待機から実行中へ遷移(開始イベント)
実行中から完了へ遷移(正常終了)
実行中からエラーへ遷移(異常終了)`;
      
      const result = parseState(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('state 待機');
      expect(result).toContain('state 実行中');
      expect(result).toContain('state 完了');
      expect(result).toContain('state エラー');
      expect(result).toContain('待機 --> 実行中 : 開始イベント');
      expect(result).toContain('実行中 --> 完了 : 正常終了');
      expect(result).toContain('実行中 --> エラー : 異常終了');
    });

    test('理由なしの遷移を解析する', () => {
      const input = `初期から処理中へ遷移
処理中から終了へ遷移`;
      
      const result = parseState(input);
      
      expect(result).toContain('初期 --> 処理中 :');
      expect(result).toContain('処理中 --> 終了 :');
    });

    test('「へ」なしの遷移パターンを解析する', () => {
      const input = `初期から実行中へ
実行中から完了`;
      
      const result = parseState(input);
      
      expect(result).toContain('state 初期');
      expect(result).toContain('state 実行中');
      expect(result).toContain('state 完了');
      expect(result).toContain('初期 --> 実行中 :');
      expect(result).toContain('実行中 --> 完了 :');
    });

    test('様々な遷移理由パターンを解析する', () => {
      const input = `起動から待機へ遷移(初期化完了)
待機から処理へ遷移(要求受信)
処理から待機へ遷移(処理完了)`;
      
      const result = parseState(input);
      
      expect(result).toContain('起動 --> 待機 : 初期化完了');
      expect(result).toContain('待機 --> 処理 : 要求受信');
      expect(result).toContain('処理 --> 待機 : 処理完了');
    });
  });

  describe('モード指定テスト', () => {
    test('semi モードを強制指定できる', () => {
      const input = `状態: テスト状態
遷移: テスト状態 -> 完了 : テスト完了`;
      
      const result = parseState(input, 'semi');
      
      expect(result).toContain('state テスト状態');
      expect(result).toContain('テスト状態 --> 完了 : テスト完了');
    });

    test('auto モードでセミ構造化を自動検出する', () => {
      const input = `状態: 自動検出
遷移: 自動検出 -> 次の状態`;
      
      const result = parseState(input, 'auto');
      
      expect(result).toContain('state 自動検出');
    });

    test('auto モードでフリーフォームを選択する', () => {
      const input = `開始から終了へ遷移`;
      
      const result = parseState(input, 'auto');
      
      expect(result).toContain('開始 --> 終了');
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseState('');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });

    test('無効なフォーマットでも基本構造を保持する', () => {
      const input = `無効な状態定義
関係のない文章`;
      
      const result = parseState(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });

    test('不正な遷移構文を適切に処理する', () => {
      const input = `遷移: 不正な構文`;
      
      const result = parseState(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });
  });

  describe('複雑なシナリオテスト', () => {
    test('Webアプリケーションの状態遷移を処理する', () => {
      const input = `状態: 未認証
状態: 認証済み
状態: セッション切れ
状態: ログアウト済み
遷移: 未認証 -> 認証済み : ログイン成功
遷移: 認証済み -> セッション切れ : タイムアウト
遷移: セッション切れ -> 未認証 : セッション更新失敗
遷移: 認証済み -> ログアウト済み : ログアウト
遷移: ログアウト済み -> 未認証 : 画面更新`;
      
      const result = parseState(input);
      
      expect(result).toContain('state 未認証');
      expect(result).toContain('state 認証済み');
      expect(result).toContain('state セッション切れ');
      expect(result).toContain('state ログアウト済み');
      expect(result).toContain('未認証 --> 認証済み : ログイン成功');
      expect(result).toContain('認証済み --> セッション切れ : タイムアウト');
      expect(result).toContain('セッション切れ --> 未認証 : セッション更新失敗');
    });

    test('自然言語による複雑な状態遷移を処理する', () => {
      const input = `システム起動から初期化へ遷移(設定読み込み)
初期化から待機へ遷移(初期化完了)
待機から実行へ遷移(タスク受信)
実行から待機へ遷移(タスク完了)
実行からエラーへ遷移(処理失敗)
エラーから待機へ遷移(エラー回復)`;
      
      const result = parseState(input);
      
      expect(result).toContain('システム起動 --> 初期化 : 設定読み込み');
      expect(result).toContain('初期化 --> 待機 : 初期化完了');
      expect(result).toContain('待機 --> 実行 : タスク受信');
      expect(result).toContain('実行 --> 待機 : タスク完了');
      expect(result).toContain('実行 --> エラー : 処理失敗');
      expect(result).toContain('エラー --> 待機 : エラー回復');
    });
  });

  describe('PlantUML出力形式テスト', () => {
    test('正しいPlantUML構文を生成する', () => {
      const input = `状態: テスト状態`;
      
      const result = parseState(input);
      
      const lines = result.split('\n');
      expect(lines[0]).toBe('@startuml');
      expect(lines[lines.length - 1]).toBe('@enduml');
    });

    test('状態の正しい構文形式', () => {
      const input = `状態: 初期状態`;
      
      const result = parseState(input);
      
      expect(result).toContain('state 初期状態');
    });

    test('遷移の正しい構文形式', () => {
      const input = `遷移: StateA -> StateB : transition`;
      
      const result = parseState(input);
      
      expect(result).toContain('StateA --> StateB : transition');
    });
  });

  describe('重複状態の処理', () => {
    test('重複する状態定義を適切に処理する', () => {
      const input = `状態: 共通状態
遷移: 共通状態 -> 次の状態
遷移: 別の状態 -> 共通状態`;
      
      const result = parseState(input);
      
      // 共通状態が一度だけ定義されることを確認
      const stateDefinitions = result.split('\n').filter(line => line === 'state 共通状態');
      expect(stateDefinitions.length).toBe(1);
    });
  });
});