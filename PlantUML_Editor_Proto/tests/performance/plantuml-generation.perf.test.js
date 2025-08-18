/**
 * plantuml-generation.perf.test.js - PlantUML生成パフォーマンステスト
 * TEST-004: パフォーマンステスト - PlantUML生成最適化
 * 
 * 測定項目:
 * - PlantUMLコード生成速度
 * - 大規模図表生成性能
 * - シンタックス検証処理時間
 * - 図表タイプ別生成効率
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// PlantUML生成エンジンのモック実装
class PlantUMLGenerator {
  constructor() {
    this.templates = {
      sequence: {
        header: '@startuml',
        footer: '@enduml',
        participantPattern: 'participant "{name}" as {alias}',
        interactionPattern: '{from} -> {to} : {message}',
        notePattern: 'note over {target} : {text}',
        activationPattern: 'activate {target}'
      },
      class: {
        header: '@startuml',
        footer: '@enduml',
        classPattern: 'class {name} {\\n{methods}\\n}',
        relationshipPattern: '{from} --> {to} : {label}',
        packagePattern: 'package "{name}" {\\n{content}\\n}'
      },
      activity: {
        header: '@startuml',
        footer: '@enduml',
        startPattern: 'start',
        endPattern: 'stop',
        actionPattern: ':{action};',
        decisionPattern: 'if ({condition}) then (yes)',
        mergePattern: 'endif'
      },
      state: {
        header: '@startuml',
        footer: '@enduml',
        statePattern: 'state {name}',
        transitionPattern: '{from} --> {to} : {trigger}',
        compositePattern: 'state {name} {\\n{substates}\\n}'
      }
    };
    
    this.syntaxValidator = {
      keywords: ['@startuml', '@enduml', 'participant', 'class', 'state', 'start', 'stop'],
      operators: ['->', '-->', '..>', ':', '|', '||'],
      patterns: {
        participant: /participant\s+"[^"]+"\s+as\s+\w+/g,
        interaction: /\w+\s+->\s+\w+\s*:\s*.+/g,
        class: /class\s+\w+/g
      }
    };
    
    this.performanceMetrics = {
      generationTime: 0,
      validationTime: 0,
      codeLength: 0,
      elementCount: 0,
      errorCount: 0
    };
    
    this.cache = new Map();
  }

  generateSequenceDiagram(data) {
    const startTime = performance.now();
    
    let code = this.templates.sequence.header + '\n\n';
    
    // タイトル追加
    if (data.title) {
      code += `title ${data.title}\n\n`;
    }
    
    // 参加者定義
    if (data.participants && data.participants.length > 0) {
      data.participants.forEach(participant => {
        const alias = this.generateAlias(participant.name);
        code += this.templates.sequence.participantPattern
          .replace('{name}', participant.name)
          .replace('{alias}', alias) + '\n';
      });
      code += '\n';
    }
    
    // インタラクション生成
    if (data.interactions && data.interactions.length > 0) {
      data.interactions.forEach(interaction => {
        if (interaction.note) {
          code += this.templates.sequence.notePattern
            .replace('{target}', interaction.from)
            .replace('{text}', interaction.note) + '\n';
        }
        
        if (interaction.activate) {
          code += this.templates.sequence.activationPattern
            .replace('{target}', interaction.to) + '\n';
        }
        
        code += this.templates.sequence.interactionPattern
          .replace('{from}', interaction.from)
          .replace('{to}', interaction.to)
          .replace('{message}', interaction.message) + '\n';
        
        if (interaction.deactivate) {
          code += `deactivate ${interaction.to}\n`;
        }
      });
    }
    
    code += '\n' + this.templates.sequence.footer;
    
    const endTime = performance.now();
    const generationTime = endTime - startTime;
    
    this.updateMetrics(generationTime, code, data.participants?.length || 0, data.interactions?.length || 0);
    
    return {
      code,
      generationTime,
      lineCount: code.split('\n').length,
      characterCount: code.length
    };
  }

  generateClassDiagram(data) {
    const startTime = performance.now();
    
    let code = this.templates.class.header + '\n\n';
    
    if (data.title) {
      code += `title ${data.title}\n\n`;
    }
    
    // パッケージ生成
    if (data.packages && data.packages.length > 0) {
      data.packages.forEach(pkg => {
        let packageContent = '';
        
        pkg.classes.forEach(cls => {
          let methods = '';
          if (cls.methods && cls.methods.length > 0) {
            methods = cls.methods.map(method => `  ${method}`).join('\\n');
          }
          
          packageContent += this.templates.class.classPattern
            .replace('{name}', cls.name)
            .replace('{methods}', methods) + '\n';
        });
        
        code += this.templates.class.packagePattern
          .replace('{name}', pkg.name)
          .replace('{content}', packageContent) + '\n\n';
      });
    }
    
    // 単独クラス生成
    if (data.classes && data.classes.length > 0) {
      data.classes.forEach(cls => {
        let methods = '';
        if (cls.methods && cls.methods.length > 0) {
          methods = cls.methods.map(method => `  ${method}`).join('\\n');
        }
        
        code += this.templates.class.classPattern
          .replace('{name}', cls.name)
          .replace('{methods}', methods) + '\n';
      });
      code += '\n';
    }
    
    // 関係性生成
    if (data.relationships && data.relationships.length > 0) {
      data.relationships.forEach(rel => {
        code += this.templates.class.relationshipPattern
          .replace('{from}', rel.from)
          .replace('{to}', rel.to)
          .replace('{label}', rel.label || '') + '\n';
      });
    }
    
    code += '\n' + this.templates.class.footer;
    
    const endTime = performance.now();
    const generationTime = endTime - startTime;
    
    const elementCount = (data.classes?.length || 0) + (data.relationships?.length || 0);
    this.updateMetrics(generationTime, code, elementCount, 0);
    
    return {
      code,
      generationTime,
      lineCount: code.split('\n').length,
      characterCount: code.length
    };
  }

  generateActivityDiagram(data) {
    const startTime = performance.now();
    
    let code = this.templates.activity.header + '\n\n';
    
    if (data.title) {
      code += `title ${data.title}\n\n`;
    }
    
    code += this.templates.activity.startPattern + '\n\n';
    
    // アクティビティ生成
    if (data.activities && data.activities.length > 0) {
      data.activities.forEach(activity => {
        switch (activity.type) {
          case 'action':
            code += this.templates.activity.actionPattern
              .replace('{action}', activity.text) + '\n';
            break;
          case 'decision':
            code += this.templates.activity.decisionPattern
              .replace('{condition}', activity.condition) + '\n';
            
            if (activity.trueAction) {
              code += this.templates.activity.actionPattern
                .replace('{action}', activity.trueAction) + '\n';
            }
            
            if (activity.falseAction) {
              code += 'else (no)\n';
              code += this.templates.activity.actionPattern
                .replace('{action}', activity.falseAction) + '\n';
            }
            
            code += this.templates.activity.mergePattern + '\n';
            break;
        }
      });
    }
    
    code += '\n' + this.templates.activity.endPattern + '\n';
    code += this.templates.activity.footer;
    
    const endTime = performance.now();
    const generationTime = endTime - startTime;
    
    this.updateMetrics(generationTime, code, data.activities?.length || 0, 0);
    
    return {
      code,
      generationTime,
      lineCount: code.split('\n').length,
      characterCount: code.length
    };
  }

  generateStateDiagram(data) {
    const startTime = performance.now();
    
    let code = this.templates.state.header + '\n\n';
    
    if (data.title) {
      code += `title ${data.title}\n\n`;
    }
    
    // 状態定義
    if (data.states && data.states.length > 0) {
      data.states.forEach(state => {
        if (state.type === 'composite') {
          let substates = '';
          if (state.substates && state.substates.length > 0) {
            substates = state.substates.map(sub => `  ${sub}`).join('\\n');
          }
          
          code += this.templates.state.compositePattern
            .replace('{name}', state.name)
            .replace('{substates}', substates) + '\n';
        } else {
          code += this.templates.state.statePattern
            .replace('{name}', state.name) + '\n';
        }
      });
      code += '\n';
    }
    
    // 遷移定義
    if (data.transitions && data.transitions.length > 0) {
      data.transitions.forEach(transition => {
        code += this.templates.state.transitionPattern
          .replace('{from}', transition.from)
          .replace('{to}', transition.to)
          .replace('{trigger}', transition.trigger) + '\n';
      });
    }
    
    code += '\n' + this.templates.state.footer;
    
    const endTime = performance.now();
    const generationTime = endTime - startTime;
    
    const elementCount = (data.states?.length || 0) + (data.transitions?.length || 0);
    this.updateMetrics(generationTime, code, elementCount, 0);
    
    return {
      code,
      generationTime,
      lineCount: code.split('\n').length,
      characterCount: code.length
    };
  }

  validateSyntax(code) {
    const startTime = performance.now();
    
    const errors = [];
    const lines = code.split('\n');
    
    // 基本構造チェック
    if (!code.includes('@startuml')) {
      errors.push({ line: 0, message: '@startuml directive missing' });
    }
    
    if (!code.includes('@enduml')) {
      errors.push({ line: lines.length, message: '@enduml directive missing' });
    }
    
    // 行ごとの構文チェック
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '') return;
      
      // コメント行をスキップ
      if (trimmedLine.startsWith('\'') || trimmedLine.startsWith('//')) return;
      
      // 基本的な構文パターンチェック
      const isValidSyntax = this.isValidPlantUMLSyntax(trimmedLine);
      if (!isValidSyntax) {
        errors.push({ 
          line: index + 1, 
          message: `Invalid syntax: ${trimmedLine}`,
          severity: 'warning'
        });
      }
    });
    
    const endTime = performance.now();
    const validationTime = endTime - startTime;
    
    this.performanceMetrics.validationTime += validationTime;
    this.performanceMetrics.errorCount += errors.length;
    
    return {
      isValid: errors.length === 0,
      errors,
      validationTime,
      lineCount: lines.length
    };
  }

  isValidPlantUMLSyntax(line) {
    // PlantUMLディレクティブ
    if (line.startsWith('@')) return true;
    
    // タイトル
    if (line.startsWith('title ')) return true;
    
    // 参加者定義
    if (this.syntaxValidator.patterns.participant.test(line)) return true;
    
    // インタラクション
    if (this.syntaxValidator.patterns.interaction.test(line)) return true;
    
    // クラス定義
    if (this.syntaxValidator.patterns.class.test(line)) return true;
    
    // その他のキーワード
    const hasKeyword = this.syntaxValidator.keywords.some(keyword => 
      line.includes(keyword)
    );
    
    if (hasKeyword) return true;
    
    // 演算子を含む行
    const hasOperator = this.syntaxValidator.operators.some(operator => 
      line.includes(operator)
    );
    
    return hasOperator;
  }

  optimizeCode(code) {
    const startTime = performance.now();
    
    let optimizedCode = code;
    
    // 重複する参加者定義を削除
    const participantLines = [];
    const seenParticipants = new Set();
    
    const lines = optimizedCode.split('\n');
    const optimizedLines = lines.filter(line => {
      if (line.trim().startsWith('participant ')) {
        const participantMatch = line.match(/participant\s+"([^"]+)"/);
        if (participantMatch) {
          const participantName = participantMatch[1];
          if (seenParticipants.has(participantName)) {
            return false; // 重複を削除
          }
          seenParticipants.add(participantName);
        }
      }
      return true;
    });
    
    // 空行の最適化
    let previousLineEmpty = false;
    const finalLines = optimizedLines.filter(line => {
      const isEmpty = line.trim() === '';
      if (isEmpty && previousLineEmpty) {
        return false; // 連続する空行を削除
      }
      previousLineEmpty = isEmpty;
      return true;
    });
    
    optimizedCode = finalLines.join('\n');
    
    const endTime = performance.now();
    const optimizationTime = endTime - startTime;
    
    return {
      code: optimizedCode,
      optimizationTime,
      originalSize: code.length,
      optimizedSize: optimizedCode.length,
      compressionRatio: (code.length - optimizedCode.length) / code.length
    };
  }

  generateAlias(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
  }

  updateMetrics(generationTime, code, elementCount, interactionCount) {
    this.performanceMetrics.generationTime += generationTime;
    this.performanceMetrics.codeLength += code.length;
    this.performanceMetrics.elementCount += elementCount;
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      averageGenerationTime: this.performanceMetrics.elementCount > 0
        ? this.performanceMetrics.generationTime / this.performanceMetrics.elementCount
        : 0,
      averageCodeLength: this.performanceMetrics.elementCount > 0
        ? this.performanceMetrics.codeLength / this.performanceMetrics.elementCount
        : 0
    };
  }

  clearCache() {
    this.cache.clear();
  }

  destroy() {
    this.clearCache();
    this.performanceMetrics = {
      generationTime: 0,
      validationTime: 0,
      codeLength: 0,
      elementCount: 0,
      errorCount: 0
    };
  }
}

describe('PlantUML生成パフォーマンステスト', () => {
  let generator;
  let performanceMonitor;

  beforeEach(() => {
    generator = new PlantUMLGenerator();
    
    performanceMonitor = {
      measurements: new Map(),
      
      startMeasurement(name) {
        this.measurements.set(name, {
          startTime: performance.now(),
          startMemory: performance.memory?.usedJSHeapSize || 0
        });
      },
      
      endMeasurement(name) {
        const measurement = this.measurements.get(name);
        if (measurement) {
          measurement.endTime = performance.now();
          measurement.endMemory = performance.memory?.usedJSHeapSize || 0;
          measurement.duration = measurement.endTime - measurement.startTime;
          measurement.memoryUsed = measurement.endMemory - measurement.startMemory;
        }
        return measurement;
      }
    };
  });

  afterEach(() => {
    generator.destroy();
  });

  describe('シーケンス図生成性能テスト', () => {
    test('小規模シーケンス図の生成速度', () => {
      const data = {
        title: 'Simple Login Sequence',
        participants: [
          { name: 'ユーザー' },
          { name: 'システム' },
          { name: 'データベース' }
        ],
        interactions: [
          { from: 'ユーザー', to: 'システム', message: 'ログイン要求' },
          { from: 'システム', to: 'データベース', message: '認証確認' },
          { from: 'データベース', to: 'システム', message: '認証結果' },
          { from: 'システム', to: 'ユーザー', message: 'ログイン完了' }
        ]
      };

      performanceMonitor.startMeasurement('smallSequence');
      
      const result = generator.generateSequenceDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('smallSequence');

      // 小規模シーケンス図は5ms以内で生成
      expect(result.generationTime).toBeLessThan(5);
      
      // 適切なコード長が生成されている
      expect(result.characterCount).toBeGreaterThan(100);
      expect(result.lineCount).toBeGreaterThan(5);
      
      // メモリ使用量が500KB以下
      expect(measurement.memoryUsed).toBeLessThan(500 * 1024);
    });

    test('中規模シーケンス図の生成速度', () => {
      const participants = Array.from({ length: 10 }, (_, i) => ({
        name: `システム${i + 1}`
      }));
      
      const interactions = [];
      for (let i = 0; i < participants.length - 1; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          interactions.push({
            from: participants[i].name,
            to: participants[j].name,
            message: `処理${i}-${j}`,
            activate: Math.random() > 0.7,
            note: Math.random() > 0.8 ? `注記${i}-${j}` : null
          });
        }
      }

      const data = {
        title: 'Medium Scale Sequence',
        participants,
        interactions: interactions.slice(0, 25) // 25個のインタラクション
      };

      performanceMonitor.startMeasurement('mediumSequence');
      
      const result = generator.generateSequenceDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('mediumSequence');

      // 中規模シーケンス図は20ms以内で生成
      expect(result.generationTime).toBeLessThan(20);
      
      // 適切なサイズのコードが生成されている
      expect(result.characterCount).toBeGreaterThan(500);
      expect(result.lineCount).toBeGreaterThan(20);
      
      // メモリ使用量が2MB以下
      expect(measurement.memoryUsed).toBeLessThan(2 * 1024 * 1024);
    });

    test('大規模シーケンス図の生成速度', () => {
      const participants = Array.from({ length: 20 }, (_, i) => ({
        name: `マイクロサービス${i + 1}`
      }));
      
      const interactions = [];
      
      // 複雑な相互作用パターンを生成
      for (let i = 0; i < 100; i++) {
        const fromIndex = Math.floor(Math.random() * participants.length);
        const toIndex = Math.floor(Math.random() * participants.length);
        
        if (fromIndex !== toIndex) {
          interactions.push({
            from: participants[fromIndex].name,
            to: participants[toIndex].name,
            message: `API呼び出し${i}`,
            activate: i % 5 === 0,
            deactivate: i % 5 === 4,
            note: i % 10 === 0 ? `重要処理${i}` : null
          });
        }
      }

      const data = {
        title: 'Large Scale Microservices Sequence',
        participants,
        interactions
      };

      performanceMonitor.startMeasurement('largeSequence');
      
      const result = generator.generateSequenceDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('largeSequence');

      // 大規模シーケンス図は100ms以内で生成
      expect(result.generationTime).toBeLessThan(100);
      
      // 大規模なコードが生成されている
      expect(result.characterCount).toBeGreaterThan(2000);
      expect(result.lineCount).toBeGreaterThan(50);
      
      // メモリ使用量が10MB以下
      expect(measurement.memoryUsed).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('クラス図生成性能テスト', () => {
    test('基本クラス図の生成速度', () => {
      const data = {
        title: 'Basic Class Diagram',
        classes: [
          {
            name: 'User',
            methods: ['login()', 'logout()', 'updateProfile()']
          },
          {
            name: 'Order',
            methods: ['create()', 'update()', 'cancel()', 'getStatus()']
          },
          {
            name: 'Product',
            methods: ['getDetails()', 'updatePrice()', 'checkStock()']
          }
        ],
        relationships: [
          { from: 'User', to: 'Order', label: 'places' },
          { from: 'Order', to: 'Product', label: 'contains' }
        ]
      };

      performanceMonitor.startMeasurement('basicClass');
      
      const result = generator.generateClassDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('basicClass');

      // 基本クラス図は10ms以内で生成
      expect(result.generationTime).toBeLessThan(10);
      
      // 適切なコード構造が生成されている
      expect(result.code).toContain('class User');
      expect(result.code).toContain('class Order');
      expect(result.code).toContain('class Product');
      expect(result.code).toContain('-->');
    });

    test('パッケージ含むクラス図の生成速度', () => {
      const data = {
        title: 'Package-based Class Diagram',
        packages: [
          {
            name: 'ユーザー管理',
            classes: Array.from({ length: 5 }, (_, i) => ({
              name: `UserClass${i + 1}`,
              methods: Array.from({ length: 3 }, (_, j) => `method${i}_${j}()`)
            }))
          },
          {
            name: '商品管理',
            classes: Array.from({ length: 8 }, (_, i) => ({
              name: `ProductClass${i + 1}`,
              methods: Array.from({ length: 4 }, (_, j) => `method${i}_${j}()`)
            }))
          },
          {
            name: '注文管理',
            classes: Array.from({ length: 6 }, (_, i) => ({
              name: `OrderClass${i + 1}`,
              methods: Array.from({ length: 5 }, (_, j) => `method${i}_${j}()`)
            }))
          }
        ],
        relationships: [
          { from: 'UserClass1', to: 'OrderClass1', label: 'creates' },
          { from: 'OrderClass1', to: 'ProductClass1', label: 'includes' }
        ]
      };

      performanceMonitor.startMeasurement('packageClass');
      
      const result = generator.generateClassDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('packageClass');

      // パッケージ含むクラス図は50ms以内で生成
      expect(result.generationTime).toBeLessThan(50);
      
      // パッケージ構造が生成されている
      expect(result.code).toContain('package "ユーザー管理"');
      expect(result.code).toContain('package "商品管理"');
      expect(result.code).toContain('package "注文管理"');
    });

    test('大規模クラス図の生成速度', () => {
      const data = {
        title: 'Enterprise Class Diagram',
        packages: Array.from({ length: 10 }, (_, pkgIndex) => ({
          name: `パッケージ${pkgIndex + 1}`,
          classes: Array.from({ length: 15 }, (_, clsIndex) => ({
            name: `Class${pkgIndex}_${clsIndex}`,
            methods: Array.from({ length: 8 }, (_, methodIndex) => 
              `method${pkgIndex}_${clsIndex}_${methodIndex}()`
            )
          }))
        })),
        relationships: Array.from({ length: 50 }, (_, i) => ({
          from: `Class${Math.floor(i / 5)}_${i % 15}`,
          to: `Class${Math.floor((i + 1) / 5)}_${(i + 1) % 15}`,
          label: `関係${i}`
        }))
      };

      performanceMonitor.startMeasurement('enterpriseClass');
      
      const result = generator.generateClassDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('enterpriseClass');

      // 大規模クラス図は300ms以内で生成
      expect(result.generationTime).toBeLessThan(300);
      
      // 大規模なコードが生成されている
      expect(result.characterCount).toBeGreaterThan(10000);
      expect(result.lineCount).toBeGreaterThan(100);
      
      // メモリ使用量が20MB以下
      expect(measurement.memoryUsed).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('アクティビティ図生成性能テスト', () => {
    test('シンプルなアクティビティ図の生成速度', () => {
      const data = {
        title: 'Simple Activity Flow',
        activities: [
          { type: 'action', text: 'ユーザー入力受付' },
          { type: 'decision', condition: '入力が有効か？', trueAction: 'データ保存', falseAction: 'エラー表示' },
          { type: 'action', text: '完了通知送信' }
        ]
      };

      performanceMonitor.startMeasurement('simpleActivity');
      
      const result = generator.generateActivityDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('simpleActivity');

      // シンプルなアクティビティ図は8ms以内で生成
      expect(result.generationTime).toBeLessThan(8);
      
      // 基本的な構造が含まれている
      expect(result.code).toContain('start');
      expect(result.code).toContain('stop');
      expect(result.code).toContain('if (');
      expect(result.code).toContain('endif');
    });

    test('複雑なアクティビティ図の生成速度', () => {
      const activities = [
        { type: 'action', text: 'プロセス開始' }
      ];
      
      // 10レベルの入れ子決定を生成
      for (let i = 0; i < 10; i++) {
        activities.push({
          type: 'decision',
          condition: `条件${i}をチェック`,
          trueAction: `処理${i}A実行`,
          falseAction: `処理${i}B実行`
        });
      }
      
      activities.push({ type: 'action', text: 'プロセス完了' });

      const data = {
        title: 'Complex Activity Flow',
        activities
      };

      performanceMonitor.startMeasurement('complexActivity');
      
      const result = generator.generateActivityDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('complexActivity');

      // 複雑なアクティビティ図は40ms以内で生成
      expect(result.generationTime).toBeLessThan(40);
      
      // 複雑な構造が生成されている
      expect(result.code.split('if (').length).toBeGreaterThan(10);
      expect(result.code.split('endif').length).toBeGreaterThan(10);
    });
  });

  describe('状態図生成性能テスト', () => {
    test('基本状態図の生成速度', () => {
      const data = {
        title: 'Basic State Diagram',
        states: [
          { name: '待機中' },
          { name: '処理中' },
          { name: '完了' },
          { name: 'エラー' }
        ],
        transitions: [
          { from: '待機中', to: '処理中', trigger: 'start' },
          { from: '処理中', to: '完了', trigger: 'success' },
          { from: '処理中', to: 'エラー', trigger: 'error' },
          { from: 'エラー', to: '待機中', trigger: 'retry' }
        ]
      };

      performanceMonitor.startMeasurement('basicState');
      
      const result = generator.generateStateDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('basicState');

      // 基本状態図は7ms以内で生成
      expect(result.generationTime).toBeLessThan(7);
      
      // 状態と遷移が含まれている
      expect(result.code).toContain('state 待機中');
      expect(result.code).toContain('state 処理中');
      expect(result.code).toContain('-->');
    });

    test('複合状態図の生成速度', () => {
      const data = {
        title: 'Composite State Diagram',
        states: Array.from({ length: 20 }, (_, i) => ({
          name: `状態${i}`,
          type: i % 5 === 0 ? 'composite' : 'simple',
          substates: i % 5 === 0 ? [`子状態${i}_1`, `子状態${i}_2`, `子状態${i}_3`] : undefined
        })),
        transitions: Array.from({ length: 50 }, (_, i) => ({
          from: `状態${i % 20}`,
          to: `状態${(i + 1) % 20}`,
          trigger: `イベント${i}`
        }))
      };

      performanceMonitor.startMeasurement('compositeState');
      
      const result = generator.generateStateDiagram(data);
      
      const measurement = performanceMonitor.endMeasurement('compositeState');

      // 複合状態図は60ms以内で生成
      expect(result.generationTime).toBeLessThan(60);
      
      // 複合状態が含まれている
      expect(result.code.split('state ').length).toBeGreaterThan(20);
    });
  });

  describe('構文検証性能テスト', () => {
    test('小規模コードの構文検証速度', () => {
      const smallCode = `
        @startuml
        participant User
        participant System
        User -> System : request
        System -> User : response
        @enduml
      `;

      performanceMonitor.startMeasurement('smallValidation');
      
      const result = generator.validateSyntax(smallCode);
      
      const measurement = performanceMonitor.endMeasurement('smallValidation');

      // 小規模構文検証は3ms以内
      expect(result.validationTime).toBeLessThan(3);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('中規模コードの構文検証速度', () => {
      // 100行程度のコード
      let mediumCode = '@startuml\ntitle Medium Diagram\n\n';
      
      for (let i = 0; i < 20; i++) {
        mediumCode += `participant "Actor${i}" as actor${i}\n`;
      }
      
      mediumCode += '\n';
      
      for (let i = 0; i < 50; i++) {
        const from = `actor${i % 20}`;
        const to = `actor${(i + 1) % 20}`;
        mediumCode += `${from} -> ${to} : message${i}\n`;
      }
      
      mediumCode += '\n@enduml';

      performanceMonitor.startMeasurement('mediumValidation');
      
      const result = generator.validateSyntax(mediumCode);
      
      const measurement = performanceMonitor.endMeasurement('mediumValidation');

      // 中規模構文検証は15ms以内
      expect(result.validationTime).toBeLessThan(15);
      expect(result.lineCount).toBeGreaterThan(70);
    });

    test('大規模コードの構文検証速度', () => {
      // 1000行程度のコード
      let largeCode = '@startuml\ntitle Large Enterprise Diagram\n\n';
      
      for (let i = 0; i < 100; i++) {
        largeCode += `participant "System${i}" as sys${i}\n`;
      }
      
      largeCode += '\n';
      
      for (let i = 0; i < 500; i++) {
        const from = `sys${i % 100}`;
        const to = `sys${(i + 1) % 100}`;
        largeCode += `${from} -> ${to} : process${i}\n`;
        
        if (i % 10 === 0) {
          largeCode += `note over ${from} : important step ${i}\n`;
        }
      }
      
      largeCode += '\n@enduml';

      performanceMonitor.startMeasurement('largeValidation');
      
      const result = generator.validateSyntax(largeCode);
      
      const measurement = performanceMonitor.endMeasurement('largeValidation');

      // 大規模構文検証は100ms以内
      expect(result.validationTime).toBeLessThan(100);
      expect(result.lineCount).toBeGreaterThan(600);
      
      // メモリ使用量が5MB以下
      expect(measurement.memoryUsed).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('コード最適化性能テスト', () => {
    test('重複除去最適化の効果', () => {
      let codeWithDuplicates = '@startuml\n';
      
      // 重複する参加者定義を作成
      for (let i = 0; i < 10; i++) {
        codeWithDuplicates += 'participant "User" as user\n';
        codeWithDuplicates += 'participant "System" as system\n';
      }
      
      codeWithDuplicates += '\nuser -> system : request\n@enduml';

      performanceMonitor.startMeasurement('optimization');
      
      const result = generator.optimizeCode(codeWithDuplicates);
      
      const measurement = performanceMonitor.endMeasurement('optimization');

      // 最適化は10ms以内で完了
      expect(result.optimizationTime).toBeLessThan(10);
      
      // コードサイズが削減されている
      expect(result.compressionRatio).toBeGreaterThan(0.5);
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
    });

    test('大規模コードの最適化性能', () => {
      let largeCodeWithRedundancy = '@startuml\n';
      
      // 多くの重複と無駄な空行を含むコード
      for (let i = 0; i < 100; i++) {
        largeCodeWithRedundancy += `participant "Actor${i % 10}" as actor${i % 10}\n`;
        largeCodeWithRedundancy += '\n\n\n'; // 余分な空行
      }
      
      for (let i = 0; i < 200; i++) {
        largeCodeWithRedundancy += `actor${i % 10} -> actor${(i + 1) % 10} : msg${i}\n`;
        largeCodeWithRedundancy += '\n\n'; // 余分な空行
      }
      
      largeCodeWithRedundancy += '@enduml';

      performanceMonitor.startMeasurement('largeOptimization');
      
      const result = generator.optimizeCode(largeCodeWithRedundancy);
      
      const measurement = performanceMonitor.endMeasurement('largeOptimization');

      // 大規模最適化は50ms以内で完了
      expect(result.optimizationTime).toBeLessThan(50);
      
      // 大幅な削減が達成されている
      expect(result.compressionRatio).toBeGreaterThan(0.3);
      
      // メモリ使用量が3MB以下
      expect(measurement.memoryUsed).toBeLessThan(3 * 1024 * 1024);
    });
  });

  describe('混合処理性能テスト', () => {
    test('生成→検証→最適化の一連処理', () => {
      const complexData = {
        title: 'End-to-End Performance Test',
        participants: Array.from({ length: 15 }, (_, i) => ({ name: `Service${i}` })),
        interactions: Array.from({ length: 40 }, (_, i) => ({
          from: `Service${i % 15}`,
          to: `Service${(i + 1) % 15}`,
          message: `operation${i}`,
          activate: i % 8 === 0,
          note: i % 12 === 0 ? `critical${i}` : null
        }))
      };

      performanceMonitor.startMeasurement('endToEndProcessing');
      
      // 生成
      const generatedResult = generator.generateSequenceDiagram(complexData);
      
      // 検証
      const validationResult = generator.validateSyntax(generatedResult.code);
      
      // 最適化
      const optimizationResult = generator.optimizeCode(generatedResult.code);
      
      const measurement = performanceMonitor.endMeasurement('endToEndProcessing');

      // 一連の処理が150ms以内で完了
      expect(measurement.duration).toBeLessThan(150);
      
      // 各工程が成功している
      expect(generatedResult.generationTime).toBeLessThan(50);
      expect(validationResult.isValid).toBe(true);
      expect(optimizationResult.compressionRatio).toBeGreaterThan(0);
      
      // 最終的な品質が確保されている
      expect(optimizationResult.optimizedSize).toBeLessThan(generatedResult.characterCount);
      
      // メモリ使用量が合理的
      expect(measurement.memoryUsed).toBeLessThan(8 * 1024 * 1024);
    });

    test('複数図表タイプの並行生成', async () => {
      const testData = {
        sequence: {
          participants: [{ name: 'A' }, { name: 'B' }],
          interactions: [{ from: 'A', to: 'B', message: 'test' }]
        },
        class: {
          classes: [{ name: 'TestClass', methods: ['test()'] }],
          relationships: []
        },
        activity: {
          activities: [{ type: 'action', text: 'test action' }]
        },
        state: {
          states: [{ name: 'TestState' }],
          transitions: []
        }
      };

      performanceMonitor.startMeasurement('parallelGeneration');
      
      const results = await Promise.all([
        generator.generateSequenceDiagram(testData.sequence),
        generator.generateClassDiagram(testData.class),
        generator.generateActivityDiagram(testData.activity),
        generator.generateStateDiagram(testData.state)
      ]);
      
      const measurement = performanceMonitor.endMeasurement('parallelGeneration');

      // 並行生成が30ms以内で完了
      expect(measurement.duration).toBeLessThan(30);
      
      // 全ての図表が正常に生成されている
      expect(results.length).toBe(4);
      results.forEach(result => {
        expect(result.code).toContain('@startuml');
        expect(result.code).toContain('@enduml');
        expect(result.generationTime).toBeLessThan(10);
      });
    });
  });
});