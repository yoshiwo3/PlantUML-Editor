/**
 * BaseFlow - Flow Object Model (FOM) 基底クラス
 * 
 * PlantUML Editor Sprint3 Hybrid Object Model Framework
 * 複数ページ・コンポーネントにまたがるビジネスフローのテスト操作を提供
 */

import { expect } from '@playwright/test';

export class BaseFlow {
  constructor(page, context = null) {
    this.page = page;
    this.context = context;
    this.steps = [];
    this.currentStep = 0;
    this.startTime = null;
    this.flowMetrics = {};
    
    // フロー実行オプション
    this.options = {
      captureScreenshots: true,
      measurePerformance: true,
      validateEachStep: true,
      continueOnError: false,
      maxRetries: 3
    };
    
    // ステップ実行履歴
    this.executionLog = [];
  }

  /**
   * フローステップ定義
   */
  defineStep(name, action, validation = null, options = {}) {
    this.steps.push({
      name,
      action,
      validation,
      options: { ...this.options, ...options },
      retry: 0,
      executed: false,
      duration: null,
      error: null
    });
    
    return this;
  }

  /**
   * フロー実行
   */
  async execute() {
    this.startTime = Date.now();
    this.flowMetrics = {
      totalSteps: this.steps.length,
      completedSteps: 0,
      failedSteps: 0,
      totalDuration: 0,
      averageStepDuration: 0,
      errors: []
    };
    
    console.log(`Starting flow execution: ${this.steps.length} steps`);
    
    try {
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        await this.executeStep(this.steps[i], i);
      }
      
      await this.onFlowComplete();
      
    } catch (error) {
      await this.onFlowError(error);
      throw error;
    } finally {
      await this.finalizeFlow();
    }
    
