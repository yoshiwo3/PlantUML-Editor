/**
 * E2Eテスト用データ生成ユーティリティ
 * 55シナリオに対応する包括的なテストデータセットを生成
 */

import fs from 'fs/promises';
import path from 'path';

export class TestDataGenerator {
  constructor() {
    this.outputDir = 'fixtures/data';
    this.filesDir = 'fixtures/files';
  }

  /**
   * 全テストデータの生成
   */
  async generateAllTestData() {
    console.log('🔄 テストデータ生成開始...');
    
    try {
      // ディレクトリ作成
      await this.ensureDirectories();
      
      // カテゴリ別データ生成
      const datasets = {
        basic: await this.generateBasicTestData(),
        editor: await this.generateEditorTestData(),
        diagrams: await this.generateDiagramTestData(),
        inline: await this.generateInlineTestData(),
        error: await this.generateErrorTestData(),
        performance: await this.generatePerformanceTestData(),
        security: await this.generateSecurityTestData(),
        accessibility: await this.generateAccessibilityTestData(),
        integration: await this.generateIntegrationTestData(),
        regression: await this.generateRegressionTestData(),
        stress: await this.generateStressTestData(),
        crossBrowser: await this.generateCrossBrowserTestData()
      };
      
      // メインデータファイル出力
      await this.writeDataFile('test-datasets.json', datasets);
      
      // 個別カテゴリファイル出力
      for (const [category, data] of Object.entries(datasets)) {
        await this.writeDataFile(`${category}-test-data.json`, data);
      }
      
      // サンプルファイル生成
      await this.generateSampleFiles();
      
      // データインデックス生成
      await this.generateDataIndex();
      
      console.log('✅ テストデータ生成完了');
      return datasets;
    } catch (error) {
      console.error('❌ テストデータ生成エラー:', error);
      throw error;
    }
  }

  /**
   * 基本機能テスト用データ (BAS-001~008)
   */
  async generateBasicTestData() {
    return {
      // BAS-001: アプリケーション起動テスト
      startup: {
        expectedElements: [
          '#japanese-input',
          '#plantuml-editor',
          '#preview-area',
          '#convert-btn',
          '#save-btn',
          '#load-btn'
        ],
        performanceThresholds: {
          loadTime: 3000,
          domContentLoaded: 3000,
          firstPaint: 2000
        }
      },

      // BAS-002: 日本語→PlantUML変換テスト
      conversion: {
        simple: {
          input: 'A → B: メッセージ',
          expected: '@startuml\nA -> B: メッセージ\n@enduml'
        },
        complex: {
          input: 'ユーザー → システム: ログイン要求\nシステム → データベース: 認証確認\nデータベース → システム: 認証結果\nシステム → ユーザー: ログイン完了',
          expected: '@startuml\nユーザー -> システム: ログイン要求\nシステム -> データベース: 認証確認\nデータベース -> システム: 認証結果\nシステム -> ユーザー: ログイン完了\n@enduml'
        },
        withNotes: {
          input: 'A → B: メッセージ\nNote right: 重要な処理',
          expected: '@startuml\nA -> B: メッセージ\nNote right: 重要な処理\n@enduml'
        }
      },

      // BAS-003: プレビュー表示テスト
      preview: {
        validationSelectors: [
          '#preview-area svg',
          '#preview-area img',
          '.diagram-container'
        ],
        expectedAttributes: {
          svg: ['width', 'height', 'viewBox'],
          img: ['src', 'alt']
        }
      },

      // BAS-004~008: その他基本機能
      sync: {
        testCases: [
          {
            action: 'input-japanese',
            input: 'テスト → 確認',
            expectedUpdate: 'plantuml-editor'
          },
          {
            action: 'input-plantuml',
            input: '@startuml\nA -> B\n@enduml',
            expectedUpdate: 'preview-area'
          }
        ]
      },

      fileOperations: {
        save: {
          filename: 'test-diagram.puml',
          content: '@startuml\nA -> B: テスト\n@enduml'
        },
        load: {
          testFiles: ['sample-sequence.puml', 'sample-class.puml']
        }
      },

      export: {
        formats: ['png', 'svg', 'pdf'],
        expectedMimeTypes: {
          png: 'image/png',
          svg: 'image/svg+xml',
          pdf: 'application/pdf'
        }
      },

      responsive: {
        viewports: [
          { width: 1920, height: 1080, name: 'desktop' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 375, height: 667, name: 'mobile' }
        ]
      }
    };
  }

