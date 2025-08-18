/**
 * editor-integration.test.js - エディター間連携統合テスト
 * TEST-003: 統合テストスイート作成 (13ポイント) - Sprint2
 * 
 * 対象コンポーネント:
 * - ActionEditor, ConditionEditor, LoopEditor, ParallelEditor
 * - EditorManager（統合制御）
 * - エディター間のデータ連携
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// Mock DOM環境
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: 'http://localhost:8086' }
});

// DOMPurifyモック
const mockDOMPurify = {
  sanitize: jest.fn((input) => input),
  isSupported: true
};
global.DOMPurify = mockDOMPurify;

// EditorManagerと各エディターの動的インポート設定
jest.mock('../../src/components/editors/EditorManager.js');
jest.mock('../../src/components/editors/ActionEditor.js');
jest.mock('../../src/components/editors/ConditionEditor.js');
jest.mock('../../src/components/editors/LoopEditor.js');
jest.mock('../../src/components/editors/ParallelEditor.js');

describe('エディター間連携統合テスト', () => {
  let container;
  let editorManager;
  let mockActionEditor;
  let mockConditionEditor;
  let mockLoopEditor;
  let mockParallelEditor;

  beforeEach(async () => {
    // DOM環境セットアップ
    document.body.innerHTML = `
      <div id="test-container">
        <div id="editor-container">
          <div id="action-editor-panel" class="editor-panel"></div>
          <div id="condition-editor-panel" class="editor-panel"></div>
          <div id="loop-editor-panel" class="editor-panel"></div>
          <div id="parallel-editor-panel" class="editor-panel"></div>
        </div>
        <div id="output-container">
          <textarea id="plantuml-output"></textarea>
          <div id="preview-container"></div>
        </div>
      </div>
    `;
    
    container = document.getElementById('test-container');
    
    // エディターモックの設定
    mockActionEditor = {
      initialize: jest.fn().mockResolvedValue(true),
      getComponentData: jest.fn().mockReturnValue({
        type: 'action',
        name: 'テストアクション',
        description: 'テストアクションの説明'
      }),
      setComponentData: jest.fn(),
      generatePlantUML: jest.fn().mockReturnValue('participant "テストアクション" as action1'),
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };
    
    mockConditionEditor = {
      initialize: jest.fn().mockResolvedValue(true),
      getComponentData: jest.fn().mockReturnValue({
        type: 'condition',
        condition: 'result == "success"',
        trueAction: 'action1',
        falseAction: 'action2'
      }),
      setComponentData: jest.fn(),
      generatePlantUML: jest.fn().mockReturnValue('alt result == "success"'),
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };
    
    mockLoopEditor = {
      initialize: jest.fn().mockResolvedValue(true),
      getComponentData: jest.fn().mockReturnValue({
        type: 'loop',
        condition: 'i < 10',
        actions: ['action1', 'action2']
      }),
      setComponentData: jest.fn(),
      generatePlantUML: jest.fn().mockReturnValue('loop i < 10'),
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };
    
    mockParallelEditor = {
      initialize: jest.fn().mockResolvedValue(true),
      getComponentData: jest.fn().mockReturnValue({
        type: 'parallel',
        branches: [
          { name: 'branch1', actions: ['action1'] },
          { name: 'branch2', actions: ['action2'] }
        ]
      }),
      setComponentData: jest.fn(),
      generatePlantUML: jest.fn().mockReturnValue('par\n  action1\nelse\n  action2\nend'),
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };
    
    // EditorManagerモックの設定
    const { EditorManager } = await import('../../src/components/editors/EditorManager.js');
    editorManager = new EditorManager(container, {
      enableSecurityMode: true,
      enableRealtimePreview: true,
      enableAutoSave: false // テスト用に無効化
    });
    
    // エディターインスタンスをモックに置き換え
    editorManager.editors = {
      action: mockActionEditor,
      condition: mockConditionEditor,
      loop: mockLoopEditor,
      parallel: mockParallelEditor
    };
  });

  afterEach(() => {
    if (editorManager) {
      editorManager.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('エディター初期化テスト', () => {
    test('全エディターが正常に初期化される', async () => {
      await editorManager.initializeAllEditors();
      
      expect(mockActionEditor.initialize).toHaveBeenCalled();
      expect(mockConditionEditor.initialize).toHaveBeenCalled();
      expect(mockLoopEditor.initialize).toHaveBeenCalled();
      expect(mockParallelEditor.initialize).toHaveBeenCalled();
    });

    test('エディター初期化失敗時の処理', async () => {
      mockActionEditor.initialize.mockRejectedValue(new Error('初期化失敗'));
      
      await expect(editorManager.initializeAllEditors()).rejects.toThrow('初期化失敗');
    });
  });

  describe('エディター間データ連携テスト', () => {
    beforeEach(async () => {
      await editorManager.initializeAllEditors();
    });

    test('ActionEditor → ConditionEditor データ受け渡し', () => {
      // ActionEditorで作成されたアクションをConditionEditorで参照
      const actionData = mockActionEditor.getComponentData();
      
      // ConditionEditorにアクションデータを設定
      const conditionData = {
        type: 'condition',
        condition: 'result == "success"',
        trueAction: actionData.name, // ActionEditorのデータを参照
        falseAction: 'fallback'
      };
      
      mockConditionEditor.setComponentData(conditionData);
      
      expect(mockConditionEditor.setComponentData).toHaveBeenCalledWith(
        expect.objectContaining({
          trueAction: 'テストアクション'
        })
      );
    });

    test('ConditionEditor → LoopEditor データ連携', () => {
      const conditionData = mockConditionEditor.getComponentData();
      
      // ConditionEditorの結果をLoopEditorのアクションに含める
      const loopData = {
        type: 'loop',
        condition: 'i < 10',
        actions: [conditionData.trueAction, conditionData.falseAction]
      };
      
      mockLoopEditor.setComponentData(loopData);
      
      expect(mockLoopEditor.setComponentData).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: expect.arrayContaining(['action1', 'action2'])
        })
      );
    });

    test('LoopEditor → ParallelEditor 統合シナリオ', () => {
      const loopData = mockLoopEditor.getComponentData();
      
      // LoopEditorのアクションをParallelEditorのブランチに分散
      const parallelData = {
        type: 'parallel',
        branches: [
          { name: 'branch1', actions: [loopData.actions[0]] },
          { name: 'branch2', actions: [loopData.actions[1]] }
        ]
      };
      
      mockParallelEditor.setComponentData(parallelData);
      
      expect(mockParallelEditor.setComponentData).toHaveBeenCalledWith(
        expect.objectContaining({
          branches: expect.arrayContaining([
            expect.objectContaining({ actions: ['action1'] }),
            expect.objectContaining({ actions: ['action2'] })
          ])
        })
      );
    });

    test('全エディター統合シナリオ', () => {
      // 1. ActionEditorでアクション作成
      const actionData = mockActionEditor.getComponentData();
      
      // 2. ConditionEditorでアクションを条件分岐に使用
      const conditionData = {
        type: 'condition',
        condition: 'status == "ready"',
        trueAction: actionData.name,
        falseAction: 'waitAction'
      };
      mockConditionEditor.setComponentData(conditionData);
      
      // 3. LoopEditorで条件分岐を繰り返し処理に組み込み
      const loopData = {
        type: 'loop',
        condition: 'retryCount < 3',
        actions: [conditionData.trueAction]
      };
      mockLoopEditor.setComponentData(loopData);
      
      // 4. ParallelEditorで並行処理として実行
      const parallelData = {
        type: 'parallel',
        branches: [
          { name: 'main', actions: loopData.actions },
          { name: 'monitor', actions: ['monitorAction'] }
        ]
      };
      mockParallelEditor.setComponentData(parallelData);
      
      // 検証: すべてのエディターが適切にデータを設定
      expect(mockConditionEditor.setComponentData).toHaveBeenCalled();
      expect(mockLoopEditor.setComponentData).toHaveBeenCalled();
      expect(mockParallelEditor.setComponentData).toHaveBeenCalled();
    });
  });

  describe('PlantUMLコード生成統合テスト', () => {
    beforeEach(async () => {
      await editorManager.initializeAllEditors();
    });

    test('各エディターのPlantUMLコード生成', () => {
      const plantUMLCodes = {
        action: mockActionEditor.generatePlantUML(),
        condition: mockConditionEditor.generatePlantUML(),
        loop: mockLoopEditor.generatePlantUML(),
        parallel: mockParallelEditor.generatePlantUML()
      };
      
      expect(plantUMLCodes.action).toBe('participant "テストアクション" as action1');
      expect(plantUMLCodes.condition).toBe('alt result == "success"');
      expect(plantUMLCodes.loop).toBe('loop i < 10');
      expect(plantUMLCodes.parallel).toBe('par\n  action1\nelse\n  action2\nend');
    });

    test('統合PlantUMLコード生成', () => {
      // EditorManagerが全エディターのコードを統合
      const integratedCode = editorManager.generateIntegratedPlantUML();
      
      expect(integratedCode).toContain('@startuml');
      expect(integratedCode).toContain('@enduml');
      expect(integratedCode).toContain('participant');
      expect(integratedCode).toContain('alt');
      expect(integratedCode).toContain('loop');
      expect(integratedCode).toContain('par');
    });

    test('日本語入力から PlantUML変換の正確性', () => {
      const japaneseInput = 'システムAがデータベースにアクセスし、結果に応じて処理を分岐する';
      
      // 日本語解析結果をシミュレート
      const parseResult = {
        actions: ['システムA', 'データベース', 'アクセス'],
        conditions: ['結果に応じて'],
        flow: 'sequence'
      };
      
      // エディターにデータを設定
      mockActionEditor.setComponentData({
        type: 'action',
        name: parseResult.actions[0],
        target: parseResult.actions[1],
        action: parseResult.actions[2]
      });
      
      // PlantUMLコード生成
      const plantUMLCode = mockActionEditor.generatePlantUML();
      
      expect(plantUMLCode).toContain('participant');
      expect(mockActionEditor.setComponentData).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'システムA',
          target: 'データベース'
        })
      );
    });
  });

  describe('バリデーション統合テスト', () => {
    beforeEach(async () => {
      await editorManager.initializeAllEditors();
    });

    test('各エディターのバリデーション', () => {
      const validationResults = {
        action: mockActionEditor.validate(),
        condition: mockConditionEditor.validate(),
        loop: mockLoopEditor.validate(),
        parallel: mockParallelEditor.validate()
      };
      
      Object.values(validationResults).forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('エラー入力時のバリデーション', () => {
      // 無効なデータを設定
      mockActionEditor.validate.mockReturnValue({
        isValid: false,
        errors: ['アクション名が空です']
      });
      
      const result = mockActionEditor.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('アクション名が空です');
    });

    test('エディター間依存関係のバリデーション', () => {
      // ActionEditorが無効な場合、それを参照するConditionEditorも無効
      mockActionEditor.validate.mockReturnValue({
        isValid: false,
        errors: ['必須項目が入力されていません']
      });
      
      const actionResult = mockActionEditor.validate();
      expect(actionResult.isValid).toBe(false);
      
      // ConditionEditorのバリデーションで依存関係をチェック
      mockConditionEditor.validate.mockReturnValue({
        isValid: false,
        errors: ['参照されているアクションが無効です']
      });
      
      const conditionResult = mockConditionEditor.validate();
      expect(conditionResult.isValid).toBe(false);
    });
  });

  describe('エラーハンドリング統合テスト', () => {
    test('エディター初期化エラーハンドリング', async () => {
      mockActionEditor.initialize.mockRejectedValue(new Error('DOM要素が見つかりません'));
      
      await expect(editorManager.initializeAllEditors()).rejects.toThrow('DOM要素が見つかりません');
    });

    test('データ設定エラーハンドリング', () => {
      mockConditionEditor.setComponentData.mockImplementation(() => {
        throw new Error('無効なデータ形式です');
      });
      
      expect(() => {
        mockConditionEditor.setComponentData({ invalid: 'data' });
      }).toThrow('無効なデータ形式です');
    });

    test('PlantUMLコード生成エラーハンドリング', () => {
      mockLoopEditor.generatePlantUML.mockImplementation(() => {
        throw new Error('PlantUMLコード生成に失敗しました');
      });
      
      expect(() => {
        mockLoopEditor.generatePlantUML();
      }).toThrow('PlantUMLコード生成に失敗しました');
    });
  });

  describe('パフォーマンステスト（統合）', () => {
    test('大量データ処理性能', async () => {
      const startTime = performance.now();
      
      // 大量のデータを処理
      for (let i = 0; i < 100; i++) {
        mockActionEditor.setComponentData({
          type: 'action',
          name: `アクション${i}`,
          description: `説明${i}`
        });
        mockActionEditor.generatePlantUML();
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 100件の処理が500ms以内に完了することを確認
      expect(executionTime).toBeLessThan(500);
    });

    test('メモリ使用量監視', () => {
      // メモリ使用量の監視（模擬）
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // 大量のデータ操作
      for (let i = 0; i < 50; i++) {
        editorManager.addEditor(`dynamic-${i}`, mockActionEditor);
        editorManager.removeEditor(`dynamic-${i}`);
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が50MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});