/**
 * Test Data Factories Index
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - 4つのデータファクトリーの統合エクスポート
 * - 日本語対応テストデータの一元管理
 * - ファクトリー間の連携機能
 */

// ファクトリークラスのインポート
import { UserDataFactory } from './UserDataFactory.js';
import { DiagramDataFactory } from './DiagramDataFactory.js';
import { ActionDataFactory } from './ActionDataFactory.js';
import { PlantUMLCodeFactory } from './PlantUMLCodeFactory.js';

/**
 * 統合テストデータファクトリー
 */
export class TestDataFactoryManager {
  constructor() {
    // 各ファクトリーのインスタンス化
    this.userFactory = new UserDataFactory();
    this.diagramFactory = new DiagramDataFactory();
    this.actionFactory = new ActionDataFactory();
    this.plantUMLFactory = new PlantUMLCodeFactory();
    
    // 日本語テストデータプリセット
    this.japaneseTestData = {
      actors: [
        'ユーザー', 'システム', 'データベース', 'API', 'Webアプリケーション',
        '管理者', '営業部', '経理部', '外部API', 'メールサーバー'
      ],
      messages: [
        'ログイン要求', 'データ取得', '処理実行', '結果通知', '状態確認',
        'ファイル送信', '承認依頼', '決済処理', 'レポート生成', 'バックアップ'
      ],
      conditions: [
        '認証済みの場合', '権限確認済み', 'データ形式正常', '処理成功',
        '在庫数量十分', '営業時間内', 'システム稼働中', '接続正常'
      ]
    };
  }

  /**
   * 完全なE2Eテストデータセット生成
   * @param {Object} options - 生成オプション
   * @returns {Object} 完全なテストデータセット
   */
  generateCompleteTestDataSet(options = {}) {
    const {
      userCount = 3,
      diagramComplexity = 'medium',
      actionCount = 5,
      includeValidation = true,
      scenario = 'business_process'
    } = options;

    // ユーザーデータ生成
    const users = this.userFactory.generateBulkUsers(userCount, {
      includeUsagePattern: true,
      includePreferences: true
    });

    // ダイアグラムデータ生成
    const diagram = this.diagramFactory.generateRandomDiagram(diagramComplexity);

    // アクションデータ生成
    const actions = this.actionFactory.generateActionItemSet(actionCount, {
      sequentialFlow: true,
      includeVariations: true,
      includeValidation
    });

    // PlantUMLコード生成
    const plantUMLCode = this.plantUMLFactory.generateComplexCode(diagram);

    return {
      id: `complete_test_set_${Date.now()}`,
      users,
      diagram,
      actions: actions.items,
      plantUMLCode,
      validation: includeValidation ? this.validateTestDataSet({
        users, diagram, actions: actions.items, plantUMLCode
      }) : null,
      metadata: {
        scenario,
        generatedAt: new Date().toISOString(),
        complexity: diagramComplexity,
        totalElements: {
          users: users.length,
          actions: actions.items.length,
          diagramActors: diagram.actors?.length || 0,
          diagramActions: diagram.actions?.length || 0
        }
      }
    };
  }

  /**
   * 業界特化テストデータ生成
   * @param {string} industry - 業界名
   * @param {string} scenario - シナリオ名
   * @returns {Object} 業界特化テストデータ
   */
  generateIndustryTestData(industry, scenario) {
    // 業界特化ユーザー
    const industryUsers = this.userFactory.generateScenarioUsers(`${industry}_test`);
    
    // 業界特化ダイアグラム
    const industryDiagram = this.diagramFactory.generateComplexDiagram({
      businessDomain: industry,
      includeErrorHandling: true,
      includeParallelProcessing: true
    });
    
    // 業界特化アクション
    const industryActions = this.actionFactory.generateIndustryActionSet(industry, scenario);
    
    // 業界特化PlantUMLコード
    const industryCode = this.plantUMLFactory.generateEnterpriseCode({
      title: `${industry}業界 - ${scenario}プロセス`,
      services: industryDiagram.actors?.map(actor => ({
        name: actor,
        category: this.categorizeService(actor)
      })) || []
    });

    return {
      id: `industry_${industry}_${scenario}_${Date.now()}`,
      industry,
      scenario,
      users: industryUsers,
      diagram: industryDiagram,
      actions: industryActions,
      plantUMLCode: industryCode,
      metadata: {
        generatedAt: new Date().toISOString(),
        industry,
        scenario
      }
    };
  }

