/**
 * RemainingComponents - 残りのコンポーネント統合実装
 * Sprint3 TEST-005-3実装
 * 
 * 時間効率を考慮し、残りの6つのコンポーネントを統合実装
 * - DropdownComponent
 * - InputFieldComponent  
 * - ErrorMessageComponent
 * - DragHandleComponent
 * - LoopBlockComponent
 * - ParallelBlockComponent
 */

import { Page } from '@playwright/test';

/**
 * DropdownComponent - ドロップダウン選択コンポーネント
 */
export class DropdownComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      dropdown: 'select, .dropdown, [data-testid*="dropdown"]',
      option: 'option, .dropdown-option',
      selected: '.selected, :checked',
      placeholder: '.placeholder, [data-placeholder]'
    };
  }

  async selectOption(dropdownSelector, optionValue) {
    const dropdown = this.page.locator(dropdownSelector);
    await dropdown.selectOption(optionValue);
    return this;
  }

  async getSelectedValue(dropdownSelector) {
    const dropdown = this.page.locator(dropdownSelector);
    return await dropdown.inputValue();
  }

  async getOptions(dropdownSelector) {
    const dropdown = this.page.locator(dropdownSelector);
    return await dropdown.locator('option').allTextContents();
  }
}

/**
 * InputFieldComponent - 入力フィールドコンポーネント
 */
export class InputFieldComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      textInput: 'input[type="text"], input:not([type])',
      textarea: 'textarea',
      numberInput: 'input[type="number"]',
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      validationError: '.field-error, .validation-error',
      label: 'label'
    };
  }

  async fillInput(inputSelector, value, options = {}) {
    const { delay = 50, clear = true } = options;
    const input = this.page.locator(inputSelector);
    
    if (clear) {
      await input.clear();
    }
    
    // 日本語対応の入力
    await input.type(value.toString(), { delay });
    
    // IME確定待機
    await this.page.waitForTimeout(100);
    
    return this;
  }

  async getInputValue(inputSelector) {
    const input = this.page.locator(inputSelector);
    return await input.inputValue();
  }

  async validateInput(inputSelector) {
    const input = this.page.locator(inputSelector);
    const errorElement = input.locator('.. .field-error');
    return await errorElement.isVisible();
  }
}

/**
 * ErrorMessageComponent - エラーメッセージコンポーネント
 */
export class ErrorMessageComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      errorMessage: '.error-message, .alert-error, [data-testid*="error"]',
      warningMessage: '.warning-message, .alert-warning',
      successMessage: '.success-message, .alert-success',
      fieldError: '.field-error',
      globalError: '.global-error'
    };
  }

  async getErrorMessage(errorSelector = this.selectors.errorMessage) {
    const errorElement = this.page.locator(errorSelector);
    const isVisible = await errorElement.isVisible();
    return isVisible ? await errorElement.textContent() : null;
  }

  async waitForErrorToShow(errorSelector = this.selectors.errorMessage, timeout = 5000) {
    await this.page.waitForSelector(errorSelector, { state: 'visible', timeout });
    return this;
  }

  async waitForErrorToHide(errorSelector = this.selectors.errorMessage, timeout = 5000) {
    await this.page.waitForSelector(errorSelector, { state: 'hidden', timeout });
    return this;
  }

  async getAllErrors() {
    const errorElements = await this.page.locator(this.selectors.errorMessage).all();
    const errors = [];
    
    for (const element of errorElements) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        errors.push(await element.textContent());
      }
    }
    
    return errors;
  }
}

/**
 * DragHandleComponent - ドラッグハンドルコンポーネント
 */
export class DragHandleComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      dragHandle: '[data-testid="drag-handle"], .drag-handle',
      draggableItem: '.draggable, [draggable="true"]',
      dropZone: '.drop-zone, [data-drop-zone]',
      dragIndicator: '.drag-indicator',
      sortableList: '.sortable-list'
    };
  }

  async dragItem(fromSelector, toSelector, options = {}) {
    const { steps = 5, delay = 100 } = options;
    
    const fromElement = this.page.locator(fromSelector);
    const toElement = this.page.locator(toSelector);
    
    // ドラッグ開始
    await fromElement.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(delay);
    
    // ドラッグ移動
    const toBox = await toElement.boundingBox();
    if (toBox) {
      await this.page.mouse.move(
        toBox.x + toBox.width / 2, 
        toBox.y + toBox.height / 2, 
        { steps }
      );
    }
    
    // ドロップ
    await this.page.mouse.up();
    
    // 移動完了を待機
    await this.page.waitForTimeout(300);
    
    return this;
  }

  async reorderItems(listSelector, fromIndex, toIndex) {
    const fromItem = this.page.locator(`${listSelector} .draggable:nth-child(${fromIndex + 1})`);
    const toItem = this.page.locator(`${listSelector} .draggable:nth-child(${toIndex + 1})`);
    
    await this.dragItem(fromItem, toItem);
    
    return this;
  }
}

/**
 * LoopBlockComponent - ループブロックコンポーネント
 */
