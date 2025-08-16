/**
 * EditorIntegrationTest.js - Sprint2エディター統合テスト
 * 4つのコアエディターとEditorManagerの統合動作を検証
 * 
 * @author Claude Code
 * @version 1.0.0
 * @created 2025-08-16
 * @purpose Sprint2 品質保証
 */

/**
 * エディター統合テストクラス
 * セキュリティ、パフォーマンス、機能統合をテスト
 */
export class EditorIntegrationTest {
  constructor() {
    this.testResults = [];
    this.testContainer = null;
    this.editorManager = null;
  }

  /**
   * テスト実行メイン
   */
  async runAllTests() {
    console.log('🧪 Starting Editor Integration Tests...');
    
    try {
      await this.setupTestEnvironment();
      
      // 基本機能テスト
      await this.testEditorManagerInitialization();
      await this.testSecurityLayerIntegration();
      await this.testActionEditorBasicOperations();
      await this.testConditionEditorBasicOperations();
      await this.testLoopEditorBasicOperations();
      await this.testParallelEditorBasicOperations();
      
      // 統合テスト
      await this.testEditorInteroperability();
      await this.testPlantUMLGeneration();
      await this.testDataPersistence();
      
      // パフォーマンステスト
      await this.testPerformanceMetrics();
      
      // セキュリティテスト
      await this.testXSSProtection();
      await this.testCSRFProtection();
      
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.push({
        name: 'Test Execution',
        status: 'FAILED',
        error: error.message
      });
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * テスト環境セットアップ
   */
  async setupTestEnvironment() {
    this.testContainer = document.createElement('div');
    this.testContainer.id = 'editor-test-container';
    this.testContainer.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 800px;
      height: 600px;
      visibility: hidden;
    `;
    document.body.appendChild(this.testContainer);
    
    // EditorManagerの動的インポートとインスタンス化
    const { EditorManager } = await import('./EditorManager.js');
    this.editorManager = new EditorManager(this.testContainer, {
      enableSecurityMode: true,
      enableRealtimePreview: false, // テスト中はプレビューを無効化
      enableAutoSave: false
    });
    
    await this.editorManager.init();
    
    this.addTestResult('Test Environment Setup', 'PASSED');
  }

  /**
   * EditorManager初期化テスト
   */
  async testEditorManagerInitialization() {
    try {
      // 初期化状態チェック
      const isInitialized = this.editorManager.isInitialized;
      const hasAllEditors = this.editorManager.editors.action &&
                           this.editorManager.editors.condition &&
                           this.editorManager.editors.loop &&
                           this.editorManager.editors.parallel;
      
      if (!isInitialized) {
        throw new Error('EditorManager not properly initialized');
      }
      
      if (!hasAllEditors) {
        throw new Error('Not all editors are initialized');
      }
      
      this.addTestResult('EditorManager Initialization', 'PASSED');
    } catch (error) {
      this.addTestResult('EditorManager Initialization', 'FAILED', error);
    }
  }

  /**
   * セキュリティレイヤー統合テスト
   */
  async testSecurityLayerIntegration() {
    try {
      const hasSecurityLayer = this.editorManager.secureEditor !== null;
      
      if (!hasSecurityLayer) {
        throw new Error('Security layer not initialized');
      }
      
      // DOMPurifyテスト
      const testInput = '<script>alert("xss")</script>safe content';
      const sanitized = await this.editorManager.secureEditor.sanitizeData({ 
        test: testInput 
      });
      
      if (sanitized.test.includes('<script>')) {
        throw new Error('XSS protection failed');
      }
      
      this.addTestResult('Security Layer Integration', 'PASSED');
    } catch (error) {
      this.addTestResult('Security Layer Integration', 'FAILED', error);
    }
  }

  /**
   * ActionEditor基本動作テスト
   */
  async testActionEditorBasicOperations() {
    try {
      const actionEditor = this.editorManager.editors.action;
      
      // アクション追加テスト
      await actionEditor.addAction({
        from: 'User',
        to: 'System',
        arrowType: '->',
        message: 'Test Action'
      });
      
      if (actionEditor.actions.length !== 1) {
        throw new Error('Action not added properly');
      }
      
      // PlantUMLコード生成テスト
      const plantUML = actionEditor.generatePlantUML();
      if (!plantUML.includes('User -> System: Test Action')) {
        throw new Error('PlantUML generation failed');
      }
      
      this.addTestResult('ActionEditor Basic Operations', 'PASSED');
    } catch (error) {
      this.addTestResult('ActionEditor Basic Operations', 'FAILED', error);
    }
  }

  /**
   * ConditionEditor基本動作テスト
   */
  async testConditionEditorBasicOperations() {
    try {
      const conditionEditor = this.editorManager.editors.condition;
      
      // 条件分岐追加テスト
      await conditionEditor.addCondition({
        condition: 'user is logged in',
        trueActions: ['Show dashboard'],
        falseActions: ['Show login form']
      });
      
      if (conditionEditor.conditions.length !== 1) {
        throw new Error('Condition not added properly');
      }
      
      this.addTestResult('ConditionEditor Basic Operations', 'PASSED');
    } catch (error) {
      this.addTestResult('ConditionEditor Basic Operations', 'FAILED', error);
    }
  }

  /**
   * LoopEditor基本動作テスト
   */
  async testLoopEditorBasicOperations() {
    try {
      const loopEditor = this.editorManager.editors.loop;
      
      // ループ追加テスト
      await loopEditor.addLoop({
        condition: 'i < 10',
        actions: ['process item', 'increment i']
      });
      
      if (loopEditor.loops.length !== 1) {
        throw new Error('Loop not added properly');
      }
      
      this.addTestResult('LoopEditor Basic Operations', 'PASSED');
    } catch (error) {
      this.addTestResult('LoopEditor Basic Operations', 'FAILED', error);
    }
  }

  /**
   * ParallelEditor基本動作テスト
   */
  async testParallelEditorBasicOperations() {
    try {
      const parallelEditor = this.editorManager.editors.parallel;
      
      // 並行処理追加テスト
      await parallelEditor.addParallelBlock({
        threads: [
          { name: 'Thread 1', actions: ['Task A', 'Task B'] },
          { name: 'Thread 2', actions: ['Task C', 'Task D'] }
        ]
      });
      
      if (parallelEditor.parallelBlocks.length !== 1) {
        throw new Error('Parallel block not added properly');
      }
      
      this.addTestResult('ParallelEditor Basic Operations', 'PASSED');
    } catch (error) {
      this.addTestResult('ParallelEditor Basic Operations', 'FAILED', error);
    }
  }

  /**
   * エディター間連携テスト
   */
  async testEditorInteroperability() {
    try {
      // 統合データ取得
      const projectData = this.editorManager.exportProject();
      
      if (!projectData.editors.actions ||
          !projectData.editors.conditions ||
          !projectData.editors.loops ||
          !projectData.editors.parallels) {
        throw new Error('Project data incomplete');
      }
      
      // データインポートテスト
      await this.editorManager.importProject(projectData);
      
      this.addTestResult('Editor Interoperability', 'PASSED');
    } catch (error) {
      this.addTestResult('Editor Interoperability', 'FAILED', error);
    }
  }

  /**
   * PlantUMLコード生成テスト
   */
  async testPlantUMLGeneration() {
    try {
      const fullPlantUML = this.editorManager.generateIntegratedPlantUML();
      
      if (!fullPlantUML.includes('@startuml')) {
        throw new Error('PlantUML structure invalid');
      }
      
      if (!fullPlantUML.includes('@enduml')) {
        throw new Error('PlantUML structure incomplete');
      }
      
      this.addTestResult('PlantUML Generation', 'PASSED');
    } catch (error) {
      this.addTestResult('PlantUML Generation', 'FAILED', error);
    }
  }

  /**
   * データ永続化テスト
   */
  async testDataPersistence() {
    try {
      // ローカルストレージテスト
      const testData = { test: 'persistence data' };
      this.editorManager.saveToLocalStorage('test-key', testData);
      
      const loadedData = this.editorManager.loadFromLocalStorage('test-key');
      
      if (JSON.stringify(testData) !== JSON.stringify(loadedData)) {
        throw new Error('Data persistence failed');
      }
      
      this.addTestResult('Data Persistence', 'PASSED');
    } catch (error) {
      this.addTestResult('Data Persistence', 'FAILED', error);
    }
  }

  /**
   * パフォーマンスメトリクステスト
   */
  async testPerformanceMetrics() {
    try {
      const startTime = performance.now();
      
      // 複数操作の実行
      for (let i = 0; i < 10; i++) {
        await this.editorManager.editors.action.addAction({
          from: `Actor${i}`,
          to: 'System',
          arrowType: '->',
          message: `Test message ${i}`
        });
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      if (executionTime > 1000) { // 1秒以上は性能問題
        throw new Error(`Performance issue: ${executionTime}ms`);
      }
      
      this.addTestResult('Performance Metrics', 'PASSED', `Execution time: ${executionTime.toFixed(2)}ms`);
    } catch (error) {
      this.addTestResult('Performance Metrics', 'FAILED', error);
    }
  }

  /**
   * XSS保護テスト
   */
  async testXSSProtection() {
    try {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">'
      ];
      
      for (const input of maliciousInputs) {
        const sanitized = await this.editorManager.secureEditor.sanitizeData({
          test: input
        });
        
        if (sanitized.test.includes('<script>') || 
            sanitized.test.includes('javascript:') ||
            sanitized.test.includes('onerror') ||
            sanitized.test.includes('onload')) {
          throw new Error(`XSS protection failed for: ${input}`);
        }
      }
      
      this.addTestResult('XSS Protection', 'PASSED');
    } catch (error) {
      this.addTestResult('XSS Protection', 'FAILED', error);
    }
  }

  /**
   * CSRF保護テスト
   */
  async testCSRFProtection() {
    try {
      const validToken = this.editorManager.secureEditor.csrfToken;
      const invalidToken = 'invalid-token-123';
      
      // 有効なトークンテスト
      const validResult = this.editorManager.secureEditor.verifyCSRFToken(validToken);
      if (!validResult) {
        throw new Error('Valid CSRF token rejected');
      }
      
      // 無効なトークンテスト
      const invalidResult = this.editorManager.secureEditor.verifyCSRFToken(invalidToken);
      if (invalidResult) {
        throw new Error('Invalid CSRF token accepted');
      }
      
      this.addTestResult('CSRF Protection', 'PASSED');
    } catch (error) {
      this.addTestResult('CSRF Protection', 'FAILED', error);
    }
  }

  /**
   * テスト結果追加
   */
  addTestResult(name, status, details = null) {
    this.testResults.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    const emoji = status === 'PASSED' ? '✅' : '❌';
    console.log(`${emoji} ${name}: ${status}${details ? ` (${details})` : ''}`);
  }

  /**
   * テストレポート生成
   */
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n📊 Editor Integration Test Report');
    console.log('================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('================================\n');
    
    // 失敗したテストの詳細表示
    const failedTestDetails = this.testResults.filter(r => r.status === 'FAILED');
    if (failedTestDetails.length > 0) {
      console.log('❌ Failed Tests:');
      failedTestDetails.forEach(test => {
        console.log(`  - ${test.name}: ${test.details || 'No details'}`);
      });
    }
    
    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: parseFloat(successRate)
      },
      results: this.testResults
    };
  }

  /**
   * テスト環境クリーンアップ
   */
  async cleanupTestEnvironment() {
    if (this.editorManager) {
      this.editorManager.destroy();
    }
    
    if (this.testContainer && this.testContainer.parentNode) {
      this.testContainer.parentNode.removeChild(this.testContainer);
    }
    
    console.log('🧹 Test environment cleaned up');
  }
}

// 自動実行スクリプト（開発時のみ）
if (typeof window !== 'undefined' && window.location.search.includes('test=editors')) {
  const tester = new EditorIntegrationTest();
  tester.runAllTests().then(report => {
    console.log('🎯 Integration tests completed');
  });
}

export default EditorIntegrationTest;