  /**
   * パフォーマンステスト用大量データ生成
   * @param {Object} options - 生成オプション
   * @returns {Object} パフォーマンステストデータ
   */
  generatePerformanceTestData(options = {}) {
    const {
      userCount = 100,
      actionCount = 1000,
      diagramCount = 50,
      codeCount = 20
    } = options;

    const startTime = Date.now();

    // 大量ユーザーデータ
    const users = this.userFactory.generateBulkUsers(userCount, {
      includeUsagePattern: false, // パフォーマンス重視
      includePreferences: false
    });

    // 大量アクションデータ
    const actionData = this.actionFactory.generatePerformanceTestData(actionCount, {
      includeValidation: false,
      batchSize: 100
    });

    // 大量ダイアグラムデータ
    const diagrams = this.diagramFactory.generateBulkDiagrams(diagramCount, 'medium');

    // 大量PlantUMLコード
    const plantUMLCodes = this.plantUMLFactory.generateTestCodes('performance', {
      count: codeCount,
      complexity: 'standard'
    });

    const endTime = Date.now();

    return {
      id: `performance_test_${Date.now()}`,
      users,
      actions: actionData.actions,
      diagrams,
      plantUMLCodes,
      performance: {
        totalGenerationTime: endTime - startTime,
        averageTimePerUser: (endTime - startTime) / userCount,
        averageTimePerAction: actionData.performance.averageTimePerAction,
        totalElements: userCount + actionCount + diagramCount + codeCount
      },
      metadata: {
        testType: 'performance',
        generatedAt: new Date().toISOString(),
        counts: { userCount, actionCount, diagramCount, codeCount }
      }
    };
  }

  /**
   * バリデーションテストケース生成
   * @param {string} validationType - バリデーションタイプ
   * @returns {Array} バリデーションテストケース
   */
  generateValidationTestCases(validationType) {
    const testCases = [];

    switch (validationType) {
      case 'user_data':
        testCases.push(...this.generateUserValidationCases());
        break;
      case 'action_data':
        testCases.push(...this.actionFactory.generateValidationTestCases('valid_data'));
        testCases.push(...this.actionFactory.generateValidationTestCases('invalid_data'));
        testCases.push(...this.actionFactory.generateValidationTestCases('edge_cases'));
        break;
      case 'plantuml_code':
        testCases.push(...this.generatePlantUMLValidationCases());
        break;
      case 'all':
        testCases.push(...this.generateValidationTestCases('user_data'));
        testCases.push(...this.generateValidationTestCases('action_data'));
        testCases.push(...this.generateValidationTestCases('plantuml_code'));
        break;
    }

    return testCases;
  }

  /**
   * ユーザーバリデーションケース生成
   * @returns {Array} ユーザーバリデーションケース
   */
  generateUserValidationCases() {
    return [
      {
        name: '有効なユーザーデータ',
        data: this.userFactory.generateRandomUser(),
        expectedResult: { isValid: true, errors: [] }
      },
      {
        name: '無効なユーザーデータ（名前なし）',
        data: this.userFactory.generateRandomUser({ name: '' }),
        expectedResult: { isValid: false, errors: ['name is required'] }
      }
    ];
  }

  /**
   * PlantUMLバリデーションケース生成
   * @returns {Array} PlantUMLバリデーションケース
   */
  generatePlantUMLValidationCases() {
    const validationCodes = this.plantUMLFactory.generateTestCodes('validation', { count: 5 });
    
    return validationCodes.map((codeData, index) => ({
      name: `PlantUMLコード検証 ${index + 1}`,
      data: codeData.code,
      expectedResult: this.plantUMLFactory.validatePlantUMLCode(codeData.code)
    }));
  }