    return this.flowMetrics;
  }

  /**
   * 個別ステップ実行
   */
  async executeStep(step, stepIndex) {
    const stepStartTime = Date.now();
    
    console.log(`Executing step ${stepIndex + 1}/${this.steps.length}: ${step.name}`);
    
    try {
      // スクリーンショット（実行前）
      if (step.options.captureScreenshots) {
        await this.captureStepScreenshot(`${stepIndex + 1}_${step.name}_before`);
      }
      
      // ステップアクション実行
      const actionResult = await this.executeStepAction(step);
      
      // バリデーション実行
      if (step.validation && step.options.validateEachStep) {
        await this.executeStepValidation(step, actionResult);
      }
      
      // スクリーンショット（実行後）
      if (step.options.captureScreenshots) {
        await this.captureStepScreenshot(`${stepIndex + 1}_${step.name}_after`);
      }
      
      // ステップ完了処理
      step.executed = true;
      step.duration = Date.now() - stepStartTime;
      this.flowMetrics.completedSteps++;
      
      // 実行ログ記録
      this.executionLog.push({
        step: stepIndex + 1,
        name: step.name,
        status: 'SUCCESS',
        duration: step.duration,
        result: actionResult
      });
      
      console.log(`Step ${stepIndex + 1} completed in ${step.duration}ms`);
      
    } catch (error) {
      await this.handleStepError(step, stepIndex, error);
    }
  }

  /**
   * ステップアクション実行（リトライ機能付き）
   */
  async executeStepAction(step) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= step.options.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retrying step "${step.name}" (attempt ${attempt}/${step.options.maxRetries})`);
          await this.page.waitForTimeout(1000 * attempt); // 指数バックオフ
        }
        
        const result = await step.action(this.page, this.context);
        return result;
        
      } catch (error) {
        lastError = error;
        step.retry = attempt + 1;
        
        if (attempt < step.options.maxRetries) {
          console.warn(`Step "${step.name}" failed (attempt ${attempt + 1}), retrying...`);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * ステップバリデーション実行
   */
  async executeStepValidation(step, actionResult) {
    try {
      await step.validation(this.page, this.context, actionResult);
    } catch (validationError) {
      throw new Error(`Validation failed for step "${step.name}": ${validationError.message}`);
    }
  }

  /**
   * ステップエラーハンドリング
   */
  async handleStepError(step, stepIndex, error) {
    step.error = error.message;
    this.flowMetrics.failedSteps++;
    this.flowMetrics.errors.push({
      step: stepIndex + 1,
      name: step.name,
      error: error.message,
      retry: step.retry
    });
    
    // エラースクリーンショット
    await this.captureStepScreenshot(`${stepIndex + 1}_${step.name}_error`);
    
    // 実行ログ記録
    this.executionLog.push({
      step: stepIndex + 1,
      name: step.name,
      status: 'FAILED',
      error: error.message,
      retry: step.retry
    });
    
    console.error(`Step ${stepIndex + 1} failed: ${error.message}`);
    
    if (!step.options.continueOnError) {
      throw error;
    }
  }

  /**
   * ステップスクリーンショット撮影
   */
  async captureStepScreenshot(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `flow_${this.constructor.name}_${name}_${timestamp}.png`;
      
      await this.page.screenshot({
        path: `test-results/flows/${filename}`,
        fullPage: true
      });
    } catch (error) {
      console.warn(`Failed to capture screenshot: ${error.message}`);
    }
  }

  /**
   * フロー完了時処理
   */
  async onFlowComplete() {
    const totalDuration = Date.now() - this.startTime;
    this.flowMetrics.totalDuration = totalDuration;
    this.flowMetrics.averageStepDuration = totalDuration / this.steps.length;
    
    console.log(`Flow completed successfully in ${totalDuration}ms`);
    console.log(`Average step duration: ${this.flowMetrics.averageStepDuration.toFixed(2)}ms`);
    
    // フロー完了スクリーンショット
    await this.captureStepScreenshot('flow_completed');
  }

  /**
   * フローエラー時処理
   */
  async onFlowError(error) {
    const totalDuration = Date.now() - this.startTime;
    this.flowMetrics.totalDuration = totalDuration;
    
    console.error(`Flow failed after ${totalDuration}ms: ${error.message}`);
    
    // エラー詳細スクリーンショット
    await this.captureStepScreenshot('flow_error');
  }

  /**
   * フロー実行履歴保存
   */
  async finalizeFlow() {
    const flowReport = {
      flowName: this.constructor.name,
      timestamp: new Date().toISOString(),
      metrics: this.flowMetrics,
      executionLog: this.executionLog,
      steps: this.steps.map(step => ({
        name: step.name,
        executed: step.executed,
        duration: step.duration,
        retry: step.retry,
        error: step.error
      }))
    };
    
    // レポート保存
    try {
      const fs = require('fs').promises;
      const reportPath = `test-results/flows/${this.constructor.name}_${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(flowReport, null, 2));
    } catch (error) {
      console.warn(`Failed to save flow report: ${error.message}`);
    }
  }

  /**
   * フロー状態確認
   */
  getFlowStatus() {
    return {
      currentStep: this.currentStep + 1,
      totalSteps: this.steps.length,
      completedSteps: this.flowMetrics.completedSteps,
      failedSteps: this.flowMetrics.failedSteps,
      isComplete: this.currentStep >= this.steps.length,
      hasErrors: this.flowMetrics.failedSteps > 0
    };
  }

  /**
   * フロー進行率取得
   */
  getProgress() {
    return {
      percentage: Math.round((this.flowMetrics.completedSteps / this.steps.length) * 100),
      current: this.flowMetrics.completedSteps,
      total: this.steps.length
    };
  }

  /**
   * ステップスキップ
   */
  skipStep(stepIndex, reason = 'Skipped by user') {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].executed = true;
      this.steps[stepIndex].error = reason;
      
      this.executionLog.push({
        step: stepIndex + 1,
        name: this.steps[stepIndex].name,
        status: 'SKIPPED',
        reason: reason
      });
    }
  }

  /**
   * フロー一時停止
   */
  async pause(duration = 1000) {
    console.log(`Flow paused for ${duration}ms`);
    await this.page.waitForTimeout(duration);
  }

  /**
   * 条件分岐ステップ
   */
  defineConditionalStep(name, condition, actionIfTrue, actionIfFalse = null, options = {}) {
    const conditionalAction = async (page, context) => {
      const conditionResult = await condition(page, context);
      
      if (conditionResult && actionIfTrue) {
        return await actionIfTrue(page, context);
      } else if (!conditionResult && actionIfFalse) {
        return await actionIfFalse(page, context);
      }
      
      return { condition: conditionResult, action: conditionResult ? 'true' : 'false' };
    };
    
    return this.defineStep(name, conditionalAction, null, options);
  }

  /**
   * 並列ステップ実行
   */
  async executeParallelSteps(steps) {
    const promises = steps.map(async (stepConfig, index) => {
      try {
        const result = await stepConfig.action(this.page, this.context);
        return { index, result, error: null };
      } catch (error) {
        return { index, result: null, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(promises);
    return results.map(result => result.value || result.reason);
  }

  /**
   * データ駆動ステップ
   */
  defineDataDrivenStep(name, action, testData, options = {}) {
    const dataDrivenAction = async (page, context) => {
      const results = [];
      
      for (let i = 0; i < testData.length; i++) {
        const data = testData[i];
        console.log(`Executing data iteration ${i + 1}/${testData.length}`);
        
        try {
          const result = await action(page, context, data, i);
          results.push({ data, result, error: null });
        } catch (error) {
          results.push({ data, result: null, error: error.message });
          
          if (!options.continueOnDataError) {
            throw error;
          }
        }
      }
      
      return results;
    };
    
    return this.defineStep(name, dataDrivenAction, null, options);
  }

  /**
   * フロー実行コンテキスト設定
   */
  setContext(key, value) {
    if (!this.context) {
      this.context = {};
    }
    this.context[key] = value;
  }

  /**
   * フロー実行コンテキスト取得
   */
  getContext(key) {
    return this.context ? this.context[key] : undefined;
  }

  /**
   * フロークリーンアップ
   */
  async cleanup() {
    // 必要に応じてオーバーライド
    console.log(`Cleaning up flow: ${this.constructor.name}`);
  }
}

/**
 * PlantUML Editor 専用フロークラス
 */
export class PlantUMLEditorFlow extends BaseFlow {
  constructor(page, context = null) {
    super(page, context);
    this.baseURL = process.env.BASE_URL || 'http://localhost:8086';
  }

  /**
   * エディター初期化フロー
   */
  defineEditorInitializationFlow() {
    return this
      .defineStep(
        'Navigate to PlantUML Editor',
        async (page) => {
          await page.goto(this.baseURL);
          return { url: page.url() };
        },
        async (page) => {
          await expect(page).toHaveTitle(/PlantUML/);
        }
      )
      .defineStep(
        'Wait for Editor Load',
        async (page) => {
          await page.waitForSelector('#plantuml-editor', { timeout: 10000 });
          return { editorLoaded: true };
        },
        async (page) => {
          const editor = await page.locator('#plantuml-editor');
          await expect(editor).toBeVisible();
        }
      )
      .defineStep(
        'Verify Japanese Input Support',
        async (page) => {
          const textInput = await page.locator('textarea, input[type="text"]').first();
          await textInput.fill('日本語テスト');
          const value = await textInput.inputValue();
          return { japaneseSupport: value === '日本語テスト' };
        },
        async (page, context, result) => {
          expect(result.japaneseSupport).toBe(true);
        }
      );
  }

  /**
   * アクション編集フロー
   */
  defineActionEditingFlow(actionData) {
    return this
      .defineStep(
        'Open Action Editor',
        async (page) => {
          await page.click('[data-testid="add-action-button"]');
          await page.waitForSelector('.action-editor-modal');
          return { modalOpened: true };
        }
      )
      .defineStep(
        'Fill Action Details',
        async (page) => {
          await page.selectOption('[data-testid="actor-from"]', actionData.actorFrom);
          await page.selectOption('[data-testid="arrow-type"]', actionData.arrowType);
          await page.selectOption('[data-testid="actor-to"]', actionData.actorTo);
          await page.fill('[data-testid="message-input"]', actionData.message);
          return { actionFilled: true };
        }
      )
      .defineStep(
        'Save Action',
        async (page) => {
          await page.click('[data-testid="save-action-button"]');
          await page.waitForSelector('.action-editor-modal', { state: 'hidden' });
          return { actionSaved: true };
        },
        async (page) => {
          // PlantUML コードに反映されているか確認
          const plantUMLCode = await page.textContent('#plantuml-code');
          expect(plantUMLCode).toContain(actionData.message);
        }
      );
  }

  /**
   * パフォーマンステストフロー
   */
  definePerformanceTestFlow() {
    return this
      .defineStep(
        'Measure Initial Load Performance',
        async (page) => {
          const startTime = Date.now();
          await page.goto(this.baseURL);
          await page.waitForLoadState('domcontentloaded');
          const loadTime = Date.now() - startTime;
          
          return { initialLoadTime: loadTime };
        },
        async (page, context, result) => {
          expect(result.initialLoadTime).toBeLessThan(3000); // 3秒以内
        }
      )
      .defineStep(
        'Measure Memory Usage',
        async (page) => {
          const memoryInfo = await page.evaluate(() => {
            return performance.memory ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize
            } : null;
          });
          
          return { memoryUsage: memoryInfo };
        },
        async (page, context, result) => {
          if (result.memoryUsage) {
            const memoryMB = result.memoryUsage.used / (1024 * 1024);
            expect(memoryMB).toBeLessThan(100); // 100MB以内
          }
        }
      );
  }
}

export default BaseFlow;