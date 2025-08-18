import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * BAS-002: 日本語→PlantUML変換テスト
 * 目的: 日本語入力からPlantUMLコードへの正確な変換を確認
 * 期待結果: 正確な変換実行、リアルタイム同期
 */

test.describe('BAS-002: 日本語→PlantUML変換テスト', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
    
    // パフォーマンス監視開始
    await editorPage.startConsoleMonitoring();
    await editorPage.startNetworkMonitoring();
  });

  test.afterEach(async () => {
    // エラーチェック
    const consoleErrors = editorPage.getConsoleErrors();
    const networkErrors = editorPage.getNetworkErrors();
    
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }
    
    if (networkErrors.length > 0) {
      console.warn('Network errors detected:', networkErrors);
    }
    
    await editorPage.cleanup();
  });

  test('基本的な日本語→PlantUML変換', async () => {
    // シンプルなシーケンス図
    const japaneseInput = 'A → B: メッセージ';
    const expectedPlantUML = /@startuml[\s\S]*A\s*->\s*B\s*:\s*メッセージ[\s\S]*@enduml/;
    
    await editorPage.inputJapaneseText(japaneseInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // PlantUMLコードの基本構造確認
    expect(generatedCode).toMatch(expectedPlantUML);
    expect(generatedCode).toContain('@startuml');
    expect(generatedCode).toContain('@enduml');
    
    // プレビューの生成確認
    const hasPreview = await editorPage.hasPreviewSVG();
    expect(hasPreview).toBe(true);
  });

  test('複雑な日本語シーケンス変換', async () => {
    const complexInput = `ユーザー → システム: ログイン要求
システム → データベース: 認証確認
データベース → システム: 認証結果
システム → ユーザー: ログイン完了`;

    await editorPage.inputJapaneseText(complexInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // 各行の変換確認
    expect(generatedCode).toContain('ユーザー');
    expect(generatedCode).toContain('システム');
    expect(generatedCode).toContain('データベース');
    expect(generatedCode).toContain('ログイン要求');
    expect(generatedCode).toContain('認証確認');
    expect(generatedCode).toContain('認証結果');
    expect(generatedCode).toContain('ログイン完了');
    
    // 構造確認
    expect(generatedCode).toContain('@startuml');
    expect(generatedCode).toContain('@enduml');
    
    // アクター関係の確認
    expect(generatedCode).toMatch(/ユーザー\s*->\s*システム/);
    expect(generatedCode).toMatch(/システム\s*->\s*データベース/);
    expect(generatedCode).toMatch(/データベース\s*->\s*システム/);
    expect(generatedCode).toMatch(/システム\s*->\s*ユーザー/);
  });

  test('日本語文字種別変換テスト', async () => {
    // ひらがな、カタカナ、漢字、英数字の混在
    const mixedInput = 'ユーザー → システムA: ひらがなテスト123';
    
    await editorPage.inputJapaneseText(mixedInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // 各文字種が正しく保持されているか確認
    expect(generatedCode).toContain('ユーザー'); // カタカナ
    expect(generatedCode).toContain('システムA'); // カタカナ + 英字
    expect(generatedCode).toContain('ひらがなテスト123'); // ひらがな + カタカナ + 数字
    
    // エンコーディングエラーがないか確認
    expect(generatedCode).not.toContain('???');
    expect(generatedCode).not.toContain('□');
  });

  test('特殊記号と句読点の処理', async () => {
    const inputWithPunctuation = 'ユーザー → システム: 「重要なメッセージ」、確認してください！';
    
    await editorPage.inputJapaneseText(inputWithPunctuation);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // 特殊文字が適切に処理されているか確認
    expect(generatedCode).toContain('「重要なメッセージ」');
    expect(generatedCode).toContain('、確認してください！');
    
    // PlantUML構文に影響していないか確認
    expect(generatedCode).toContain('@startuml');
    expect(generatedCode).toContain('@enduml');
  });

  test('長文入力の変換テスト', async () => {
    const longInput = `管理者システム → 認証サーバー: ユーザー認証要求（ID、パスワード、権限レベル）
認証サーバー → ユーザーデータベース: 認証情報確認クエリ実行
ユーザーデータベース → 認証サーバー: 認証結果とユーザー権限情報を返却
認証サーバー → セッション管理システム: 新規セッション作成要求
セッション管理システム → 認証サーバー: セッションID発行完了通知
認証サーバー → 管理者システム: 認証成功レスポンス（セッションID、権限情報含む）`;

    await editorPage.inputJapaneseText(longInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // 長文が適切に処理されているか確認
    expect(generatedCode.length).toBeGreaterThan(100);
    expect(generatedCode).toContain('@startuml');
    expect(generatedCode).toContain('@enduml');
    
    // 主要なアクターが含まれているか確認
    expect(generatedCode).toContain('管理者システム');
    expect(generatedCode).toContain('認証サーバー');
    expect(generatedCode).toContain('ユーザーデータベース');
    expect(generatedCode).toContain('セッション管理システム');
    
    // プレビューが生成されているか確認
    const hasPreview = await editorPage.hasPreviewSVG();
    expect(hasPreview).toBe(true);
  });

  test('ノート付きシーケンスの変換', async () => {
    const inputWithNotes = `A → B: メッセージ送信
Note right of B: 重要な処理を実行
B → A: 応答メッセージ`;

    await editorPage.inputJapaneseText(inputWithNotes);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // ノート構文の確認
    expect(generatedCode).toMatch(/note\s+right/i);
    expect(generatedCode).toContain('重要な処理を実行');
    
    // シーケンスの順序確認
    expect(generatedCode).toMatch(/A\s*->\s*B.*メッセージ送信/);
    expect(generatedCode).toMatch(/B\s*->\s*A.*応答メッセージ/);
  });

  test('クラス図形式の日本語変換', async () => {
    const classInput = `クラス ユーザー
属性: 名前、メールアドレス
メソッド: ログイン、ログアウト

クラス 管理者
継承: ユーザー
メソッド: ユーザー管理`;

    await editorPage.inputJapaneseText(classInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // クラス定義の確認
    expect(generatedCode).toContain('ユーザー');
    expect(generatedCode).toContain('管理者');
    expect(generatedCode).toContain('名前');
    expect(generatedCode).toContain('メールアドレス');
    expect(generatedCode).toContain('ログイン');
    expect(generatedCode).toContain('ユーザー管理');
  });

  test('リアルタイム変換パフォーマンス', async () => {
    const testInputs = [
      'A → B',
      'A → B: テスト',
      'A → B: テストメッセージ',
      'ユーザー → システム: ログイン要求'
    ];

    for (const input of testInputs) {
      const startTime = Date.now();
      
      await editorPage.inputJapaneseText(input);
      
      // 変換完了を待機
      await editorPage.waitForConversion();
      
      const conversionTime = Date.now() - startTime;
      
      // 100ms以内での変換を期待
      expect(conversionTime).toBeLessThan(100);
      
      // PlantUMLコードが生成されているか確認
      const generatedCode = await editorPage.getPlantUMLCode();
      expect(generatedCode.length).toBeGreaterThan(0);
      
      // 入力をクリア
      await editorPage.clearAll();
    }
  });

  test('変換エラーハンドリング', async () => {
    // 空入力
    await editorPage.inputJapaneseText('');
    const emptyResult = await editorPage.getPlantUMLCode();
    expect(emptyResult).toBeDefined();
    
    // 無効な文字列
    await editorPage.inputJapaneseText('###無効な入力###');
    const invalidResult = await editorPage.getPlantUMLCode();
    expect(invalidResult).toBeDefined();
    
    // エラーメッセージの確認
    const errorMessage = await editorPage.getErrorMessage();
    // エラーメッセージがある場合は適切な内容であることを確認
    if (errorMessage) {
      expect(errorMessage).toContain('変換');
    }
  });

  test('同期機能の確認', async () => {
    // 日本語入力後の同期確認
    await editorPage.inputJapaneseText('A → B: 同期テスト');
    
    // リアルタイム同期のテスト
    const syncResult = await editorPage.testRealtimeSync();
    
    expect(syncResult.plantumlGenerated).toBe(true);
    expect(syncResult.previewUpdated).toBe(true);
    
    // PlantUMLエディターからの逆同期テスト
    const directCode = '@startuml\nC -> D: 直接入力\n@enduml';
    await editorPage.inputPlantUMLCode(directCode);
    
    // プレビューが更新されているか確認
    await editorPage.waitForPreviewUpdate();
    const hasPreview = await editorPage.hasPreviewSVG();
    expect(hasPreview).toBe(true);
  });

  test('ブラウザ固有の日本語処理', async ({ browserName }) => {
    const japaneseInput = 'テスト用シーケンス → 確認処理: 日本語メッセージ';
    
    await editorPage.inputJapaneseText(japaneseInput);
    
    const generatedCode = await editorPage.getPlantUMLCode();
    
    // ブラウザに関係なく日本語が正しく処理されるか確認
    expect(generatedCode).toContain('テスト用シーケンス');
    expect(generatedCode).toContain('確認処理');
    expect(generatedCode).toContain('日本語メッセージ');
    
    // ブラウザ固有の情報を記録
    console.log(`${browserName} - 日本語処理テスト完了`);
    console.log(`生成されたコード長: ${generatedCode.length}`);
  });

  test('複数の図表タイプ変換', async () => {
    const diagramTypes = [
      {
        type: 'sequence',
        input: 'A → B: シーケンス図テスト',
        expected: /A\s*->\s*B/
      },
      {
        type: 'usecase',
        input: 'ユーザー (ログイン機能)',
        expected: /ユーザー/
      },
      {
        type: 'activity',
        input: '開始 → 処理A → 終了',
        expected: /開始|処理A|終了/
      }
    ];

    for (const diagram of diagramTypes) {
      await editorPage.inputJapaneseText(diagram.input);
      await editorPage.waitForConversion();
      
      const generatedCode = await editorPage.getPlantUMLCode();
      expect(generatedCode).toMatch(diagram.expected);
      
      // プレビューの確認
      const hasPreview = await editorPage.hasPreviewSVG();
      expect(hasPreview).toBe(true);
      
      await editorPage.clearAll();
    }
  });
});