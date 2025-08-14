/**
 * 統合テスト: パーサー統合テスト
 * 複数のパーサーと変換エンジンの統合動作を検証
 */

const { convertJapaneseToPlantUML } = require('../../src/convert');

describe('パーサー統合テスト', () => {
  describe('パーサー間の相互動作テスト', () => {
    test('自動検出による適切なパーサー選択', () => {
      const testCases = [
        {
          input: 'ユーザー -> システム: ログイン\nシステム -> ユーザー: 結果',
          expectedType: 'sequence'
        },
        {
          input: 'タスク: 開発; 2025-08-13 〜 2025-08-20\nタスク: テスト; 2025-08-21 〜 2025-08-25',
          expectedType: 'gantt'
        },
        {
          input: 'クラス: User { id:int }\nクラス: Order { id:int }\n関連: User -> Order',
          expectedType: 'class'
        },
        {
          input: '開始\nアクティビティ: 処理1\nアクティビティ: 処理2\n終了',
          expectedType: 'activity'
        },
        {
          input: '状態: 待機\n状態: 実行中\n遷移: 待機 -> 実行中',
          expectedType: 'state'
        },
        {
          input: 'アクター: ユーザー\nユースケース: ログイン\n関係: ユーザー -> ログイン',
          expectedType: 'usecase'
        }
      ];

      testCases.forEach(testCase => {
        const result = convertJapaneseToPlantUML(testCase.input);
        expect(result.diagramType).toBe(testCase.expectedType);
        expect(result.plantuml).toContain('@start');
        expect(result.plantuml).toContain('@end');
      });
    });

    test('曖昧な入力での優先度付き選択', () => {
      // シーケンスとアクティビティの境界ケース
      const borderlineInput = '処理1を実行\n処理2を実行\n結果を返す';
      const result = convertJapaneseToPlantUML(borderlineInput);
      
      // デフォルトでsequenceが選ばれることを確認
      expect(result.diagramType).toBe('sequence');
      expect(result.plantuml).toContain('@startuml');
    });
  });

  describe('複合的なデータ構造の処理', () => {
    test('混在したフォーマットの統合処理', () => {
      const mixedInput = `プロジェクト名: 複合プロジェクト
開始日: 2025-08-13
部門: 企画部
タスク: 要件定義; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 100%; 依存: -
部門: 開発部
タスク: 基本設計; 2025-08-21 〜 2025-08-31; 担当: 佐藤; 進捗: 75%; 依存: 要件定義
タスク: 実装; 2025-09-01 〜 2025-09-20; 担当: 鈴木; 進捗: 25%; 依存: 基本設計
部門: テスト部
タスク: 単体テスト; 2025-09-15 〜 2025-09-25; 担当: 高橋; 進捗: 0%; 依存: 実装
タスク: 結合テスト; 2025-09-26 〜 2025-10-05; 担当: 山田; 進捗: 0%; 依存: 単体テスト`;

      const result = convertJapaneseToPlantUML(mixedInput);
      
      expect(result.diagramType).toBe('gantt');
      expect(result.plantuml).toContain('@startgantt');
      expect(result.plantuml).toContain('Project starts 2025-08-13');
      
      // 部門セクション
      expect(result.plantuml).toContain('-- 企画部 --');
      expect(result.plantuml).toContain('-- 開発部 --');
      expect(result.plantuml).toContain('-- テスト部 --');
      
      // タスクと依存関係
      expect(result.plantuml).toContain('[要件定義]');
      expect(result.plantuml).toContain('[基本設計]');
      expect(result.plantuml).toContain('T1 -> T2');
      expect(result.plantuml).toContain('T2 -> T3');
      
      // メタデータ
      expect(result.meta.project.tasks).toHaveLength(5);
      expect(result.meta.project.tasks[0].dept).toBe('企画部');
      expect(result.meta.project.tasks[1].dept).toBe('開発部');
    });

    test('複雑なシーケンス図の統合処理', () => {
      const complexSequence = `参加者: クライアント, APIGateway, AuthService, UserService, Database, LogService
メッセージ: クライアント -> APIGateway: ユーザー情報取得要求
メッセージ: APIGateway -> AuthService: 認証トークン検証
メッセージ: AuthService -> APIGateway: 検証結果
メッセージ: APIGateway -> UserService: ユーザー情報要求
メッセージ: UserService -> Database: SELECT * FROM users WHERE id = ?
メッセージ: Database -> UserService: ユーザーデータ
メッセージ: UserService -> LogService: アクセスログ記録
メッセージ: LogService -> UserService: 記録完了
メッセージ: UserService -> APIGateway: ユーザー情報レスポンス
メッセージ: APIGateway -> クライアント: JSON レスポンス`;

      const result = convertJapaneseToPlantUML(complexSequence);
      
      expect(result.diagramType).toBe('sequence');
      expect(result.plantuml).toContain('participant クライアント');
      expect(result.plantuml).toContain('participant APIGateway');
      expect(result.plantuml).toContain('participant AuthService');
      expect(result.plantuml).toContain('participant UserService');
      expect(result.plantuml).toContain('participant Database');
      expect(result.plantuml).toContain('participant LogService');
      
      // メッセージフローの確認
      expect(result.plantuml).toContain('クライアント -> APIGateway: ユーザー情報取得要求');
      expect(result.plantuml).toContain('UserService -> Database: SELECT * FROM users WHERE id = ?');
      expect(result.plantuml).toContain('APIGateway -> クライアント: JSON レスポンス');
    });
  });

  describe('エラー処理と警告の統合', () => {
    test('複数パーサーからの警告メッセージ集約', () => {
      const problematicGantt = `プロジェクト名: 問題プロジェクト
開始日: 無効な日付フォーマット
タスク: 不完全タスク1; 担当: 田中
タスク: 不完全タスク2; 進捗: 50%`;

      const result = convertJapaneseToPlantUML(problematicGantt);
      
      expect(result.diagramType).toBe('gantt');
      expect(result.warnings).toContain('開始日の日付形式を解釈できませんでした');
      expect(result.plantuml).toContain('@startgantt');
      expect(result.meta.project.name).toBe('問題プロジェクト');
    });

    test('シーケンス図での未対応パターン処理', () => {
      const unpairedSequence = `メールを送信（送信者）
何かを実行（実行者）
メールを受信（受信者）`;

      const result = convertJapaneseToPlantUML(unpairedSequence);
      
      expect(result.diagramType).toBe('sequence');
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('受信の相手が見つかりません')
        ])
      );
      expect(result.plantuml).toContain('participant 送信者');
      expect(result.plantuml).toContain('participant 実行者');
    });
  });

  describe('モード統合テスト', () => {
    test('strictモードでの厳密な解析', () => {
      const semiStructuredInput = `参加者: A, B, C
メッセージ: A -> B: test1
メッセージ: B -> C: test2`;

      const autoResult = convertJapaneseToPlantUML(semiStructuredInput, { mode: 'auto' });
      const strictResult = convertJapaneseToPlantUML(semiStructuredInput, { mode: 'strict' });
      
      expect(autoResult.diagramType).toBe('sequence');
      expect(strictResult.diagramType).toBe('sequence');
      expect(autoResult.plantuml).toContain('participant A');
      expect(strictResult.plantuml).toContain('participant A');
    });

    test('semi モードでの構造化データ優先処理', () => {
      const input = `タスク: セミモードテスト; 2025-08-13 〜 2025-08-20`;

      const result = convertJapaneseToPlantUML(input, { mode: 'semi' });
      
      expect(result.diagramType).toBe('gantt');
      expect(result.plantuml).toContain('[セミモードテスト]');
    });
  });

  describe('パフォーマンスと大量データ処理', () => {
    test('大量のタスクを含むガント図の処理', () => {
      const largeTasks = Array(50).fill(0).map((_, i) => 
        `タスク: 大量タスク${i + 1}; 2025-08-${String(13 + (i % 15)).padStart(2, '0')} 〜 2025-08-${String(14 + (i % 15)).padStart(2, '0')}; 担当: 担当者${i % 5 + 1}; 進捗: ${(i * 10) % 100}%`
      ).join('\n');
      
      const input = `プロジェクト名: 大量データテスト\n開始日: 2025-08-13\n${largeTasks}`;
      
      const startTime = Date.now();
      const result = convertJapaneseToPlantUML(input);
      const processingTime = Date.now() - startTime;
      
      expect(result.diagramType).toBe('gantt');
      expect(result.meta.project.tasks).toHaveLength(50);
      expect(processingTime).toBeLessThan(5000); // 5秒以内で処理完了
      expect(result.plantuml).toContain('@startgantt');
    });

    test('長いシーケンスフローの処理', () => {
      const longSequence = Array(30).fill(0).map((_, i) => 
        `メッセージ: A${i} -> A${i + 1}: step${i + 1}`
      ).join('\n');
      
      const participants = Array(31).fill(0).map((_, i) => `A${i}`).join(', ');
      const input = `参加者: ${participants}\n${longSequence}`;
      
      const result = convertJapaneseToPlantUML(input);
      
      expect(result.diagramType).toBe('sequence');
      expect(result.plantuml.split('\n').filter(line => line.includes('participant')).length).toBe(31);
      expect(result.plantuml.split('\n').filter(line => line.includes('->')).length).toBe(30);
    });
  });

  describe('互換性モードの統合処理', () => {
    test('legacy互換性での機能制限確認', () => {
      const modernGantt = `プロジェクト名: 互換テスト
部門: 開発部
タスク: タスク1; 2025-08-13 〜 2025-08-20; 担当: 田中; 進捗: 75%; 依存: -
部門: テスト部
タスク: タスク2; 2025-08-21 〜 2025-08-25; 担当: 佐藤; 進捗: 50%; 依存: タスク1`;

      const legacyResult = convertJapaneseToPlantUML(modernGantt, { compat: 'legacy' });
      const latestResult = convertJapaneseToPlantUML(modernGantt, { compat: 'latest' });
      
      // legacy モードでは高度な機能が無効
      expect(legacyResult.plantuml).not.toContain('is 75% completed');
      expect(legacyResult.plantuml).not.toContain('note right');
      expect(legacyResult.plantuml).not.toContain('T1 -> T2');
      expect(legacyResult.plantuml).not.toContain('-- 開発部 --');
      
      // latest モードでは全機能有効
      expect(latestResult.plantuml).toContain('T1 is 75% completed');
      expect(latestResult.plantuml).toContain('note right of T1: 担当 田中');
      expect(latestResult.plantuml).toContain('T1 -> T2');
      expect(latestResult.plantuml).toContain('-- 開発部 --');
      
      // 警告メッセージの確認
      expect(legacyResult.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('互換モードでは依存矢印を出力しません'),
          expect.stringContaining('互換モードでは進捗表示を出力しません'),
          expect.stringContaining('互換モードでは担当者ノートを出力しません'),
          expect.stringContaining('互換モードでは部門セクションの見出しを出力しません')
        ])
      );
    });
  });

  describe('メタデータの統合生成', () => {
    test('全パーサーでのメタデータ生成確認', () => {
      const testCases = [
        {
          input: 'ユーザー -> システム: test',
          type: 'sequence',
          expectedMeta: ['participants', 'messages']
        },
        {
          input: 'タスク: test; 2025-08-13 〜 2025-08-20',
          type: 'gantt',
          expectedMeta: ['project', 'compat']
        }
      ];

      testCases.forEach(testCase => {
        const result = convertJapaneseToPlantUML(testCase.input);
        expect(result.diagramType).toBe(testCase.type);
        expect(result).toHaveProperty('meta');
        
        testCase.expectedMeta.forEach(metaKey => {
          expect(result.meta).toHaveProperty(metaKey);
        });
      });
    });
  });
});