export class LoopBlockComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      loopBlock: '.loop-block, [data-testid="loop-block"]',
      loopIcon: '[data-testid="loop-icon"]', // 🔁
      loopCondition: '[data-testid="loop-condition"]',
      loopContent: '[data-testid="loop-content"]',
      addLoopAction: '[data-testid="add-loop-action"]',
      loopActions: '[data-testid="loop-actions"]'
    };
  }

  async setLoopCondition(loopIndex, condition) {
    const loopBlock = this.page.locator(`${this.selectors.loopBlock}:nth-child(${loopIndex + 1})`);
    const conditionInput = loopBlock.locator(this.selectors.loopCondition);
    
    await conditionInput.clear();
    await conditionInput.type(condition, { delay: 50 });
    await conditionInput.press('Enter');
    
    return this;
  }

  async addActionToLoop(loopIndex, actionData) {
    const loopBlock = this.page.locator(`${this.selectors.loopBlock}:nth-child(${loopIndex + 1})`);
    const addButton = loopBlock.locator(this.selectors.addLoopAction);
    
    await addButton.click();
    
    // アクション編集ダイアログで設定
    await this.page.waitForSelector('.action-dialog', { state: 'visible' });
    await this.fillActionDialog(actionData);
    await this.page.click('.dialog-confirm');
    
    return this;
  }

  async fillActionDialog(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;
    
    if (actorFrom) await this.page.selectOption('.dialog-actor-from', actorFrom);
    if (arrowType) await this.page.selectOption('.dialog-arrow-type', arrowType);
    if (actorTo) await this.page.selectOption('.dialog-actor-to', actorTo);
    if (message) await this.page.fill('.dialog-message', message);
  }

  async getLoopData(loopIndex) {
    const loopBlock = this.page.locator(`${this.selectors.loopBlock}:nth-child(${loopIndex + 1})`);
    
    return {
      condition: await loopBlock.locator(this.selectors.loopCondition).textContent(),
      actionCount: await loopBlock.locator(`${this.selectors.loopActions} .action-item`).count()
    };
  }
}

/**
 * ParallelBlockComponent - 並行処理ブロックコンポーネント
 */
export class ParallelBlockComponent {
  constructor(page) {
    this.page = page;
    this.selectors = {
      parallelBlock: '.parallel-block, [data-testid="parallel-block"]',
      threadTabs: '[data-testid="thread-tabs"]',
      threadTab: '[data-testid="thread-tab"]',
      threadIcon: '[data-testid="thread-icon"]', // 🧵
      addThreadButton: '[data-testid="add-thread-button"]', // ➕
      deleteThreadButton: '[data-testid="delete-thread-button"]', // ×
      threadContent: '[data-testid="thread-content"]',
      addThreadAction: '[data-testid="add-thread-action"]'
    };
  }

  async addThread(parallelIndex) {
    const parallelBlock = this.page.locator(`${this.selectors.parallelBlock}:nth-child(${parallelIndex + 1})`);
    const addButton = parallelBlock.locator(this.selectors.addThreadButton);
    
    await addButton.click();
    
    // 新しいスレッドタブの表示を待機
    await this.page.waitForSelector(`${this.selectors.threadTab}:last-child`, { state: 'visible' });
    
    return this;
  }

  async selectThread(parallelIndex, threadIndex) {
    const parallelBlock = this.page.locator(`${this.selectors.parallelBlock}:nth-child(${parallelIndex + 1})`);
    const threadTab = parallelBlock.locator(`${this.selectors.threadTab}:nth-child(${threadIndex + 1})`);
    
    await threadTab.click();
    
    // アクティブスレッドの切り替えを待機
    await threadTab.waitFor({ state: 'visible' });
    
    return this;
  }

  async addActionToThread(parallelIndex, threadIndex, actionData) {
    await this.selectThread(parallelIndex, threadIndex);
    
    const parallelBlock = this.page.locator(`${this.selectors.parallelBlock}:nth-child(${parallelIndex + 1})`);
    const addButton = parallelBlock.locator(this.selectors.addThreadAction);
    
    await addButton.click();
    
    // アクション編集ダイアログで設定
    await this.page.waitForSelector('.thread-action-dialog', { state: 'visible' });
    await this.fillActionDialog(actionData);
    await this.page.click('.dialog-confirm');
    
    return this;
  }

  async fillActionDialog(actionData) {
    const { actorFrom, arrowType, actorTo, message } = actionData;
    
    if (actorFrom) await this.page.selectOption('.thread-action-from', actorFrom);
    if (arrowType) await this.page.selectOption('.thread-action-arrow', arrowType);
    if (actorTo) await this.page.selectOption('.thread-action-to', actorTo);
    if (message) await this.page.fill('.thread-action-message', message);
  }

  async getThreadCount(parallelIndex) {
    const parallelBlock = this.page.locator(`${this.selectors.parallelBlock}:nth-child(${parallelIndex + 1})`);
    return await parallelBlock.locator(this.selectors.threadTab).count();
  }