  /**
   * エディター機能テスト用データ (EDT-001~007)
   */
  async generateEditorTestData() {
    return {
      syntaxHighlight: {
        keywords: ['@startuml', '@enduml', 'actor', 'participant', 'note', 'alt', 'else', 'end'],
        testCode: '@startuml\nactor User\nparticipant System\nUser -> System: request\nnote right: important\n@enduml'
      },

      autoComplete: {
        triggers: [
          { input: '@start', expected: '@startuml' },
          { input: 'act', expected: 'actor' },
          { input: 'part', expected: 'participant' },
          { input: 'not', expected: 'note' }
        ]
      },

      indentation: {
        testCases: [
          {
            input: '@startuml\nalt condition\nA -> B\nelse\nB -> A\nend\n@enduml',
            expectedIndented: '@startuml\nalt condition\n    A -> B\nelse\n    B -> A\nend\n@enduml'
          }
        ]
      },

      bracketMatching: {
        testPairs: [
          { open: '(', close: ')' },
          { open: '[', close: ']' },
          { open: '{', close: '}' }
        ]
      },

      searchReplace: {
        testCases: [
          {
            content: 'A -> B: message1\nB -> C: message2\nA -> C: message3',
            search: 'message',
            replace: 'msg',
            expectedMatches: 3
          }
        ]
      },

      undoRedo: {
        actions: [
          'input:A -> B',
          'input: test',
          'delete:test',
          'input: message'
        ],
        expectedStates: 4
      },

      comments: {
        testCode: 'A -> B: message\n// This is a comment\nB -> C: response',
        commentPrefix: '//'
      }
    };
  }

  /**
   * 図表タイプテスト用データ (DIA-001~006)
   */
  async generateDiagramTestData() {
    return {
      sequence: {
        simple: '@startuml\nA -> B: message\n@enduml',
        complex: '@startuml\nactor User\nparticipant System\nparticipant Database\n\nUser -> System: login\nSystem -> Database: validate\nDatabase -> System: result\nSystem -> User: response\n@enduml',
        withNotes: '@startuml\nA -> B: message\nnote right of B: process\nB -> A: response\n@enduml'
      },

      class: {
        simple: '@startuml\nclass ClassA\nclass ClassB\nClassA --|> ClassB\n@enduml',
        complex: '@startuml\nclass User {\n  +name: String\n  +email: String\n  +login()\n}\nclass Admin {\n  +permissions: List\n  +manageUsers()\n}\nUser <|-- Admin\n@enduml'
      },

      usecase: {
        simple: '@startuml\nactor User\nUser --> (Login)\nUser --> (View Data)\n@enduml',
        complex: '@startuml\nactor User\nactor Admin\n(Login) as UC1\n(Manage Users) as UC2\n(View Reports) as UC3\nUser --> UC1\nAdmin --> UC1\nAdmin --> UC2\nAdmin --> UC3\n@enduml'
      },

      activity: {
        simple: '@startuml\nstart\n:action1;\n:action2;\nstop\n@enduml',
        withBranching: '@startuml\nstart\nif (condition?) then (yes)\n  :action1;\nelse (no)\n  :action2;\nendif\nstop\n@enduml'
      },

      state: {
        simple: '@startuml\n[*] --> State1\nState1 --> State2\nState2 --> [*]\n@enduml',
        complex: '@startuml\n[*] --> Idle\nIdle --> Active : start\nActive --> Processing : process\nProcessing --> Complete : finish\nComplete --> Idle : reset\nComplete --> [*]\n@enduml'
      },

      entity: {
        simple: '@startuml\nentity User {\n  id : number\n  name : text\n}\nentity Order {\n  id : number\n  user_id : number\n}\nUser ||--o{ Order\n@enduml'
      }
    };
  }

  /**
   * パフォーマンステスト用データ (PER-001~004)
   */
  async generatePerformanceTestData() {
    const largeSequence = this.generateLargeSequenceDiagram(100);
    const complexClass = this.generateComplexClassDiagram(50);
    
    return {
      loadTime: {
        threshold: 3000,
        measurePoints: ['navigationStart', 'domContentLoaded', 'loadComplete']
      },

      largeDocument: {
        sequence100: largeSequence,
        class50: complexClass,
        mixed: `${largeSequence}\n\n${complexClass}`
      },

      realTimeSync: {
        threshold: 100,
        testInputs: [
          'A -> B: fast test',
          'System -> Database: query',
          'User -> Application: complex interaction with multiple parameters'
        ]
      },

      memoryUsage: {
        thresholds: {
          initial: 50 * 1024 * 1024, // 50MB
          afterLoad: 100 * 1024 * 1024, // 100MB
          afterLargeDocument: 200 * 1024 * 1024 // 200MB
        },
        monitoringInterval: 1000
      }
    };
  }

