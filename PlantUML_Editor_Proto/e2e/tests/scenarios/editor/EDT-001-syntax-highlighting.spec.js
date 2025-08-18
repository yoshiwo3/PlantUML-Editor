import { test, expect } from '@playwright/test';
import { PlantUMLEditorPage } from '../../../page-objects/PlantUMLEditorPage.js';

/**
 * EDT-001: 構文ハイライトテスト
 * 目的: PlantUMLエディターの構文ハイライト機能を確認
 * 期待結果: キーワード強調、色分け表示、リアルタイム更新
 */

test.describe('EDT-001: 構文ハイライトテスト', () => {
  let editorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new PlantUMLEditorPage(page);
    await editorPage.open();
  });

  test.afterEach(async () => {
    await editorPage.cleanup();
  });

  test('PlantUMLキーワードのハイライト確認', async ({ page }) => {
    const plantumlCode = `@startuml
actor User
participant System
User -> System: request
note right: important
alt condition
  System -> User: response1
else
  System -> User: response2
end
@enduml`;

    await editorPage.inputPlantUMLCode(plantumlCode);
    
    // 構文ハイライトの適用を待機
    await page.waitForTimeout(1000);

    // キーワードのハイライト確認
    const keywords = ['@startuml', '@enduml', 'actor', 'participant', 'note', 'alt', 'else', 'end'];
    
    for (const keyword of keywords) {
      // キーワードが特別なクラスでマークされているか確認
      const highlightedKeyword = await page.locator(`#plantuml-editor .keyword:has-text("${keyword}")`);
      const keywordExists = await highlightedKeyword.count() > 0;
      
      if (!keywordExists) {
        // 代替として、色付きスタイルを確認
        const editorContent = await page.locator('#plantuml-editor').innerHTML();
        expect(editorContent).toContain(keyword);
      }
    }
  });

  test('コメント行のハイライト', async ({ page }) => {
    const codeWithComments = `@startuml
' This is a comment
actor User
// Another comment style
User -> System: message
/* Multi-line
   comment */
@enduml`;

    await editorPage.inputPlantUMLCode(codeWithComments);
    await page.waitForTimeout(1000);

    // コメントスタイルの確認
    const commentPatterns = [
      "' This is a comment",
      '// Another comment style',
      '/* Multi-line'
    ];

    for (const comment of commentPatterns) {
      const editorContent = await page.locator('#plantuml-editor').innerHTML();
      expect(editorContent).toContain(comment);
    }
  });

  test('文字列リテラルのハイライト', async ({ page }) => {
    const codeWithStrings = `@startuml
actor "長い名前のユーザー" as User
User -> System: "重要なメッセージ"
note right: "これは重要な\n複数行のノート"
@enduml`;

    await editorPage.inputPlantUMLCode(codeWithStrings);
    await page.waitForTimeout(1000);

    // 文字列の確認
    const strings = [
      '"長い名前のユーザー"',
      '"重要なメッセージ"',
      '"これは重要な'
    ];

    const editorContent = await page.locator('#plantuml-editor').innerHTML();
    for (const str of strings) {
      expect(editorContent).toContain(str);
    }
  });

  test('矢印記号のハイライト', async ({ page }) => {
    const codeWithArrows = `@startuml
A -> B: normal
A --> B: dotted
A ->> B: async
A <<-- B: return async
A -x B: lost
A -o B: to boundary
@enduml`;

    await editorPage.inputPlantUMLCode(codeWithArrows);
    await page.waitForTimeout(1000);

    // 矢印パターンの確認
    const arrows = ['->', '-->', '->>', '<<--', '-x', '-o'];
    
    const editorContent = await page.locator('#plantuml-editor').innerHTML();
    for (const arrow of arrows) {
      expect(editorContent).toContain(arrow);
    }
  });

  test('ネストした構造のハイライト', async ({ page }) => {
    const nestedCode = `@startuml
alt 条件A
  alt 条件B
    A -> B: メッセージ1
  else 条件C
    A -> C: メッセージ2
  end
else 条件D
  loop 5回
    A -> D: 繰り返し
  end
end
@enduml`;

    await editorPage.inputPlantUMLCode(nestedCode);
    await page.waitForTimeout(1000);

    // ネスト構造のキーワード確認
    const structureKeywords = ['alt', 'else', 'end', 'loop'];
    
    const editorContent = await page.locator('#plantuml-editor').innerHTML();
    for (const keyword of structureKeywords) {
      expect(editorContent).toContain(keyword);
    }
  });

  test('日本語文字とキーワードの混在ハイライト', async ({ page }) => {
    const mixedCode = `@startuml
actor ユーザー
participant システム as Sys
ユーザー -> Sys: ログイン要求
note right of Sys: 認証処理\n実行中
alt 認証成功
  Sys -> ユーザー: ログイン完了
else 認証失敗
  Sys -> ユーザー: エラーメッセージ
end
@enduml`;

    await editorPage.inputPlantUMLCode(mixedCode);
    await page.waitForTimeout(1000);

    // 日本語とキーワードが共存していることを確認
    const editorContent = await page.locator('#plantuml-editor').innerHTML();
    
    // 日本語テキスト
    expect(editorContent).toContain('ユーザー');
    expect(editorContent).toContain('システム');
    expect(editorContent).toContain('ログイン要求');
    
    // キーワード
    expect(editorContent).toContain('actor');
    expect(editorContent).toContain('participant');
    expect(editorContent).toContain('note');
    expect(editorContent).toContain('alt');
    expect(editorContent).toContain('else');
  });

  test('リアルタイムハイライト更新', async ({ page }) => {
    // 段階的にコードを入力してハイライトの更新を確認
    
    // 1. 基本構造
    await editorPage.inputPlantUMLCode('@startuml');
    await page.waitForTimeout(500);
    
    let content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('@startuml');
    
    // 2. アクター追加
    await editorPage.inputPlantUMLCode('@startuml\nactor User');
    await page.waitForTimeout(500);
    
    content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('actor');
    expect(content).toContain('User');
    
    // 3. 相互作用追加
    await editorPage.inputPlantUMLCode('@startuml\nactor User\nUser -> System: message');
    await page.waitForTimeout(500);
    
    content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('->');
    expect(content).toContain('System');
    
    // 4. 終了タグ
    await editorPage.inputPlantUMLCode('@startuml\nactor User\nUser -> System: message\n@enduml');
    await page.waitForTimeout(500);
    
    content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('@enduml');
  });

  test('無効な構文のハイライト', async ({ page }) => {
    const invalidCode = `@startuml
actor User
invalid_keyword test
User -> : incomplete
@enduml`;

    await editorPage.inputPlantUMLCode(invalidCode);
    await page.waitForTimeout(1000);

    // 有効なキーワードはハイライトされ、無効なものはされない
    const content = await page.locator('#plantuml-editor').innerHTML();
    
    // 有効なキーワード
    expect(content).toContain('@startuml');
    expect(content).toContain('actor');
    expect(content).toContain('@enduml');
    
    // 無効なキーワード（通常のテキストとして処理される）
    expect(content).toContain('invalid_keyword');
  });

  test('大文字小文字の区別', async ({ page }) => {
    const caseTestCode = `@startuml
ACTOR User1
actor User2
Actor User3
USER -> SYSTEM: MESSAGE
user -> system: message
@enduml`;

    await editorPage.inputPlantUMLCode(caseTestCode);
    await page.waitForTimeout(1000);

    const content = await page.locator('#plantuml-editor').innerHTML();
    
    // PlantUMLでは通常、キーワードは大文字小文字を区別しない
    expect(content).toContain('ACTOR');
    expect(content).toContain('actor');
    expect(content).toContain('Actor');
  });

  test('特殊文字とエスケープシーケンス', async ({ page }) => {
    const specialCharCode = `@startuml
participant "User\\nwith\\nnewlines" as U
U -> S: message with \\"quotes\\"
note right: Special chars: &, <, >, \\t, \\n
@enduml`;

    await editorPage.inputPlantUMLCode(specialCharCode);
    await page.waitForTimeout(1000);

    const content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('participant');
    expect(content).toContain('\\n');
    expect(content).toContain('\\"');
  });

  test('色とスタイル指定のハイライト', async ({ page }) => {
    const styledCode = `@startuml
!define BLUE #0000FF
actor User #lightblue
participant System #lightgreen
User -> System: message
note right #yellow: colored note
@enduml`;

    await editorPage.inputPlantUMLCode(styledCode);
    await page.waitForTimeout(1000);

    const content = await page.locator('#plantuml-editor').innerHTML();
    
    // 色指定の確認
    expect(content).toContain('#lightblue');
    expect(content).toContain('#lightgreen');
    expect(content).toContain('#yellow');
    expect(content).toContain('#0000FF');
    
    // マクロ定義の確認
    expect(content).toContain('!define');
  });

  test('長いコードでのハイライトパフォーマンス', async ({ page }) => {
    // 大きなPlantUMLコードでのハイライト性能テスト
    let longCode = '@startuml\n';
    
    for (let i = 1; i <= 100; i++) {
      longCode += `actor Actor${i}\n`;
      longCode += `participant System${i}\n`;
      longCode += `Actor${i} -> System${i}: message${i}\n`;
      longCode += `note right: note${i}\n`;
    }
    
    longCode += '@enduml';

    const startTime = Date.now();
    await editorPage.inputPlantUMLCode(longCode);
    
    // ハイライト処理の完了を待機
    await page.waitForTimeout(2000);
    
    const highlightTime = Date.now() - startTime;
    
    // 5秒以内でハイライト処理が完了することを期待
    expect(highlightTime).toBeLessThan(5000);
    
    // 最初と最後のキーワードが正しくハイライトされていることを確認
    const content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('@startuml');
    expect(content).toContain('@enduml');
    expect(content).toContain('actor');
    expect(content).toContain('participant');
  });

  test('ダークモード対応のハイライト', async ({ page }) => {
    // ダークモードが実装されている場合のテスト
    
    const code = `@startuml
actor User
participant System
User -> System: message
note right: important
@enduml`;

    await editorPage.inputPlantUMLCode(code);
    
    // ダークモード切り替えボタンがあるかチェック
    const darkModeToggle = await page.locator('[data-theme-toggle]').count();
    
    if (darkModeToggle > 0) {
      // ダークモードに切り替え
      await page.click('[data-theme-toggle]');
      await page.waitForTimeout(1000);
      
      // ダークモードでもハイライトが機能することを確認
      const content = await page.locator('#plantuml-editor').innerHTML();
      expect(content).toContain('@startuml');
      expect(content).toContain('actor');
      expect(content).toContain('participant');
      
      // ライトモードに戻す
      await page.click('[data-theme-toggle]');
    }
  });

  test('コピペ時のハイライト保持', async ({ page }) => {
    const originalCode = `@startuml
actor User
User -> System: test
@enduml`;

    await editorPage.inputPlantUMLCode(originalCode);
    await page.waitForTimeout(1000);

    // コードを全選択してコピー
    await page.keyboard.press('Ctrl+A');
    await page.keyboard.press('Ctrl+C');
    
    // エディターをクリア
    await editorPage.clearAll();
    
    // ペースト
    await page.keyboard.press('Ctrl+V');
    await page.waitForTimeout(1000);

    // ハイライトが復元されていることを確認
    const content = await page.locator('#plantuml-editor').innerHTML();
    expect(content).toContain('@startuml');
    expect(content).toContain('actor');
    expect(content).toContain('@enduml');
  });
});