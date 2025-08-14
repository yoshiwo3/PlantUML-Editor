/**
 * 単体テスト: シーケンス図パーサー
 * jp2plantuml/src/parsers/sequence.js のテスト
 */

const { parseSequence } = require('../../src/parsers/sequence');

describe('parseSequence', () => {
  describe('セミ構造化データのパース', () => {
    test('参加者とメッセージを正しく解析する', () => {
      const input = `参加者: ユーザー, システム
メッセージ: ユーザー -> システム: ログイン要求
メッセージ: システム -> ユーザー: 認証結果`;
      
      const result = parseSequence(input, 'semi');
      
      expect(result).toHaveProperty('plantuml');
      expect(result.plantuml).toContain('@startuml');
      expect(result.plantuml).toContain('@enduml');
      expect(result.plantuml).toContain('participant ユーザー');
      expect(result.plantuml).toContain('participant システム');
      expect(result.plantuml).toContain('ユーザー -> システム:');
      expect(result.plantuml).toContain('システム -> ユーザー:');
    });

    test('矢印構文の直接記述を解析する', () => {
      const input = `ユーザー -> システム: データ送信
システム -> データベース: データ保存
データベース -> システム: 保存完了`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('ユーザー -> システム: データ送信');
      expect(result.plantuml).toContain('システム -> データベース: データ保存');
      expect(result.plantuml).toContain('participant ユーザー');
      expect(result.plantuml).toContain('participant システム');
      expect(result.plantuml).toContain('participant データベース');
    });

    test('逆方向の矢印（<--）を正しく処理する', () => {
      const input = `ユーザー <-- システム: エラーメッセージ`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('システム -> ユーザー: エラーメッセージ');
    });
  });

  describe('自然言語のパース', () => {
    test('送信・受信パターンを対応付ける', () => {
      const input = `メールを送信（ユーザー）
メールを受信（システム）`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('participant ユーザー');
      expect(result.plantuml).toContain('participant システム');
      expect(result.plantuml).toContain('ユーザー -> システム: メールをメールで送信');
    });

    test('実行パターンを自己メッセージとして処理する', () => {
      const input = `データ検証を実行（システム）`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('participant システム');
      expect(result.plantuml).toContain('システム -> システム: データ検証を実行');
    });

    test('一般的な日本語パターンを解析する', () => {
      const input = `ユーザーがシステムに要求を送る`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('participant ユーザー');
      expect(result.plantuml).toContain('participant システム');
    });

    test('対応する受信者が見つからない場合に警告を出力する', () => {
      const input = `メールを送信（ユーザー）`;
      
      const result = parseSequence(input);
      
      expect(result).toHaveProperty('warnings');
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining('受信の相手が見つかりません')
      ]));
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseSequence('');
      
      expect(result.plantuml).toContain('@startuml');
      expect(result.plantuml).toContain('@enduml');
      // デフォルトのメッセージが含まれる
      expect(result.plantuml).toContain('participant A');
      expect(result.plantuml).toContain('participant B');
      expect(result.plantuml).toContain('A -> B: メッセージ');
    });

    test('無効なフォーマットでも基本構造を保持する', () => {
      const input = `無効なデータ`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('@startuml');
      expect(result.plantuml).toContain('@enduml');
    });
  });

  describe('モード指定テスト', () => {
    test('autoモードで適切なパーサーを選択する', () => {
      const inputSemi = `参加者: A, B
メッセージ: A -> B: テスト`;
      
      const result = parseSequence(inputSemi, 'auto');
      
      expect(result.plantuml).toContain('participant A');
      expect(result.plantuml).toContain('A -> B:');
    });

    test('semi モードを強制指定できる', () => {
      const input = `A -> B: テスト`;
      
      const result = parseSequence(input, 'semi');
      
      expect(result.plantuml).toContain('participant A');
      expect(result.plantuml).toContain('A -> B: テスト');
    });
  });

  describe('複雑なシナリオテスト', () => {
    test('複数の参加者とメッセージの組み合わせ', () => {
      const input = `参加者: ユーザー, フロントエンド, バックエンド, データベース
メッセージ: ユーザー -> フロントエンド: ログイン要求
メッセージ: フロントエンド -> バックエンド: 認証API呼び出し
メッセージ: バックエンド -> データベース: ユーザー情報取得
メッセージ: データベース -> バックエンド: ユーザー情報
メッセージ: バックエンド -> フロントエンド: 認証結果
メッセージ: フロントエンド -> ユーザー: ログイン完了`;
      
      const result = parseSequence(input, 'semi');
      
      expect(result.plantuml).toContain('participant ユーザー');
      expect(result.plantuml).toContain('participant フロントエンド');
      expect(result.plantuml).toContain('participant バックエンド');
      expect(result.plantuml).toContain('participant データベース');
      
      expect(result.plantuml).toContain('ユーザー -> フロントエンド:');
      expect(result.plantuml).toContain('フロントエンド -> バックエンド:');
      expect(result.plantuml).toContain('データベース -> バックエンド:');
    });

    test('日本語の複雑な送受信パターン', () => {
      const input = `注文データをメールで送信（顧客）
注文データを受信（店舗）
確認メールを送信（店舗）
確認メールを受信（顧客）`;
      
      const result = parseSequence(input);
      
      expect(result.plantuml).toContain('participant 顧客');
      expect(result.plantuml).toContain('participant 店舗');
      expect(result.plantuml).toContain('顧客 -> 店舗: 注文データをメールで送信');
      expect(result.plantuml).toContain('店舗 -> 顧客: 確認メールをメールで送信');
    });
  });
});