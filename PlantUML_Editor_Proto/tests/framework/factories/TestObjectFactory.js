/**
 * TestObjectFactory - Hybrid Object Model オブジェクトファクトリー
 * 
 * Sprint3 Hybrid Object Model Framework
 * Page/Component/Flow オブジェクトの生成と管理を提供
 */

import { EditorPage } from '../pages/EditorPage.js';
import { ActionEditorComponent } from '../components/ActionEditorComponent.js';
import { EditorWorkflow } from '../flows/EditorWorkflow.js';
import { SecurityTestFramework } from '../security/SecurityTestFramework.js';
import { PerformanceTestFramework } from '../performance/PerformanceTestFramework.js';
import TestHelpers from '../utils/TestHelpers.js';

export class TestObjectFactory {
  constructor() {
    this.instances = new Map();
    this.testHelpers = new TestHelpers();
  }

  /**
   * ファクトリー初期化
   */
  async initialize() {
    await this.testHelpers.initialize();
  }

  /**
   * Page Object 生成
   */
  async createPageObject(type, page, context = null, options = {}) {
    const key = `page_${type}_${page._guid || Date.now()}`;
    
    if (this.instances.has(key) && !options.forceNew) {
      return this.instances.get(key);
    }
    
    let pageObject;
    
    switch (type.toLowerCase()) {
      case 'editor':
      case 'editorpage':
        pageObject = new EditorPage(page, context);
        break;
      
      default:
        throw new Error(`Unknown page object type: ${type}`);
    }
    
    // 初期化処理
    if (pageObject && typeof pageObject.initialize === 'function') {
      await pageObject.initialize();
    }
    
    this.instances.set(key, pageObject);
    return pageObject;
  }

  /**
   * Component Object 生成
   */
  async createComponentObject(type, page, selector, options = {}) {
    const key = `component_${type}_${selector}_${page._guid || Date.now()}`;
    
    if (this.instances.has(key) && !options.forceNew) {
      return this.instances.get(key);
    }
    
    let componentObject;
    
    switch (type.toLowerCase()) {
      case 'actioneditor':
      case 'actioneditorcomponent':
        componentObject = new ActionEditorComponent(page, selector, options);
        break;
      
      // その他のコンポーネントタイプを追加可能
      case 'plantumlpreview':
        // 将来的に PlantUMLPreviewComponent を追加
        break;
      
      case 'toolbar':
        // 将来的に ToolbarComponent を追加
        break;
      
      default:
        throw new Error(`Unknown component object type: ${type}`);
    }
    
    // 初期化処理
    if (componentObject && typeof componentObject.initialize === 'function') {
      await componentObject.initialize();
    }
    
    this.instances.set(key, componentObject);
    return componentObject;
  }

  /**
   * Flow Object 生成
   */
  async createFlowObject(type, page, context = null, options = {}) {
    const key = `flow_${type}_${page._guid || Date.now()}`;
    
    if (this.instances.has(key) && !options.forceNew) {
      return this.instances.get(key);
    }
    
    let flowObject;
    
    switch (type.toLowerCase()) {
      case 'editor':
      case 'editorworkflow':
        flowObject = new EditorWorkflow(page, context);
        break;
      
      // その他のフロータイプを追加可能
      case 'onboarding':
        // 将来的に OnboardingWorkflow を追加
        break;
      
      case 'testing':
        // 将来的に TestingWorkflow を追加
        break;
      
      default:
        throw new Error(`Unknown flow object type: ${type}`);
    }
    
    // 初期化処理
    if (flowObject && typeof flowObject.initialize === 'function') {
      await flowObject.initialize();
    }
    
    this.instances.set(key, flowObject);
    return flowObject;
  }

  /**
   * Security Test Framework 生成
   */
  async createSecurityFramework(page, context = null, options = {}) {
    const key = `security_${page._guid || Date.now()}`;
    
    if (this.instances.has(key) && !options.forceNew) {
      return this.instances.get(key);
    }
    
    const securityFramework = new SecurityTestFramework(page, context);
    
    // 初期化処理
    if (typeof securityFramework.initialize === 'function') {
      await securityFramework.initialize();
    }
    
    this.instances.set(key, securityFramework);
    return securityFramework;
  }

