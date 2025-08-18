/**
 * ユーザージャーニーテスト用ペルソナ定義
 * 各ペルソナに基づいたテストシナリオで使用
 */

export const personas = {
  // 初回利用者ペルソナ
  firstTimeUser: {
    name: '田中太郎',
    role: '新入社員',
    experience: 'PlantUML初心者',
    department: 'システム開発部',
    age: 25,
    goals: [
      'PlantUMLの基本操作を覚える',
      '簡単な設計図を作成できるようになる',
      'チーム開発に活用する'
    ],
    painPoints: [
      'PlantUML記法が分からない',
      'どこから始めればいいか分からない',
      'エラーメッセージの意味が理解できない'
    ],
    expectedBehavior: {
      learningStyle: 'ステップバイステップ',
      preferredHelp: 'チュートリアル・ガイド',
      successCriteria: '15分以内に最初の図表を完成'
    }
  },

  // パワーユーザーペルソナ
  powerUser: {
    name: '山田花子',
    role: 'テックリード',
    experience: 'PlantUML上級者',
    department: 'アーキテクチャ設計部',
    age: 32,
    goals: [
      '複雑な設計図を効率的に作成',
      'チーム標準テンプレートの作成',
      '自動化ツールとの連携'
    ],
    painPoints: [
      '大規模図表の編集が重い',
      'カスタマイズ機能が不足',
      'バッチ処理機能がない'
    ],
    expectedBehavior: {
      learningStyle: '試行錯誤・探索',
      preferredHelp: 'ショートカット・API',
      successCriteria: '100要素超の図表を30分以内で作成'
    }
  },

  // コラボレーターペルソナ
  collaborator: {
    name: '佐藤次郎',
    role: 'プロジェクトマネージャー',
    experience: 'PlantUML中級者',
    department: 'プロジェクト管理室',
    age: 38,
    goals: [
      'チームでの図表共有',
      'レビュープロセスの効率化',
      'バージョン管理の徹底'
    ],
    painPoints: [
      '同時編集時の競合',
      'レビューワークフローが複雑',
      '変更履歴が追いにくい'
    ],
    expectedBehavior: {
      learningStyle: 'プロセス重視',
      preferredHelp: 'ワークフロー・承認機能',
      successCriteria: '5人チームで同時編集を10分継続'
    }
  }
};

// ペルソナ別テストデータ
export const testData = {
  firstTimeUser: {
    // 初心者向けの簡単なシナリオ
    scenarios: [
      {
        name: '基本的なシーケンス図',
        input: 'AさんがBさんにメッセージを送る',
        expectedElements: ['A', 'B', 'メッセージ']
      },
      {
        name: '条件分岐のある処理',
        input: 'もしユーザーがログインしていればメインページを表示、そうでなければログインページを表示',
        expectedElements: ['ユーザー', 'ログイン', 'メインページ', 'ログインページ']
      }
    ]
  },

  powerUser: {
    // 上級者向けの複雑なシナリオ
    scenarios: [
      {
        name: '大規模マイクロサービス図',
        input: `ユーザーがAPIゲートウェイ経由で認証サービス、ユーザーサービス、注文サービス、決済サービス、通知サービスと連携し、
                最終的にデータベースクラスターと外部決済システムにアクセスする複雑な処理フロー`,
        expectedElements: ['ユーザー', 'APIゲートウェイ', '認証サービス', 'ユーザーサービス', '注文サービス', '決済サービス', '通知サービス'],
        expectedComplexity: 'high'
      }
    ]
  },

  collaboration: {
    // チームワーク向けのシナリオ
    scenarios: [
      {
        name: 'チーム設計レビュー',
        input: 'システム管理者がデータベースにアクセスし、ユーザー情報を更新した後、メール通知を送信',
        reviewComments: [
          'セキュリティチェックを追加してください',
          'エラーハンドリングが不足しています',
          'ログ出力を忘れずに'
        ]
      }
    ]
  }
};

// ユーザージャーニー共通のアクション定義
export const journeyActions = {
  // オンボーディング関連
  onboarding: {
    skipTutorial: '[data-testid="skip-tutorial"]',
    startTutorial: '[data-testid="start-tutorial"]',
    nextStep: '[data-testid="tutorial-next"]',
    previousStep: '[data-testid="tutorial-prev"]',
    completeTutorial: '[data-testid="tutorial-complete"]'
  },

  // 基本操作関連
  basicActions: {
    addActor: '[data-testid="add-actor"]',
    addArrow: '[data-testid="add-arrow"]',
    addMessage: '[data-testid="add-message"]',
    dragHandle: '[data-testid="drag-handle"]',
    questionButton: '[data-testid="question-button"]',
    deleteButton: '[data-testid="delete-button"]'
  },

  // 高度な操作関連
  advancedActions: {
    batchEdit: '[data-testid="batch-edit"]',
    customTemplate: '[data-testid="custom-template"]',
    macroRecord: '[data-testid="macro-record"]',
    codeEdit: '[data-testid="code-edit"]',
    performance: '[data-testid="performance-monitor"]'
  },

  // コラボレーション関連
  collaboration: {
    share: '[data-testid="share-diagram"]',
    invite: '[data-testid="invite-collaborator"]',
    comment: '[data-testid="add-comment"]',
    approve: '[data-testid="approve-change"]',
    versionHistory: '[data-testid="version-history"]'
  }
};

// 成功基準の定義
export const successCriteria = {
  firstTimeUser: {
    tutorialCompletion: 300000, // 5分以内
    firstDiagramCreation: 900000, // 15分以内
    basicFeaturesMastery: 1800000, // 30分以内
    errorRate: 0.1 // 10%以下
  },

  powerUser: {
    largeScaleDiagram: 1800000, // 30分以内
    advancedFeatures: 600000, // 10分以内
    customization: 300000, // 5分以内
    productivity: 2.0 // 従来の2倍の生産性
  },

  collaboration: {
    sharing: 120000, // 2分以内
    realTimeSync: 5000, // 5秒以内
    review: 600000, // 10分以内
    conflictResolution: 180000 // 3分以内
  }
};