  /**
   * セキュリティテスト用データ (SEC-001~004)
   */
  async generateSecurityTestData() {
    return {
      xss: {
        payloads: [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src="x" onerror="alert(1)">',
          '<svg onload="alert(1)">',
          '${alert("xss")}',
          '{{alert("xss")}}',
          '<iframe src="javascript:alert(1)"></iframe>'
        ],
        expectedBehavior: 'sanitized'
      },

      csrf: {
        testEndpoints: ['/api/save', '/api/export', '/api/settings'],
        tokenValidation: true,
        headerValidation: ['X-Requested-With', 'Origin', 'Referer']
      },

      inputValidation: {
        testCases: [
          {
            input: 'A'.repeat(10000),
            category: 'length',
            expected: 'rejected'
          },
          {
            input: '../../../etc/passwd',
            category: 'path-traversal',
            expected: 'sanitized'
          },
          {
            input: '"; DROP TABLE users; --',
            category: 'sql-injection',
            expected: 'sanitized'
          }
        ]
      },

      authentication: {
        validCredentials: { username: 'testuser', password: 'testpass123' },
        invalidCredentials: [
          { username: '', password: '' },
          { username: 'invalid', password: 'wrong' },
          { username: 'admin', password: 'admin' }
        ],
        sessionValidation: true
      }
    };
  }

  /**
   * アクセシビリティテスト用データ (ACC-001~004)
   */
  async generateAccessibilityTestData() {
    return {
      keyboard: {
        navigation: [
          { key: 'Tab', expectedFocus: 'next-element' },
          { key: 'Shift+Tab', expectedFocus: 'previous-element' },
          { key: 'Enter', expectedAction: 'activate' },
          { key: 'Space', expectedAction: 'activate' },
          { key: 'Escape', expectedAction: 'close' }
        ],
        shortcuts: [
          { keys: 'Ctrl+S', action: 'save' },
          { keys: 'Ctrl+Z', action: 'undo' },
          { keys: 'Ctrl+Y', action: 'redo' }
        ]
      },

      screenReader: {
        ariaLabels: [
          { selector: '#japanese-input', expectedLabel: '日本語入力エリア' },
          { selector: '#plantuml-editor', expectedLabel: 'PlantUMLコードエディター' },
          { selector: '#convert-btn', expectedLabel: '変換実行ボタン' }
        ],
        landmarks: ['main', 'navigation', 'complementary'],
        headingStructure: ['h1', 'h2', 'h3']
      },

      colorContrast: {
        testPairs: [
          { foreground: '#000000', background: '#ffffff', ratio: 21 },
          { foreground: '#666666', background: '#ffffff', ratio: 4.5 },
          { foreground: '#ffffff', background: '#0066cc', ratio: 4.5 }
        ],
        wcagLevel: 'AA'
      },

      fontSize: {
        scales: [100, 125, 150, 175, 200],
        expectedBehavior: 'responsive-layout'
      }
    };
  }

  /**
   * 統合テスト用データ (INT-001~004)
   */
  async generateIntegrationTestData() {
    return {
      api: {
        endpoints: {
          convert: { url: '/api/convert', method: 'POST' },
          save: { url: '/api/save', method: 'POST' },
          load: { url: '/api/load', method: 'GET' },
          export: { url: '/api/export', method: 'POST' }
        },
        mockResponses: {
          success: { status: 200, data: { success: true } },
          error: { status: 500, data: { success: false, error: 'Server error' } }
        }
      },

      database: {
        operations: ['create', 'read', 'update', 'delete'],
        testData: {
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
          diagram: { id: 1, title: 'Test Diagram', content: '@startuml\nA -> B\n@enduml' }
        }
      },

      fileSystem: {
        operations: ['save', 'load', 'delete', 'list'],
        testFiles: [
          { name: 'test1.puml', size: 1024 },
          { name: 'test2.puml', size: 2048 }
        ]
      }
    };
  }

  /**
   * 大規模シーケンス図データ生成
   */
  generateLargeSequenceDiagram(actorCount) {
    let diagram = '@startuml\n';
    
    // アクター定義
    for (let i = 1; i <= actorCount; i++) {
      diagram += `participant Actor${i}\n`;
    }
    diagram += '\n';
    
    // 相互作用の生成
    for (let i = 1; i <= actorCount; i++) {
      const nextActor = (i % actorCount) + 1;
      diagram += `Actor${i} -> Actor${nextActor}: メッセージ${i}\n`;
      
      if (i % 10 === 0) {
        diagram += `note right of Actor${nextActor}: 処理${i}\n`;
      }
    }
    
    diagram += '@enduml';
    return diagram;
  }

  /**
   * 複雑なクラス図データ生成
   */
  generateComplexClassDiagram(classCount) {
    let diagram = '@startuml\n';
    
    // クラス定義
    for (let i = 1; i <= classCount; i++) {
      diagram += `class Class${i} {\n`;
      diagram += `  +field${i}: String\n`;
      diagram += `  +method${i}(): void\n`;
      diagram += `}\n\n`;
      
      // 継承関係
      if (i > 1) {
        diagram += `Class${i-1} <|-- Class${i}\n`;
      }
      
      // 組み合わせ関係
      if (i > 2) {
        diagram += `Class${i} *-- Class${i-2}\n`;
      }
    }
    
    diagram += '@enduml';
    return diagram;
  }

