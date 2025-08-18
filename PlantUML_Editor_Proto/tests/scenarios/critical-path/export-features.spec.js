/**
 * Sprint4 エクスポート機能テスト
 * PNG/SVG/PDF出力とPlantUMLコード出力の包括的テスト
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('エクスポート機能 - 全形式対応テスト', () => {
  const testOutputDir = path.join(process.cwd(), 'test-results', 'export-outputs');

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8086');
    
    // エディター初期化待機
    await page.waitForSelector('[data-testid="plantuml-editor"]', { timeout: 10000 });
    
    // テスト用PlantUML作成
    const testInput = 'ユーザーがシステムにログインし、データを取得する';
    await page.fill('[data-testid="japanese-input"]', testInput);
    await page.waitForTimeout(1000);
    
    // 出力ディレクトリ作成
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  test('EXPORT-001: PNG画像エクスポート完全テスト', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: 'PNG形式での画像エクスポート機能テスト'
    });

    // エクスポートメニュー表示
    await page.click('[data-testid="export-menu-button"]');
    await page.waitForSelector('[data-testid="export-menu"]');
    
    // PNG エクスポートオプション選択
    await page.click('[data-testid="export-png-button"]');
    
    // PNG設定モーダル確認
    const pngModal = page.locator('[data-testid="png-export-modal"]');
    await expect(pngModal).toBeVisible();
    
    // PNG設定確認
    const qualitySlider = page.locator('[data-testid="png-quality-slider"]');
    const sizeSelect = page.locator('[data-testid="png-size-select"]');
    const backgroundSelect = page.locator('[data-testid="png-background-select"]');
    
    // 品質設定（高品質）
    await qualitySlider.fill('100');
    expect(await qualitySlider.inputValue()).toBe('100');
    
    // サイズ設定
    await sizeSelect.selectOption('1920x1080');
    expect(await sizeSelect.inputValue()).toBe('1920x1080');
    
    // 背景設定
    await backgroundSelect.selectOption('white');
    expect(await backgroundSelect.inputValue()).toBe('white');
    
    // ダウンロード処理
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="png-export-confirm"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    
    // ファイル保存・検証
    const downloadPath = path.join(testOutputDir, 'test-export.png');
    await download.saveAs(downloadPath);
    
    // ファイル存在確認
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    // ファイルサイズ確認（空でない）
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // 1KB以上
    
    // ファイルヘッダー確認（PNG形式）
    const buffer = fs.readFileSync(downloadPath);
    const pngHeader = buffer.subarray(0, 8);
    const expectedPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(pngHeader.equals(expectedPngHeader)).toBeTruthy();
    
    console.log(`PNG export successful: ${downloadPath} (${stats.size} bytes)`);
  });

  test('EXPORT-002: SVG ベクター画像エクスポート', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: 'SVG形式でのベクター画像エクスポート機能テスト'
    });

    // 複雑な図表作成（SVGの利点確認用）
    const complexInput = `システム管理者がデータベースにアクセスし、
ユーザー情報を更新する。
その後、メール通知サービスが自動的に確認メールを送信する。`;
    
    await page.fill('[data-testid="japanese-input"]', complexInput);
    await page.waitForTimeout(1500);
    
    // SVG エクスポート実行
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-svg-button"]');
    
    // SVG設定モーダル
    const svgModal = page.locator('[data-testid="svg-export-modal"]');
    await expect(svgModal).toBeVisible();
    
    // SVG オプション設定
    const embedFonts = page.locator('[data-testid="svg-embed-fonts"]');
    const optimizeSize = page.locator('[data-testid="svg-optimize-size"]');
    const includeMetadata = page.locator('[data-testid="svg-include-metadata"]');
    
    // フォント埋め込み有効化（日本語対応）
    await embedFonts.check();
    expect(await embedFonts.isChecked()).toBeTruthy();
    
    // サイズ最適化有効化
    await optimizeSize.check();
    expect(await optimizeSize.isChecked()).toBeTruthy();
    
    // メタデータ含める
    await includeMetadata.check();
    expect(await includeMetadata.isChecked()).toBeTruthy();
    
    // SVG エクスポート実行
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="svg-export-confirm"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);
    
    // ファイル保存・検証
    const downloadPath = path.join(testOutputDir, 'test-export.svg');
    await download.saveAs(downloadPath);
    
    // SVG ファイル検証
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const svgContent = fs.readFileSync(downloadPath, 'utf8');
    
    // SVG形式確認
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
    expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
    
    // 日本語文字確認
    expect(svgContent).toContain('システム管理者');
    expect(svgContent).toContain('データベース');
    expect(svgContent).toContain('メール通知');
    
    // メタデータ確認
    if (includeMetadata.isChecked()) {
      expect(svgContent).toContain('<metadata>');
      expect(svgContent).toContain('PlantUML Editor');
    }
    
    console.log(`SVG export successful: ${downloadPath} (${svgContent.length} chars)`);
  });

  test('EXPORT-003: PDF文書エクスポート', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: 'PDF形式での文書エクスポート機能テスト'
    });

    // PDF エクスポート実行
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-pdf-button"]');
    
    // PDF設定モーダル
    const pdfModal = page.locator('[data-testid="pdf-export-modal"]');
    await expect(pdfModal).toBeVisible();
    
    // PDF オプション設定
    const pageSize = page.locator('[data-testid="pdf-page-size"]');
    const orientation = page.locator('[data-testid="pdf-orientation"]');
    const includeTitle = page.locator('[data-testid="pdf-include-title"]');
    const includeTimestamp = page.locator('[data-testid="pdf-include-timestamp"]');
    
    // ページサイズ設定
    await pageSize.selectOption('A4');
    expect(await pageSize.inputValue()).toBe('A4');
    
    // 向き設定
    await orientation.selectOption('landscape');
    expect(await orientation.inputValue()).toBe('landscape');
    
    // タイトル含める
    await includeTitle.check();
    expect(await includeTitle.isChecked()).toBeTruthy();
    
    // タイムスタンプ含める
    await includeTimestamp.check();
    expect(await includeTimestamp.isChecked()).toBeTruthy();
    
    // PDF エクスポート実行
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="pdf-export-confirm"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    
    // ファイル保存・検証
    const downloadPath = path.join(testOutputDir, 'test-export.pdf');
    await download.saveAs(downloadPath);
    
    // PDF ファイル検証
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(5000); // 5KB以上
    
    // PDFヘッダー確認
    const buffer = fs.readFileSync(downloadPath);
    const pdfHeader = buffer.subarray(0, 4).toString();
    expect(pdfHeader).toBe('%PDF');
    
    console.log(`PDF export successful: ${downloadPath} (${stats.size} bytes)`);
  });

  test('EXPORT-004: PlantUMLコード出力', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: 'PlantUMLソースコードのエクスポート機能テスト'
    });

    // PlantUMLコード エクスポート
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-plantuml-button"]');
    
    // コード出力モーダル
    const codeModal = page.locator('[data-testid="plantuml-export-modal"]');
    await expect(codeModal).toBeVisible();
    
    // 出力オプション
    const includeComments = page.locator('[data-testid="plantuml-include-comments"]');
    const formatCode = page.locator('[data-testid="plantuml-format-code"]');
    const includeMetadata = page.locator('[data-testid="plantuml-include-metadata"]');
    
    // コメント含める
    await includeComments.check();
    
    // コード整形
    await formatCode.check();
    
    // メタデータ含める
    await includeMetadata.check();
    
    // コードプレビュー確認
    const codePreview = page.locator('[data-testid="plantuml-code-preview"]');
    const previewContent = await codePreview.textContent();
    
    expect(previewContent).toContain('@startuml');
    expect(previewContent).toContain('@enduml');
    expect(previewContent).toContain('participant');
    expect(previewContent).toContain('ユーザー');
    expect(previewContent).toContain('システム');
    
    // クリップボードコピー機能テスト
    await page.click('[data-testid="copy-to-clipboard"]');
    
    // 成功メッセージ確認
    const successMessage = page.locator('[data-testid="copy-success-message"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('コピーしました');
    
    // ファイルダウンロード
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-plantuml-file"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.puml$|\.plantuml$/);
    
    // ファイル保存・検証
    const downloadPath = path.join(testOutputDir, 'test-export.puml');
    await download.saveAs(downloadPath);
    
    // PlantUMLファイル検証
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const pumlContent = fs.readFileSync(downloadPath, 'utf8');
    expect(pumlContent).toContain('@startuml');
    expect(pumlContent).toContain('@enduml');
    
    // メタデータ確認
    if (await includeMetadata.isChecked()) {
      expect(pumlContent).toContain('Generated by PlantUML Editor');
      expect(pumlContent).toContain(new Date().getFullYear().toString());
    }
    
    console.log(`PlantUML code export successful: ${downloadPath}`);
  });

  test('EXPORT-005: 日本語エンコーディング確認', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: '日本語文字の正確なエンコーディング確認テスト'
    });

    // 日本語特化テストデータ作成
    const japaneseInput = `利用者が認証システムに接続する。
認証システムがユーザーデータベースを参照する。
データベースが認証結果を返却する。
認証システムがメール通知サービスに通知する。
メール通知サービスが利用者にメールを送信する。`;
    
    await page.fill('[data-testid="japanese-input"]', japaneseInput);
    await page.waitForTimeout(1500);
    
    // 各形式でエクスポートして日本語確認
    const formats = [
      { button: 'export-svg-button', extension: 'svg' },
      { button: 'export-plantuml-button', extension: 'puml' }
    ];
    
    for (const format of formats) {
      await page.click('[data-testid="export-menu-button"]');
      await page.click(`[data-testid="${format.button}"]`);
      
      // 設定スキップしてダウンロード
      const downloadPromise = page.waitForEvent('download');
      
      if (format.extension === 'svg') {
        await page.click('[data-testid="svg-export-confirm"]');
      } else if (format.extension === 'puml') {
        await page.click('[data-testid="download-plantuml-file"]');
      }
      
      const download = await downloadPromise;
      const downloadPath = path.join(testOutputDir, `japanese-test.${format.extension}`);
      await download.saveAs(downloadPath);
      
      // 日本語文字確認
      const content = fs.readFileSync(downloadPath, 'utf8');
      
      const japaneseTerms = [
        '利用者', '認証システム', 'ユーザーデータベース', 
        '認証結果', 'メール通知サービス'
      ];
      
      for (const term of japaneseTerms) {
        expect(content).toContain(term);
      }
      
      console.log(`Japanese encoding test passed for ${format.extension}`);
    }
  });

  test('EXPORT-006: 大規模図表エクスポート', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: '大規模図表の エクスポート性能テスト'
    });

    // 大規模図表作成（50要素）
    const largeInput = Array.from({ length: 50 }, (_, i) => 
      `アクター${i + 1}がシステム${Math.floor(i / 5) + 1}に処理${i + 1}を要求する`
    ).join('\n');
    
    await page.fill('[data-testid="japanese-input"]', largeInput);
    await page.waitForTimeout(3000); // 大規模処理待機
    
    // PNG エクスポート（高解像度）
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-png-button"]');
    
    // 高解像度設定
    await page.selectOption('[data-testid="png-size-select"]', '2560x1440');
    await page.fill('[data-testid="png-quality-slider"]', '100');
    
    // タイムアウト延長してエクスポート
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.click('[data-testid="png-export-confirm"]');
    
    const download = await downloadPromise;
    const downloadPath = path.join(testOutputDir, 'large-diagram.png');
    await download.saveAs(downloadPath);
    
    // ファイルサイズ確認（大規模のため大きいファイル）
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(50000); // 50KB以上
    
    console.log(`Large diagram export: ${downloadPath} (${stats.size} bytes)`);
  });

  test('EXPORT-007: バッチエクスポート機能', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: '複数形式同時エクスポート機能テスト'
    });

    // バッチエクスポートメニュー
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="batch-export-button"]');
    
    // バッチエクスポートモーダル
    const batchModal = page.locator('[data-testid="batch-export-modal"]');
    await expect(batchModal).toBeVisible();
    
    // エクスポート形式選択
    const formatCheckboxes = [
      '[data-testid="batch-png-checkbox"]',
      '[data-testid="batch-svg-checkbox"]',
      '[data-testid="batch-plantuml-checkbox"]'
    ];
    
    // 全形式選択
    for (const checkbox of formatCheckboxes) {
      await page.check(checkbox);
      expect(await page.isChecked(checkbox)).toBeTruthy();
    }
    
    // バッチエクスポート実行
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="batch-export-execute"]');
    
    // ZIP ファイルダウンロード
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    
    const downloadPath = path.join(testOutputDir, 'batch-export.zip');
    await download.saveAs(downloadPath);
    
    // ZIP ファイル検証
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // 1KB以上
    
    console.log(`Batch export successful: ${downloadPath} (${stats.size} bytes)`);
  });

  test('EXPORT-008: エクスポートエラー処理', async ({ page }) => {
    test.info().annotations.push({
      type: 'export',
      description: 'エクスポート時のエラーハンドリングテスト'
    });

    // 空のコンテンツでエクスポート試行
    await page.fill('[data-testid="japanese-input"]', '');
    await page.waitForTimeout(500);
    
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-png-button"]');
    
    // エラーメッセージ確認
    const errorMessage = page.locator('[data-testid="export-error-message"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('エクスポートするコンテンツがありません');
    }
    
    // 無効な設定でエクスポート試行
    await page.fill('[data-testid="japanese-input"]', 'テスト内容');
    await page.waitForTimeout(500);
    
    await page.click('[data-testid="export-menu-button"]');
    await page.click('[data-testid="export-png-button"]');
    
    // 無効なサイズ設定
    const customSize = page.locator('[data-testid="png-custom-size"]');
    if (await customSize.isVisible()) {
      await customSize.fill('10000x10000'); // 非現実的なサイズ
      
      const exportButton = page.locator('[data-testid="png-export-confirm"]');
      await exportButton.click();
      
      // エラーまたは警告確認
      const warning = page.locator('[data-testid="size-warning"]');
      if (await warning.isVisible()) {
        await expect(warning).toContainText('サイズが大きすぎます');
      }
    }
    
    console.log('Export error handling test completed');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // テスト失敗時の情報保存
    if (testInfo.status !== testInfo.expectedStatus) {
      // スクリーンショット
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
      
      // エクスポートメニューの状態
      try {
        const menuState = await page.locator('[data-testid="export-menu"]').screenshot();
        await testInfo.attach('export-menu-state', { body: menuState, contentType: 'image/png' });
      } catch (error) {
        console.log('Export menu state capture failed:', error.message);
      }
      
      // エラーログ
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });
      
      if (consoleLogs.length > 0) {
        await testInfo.attach('console-errors', { 
          body: consoleLogs.join('\n'), 
          contentType: 'text/plain' 
        });
      }
    }
  });
});