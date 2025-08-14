/**
 * 単体テスト: ユースケース図パーサー
 * jp2plantuml/src/parsers/usecase.js のテスト
 */

const { parseUsecase } = require('../../src/parsers/usecase');

describe('parseUsecase', () => {
  describe('セミ構造化データのパース', () => {
    test('基本的なアクター定義を解析する', () => {
      const input = `アクター: ユーザー, 管理者, システム
ユースケース: ログイン
ユースケース: データ管理`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('actor ユーザー');
      expect(result).toContain('actor 管理者');
      expect(result).toContain('actor システム');
      expect(result).toContain('usecase ログイン');
      expect(result).toContain('usecase データ管理');
    });

    test('アクターとユースケース間の関係を解析する', () => {
      const input = `アクター: 顧客, 営業担当
ユースケース: 注文作成, 見積作成
関係: 顧客 -> 注文作成
関係: 営業担当 -> 見積作成`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor 顧客');
      expect(result).toContain('actor 営業担当');
      expect(result).toContain('usecase 注文作成');
      expect(result).toContain('usecase 見積作成');
      expect(result).toContain('顧客 --> 注文作成');
      expect(result).toContain('営業担当 --> 見積作成');
    });

    test('関係から自動的にアクターとユースケースを推論する', () => {
      const input = `関係: 新規ユーザー -> 会員登録
関係: 既存ユーザー -> ログイン`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor 新規ユーザー');
      expect(result).toContain('actor 既存ユーザー');
      expect(result).toContain('usecase 会員登録');
      expect(result).toContain('usecase ログイン');
      expect(result).toContain('新規ユーザー --> 会員登録');
      expect(result).toContain('既存ユーザー --> ログイン');
    });

    test('複雑なユースケースシステムを解析する', () => {
      const input = `アクター: 一般ユーザー, プレミアムユーザー, 管理者
ユースケース: 商品検索, 商品購入, プレミアム機能利用, ユーザー管理
関係: 一般ユーザー -> 商品検索
関係: 一般ユーザー -> 商品購入
関係: プレミアムユーザー -> 商品検索
関係: プレミアムユーザー -> 商品購入
関係: プレミアムユーザー -> プレミアム機能利用
関係: 管理者 -> ユーザー管理`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor 一般ユーザー');
      expect(result).toContain('actor プレミアムユーザー');
      expect(result).toContain('actor 管理者');
      expect(result).toContain('usecase 商品検索');
      expect(result).toContain('usecase 商品購入');
      expect(result).toContain('usecase プレミアム機能利用');
      expect(result).toContain('usecase ユーザー管理');
      expect(result).toContain('一般ユーザー --> 商品検索');
      expect(result).toContain('プレミアムユーザー --> プレミアム機能利用');
      expect(result).toContain('管理者 --> ユーザー管理');
    });
  });

  describe('フリーフォーム自然言語のパース', () => {
    test('自然な日本語からユースケースを抽出する', () => {
      const input = `ユーザーはログインを行う
管理者は設定を実行する
顧客は注文を行う`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('actor ユーザー');
      expect(result).toContain('actor 管理者');
      expect(result).toContain('actor 顧客');
      expect(result).toContain('usecase ログイン');
      expect(result).toContain('usecase 設定');
      expect(result).toContain('usecase 注文');
      expect(result).toContain('ユーザー --> ログイン');
      expect(result).toContain('管理者 --> 設定');
      expect(result).toContain('顧客 --> 注文');
    });

    test('様々な動詞パターンを解析する', () => {
      const input = `利用者は機能を使う
システムはデータを実行する
オペレーターは操作を行う`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('利用者 --> 機能');
      expect(result).toContain('システム --> データ');
      expect(result).toContain('オペレーター --> 操作');
    });

    test('助詞「を」ありなしの両パターンを解析する', () => {
      const input = `ユーザーは検索を行う
管理者は管理行う`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('ユーザー --> 検索');
      expect(result).toContain('管理者 --> 管理');
    });
  });

  describe('モード指定テスト', () => {
    test('semi モードを強制指定できる', () => {
      const input = `アクター: テストアクター
ユースケース: テストケース
関係: テストアクター -> テストケース`;
      
      const result = parseUsecase(input, 'semi');
      
      expect(result).toContain('actor テストアクター');
      expect(result).toContain('usecase テストケース');
      expect(result).toContain('テストアクター --> テストケース');
    });

    test('auto モードでセミ構造化を自動検出する', () => {
      const input = `アクター: 自動検出アクター
関係: 自動検出アクター -> 自動検出機能`;
      
      const result = parseUsecase(input, 'auto');
      
      expect(result).toContain('actor 自動検出アクター');
      expect(result).toContain('usecase 自動検出機能');
    });

    test('auto モードでフリーフォームを選択する', () => {
      const input = `テスターはテストを実行する`;
      
      const result = parseUsecase(input, 'auto');
      
      expect(result).toContain('テスター --> テスト');
    });
  });

  describe('エラーハンドリング', () => {
    test('空文字列の入力を適切に処理する', () => {
      const result = parseUsecase('');
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('actor User');
      expect(result).toContain('usecase Login');
      expect(result).toContain('User --> Login');
    });

    test('無効なフォーマットでも基本構造を保持する', () => {
      const input = `無効なユースケース定義
関係のない文章`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      // デフォルトのユースケースが生成される
      expect(result).toContain('actor User');
      expect(result).toContain('usecase Login');
    });

    test('不正な関係構文を適切に処理する', () => {
      const input = `関係: 不正な構文`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
    });
  });

  describe('複雑なシナリオテスト', () => {
    test('ECサイトのユースケースを処理する', () => {
      const input = `アクター: 顧客, 管理者, 配送業者, 決済システム
ユースケース: 商品閲覧, 商品購入, 決済処理, 在庫管理, 注文管理, 配送追跡
関係: 顧客 -> 商品閲覧
関係: 顧客 -> 商品購入
関係: 顧客 -> 決済処理
関係: 管理者 -> 在庫管理
関係: 管理者 -> 注文管理
関係: 配送業者 -> 配送追跡
関係: 決済システム -> 決済処理`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor 顧客');
      expect(result).toContain('actor 管理者');
      expect(result).toContain('actor 配送業者');
      expect(result).toContain('actor 決済システム');
      expect(result).toContain('usecase 商品閲覧');
      expect(result).toContain('usecase 商品購入');
      expect(result).toContain('usecase 決済処理');
      expect(result).toContain('顧客 --> 商品閲覧');
      expect(result).toContain('管理者 --> 在庫管理');
      expect(result).toContain('配送業者 --> 配送追跡');
    });

    test('自然言語による複雑なユースケース記述を処理する', () => {
      const input = `一般ユーザーは記事閲覧を行う
プレミアムユーザーは高品質コンテンツを使う
編集者は記事編集を実行する
管理者はユーザー管理を行う
システムはデータバックアップを実行する`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor 一般ユーザー');
      expect(result).toContain('actor プレミアムユーザー');
      expect(result).toContain('actor 編集者');
      expect(result).toContain('actor 管理者');
      expect(result).toContain('actor システム');
      expect(result).toContain('一般ユーザー --> 記事閲覧');
      expect(result).toContain('プレミアムユーザー --> 高品質コンテンツ');
      expect(result).toContain('編集者 --> 記事編集');
      expect(result).toContain('管理者 --> ユーザー管理');
      expect(result).toContain('システム --> データバックアップ');
    });
  });

  describe('PlantUML出力形式テスト', () => {
    test('正しいPlantUML構文を生成する', () => {
      const input = `アクター: テストアクター`;
      
      const result = parseUsecase(input);
      
      const lines = result.split('\n');
      expect(lines[0]).toBe('@startuml');
      expect(lines[lines.length - 1]).toBe('@enduml');
    });

    test('アクターの正しい構文形式', () => {
      const input = `アクター: ユーザー`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('actor ユーザー');
    });

    test('ユースケースの正しい構文形式', () => {
      const input = `ユースケース: ログイン`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('usecase ログイン');
    });

    test('関係の正しい構文形式', () => {
      const input = `関係: ユーザー -> ログイン`;
      
      const result = parseUsecase(input);
      
      expect(result).toContain('ユーザー --> ログイン');
    });
  });

  describe('重複要素の処理', () => {
    test('重複するアクターを適切に処理する', () => {
      const input = `アクター: 共通アクター
関係: 共通アクター -> 機能A
関係: 共通アクター -> 機能B`;
      
      const result = parseUsecase(input);
      
      // 共通アクターが一度だけ定義されることを確認
      const actorDefinitions = result.split('\n').filter(line => line === 'actor 共通アクター');
      expect(actorDefinitions.length).toBe(1);
      expect(result).toContain('共通アクター --> 機能A');
      expect(result).toContain('共通アクター --> 機能B');
    });

    test('重複するユースケースを適切に処理する', () => {
      const input = `ユースケース: 共通機能
関係: アクターA -> 共通機能
関係: アクターB -> 共通機能`;
      
      const result = parseUsecase(input);
      
      // 共通機能が一度だけ定義されることを確認
      const usecaseDefinitions = result.split('\n').filter(line => line === 'usecase 共通機能');
      expect(usecaseDefinitions.length).toBe(1);
    });
  });
});