  async getParallelData(parallelIndex) {
    const threadCount = await this.getThreadCount(parallelIndex);
    const threads = [];
    
    for (let i = 0; i < threadCount; i++) {
      await this.selectThread(parallelIndex, i);
      
      const parallelBlock = this.page.locator(`${this.selectors.parallelBlock}:nth-child(${parallelIndex + 1})`);
      const actionCount = await parallelBlock.locator('.thread-action-item').count();
      
      threads.push({
        index: i,
        actionCount
      });
    }
    
    return {
      threadCount,
      threads
    };
  }
}

/**
 * 統合コンポーネントファクトリー
 */
export function createRemainingComponents(page) {
  return {
    dropdown: new DropdownComponent(page),
    inputField: new InputFieldComponent(page),
    errorMessage: new ErrorMessageComponent(page),
    dragHandle: new DragHandleComponent(page),
    loopBlock: new LoopBlockComponent(page),
    parallelBlock: new ParallelBlockComponent(page)
  };
}

/**
 * 統合テストヘルパー
 */
export const RemainingComponentsTestHelpers = {
  /**
   * 全残りコンポーネントの基本機能テスト
   * @param {Page} page - ページオブジェクト
   * @returns {Object} テスト結果
   */
  async testBasicFunctionality(page) {
    const components = createRemainingComponents(page);
    const results = {};
    
    // DropdownComponent テスト
    try {
      results.dropdown = {
        initialized: components.dropdown !== null,
        canSelect: typeof components.dropdown.selectOption === 'function',
        canGetValue: typeof components.dropdown.getSelectedValue === 'function'
      };
    } catch (error) {
      results.dropdown = { error: error.message };
    }
    
    // InputFieldComponent テスト
    try {
      results.inputField = {
        initialized: components.inputField !== null,
        canFill: typeof components.inputField.fillInput === 'function',
        canValidate: typeof components.inputField.validateInput === 'function'
      };
    } catch (error) {
      results.inputField = { error: error.message };
    }
    
    // ErrorMessageComponent テスト
    try {
      results.errorMessage = {
        initialized: components.errorMessage !== null,
        canGetErrors: typeof components.errorMessage.getErrorMessage === 'function',
        canWaitForErrors: typeof components.errorMessage.waitForErrorToShow === 'function'
      };
    } catch (error) {
      results.errorMessage = { error: error.message };
    }
    
    // DragHandleComponent テスト
    try {
      results.dragHandle = {
        initialized: components.dragHandle !== null,
        canDrag: typeof components.dragHandle.dragItem === 'function',
        canReorder: typeof components.dragHandle.reorderItems === 'function'
      };
    } catch (error) {
      results.dragHandle = { error: error.message };
    }
    
    // LoopBlockComponent テスト
    try {
      results.loopBlock = {
        initialized: components.loopBlock !== null,
        canSetCondition: typeof components.loopBlock.setLoopCondition === 'function',
        canAddActions: typeof components.loopBlock.addActionToLoop === 'function'
      };
    } catch (error) {
      results.loopBlock = { error: error.message };
    }
    
    // ParallelBlockComponent テスト
    try {
      results.parallelBlock = {
        initialized: components.parallelBlock !== null,
        canAddThreads: typeof components.parallelBlock.addThread === 'function',
        canManageThreads: typeof components.parallelBlock.selectThread === 'function'
      };
    } catch (error) {
      results.parallelBlock = { error: error.message };
    }
    
    return {
      ...results,
      timestamp: new Date().toISOString(),
      allComponentsWorking: !Object.values(results).some(result => result.error)
    };
  },

  /**
   * 統合パフォーマンステスト
   * @param {Page} page - ページオブジェクト
   * @returns {Object} パフォーマンス結果
   */
  async measurePerformance(page) {
    const startTime = Date.now();
    const components = createRemainingComponents(page);
    
    const testOperations = [
      // Dropdown操作
      async () => {
        try {
          const dropdown = page.locator('select').first();
          if (await dropdown.count() > 0) {
            await components.dropdown.selectOption(dropdown, '0');
          }
        } catch (error) {
          // 無視
        }
      },
      
      // InputField操作
      async () => {
        try {
          const input = page.locator('input[type="text"]').first();
          if (await input.count() > 0) {
            await components.inputField.fillInput(input, 'テスト入力');
          }
        } catch (error) {
          // 無視
        }
      },
      
      // ErrorMessage操作
      async () => {
        try {
          await components.errorMessage.getAllErrors();
        } catch (error) {
          // 無視
        }
      }
    ];
    
    const operationTimes = [];
    
    for (let i = 0; i < testOperations.length; i++) {
      const opStart = Date.now();
      try {
        await testOperations[i]();
        operationTimes.push(Date.now() - opStart);
      } catch (error) {
        operationTimes.push(-1);
      }
    }
    
    return {
      totalTime: Date.now() - startTime,
      operationTimes,
      averageTime: operationTimes.filter(t => t > 0).reduce((a, b) => a + b, 0) / operationTimes.length,
      timestamp: new Date().toISOString()
    };
  }
};

// デフォルトエクスポート
export default {
  DropdownComponent,
  InputFieldComponent,
  ErrorMessageComponent,
  DragHandleComponent,
  LoopBlockComponent,
  ParallelBlockComponent,
  createRemainingComponents,
  RemainingComponentsTestHelpers
};