  /**
   * Performance Test Framework 生成
   */
  async createPerformanceFramework(page, context = null, options = {}) {
    const key = `performance_${page._guid || Date.now()}`;
    
    if (this.instances.has(key) && !options.forceNew) {
      return this.instances.get(key);
    }
    
    const performanceFramework = new PerformanceTestFramework(page, context);
    
    // 初期化処理
    if (typeof performanceFramework.initialize === 'function') {
      await performanceFramework.initialize();
    }
    
    this.instances.set(key, performanceFramework);
    return performanceFramework;
  }

  /**
   * Test Helpers 取得
   */
  getTestHelpers() {
    return this.testHelpers;
  }

  /**
   * 完全なテストスイート生成
   */
  async createTestSuite(page, context = null, options = {}) {
    const suite = {
      // Page Objects
      editorPage: await this.createPageObject('editor', page, context, options),
      
      // Component Objects
      actionEditor: await this.createComponentObject('actioneditor', page, '.action-editor-modal', options),
      
      // Flow Objects
      editorWorkflow: await this.createFlowObject('editor', page, context, options),
      
      // Test Frameworks
      security: await this.createSecurityFramework(page, context, options),
      performance: await this.createPerformanceFramework(page, context, options),
      
      // Utilities
      helpers: this.getTestHelpers()
    };
    
    return suite;
  }

  /**
   * テストタイプ別オブジェクト生成
   */
  async createTestObjects(testType, page, context = null, options = {}) {
    const testObjects = {
      helpers: this.getTestHelpers()
    };
    
    switch (testType.toLowerCase()) {
      case 'unit':
        // 単体テスト用オブジェクト
        testObjects.components = {
          actionEditor: await this.createComponentObject('actioneditor', page, '.action-editor-modal', options)
        };
        break;
        
      case 'integration':
        // 統合テスト用オブジェクト
        testObjects.pages = {
          editor: await this.createPageObject('editor', page, context, options)
        };
        testObjects.components = {
          actionEditor: await this.createComponentObject('actioneditor', page, '.action-editor-modal', options)
        };
        break;
        
      case 'e2e':
        // E2Eテスト用オブジェクト
        testObjects.pages = {
          editor: await this.createPageObject('editor', page, context, options)
        };
        testObjects.flows = {
          editor: await this.createFlowObject('editor', page, context, options)
        };
        break;
        
      case 'security':
        // セキュリティテスト用オブジェクト
        testObjects.security = await this.createSecurityFramework(page, context, options);
        testObjects.pages = {
          editor: await this.createPageObject('editor', page, context, options)
        };
        break;
        
      case 'performance':
        // パフォーマンステスト用オブジェクト
        testObjects.performance = await this.createPerformanceFramework(page, context, options);
        testObjects.pages = {
          editor: await this.createPageObject('editor', page, context, options)
        };
        break;
        
      case 'accessibility':
        // アクセシビリティテスト用オブジェクト
        testObjects.pages = {
          editor: await this.createPageObject('editor', page, context, options)
        };
        testObjects.accessibility = {
          validator: this.testHelpers
        };
        break;
        
      default:
        // デフォルト（包括的）
        testObjects = await this.createTestSuite(page, context, options);
    }
    
    return testObjects;
  }

  /**
   * インスタンス管理
   */
  
  /**
   * 特定インスタンス取得
   */
  getInstance(key) {
    return this.instances.get(key);
  }

  /**
   * 全インスタンス取得
   */
  getAllInstances() {
    return Array.from(this.instances.values());
  }

  /**
   * インスタンス削除
   */
  removeInstance(key) {
    const instance = this.instances.get(key);
    if (instance && typeof instance.cleanup === 'function') {
      instance.cleanup();
    }
    return this.instances.delete(key);
  }

  /**
   * 全インスタンスクリーンアップ
   */
  async cleanup() {
    const cleanupPromises = [];
    
    for (const [key, instance] of this.instances) {
      if (instance && typeof instance.cleanup === 'function') {
        cleanupPromises.push(instance.cleanup());
      }
    }
    
    await Promise.allSettled(cleanupPromises);
    this.instances.clear();
  }

  /**
   * プリセット設定
   */
  
  /**
   * 日本語テスト用プリセット
   */
  async createJapaneseTestPreset(page, context = null) {
    const preset = await this.createTestSuite(page, context);
    
    // 日本語テスト専用設定
    preset.helpers.japaneseTestMode = true;
    preset.helpers.defaultEncoding = 'UTF-8';
    preset.helpers.testData = preset.helpers.japaneseTestData;
    
    return preset;
  }

