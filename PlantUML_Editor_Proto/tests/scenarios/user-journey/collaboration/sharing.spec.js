/**
 * TEST-013-1: 図表共有プロセステスト
 * ペルソナ: 佐藤次郎（プロジェクトマネージャー、PlantUML中級者）
 */

import { test, expect } from '@playwright/test';
import { 
  initializeForPersona, 
  createBasicDiagram,
  measurePerformance,
  calculateUsabilityScore 
} from '../journey-helpers.js';
import { personas, testData, successCriteria } from '../personas.js';

test.describe('図表共有プロセスジャーニー', () => {
  const personaType = 'collaborator';
  let testResults = [];

  test.beforeEach(async ({ page }) => {
    await initializeForPersona(page, personaType);
    
    // 共有テスト用の図表を作成
    const scenario = testData.collaboration.scenarios[0];
    await createBasicDiagram(page, scenario.input, ['システム管理者', 'データベース', 'メール通知']);
  });

  test('共有リンク生成機能', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let sharingResults = {
        shareButtonAvailable: false,
        linkGenerated: false,
        linkAccessible: false,
        shareDialogOpened: false
      };
      
      // 共有ボタン確認
      const shareButton = page.locator('[data-testid="share-diagram"], button:has-text("共有")');
      
      if (await shareButton.isVisible()) {
        sharingResults.shareButtonAvailable = true;
        await shareButton.click();
        await page.waitForTimeout(500);
        
        // 共有ダイアログ表示確認
        const shareDialog = page.locator('[data-testid="share-dialog"], .share-modal');
        if (await shareDialog.isVisible()) {
          sharingResults.shareDialogOpened = true;
          
          // リンク生成ボタン
          const generateLinkButton = page.locator('[data-testid="generate-link"], button:has-text("リンク生成")');
          if (await generateLinkButton.isVisible()) {
            await generateLinkButton.click();
            await page.waitForTimeout(1000);
            
            // 生成されたリンク確認
            const shareLink = page.locator('[data-testid="share-link"], input[readonly]');
            if (await shareLink.isVisible()) {
              const linkValue = await shareLink.inputValue();
              sharingResults.linkGenerated = linkValue.length > 0;
              sharingResults.linkAccessible = linkValue.startsWith('http');
              
              // リンクのコピー機能確認
              const copyButton = page.locator('[data-testid="copy-link"], button:has-text("コピー")');
              if (await copyButton.isVisible()) {
                await copyButton.click();
                // コピー成功通知確認
                const copyNotification = page.locator('[data-testid="copy-success"], .copy-notification');
                if (await copyNotification.isVisible()) {
                  sharingResults.copyFunctionWorking = true;
                }
              }
            }
          } else {
            // 自動リンク生成の場合
            const autoLink = page.locator('[data-testid="auto-share-link"], .generated-link');
            if (await autoLink.isVisible()) {
              const linkText = await autoLink.textContent();
              sharingResults.linkGenerated = linkText.includes('http');
            }
          }
        }
      } else {
        // エクスポート機能経由での共有確認
        const exportButton = page.locator('[data-testid="export-diagram"], button:has-text("エクスポート")');
        if (await exportButton.isVisible()) {
          await exportButton.click();
          await page.waitForTimeout(500);
          
          const shareOption = page.locator('[data-testid="export-share"], option:has-text("共有URL")');
          if (await shareOption.isVisible()) {
            sharingResults.shareButtonAvailable = true; // 代替手段として評価
          }
        }
      }
      
      return sharingResults;
    }, '共有リンク生成');
    
    // 共有機能の基本要件確認
    expect(testResult.result.shareButtonAvailable).toBeTruthy();
    
    // 共有成功時の時間基準確認
    if (testResult.result.linkGenerated) {
      expect(testResult.executionTime).toBeLessThan(successCriteria.collaboration.sharing);
    }
    
    testResults.push({
      test: '共有リンク生成',
      status: testResult.result.shareButtonAvailable ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('権限設定（閲覧/編集）', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let permissionResults = {
        permissionOptionsAvailable: false,
        viewOnlyOption: false,
        editPermissionOption: false,
        customPermissions: false
      };
      
      // 共有ダイアログを開く
      const shareButton = page.locator('[data-testid="share-diagram"], button:has-text("共有")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        
        // 権限設定セクション確認
        const permissionSection = page.locator('[data-testid="permission-settings"], .permission-controls');
        
        if (await permissionSection.isVisible()) {
          permissionResults.permissionOptionsAvailable = true;
          
          // 閲覧専用オプション
          const viewOnlyRadio = page.locator('[data-testid="permission-view"], input[value="view"]');
          const viewOnlyLabel = page.locator('label:has-text("閲覧専用")');
          
          if (await viewOnlyRadio.isVisible() || await viewOnlyLabel.isVisible()) {
            permissionResults.viewOnlyOption = true;
            
            // 閲覧専用を選択
            if (await viewOnlyRadio.isVisible()) {
              await viewOnlyRadio.click();
            } else {
              await viewOnlyLabel.click();
            }
            await page.waitForTimeout(300);
          }
          
          // 編集許可オプション
          const editRadio = page.locator('[data-testid="permission-edit"], input[value="edit"]');
          const editLabel = page.locator('label:has-text("編集可能")');
          
          if (await editRadio.isVisible() || await editLabel.isVisible()) {
            permissionResults.editPermissionOption = true;
            
            // 編集許可を選択
            if (await editRadio.isVisible()) {
              await editRadio.click();
            } else {
              await editLabel.click();
            }
            await page.waitForTimeout(300);
          }
          
          // カスタム権限設定
          const customPermissionArea = page.locator('[data-testid="custom-permissions"], .advanced-permissions');
          if (await customPermissionArea.isVisible()) {
            permissionResults.customPermissions = true;
            
            // 個別権限の確認
            const specificPermissions = page.locator('[data-testid="specific-permission"], input[type="checkbox"]');
            const permissionCount = await specificPermissions.count();
            permissionResults.specificPermissionCount = permissionCount;
          }
        } else {
          // シンプルな権限設定の確認
          const simplePermission = page.locator('select[name="permission"], .permission-select');
          if (await simplePermission.isVisible()) {
            permissionResults.permissionOptionsAvailable = true;
            
            // オプション確認
            const options = page.locator('option');
            const optionCount = await options.count();
            
            for (let i = 0; i < optionCount; i++) {
              const optionText = await options.nth(i).textContent();
              if (optionText.includes('閲覧') || optionText.includes('表示')) {
                permissionResults.viewOnlyOption = true;
              }
              if (optionText.includes('編集') || optionText.includes('修正')) {
                permissionResults.editPermissionOption = true;
              }
            }
          }
        }
      }
      
      return permissionResults;
    }, '権限設定');
    
    // 権限設定機能の評価
    const permissionFeatures = Object.values(testResult.result).filter(v => v === true).length;
    expect(permissionFeatures).toBeGreaterThan(1); // 少なくとも2つの権限機能
    
    testResults.push({
      test: '権限設定',
      status: testResult.result.permissionOptionsAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('パスワード保護設定', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let securityResults = {
        passwordProtectionAvailable: false,
        passwordSet: false,
        passwordStrengthValidation: false,
        accessControlWorking: false
      };
      
      // 共有ダイアログを開く
      const shareButton = page.locator('[data-testid="share-diagram"], button:has-text("共有")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        
        // パスワード保護オプション確認
        const passwordOption = page.locator('[data-testid="password-protection"], input[type="checkbox"]');
        const passwordLabel = page.locator('label:has-text("パスワード保護")');
        
        if (await passwordOption.isVisible() || await passwordLabel.isVisible()) {
          securityResults.passwordProtectionAvailable = true;
          
          // パスワード保護を有効化
          if (await passwordOption.isVisible()) {
            await passwordOption.click();
          } else {
            await passwordLabel.click();
          }
          await page.waitForTimeout(500);
          
          // パスワード入力フィールド表示確認
          const passwordInput = page.locator('[data-testid="share-password"], input[type="password"]');
          if (await passwordInput.isVisible()) {
            // パスワード設定テスト
            const testPassword = 'SecurePass123!';
            await passwordInput.fill(testPassword);
            securityResults.passwordSet = true;
            
            // パスワード強度チェック確認
            const strengthIndicator = page.locator('[data-testid="password-strength"], .password-strength');
            if (await strengthIndicator.isVisible()) {
              securityResults.passwordStrengthValidation = true;
              
              const strengthText = await strengthIndicator.textContent();
              expect(strengthText).toBeTruthy();
            }
            
            // 確認用パスワード入力
            const confirmPasswordInput = page.locator('[data-testid="confirm-password"], input[placeholder*="確認"]');
            if (await confirmPasswordInput.isVisible()) {
              await confirmPasswordInput.fill(testPassword);
              securityResults.passwordConfirmationRequired = true;
            }
          }
        } else {
          // セキュリティ設定セクション確認
          const securitySection = page.locator('[data-testid="security-settings"], .security-options');
          if (await securitySection.isVisible()) {
            const securityOptions = page.locator('.security-option');
            const securityCount = await securityOptions.count();
            securityResults.passwordProtectionAvailable = securityCount > 0;
          }
        }
      }
      
      return securityResults;
    }, 'パスワード保護');
    
    testResults.push({
      test: 'パスワード保護',
      status: testResult.result.passwordProtectionAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('有効期限設定', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let expirationResults = {
        expirationAvailable: false,
        datePickerWorking: false,
        presetOptionsAvailable: false,
        customDurationSet: false
      };
      
      // 共有ダイアログを開く
      const shareButton = page.locator('[data-testid="share-diagram"], button:has-text("共有")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        
        // 有効期限設定確認
        const expirationSection = page.locator('[data-testid="expiration-settings"], .expiration-controls');
        
        if (await expirationSection.isVisible()) {
          expirationResults.expirationAvailable = true;
          
          // 日付ピッカー確認
          const datePicker = page.locator('[data-testid="expiration-date"], input[type="date"]');
          if (await datePicker.isVisible()) {
            expirationResults.datePickerWorking = true;
            
            // 1週間後の日付を設定
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const dateString = futureDate.toISOString().split('T')[0];
            
            await datePicker.fill(dateString);
            expirationResults.customDurationSet = true;
          }
          
          // プリセット期間オプション確認
          const presetOptions = page.locator('[data-testid="preset-duration"], select, .duration-preset');
          if (await presetOptions.isVisible()) {
            expirationResults.presetOptionsAvailable = true;
            
            // プリセット選択テスト
            if (await presetOptions.isVisible() && await presetOptions.getAttribute('tagName') === 'SELECT') {
              await presetOptions.selectOption('7days');
            } else {
              const oneWeekOption = page.locator('[data-testid="duration-week"], button:has-text("1週間")');
              if (await oneWeekOption.isVisible()) {
                await oneWeekOption.click();
              }
            }
          }
        } else {
          // 簡易的な期限設定確認
          const simpleExpiration = page.locator('input[name*="expire"], .expiration-field');
          if (await simpleExpiration.isVisible()) {
            expirationResults.expirationAvailable = true;
          }
        }
      }
      
      return expirationResults;
    }, '有効期限設定');
    
    testResults.push({
      test: '有効期限設定',
      status: testResult.result.expirationAvailable ? 'passed' : 'not-implemented',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test('共有プロセス完了確認', async ({ page }) => {
    const testResult = await measurePerformance(page, async () => {
      let completionResults = {
        shareProcessCompleted: false,
        notificationSent: false,
        shareHistoryRecorded: false,
        accessAnalyticsAvailable: false
      };
      
      // 完全な共有プロセス実行
      const shareButton = page.locator('[data-testid="share-diagram"], button:has-text("共有")');
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
        
        // 基本設定を完了
        const confirmShareButton = page.locator('[data-testid="confirm-share"], button:has-text("共有実行")');
        if (await confirmShareButton.isVisible()) {
          await confirmShareButton.click();
          await page.waitForTimeout(1000);
          
          // 共有完了通知確認
          const successNotification = page.locator('[data-testid="share-success"], .share-complete');
          if (await successNotification.isVisible()) {
            completionResults.shareProcessCompleted = true;
            
            const notificationText = await successNotification.textContent();
            if (notificationText.includes('共有') && notificationText.includes('完了')) {
              completionResults.notificationSent = true;
            }
          }
          
          // 共有履歴記録確認
          const historyLink = page.locator('[data-testid="share-history"], a:has-text("共有履歴")');
          if (await historyLink.isVisible()) {
            completionResults.shareHistoryRecorded = true;
            
            // 履歴詳細確認
            await historyLink.click();
            await page.waitForTimeout(500);
            
            const historyEntries = page.locator('[data-testid="history-entry"], .history-item');
            const entryCount = await historyEntries.count();
            completionResults.historyEntryCount = entryCount;
          }
          
          // アクセス分析確認
          const analyticsPanel = page.locator('[data-testid="access-analytics"], .analytics-panel');
          if (await analyticsPanel.isVisible()) {
            completionResults.accessAnalyticsAvailable = true;
          }
        }
      }
      
      return completionResults;
    }, '共有プロセス完了');
    
    expect(testResult.result.shareProcessCompleted).toBeTruthy();
    
    testResults.push({
      test: '共有プロセス完了',
      status: testResult.result.shareProcessCompleted ? 'passed' : 'failed',
      executionTime: testResult.executionTime,
      metrics: testResult.result
    });
  });

  test.afterAll(async () => {
    // 図表共有プロセスの総合評価
    const totalTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const notImplementedTests = testResults.filter(r => r.status === 'not-implemented').length;
    const completionRate = passedTests / testResults.length;
    
    const usabilityScore = calculateUsabilityScore({
      executionTime: totalTime,
      errorRate: (testResults.length - passedTests) / testResults.length,
      completionRate: completionRate
    }, personaType);
    
    console.log('=== 図表共有プロセス結果 ===');
    console.log(`ユーザビリティスコア: ${usabilityScore}/100`);
    console.log(`機能実装率: ${(completionRate * 100).toFixed(1)}%`);
    console.log(`共有完了時間: ${Math.round(totalTime)}ms`);
    console.log(`未実装機能: ${notImplementedTests}件`);
    
    // コラボレーション評価
    if (totalTime <= successCriteria.collaboration.sharing) {
      console.log('⚡ 迅速な共有プロセスを実現');
    } else {
      console.log('🐌 共有プロセスの効率化が必要');
    }
    
    if (completionRate >= 0.8) {
      console.log('🤝 充実した共有機能を提供');
    } else {
      console.log('🔧 共有機能の拡充が必要');
    }
    
    if (notImplementedTests === 0) {
      console.log('🏆 企業レベルの共有機能を完備');
    } else {
      console.log(`🚧 ${notImplementedTests}件の共有機能が未実装`);
    }
  });
});