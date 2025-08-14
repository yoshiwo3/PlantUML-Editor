/**
 * Jest セットアップファイル
 * テスト実行前の共通設定を定義
 */

// テストタイムアウトを30秒に設定（API呼び出しがあるため）
jest.setTimeout(30000);

// コンソールの出力をクリーンにするため、不要なログを抑制
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // テスト実行中は一部のコンソール出力を抑制
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('jest-worker')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('deprecated')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});

afterAll(() => {
  // テスト終了後にコンソール出力を元に戻す
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// テスト用のヘルパー関数をグローバルに定義
global.testHelpers = {
  /**
   * 非同期処理の完了を待つヘルパー
   * @param {number} ms - 待機時間（ミリ秒）
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * PlantUML形式の文字列かどうかを検証
   * @param {string} text - 検証対象の文字列
   * @returns {boolean}
   */
  isValidPlantUML: (text) => {
    return typeof text === 'string' && 
           text.includes('@startuml') && 
           text.includes('@enduml');
  },
  
  /**
   * テスト用のサンプル日本語入力データ
   */
  sampleInputs: {
    sequence: 'ユーザー -> システム: ログイン要求\nシステム -> データベース: 認証確認\nデータベース -> システム: 認証結果\nシステム -> ユーザー: ログイン完了',
    activity: '開始\nアクティビティ: データ入力\nアクティビティ: データ検証\n分岐: 妥当性チェック -> 正常 / エラー\n終了',
    class: 'クラス: User { id:int; name:string; email:string }\nクラス: Order { id:int; userId:int }\n関連: User -> Order',
    state: '状態: 待機中\n状態: 処理中\n状態: 完了\n遷移: 待機中 -> 処理中\n遷移: 処理中 -> 完了',
    usecase: 'アクター: ユーザー\nアクター: 管理者\nユースケース: ログイン\nユースケース: データ管理\n関係: ユーザー -> ログイン\n関係: 管理者 -> データ管理',
    gantt: 'プロジェクト名: テストプロジェクト\n開始日: 2025-08-13\nタスク: 要件定義; 2025-08-13 〜 2025-08-20\nタスク: 設計; 2025-08-21 〜 2025-08-31'
  }
};