  /**
   * PlantUMLテスト用プリセット
   */
  async createPlantUMLTestPreset(page, context = null) {
    const preset = await this.createTestSuite(page, context);
    
    // PlantUML テスト専用設定
    preset.helpers.plantUMLTestMode = true;
    preset.helpers.testData = preset.helpers.plantUMLTestData;
    preset.helpers.validationEnabled = true;
    
    return preset;
  }

  /**
   * セキュリティテスト用プリセット
   */
  async createSecurityTestPreset(page, context = null) {
    const preset = {
      security: await this.createSecurityFramework(page, context),
      editorPage: await this.createPageObject('editor', page, context),
      helpers: this.getTestHelpers()
    };
    
    // セキュリティテスト専用設定
    preset.helpers.securityTestMode = true;
    preset.helpers.owaspCompliant = true;
    
    return preset;
  }

  /**
   * パフォーマンステスト用プリセット
   */
  async createPerformanceTestPreset(page, context = null) {
    const preset = {
      performance: await this.createPerformanceFramework(page, context),
      editorPage: await this.createPageObject('editor', page, context),
      helpers: this.getTestHelpers()
    };
    
    // パフォーマンステスト専用設定
    preset.helpers.performanceTestMode = true;
    preset.helpers.lighthouseEnabled = process.env.LIGHTHOUSE_ENABLED === 'true';
    preset.helpers.webVitalsEnabled = true;
    
    return preset;
  }

  /**
   * カスタムプリセット作成
   */
  async createCustomPreset(config, page, context = null) {
    const preset = {};
    
    // Page Objects
    if (config.pages) {
      preset.pages = {};
      for (const [name, type] of Object.entries(config.pages)) {
        preset.pages[name] = await this.createPageObject(type, page, context);
      }
    }
    
    // Component Objects
    if (config.components) {
      preset.components = {};
      for (const [name, componentConfig] of Object.entries(config.components)) {
        preset.components[name] = await this.createComponentObject(
          componentConfig.type,
          page,
          componentConfig.selector,
          componentConfig.options || {}
        );
      }
    }
    
    // Flow Objects
    if (config.flows) {
      preset.flows = {};
      for (const [name, type] of Object.entries(config.flows)) {
        preset.flows[name] = await this.createFlowObject(type, page, context);
      }
    }
    
    // Test Frameworks
    if (config.frameworks) {
      if (config.frameworks.includes('security')) {
        preset.security = await this.createSecurityFramework(page, context);
      }
      if (config.frameworks.includes('performance')) {
        preset.performance = await this.createPerformanceFramework(page, context);
      }
    }
    
    // Always include helpers
    preset.helpers = this.getTestHelpers();
    
    // カスタム設定適用
    if (config.settings) {
      Object.assign(preset.helpers, config.settings);
    }
    
    return preset;
  }

  /**
   * ファクトリー統計情報
   */
  getStatistics() {
    const stats = {
      totalInstances: this.instances.size,
      instancesByType: {},
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    for (const [key, instance] of this.instances) {
      const type = key.split('_')[0];
      stats.instancesByType[type] = (stats.instancesByType[type] || 0) + 1;
    }
    
    return stats;
  }
}

// シングルトンインスタンス
let factoryInstance = null;

/**
 * ファクトリーインスタンス取得
 */
export function getTestObjectFactory() {
  if (!factoryInstance) {
    factoryInstance = new TestObjectFactory();
  }
  return factoryInstance;
}

/**
 * 便利なヘルパー関数
 */
export async function createTestObjects(testType, page, context = null, options = {}) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createTestObjects(testType, page, context, options);
}

export async function createTestSuite(page, context = null, options = {}) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createTestSuite(page, context, options);
}

export async function createJapaneseTestPreset(page, context = null) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createJapaneseTestPreset(page, context);
}

export async function createPlantUMLTestPreset(page, context = null) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createPlantUMLTestPreset(page, context);
}

export async function createSecurityTestPreset(page, context = null) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createSecurityTestPreset(page, context);
}

export async function createPerformanceTestPreset(page, context = null) {
  const factory = getTestObjectFactory();
  await factory.initialize();
  return await factory.createPerformanceTestPreset(page, context);
}

export default TestObjectFactory;