  /**
   * 回帰テスト用データ
   */
  async generateRegressionTestData() {
    return {
      previousVersions: {
        'v1.0.0': {
          features: ['basic-conversion', 'preview', 'save-load'],
          testCases: [
            { input: 'A -> B', expected: '@startuml\nA -> B\n@enduml' }
          ]
        }
      },
      
      knownIssues: {
        'issue-123': {
          description: 'Japanese character encoding',
          testCase: { input: '日本語テスト', expected: 'proper-encoding' },
          status: 'fixed'
        }
      }
    };
  }

  /**
   * ストレステスト用データ
   */
  async generateStressTestData() {
    return {
      concurrent: {
        userCount: 100,
        duration: 300000, // 5分
        actions: ['convert', 'save', 'load', 'export']
      },
      
      longRunning: {
        duration: 86400000, // 24時間
        monitoringInterval: 60000, // 1分
        memoryThreshold: 500 * 1024 * 1024 // 500MB
      },
      
      resourceExhaustion: {
        maxMemory: '512m',
        maxCpu: '1',
        testScenarios: ['memory-leak', 'cpu-intensive', 'disk-full']
      }
    };
  }

  /**
   * クロスブラウザテスト用データ
   */
  async generateCrossBrowserTestData() {
    return {
      browsers: {
        chromium: { version: '119+', features: ['all'] },
        firefox: { version: '118+', features: ['all'] },
        webkit: { version: '17+', features: ['most'] },
        edge: { version: '119+', features: ['all'] }
      },
      
      compatibility: {
        features: [
          'svg-rendering',
          'canvas-support',
          'local-storage',
          'websockets',
          'file-api'
        ]
      },
      
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      ]
    };
  }

  /**
   * サンプルファイル生成
   */
  async generateSampleFiles() {
    const sampleFiles = {
      'sample-sequence.puml': `@startuml
title サンプルシーケンス図
actor ユーザー
participant システム
participant データベース

ユーザー -> システム: ログイン要求
システム -> データベース: 認証確認
データベース -> システム: 認証結果
システム -> ユーザー: ログイン完了
@enduml`,

      'sample-class.puml': `@startuml
title サンプルクラス図
class User {
  +name: String
  +email: String
  +login(): boolean
}

class Admin {
  +permissions: List<String>
  +manageUsers(): void
}

User <|-- Admin
@enduml`,

      'sample-usecase.puml': `@startuml
title サンプルユースケース図
actor ユーザー
actor 管理者

(ログイン) as UC1
(データ閲覧) as UC2
(ユーザー管理) as UC3

ユーザー --> UC1
ユーザー --> UC2
管理者 --> UC1
管理者 --> UC3
@enduml`,

      'large-test.puml': this.generateLargeSequenceDiagram(50),
      'complex-class.puml': this.generateComplexClassDiagram(25)
    };

    for (const [filename, content] of Object.entries(sampleFiles)) {
      await this.writeFile(this.filesDir, filename, content);
    }
  }

  /**
   * データインデックス生成
   */
  async generateDataIndex() {
    const index = {
      version: '2.0.0',
      generated: new Date().toISOString(),
      categories: [
        'basic', 'editor', 'diagrams', 'inline', 'error',
        'performance', 'security', 'accessibility', 'integration',
        'regression', 'stress', 'crossBrowser'
      ],
      totalScenarios: 55,
      dataFiles: [
        'test-datasets.json',
        'basic-test-data.json',
        'editor-test-data.json',
        'diagrams-test-data.json',
        'performance-test-data.json',
        'security-test-data.json',
        'accessibility-test-data.json',
        'integration-test-data.json',
        'regression-test-data.json',
        'stress-test-data.json',
        'crossBrowser-test-data.json'
      ],
      sampleFiles: [
        'sample-sequence.puml',
        'sample-class.puml',
        'sample-usecase.puml',
        'large-test.puml',
        'complex-class.puml'
      ]
    };

    await this.writeDataFile('index.json', index);
  }

  /**
   * ディレクトリ確保
   */
  async ensureDirectories() {
    const dirs = [this.outputDir, this.filesDir];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * データファイル書き込み
   */
  async writeDataFile(filename, data) {
    const filePath = path.join(this.outputDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * ファイル書き込み
   */
  async writeFile(dir, filename, content) {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, 'utf8');
  }
}

// CLI実行サポート
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TestDataGenerator();
  generator.generateAllTestData()
    .then(() => {
      console.log('✅ テストデータ生成が完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ テストデータ生成に失敗しました:', error);
      process.exit(1);
    });
}

export default TestDataGenerator;