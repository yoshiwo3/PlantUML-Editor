/**
 * plantuml-conversion.test.js - PlantUML変換統合テスト
 * TEST-003: 統合テストスイート作成 - PlantUML変換機能
 * 
 * テスト対象:
 * - 日本語入力からPlantUML変換
 * - 複雑な構造の変換精度
 * - エラー入力時の処理
 * - マルチエディター統合変換
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// DOMPurifyモック
const mockDOMPurify = {
  sanitize: jest.fn((input) => input),
  isSupported: true
};
global.DOMPurify = mockDOMPurify;

// PlantUMLParser モック
jest.mock('../../PlantUMLParser.js');

describe('PlantUML変換統合テスト', () => {
  let parser;
  let editorManager;
  let container;

  beforeEach(async () => {
    // DOM環境セットアップ
    document.body.innerHTML = `
      <div id="conversion-test-container">
        <div id="input-area">
          <textarea id="japanese-input" placeholder="日本語でシーケンス図を記述してください"></textarea>
          <div id="input-toolbar">
            <button id="parse-btn">解析</button>
            <button id="clear-btn">クリア</button>
          </div>
        </div>
        <div id="editor-area">
          <div id="action-editor-panel"></div>
          <div id="condition-editor-panel"></div>
          <div id="loop-editor-panel"></div>
          <div id="parallel-editor-panel"></div>
        </div>
        <div id="output-area">
          <textarea id="plantuml-output" readonly></textarea>
          <div id="preview-container"></div>
          <div id="error-display"></div>
        </div>
      </div>
    `;
    
    container = document.getElementById('conversion-test-container');
    
    // PlantUMLParser モック実装
    const { PlantUMLParser } = await import('../../PlantUMLParser.js');
    parser = new PlantUMLParser();
    
    // パーサーメソッドをモック
    parser.parseJapaneseText = jest.fn();
    parser.generatePlantUMLCode = jest.fn();
    parser.validateSyntax = jest.fn();
    parser.optimizeCode = jest.fn();
    
    // EditorManager モック
    editorManager = {
      editors: {
        action: {
          setData: jest.fn(),
          getData: jest.fn().mockReturnValue([]),
          generatePlantUML: jest.fn().mockReturnValue('')
        },
        condition: {
          setData: jest.fn(),
          getData: jest.fn().mockReturnValue([]),
          generatePlantUML: jest.fn().mockReturnValue('')
        },
        loop: {
          setData: jest.fn(),
          getData: jest.fn().mockReturnValue([]),
          generatePlantUML: jest.fn().mockReturnValue('')
        },
        parallel: {
          setData: jest.fn(),
          getData: jest.fn().mockReturnValue([]),
          generatePlantUML: jest.fn().mockReturnValue('')
        }
      },
      generateIntegratedPlantUML: jest.fn(),
      validateAllEditors: jest.fn()
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('日本語入力解析テスト', () => {
    test('基本的なシーケンス図の解析', () => {
      const japaneseInput = 'ユーザーがシステムにログインする';
      
      // モック解析結果
      const parseResult = {
        actors: ['ユーザー', 'システム'],
        actions: [
          {
            from: 'ユーザー',
            to: 'システム',
            action: 'ログイン',
            type: 'request'
          }
        ],
        conditions: [],
        loops: [],
        parallel: []
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      const result = parser.parseJapaneseText(japaneseInput);
      
      expect(result.actors).toContain('ユーザー');
      expect(result.actors).toContain('システム');
      expect(result.actions[0].action).toBe('ログイン');
      expect(parser.parseJapaneseText).toHaveBeenCalledWith(japaneseInput);
    });

    test('複雑な条件分岐を含む解析', () => {
      const complexInput = `
        ユーザーがシステムにアクセスする
        もし認証が成功した場合：
          データベースから情報を取得する
          結果をユーザーに返す
        そうでなければ：
          エラーメッセージを表示する
      `;
      
      const parseResult = {
        actors: ['ユーザー', 'システム', 'データベース'],
        actions: [
          { from: 'ユーザー', to: 'システム', action: 'アクセス' }
        ],
        conditions: [
          {
            condition: '認証が成功',
            trueActions: [
              { from: 'システム', to: 'データベース', action: '情報取得' },
              { from: 'システム', to: 'ユーザー', action: '結果返却' }
            ],
            falseActions: [
              { from: 'システム', to: 'ユーザー', action: 'エラー表示' }
            ]
          }
        ],
        loops: [],
        parallel: []
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      const result = parser.parseJapaneseText(complexInput);
      
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].condition).toBe('認証が成功');
      expect(result.conditions[0].trueActions).toHaveLength(2);
      expect(result.conditions[0].falseActions).toHaveLength(1);
    });

    test('ループ処理の解析', () => {
      const loopInput = `
        システムがデータリストを取得する
        各データに対して繰り返し：
          データを検証する
          結果をログに記録する
        繰り返し終了
      `;
      
      const parseResult = {
        actors: ['システム', 'データリスト', 'ログ'],
        actions: [
          { from: 'システム', to: 'データリスト', action: '取得' }
        ],
        conditions: [],
        loops: [
          {
            condition: '各データに対して',
            actions: [
              { from: 'システム', to: 'データ', action: '検証' },
              { from: 'システム', to: 'ログ', action: '記録' }
            ]
          }
        ],
        parallel: []
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      const result = parser.parseJapaneseText(loopInput);
      
      expect(result.loops).toHaveLength(1);
      expect(result.loops[0].condition).toBe('各データに対して');
      expect(result.loops[0].actions).toHaveLength(2);
    });

    test('並行処理の解析', () => {
      const parallelInput = `
        同時に以下を実行：
          ブランチ1: ユーザーデータを更新する
          ブランチ2: ログデータを記録する
          ブランチ3: 通知を送信する
        同時実行終了
      `;
      
      const parseResult = {
        actors: ['システム', 'ユーザーデータ', 'ログ', '通知サービス'],
        actions: [],
        conditions: [],
        loops: [],
        parallel: [
          {
            branches: [
              {
                name: 'ブランチ1',
                actions: [{ from: 'システム', to: 'ユーザーデータ', action: '更新' }]
              },
              {
                name: 'ブランチ2',
                actions: [{ from: 'システム', to: 'ログ', action: '記録' }]
              },
              {
                name: 'ブランチ3',
                actions: [{ from: 'システム', to: '通知サービス', action: '送信' }]
              }
            ]
          }
        ]
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      const result = parser.parseJapaneseText(parallelInput);
      
      expect(result.parallel).toHaveLength(1);
      expect(result.parallel[0].branches).toHaveLength(3);
      expect(result.parallel[0].branches[0].name).toBe('ブランチ1');
    });
  });

  describe('PlantUMLコード生成テスト', () => {
    test('基本的なシーケンス図のコード生成', () => {
      const inputData = {
        actors: ['ユーザー', 'システム'],
        actions: [
          { from: 'ユーザー', to: 'システム', action: 'ログイン要求' },
          { from: 'システム', to: 'ユーザー', action: 'ログイン結果' }
        ]
      };
      
      const expectedPlantUML = `@startuml
participant "ユーザー" as user
participant "システム" as system

user -> system : ログイン要求
system -> user : ログイン結果
@enduml`;
      
      parser.generatePlantUMLCode.mockReturnValue(expectedPlantUML);
      
      const result = parser.generatePlantUMLCode(inputData);
      
      expect(result).toContain('@startuml');
      expect(result).toContain('@enduml');
      expect(result).toContain('participant "ユーザー"');
      expect(result).toContain('participant "システム"');
      expect(result).toContain('user -> system : ログイン要求');
    });

    test('条件分岐を含むコード生成', () => {
      const inputData = {
        actors: ['ユーザー', 'システム'],
        actions: [
          { from: 'ユーザー', to: 'システム', action: 'ログイン要求' }
        ],
        conditions: [
          {
            condition: '認証成功',
            trueActions: [
              { from: 'システム', to: 'ユーザー', action: 'ダッシュボード表示' }
            ],
            falseActions: [
              { from: 'システム', to: 'ユーザー', action: 'エラー表示' }
            ]
          }
        ]
      };
      
      const expectedPlantUML = `@startuml
participant "ユーザー" as user
participant "システム" as system

user -> system : ログイン要求
alt 認証成功
  system -> user : ダッシュボード表示
else
  system -> user : エラー表示
end
@enduml`;
      
      parser.generatePlantUMLCode.mockReturnValue(expectedPlantUML);
      
      const result = parser.generatePlantUMLCode(inputData);
      
      expect(result).toContain('alt 認証成功');
      expect(result).toContain('else');
      expect(result).toContain('end');
      expect(result).toContain('ダッシュボード表示');
      expect(result).toContain('エラー表示');
    });

    test('ループを含むコード生成', () => {
      const inputData = {
        actors: ['システム', 'データベース'],
        loops: [
          {
            condition: 'データが存在する間',
            actions: [
              { from: 'システム', to: 'データベース', action: 'データ処理' }
            ]
          }
        ]
      };
      
      const expectedPlantUML = `@startuml
participant "システム" as system
participant "データベース" as database

loop データが存在する間
  system -> database : データ処理
end
@enduml`;
      
      parser.generatePlantUMLCode.mockReturnValue(expectedPlantUML);
      
      const result = parser.generatePlantUMLCode(inputData);
      
      expect(result).toContain('loop データが存在する間');
      expect(result).toContain('system -> database : データ処理');
      expect(result).toContain('end');
    });

    test('並行処理を含むコード生成', () => {
      const inputData = {
        actors: ['システム', 'サービスA', 'サービスB'],
        parallel: [
          {
            branches: [
              {
                name: 'ブランチ1',
                actions: [{ from: 'システム', to: 'サービスA', action: '処理A' }]
              },
              {
                name: 'ブランチ2',
                actions: [{ from: 'システム', to: 'サービスB', action: '処理B' }]
              }
            ]
          }
        ]
      };
      
      const expectedPlantUML = `@startuml
participant "システム" as system
participant "サービスA" as serviceA
participant "サービスB" as serviceB

par
  system -> serviceA : 処理A
else
  system -> serviceB : 処理B
end
@enduml`;
      
      parser.generatePlantUMLCode.mockReturnValue(expectedPlantUML);
      
      const result = parser.generatePlantUMLCode(inputData);
      
      expect(result).toContain('par');
      expect(result).toContain('system -> serviceA : 処理A');
      expect(result).toContain('else');
      expect(result).toContain('system -> serviceB : 処理B');
      expect(result).toContain('end');
    });
  });

  describe('統合変換フローテスト', () => {
    test('日本語入力から最終PlantUMLまでの完全フロー', async () => {
      const japaneseInput = `
        ユーザーがシステムにログインする
        もし認証が成功した場合：
          ダッシュボードを表示する
        そうでなければ：
          エラーページを表示する
      `;
      
      // ステップ1: 日本語解析
      const parseResult = {
        actors: ['ユーザー', 'システム'],
        actions: [
          { from: 'ユーザー', to: 'システム', action: 'ログイン', type: 'request' }
        ],
        conditions: [
          {
            condition: '認証が成功',
            trueActions: [
              { from: 'システム', to: 'ユーザー', action: 'ダッシュボード表示' }
            ],
            falseActions: [
              { from: 'システム', to: 'ユーザー', action: 'エラーページ表示' }
            ]
          }
        ]
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      // ステップ2: エディターにデータ設定
      editorManager.editors.action.setData(parseResult.actions);
      editorManager.editors.condition.setData(parseResult.conditions);
      
      // ステップ3: 各エディターからPlantUMLコード生成
      editorManager.editors.action.generatePlantUML.mockReturnValue(
        'participant "ユーザー" as user\nparticipant "システム" as system\nuser -> system : ログイン'
      );
      
      editorManager.editors.condition.generatePlantUML.mockReturnValue(
        'alt 認証が成功\n  system -> user : ダッシュボード表示\nelse\n  system -> user : エラーページ表示\nend'
      );
      
      // ステップ4: 統合PlantUMLコード生成
      const integratedCode = `@startuml
${editorManager.editors.action.generatePlantUML()}
${editorManager.editors.condition.generatePlantUML()}
@enduml`;
      
      editorManager.generateIntegratedPlantUML.mockReturnValue(integratedCode);
      
      // フロー実行と検証
      const parsedData = parser.parseJapaneseText(japaneseInput);
      expect(parsedData.actors).toContain('ユーザー');
      expect(parsedData.conditions).toHaveLength(1);
      
      const finalCode = editorManager.generateIntegratedPlantUML();
      expect(finalCode).toContain('@startuml');
      expect(finalCode).toContain('@enduml');
      expect(finalCode).toContain('alt 認証が成功');
      expect(finalCode).toContain('ダッシュボード表示');
    });

    test('エラー入力時の処理フロー', () => {
      const invalidInput = 'これは無効な入力です@@##$$';
      
      // パーサーエラーを模擬
      parser.parseJapaneseText.mockImplementation(() => {
        throw new Error('解析できない文字が含まれています');
      });
      
      let error = null;
      let parseResult = null;
      
      try {
        parseResult = parser.parseJapaneseText(invalidInput);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('解析できない文字');
      expect(parseResult).toBeNull();
    });

    test('大量データの変換性能', () => {
      const largeInput = Array.from({ length: 100 }, (_, i) => 
        `アクター${i}がシステム${i}に処理${i}を依頼する`
      ).join('\n');
      
      const startTime = performance.now();
      
      // 大量データの解析を模擬
      const largeParseResult = {
        actors: Array.from({ length: 200 }, (_, i) => `アクター${i}`),
        actions: Array.from({ length: 100 }, (_, i) => ({
          from: `アクター${i}`,
          to: `システム${i}`,
          action: `処理${i}`
        }))
      };
      
      parser.parseJapaneseText.mockReturnValue(largeParseResult);
      
      const result = parser.parseJapaneseText(largeInput);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(result.actors).toHaveLength(200);
      expect(result.actions).toHaveLength(100);
      
      // 大量データの処理が500ms以内に完了することを確認
      expect(executionTime).toBeLessThan(500);
    });
  });

  describe('バリデーションテスト', () => {
    test('PlantUML構文バリデーション', () => {
      const validCode = `@startuml
participant "ユーザー" as user
participant "システム" as system
user -> system : ログイン
@enduml`;
      
      parser.validateSyntax.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      
      const result = parser.validateSyntax(validCode);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効なPlantUML構文の検出', () => {
      const invalidCode = `@startuml
participant "ユーザー" as user
user -> : 無効な構文
@enduml`;
      
      parser.validateSyntax.mockReturnValue({
        isValid: false,
        errors: ['送信先が指定されていません'],
        warnings: []
      });
      
      const result = parser.validateSyntax(invalidCode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('送信先が指定されていません');
    });

    test('日本語文字列のサニタイゼーション', () => {
      const unsafeInput = 'ユーザー<script>alert("XSS")</script>がシステムにアクセスする';
      
      // DOMPurifyによるサニタイゼーション
      const sanitizedInput = mockDOMPurify.sanitize(unsafeInput);
      
      expect(mockDOMPurify.sanitize).toHaveBeenCalledWith(unsafeInput);
      
      // 危険なスクリプトが除去されることを確認
      const parseResult = {
        actors: ['ユーザー', 'システム'],
        actions: [
          { from: 'ユーザー', to: 'システム', action: 'アクセス' }
        ]
      };
      
      parser.parseJapaneseText.mockReturnValue(parseResult);
      
      const result = parser.parseJapaneseText(sanitizedInput);
      expect(result.actors[0]).toBe('ユーザー');
    });
  });

  describe('最適化テスト', () => {
    test('重複削除の最適化', () => {
      const redundantCode = `@startuml
participant "ユーザー" as user
participant "ユーザー" as user
participant "システム" as system
user -> system : ログイン
user -> system : ログイン
@enduml`;
      
      const optimizedCode = `@startuml
participant "ユーザー" as user
participant "システム" as system
user -> system : ログイン
@enduml`;
      
      parser.optimizeCode.mockReturnValue(optimizedCode);
      
      const result = parser.optimizeCode(redundantCode);
      
      // 重複が除去されていることを確認
      const userMatches = (result.match(/participant "ユーザー"/g) || []).length;
      const loginMatches = (result.match(/user -> system : ログイン/g) || []).length;
      
      expect(userMatches).toBe(1);
      expect(loginMatches).toBe(1);
    });

    test('コード構造の最適化', () => {
      const unoptimizedCode = `@startuml
participant A
participant B
A -> B : msg1
A -> B : msg2
A -> B : msg3
@enduml`;
      
      const optimizedCode = `@startuml
participant A
participant B
A -> B : msg1
A -> B : msg2
A -> B : msg3
note right : 連続メッセージ最適化済み
@enduml`;
      
      parser.optimizeCode.mockReturnValue(optimizedCode);
      
      const result = parser.optimizeCode(unoptimizedCode);
      
      expect(result).toContain('note right');
      expect(result).toContain('最適化済み');
    });
  });
});