  /**
   * 日本語特化テストデータ生成
   * @returns {Object} 日本語テストデータ
   */
  generateJapaneseTestData() {
    return {
      users: this.userFactory.japanesePersonas,
      actions: this.generateJapaneseActionSet(),
      plantUMLCode: this.plantUMLFactory.generateJapaneseTestCode(),
      testCases: this.generateJapaneseTestCases(),
      metadata: {
        language: 'ja',
        encoding: 'UTF-8',
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 日本語アクションセット生成
   * @returns {Array} 日本語アクション配列
   */
  generateJapaneseActionSet() {
    return [
      {
        actorFrom: 'ユーザー',
        actorTo: 'システム',
        message: 'ログイン要求（ユーザーID、パスワード）',
        arrowType: 'sync'
      },
      {
        actorFrom: 'システム',
        actorTo: 'データベース',
        message: 'ユーザー認証情報確認',
        arrowType: 'sync'
      },
      {
        actorFrom: 'データベース',
        actorTo: 'システム',
        message: '認証結果返却（成功/失敗）',
        arrowType: 'return'
      },
      {
        actorFrom: 'システム',
        actorTo: 'ユーザー',
        message: 'ログイン結果通知',
        arrowType: 'return'
      }
    ];
  }

  /**
   * 日本語テストケース生成
   * @returns {Array} 日本語テストケース
   */
  generateJapaneseTestCases() {
    return [
      {
        name: 'ひらがな入力テスト',
        input: 'ひらがなのてすと',
        expected: 'ひらがなのてすと'
      },
      {
        name: 'カタカナ入力テスト', 
        input: 'カタカナノテスト',
        expected: 'カタカナノテスト'
      },
      {
        name: '漢字入力テスト',
        input: '漢字入力試験',
        expected: '漢字入力試験'
      },
      {
        name: '混合文字入力テスト',
        input: 'ユーザー認証システム',
        expected: 'ユーザー認証システム'
      },
      {
        name: '特殊記号入力テスト',
        input: '処理完了（成功）',
        expected: '処理完了（成功）'
      }
    ];
  }

  /**
   * テストデータセットバリデーション
   * @param {Object} testDataSet - テストデータセット
   * @returns {Object} バリデーション結果
   */
  validateTestDataSet(testDataSet) {
    const { users, diagram, actions, plantUMLCode } = testDataSet;
    const errors = [];
    const warnings = [];

    // ユーザーデータ検証
    users.forEach((user, index) => {
      const validation = this.userFactory.validateUserData(user);
      if (!validation.isValid) {
        errors.push(`User ${index}: ${validation.missingFields.join(', ')}`);
      }
    });

    // アクションデータ検証
    actions.forEach((action, index) => {
      if (action.validation && !action.validation.isValid) {
        errors.push(`Action ${index}: ${action.validation.errors.join(', ')}`);
      }
    });

    // PlantUMLコード検証
    const codeValidation = this.plantUMLFactory.validatePlantUMLCode(plantUMLCode);
    if (!codeValidation.isValid) {
      errors.push(`PlantUML Code: ${codeValidation.errors.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalUsers: users.length,
        totalActions: actions.length,
        codeLineCount: codeValidation.lineCount,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * サービスカテゴリ分類
   * @param {string} serviceName - サービス名
   * @returns {string} カテゴリ
   */
  categorizeService(serviceName) {
    if (serviceName.includes('API') || serviceName.includes('アプリケーション')) {
      return 'api';
    } else if (serviceName.includes('データベース') || serviceName.includes('DB')) {
      return 'database';
    } else if (serviceName.includes('外部') || serviceName.includes('パートナー')) {
      return 'external';
    } else {
      return 'messaging';
    }
  }

  /**
   * 統合統計情報取得
   * @returns {Object} 統合統計情報
   */
  getIntegratedStats() {
    return {
      userFactory: this.userFactory.getFactoryStats(),
      diagramFactory: this.diagramFactory.getFactoryStats(),
      actionFactory: this.actionFactory.getFactoryStats(),
      plantUMLFactory: this.plantUMLFactory.getFactoryStats(),
      japaneseTestData: {
        actors: this.japaneseTestData.actors.length,
        messages: this.japaneseTestData.messages.length,
        conditions: this.japaneseTestData.conditions.length
      },
      generatedAt: new Date().toISOString()
    };
  }
}

// 個別ファクトリーのエクスポート
export { UserDataFactory } from './UserDataFactory.js';
export { DiagramDataFactory } from './DiagramDataFactory.js';
export { ActionDataFactory } from './ActionDataFactory.js';
export { PlantUMLCodeFactory } from './PlantUMLCodeFactory.js';

// デフォルトエクスポート
export default TestDataFactoryManager;