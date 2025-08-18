/**
 * DiagramDataFactory - ダイアグラムデータファクトリー
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - PlantUMLダイアグラムテストデータ生成
 * - 日本語ビジネスシナリオ
 * - 複雑さレベル別データセット
 * - リアルなビジネスプロセス模擬
 */

export class DiagramDataFactory {
  constructor() {
    // 日本語ビジネスアクター
    this.businessActors = {
      users: ['ユーザー', '管理者', 'ゲストユーザー', 'プレミアム会員', 'システム管理者'],
      systems: ['Webアプリケーション', 'データベース', 'API', 'メールサーバー', 'ファイルサーバー'],
      external: ['外部API', '決済システム', 'SMS送信サービス', 'クラウドストレージ', '監査システム'],
      departments: ['営業部', '経理部', '人事部', 'IT部門', '品質管理部'],
      services: ['認証サービス', 'ログサービス', '通知サービス', 'バックアップサービス', 'モニタリングサービス']
    };

    // 日本語ビジネスアクション
    this.businessActions = {
      authentication: [
        'ログイン要求', 'パスワード確認', '認証結果通知', 'セッション開始', 'ログアウト処理'
      ],
      data_operations: [
        'データ取得', 'データ更新', 'データ削除', 'データ検索', 'データ検証'
      ],
      business_processes: [
        '注文処理', '在庫確認', '決済処理', '配送手配', '受注確認'
      ],
      communication: [
        'メール送信', 'SMS通知', 'プッシュ通知', 'アラート発信', 'レポート送付'
      ],
      file_operations: [
        'ファイルアップロード', 'ファイルダウンロード', 'ファイル変換', 'ファイル削除', 'バックアップ作成'
      ]
    };

    // 条件分岐パターン
    this.conditionPatterns = {
      authentication: [
        '認証済みの場合', '権限確認済み', 'セッション有効期限内', 'アカウントロック解除済み'
      ],
      validation: [
        'データ形式正常', '必須項目入力済み', '重複チェック通過', '権限レベル適切'
      ],
      business_rules: [
        '在庫数量十分', '予算範囲内', '承認完了', '営業時間内', '緊急度高'
      ],
      technical: [
        'システム稼働中', 'ネットワーク接続正常', 'メモリ使用量正常', 'CPU負荷正常'
      ]
    };

    // ループパターン
    this.loopPatterns = {
      retry: '処理成功まで繰り返し',
      polling: '新規データ確認',
      batch: 'バッチ処理継続',
      monitoring: 'ステータス監視継続',
      timeout: 'タイムアウトまで待機'
    };

    // 複雑さレベル
    this.complexityLevels = {
      simple: { actors: 2, actions: 3, conditions: 0, loops: 0, parallel: 0 },
      medium: { actors: 4, actions: 8, conditions: 2, loops: 1, parallel: 0 },
      complex: { actors: 6, actions: 15, conditions: 5, loops: 2, parallel: 2 },
      enterprise: { actors: 10, actions: 25, conditions: 8, loops: 3, parallel: 4 }
    };
  }

  /**
   * シンプルなダイアグラムデータ生成
   * @param {Object} options - 生成オプション
   * @returns {Object} ダイアグラムデータ
   */
  generateSimpleDiagram(options = {}) {
    const {
      scenario = 'login',
      includeConditions = false,
      language = 'ja'
    } = options;

    const scenarios = {
      login: this.createLoginScenario(),
      data_fetch: this.createDataFetchScenario(),
      file_upload: this.createFileUploadScenario(),
      notification: this.createNotificationScenario()
    };

    const diagramData = scenarios[scenario] || scenarios.login;
    
    return {
      id: this.generateDiagramId(),
      type: 'simple',
      scenario,
      complexity: 'simple',
      ...diagramData,
      metadata: {
        createdAt: new Date().toISOString(),
        language,
        estimatedComplexity: this.complexityLevels.simple
      }
    };
  }

  /**
   * 複雑なダイアグラムデータ生成
   * @param {Object} options - 生成オプション
   * @returns {Object} ダイアグラムデータ
   */
  generateComplexDiagram(options = {}) {
    const {
      businessDomain = 'ecommerce',
      includeErrorHandling = true,
      includeParallelProcessing = true
    } = options;

    const domains = {
      ecommerce: this.createECommerceProcess(),
      banking: this.createBankingProcess(),
      healthcare: this.createHealthcareProcess(),
      education: this.createEducationProcess()
    };

    const diagramData = domains[businessDomain] || domains.ecommerce;

    return {
      id: this.generateDiagramId(),
      type: 'complex',
      businessDomain,
      complexity: 'complex',
      ...diagramData,
      metadata: {
        createdAt: new Date().toISOString(),
        estimatedComplexity: this.complexityLevels.complex,
        includeErrorHandling,
        includeParallelProcessing
      }
    };
  }

  /**
   * エンタープライズレベルダイアグラム生成
   * @param {Object} options - 生成オプション
   * @returns {Object} ダイアグラムデータ
   */
  generateEnterpriseDiagram(options = {}) {
    const {
      integrationPattern = 'microservices',
      includeSecurityFlow = true,
      includeAuditTrail = true
    } = options;

    const patterns = {
      microservices: this.createMicroservicesPattern(),
      event_driven: this.createEventDrivenPattern(),
      batch_processing: this.createBatchProcessingPattern(),
      real_time: this.createRealTimePattern()
    };

    const diagramData = patterns[integrationPattern] || patterns.microservices;

    return {
      id: this.generateDiagramId(),
      type: 'enterprise',
      integrationPattern,
      complexity: 'enterprise',
      ...diagramData,
      metadata: {
        createdAt: new Date().toISOString(),
        estimatedComplexity: this.complexityLevels.enterprise,
        includeSecurityFlow,
        includeAuditTrail
      }
    };
  }

  /**
   * ログインシナリオ作成
   * @returns {Object} ログインシナリオデータ
   */
  createLoginScenario() {
    return {
      title: 'ユーザーログインプロセス',
      actors: ['ユーザー', 'Webアプリケーション', 'データベース'],
      actions: [
        {
          from: 'ユーザー',
          to: 'Webアプリケーション',
          message: 'ログイン要求（ID、パスワード）',
          arrowType: 'sync'
        },
        {
          from: 'Webアプリケーション',
          to: 'データベース',
          message: 'ユーザー認証情報確認',
          arrowType: 'sync'
        },
        {
          from: 'データベース',
          to: 'Webアプリケーション',
          message: '認証結果返却',
          arrowType: 'return'
        },
        {
          from: 'Webアプリケーション',
          to: 'ユーザー',
          message: 'ログイン結果通知',
          arrowType: 'return'
        }
      ],
      conditions: [
        {
          condition: '認証成功の場合',
          trueAction: 'メインページへリダイレクト',
          falseAction: 'エラーメッセージ表示'
        }
      ]
    };
  }

  /**
   * データ取得シナリオ作成
   * @returns {Object} データ取得シナリオデータ
   */
  createDataFetchScenario() {
    return {
      title: 'データ一覧取得プロセス',
      actors: ['ユーザー', 'API', 'データベース', 'キャッシュサーバー'],
      actions: [
        {
          from: 'ユーザー',
          to: 'API',
          message: 'データ一覧要求',
          arrowType: 'sync'
        },
        {
          from: 'API',
          to: 'キャッシュサーバー',
          message: 'キャッシュ確認',
          arrowType: 'sync'
        },
        {
          from: 'API',
          to: 'データベース',
          message: 'データ取得クエリ実行',
          arrowType: 'sync',
          condition: 'キャッシュが存在しない場合'
        },
        {
          from: 'データベース',
          to: 'API',
          message: 'データ返却',
          arrowType: 'return'
        },
        {
          from: 'API',
          to: 'ユーザー',
          message: 'データ一覧レスポンス',
          arrowType: 'return'
        }
      ]
    };
  }

  /**
   * ファイルアップロードシナリオ作成
   * @returns {Object} ファイルアップロードシナリオデータ
   */
  createFileUploadScenario() {
    return {
      title: 'ファイルアップロードプロセス',
      actors: ['ユーザー', 'Webアプリケーション', 'ファイルサーバー', 'ウイルススキャン'],
      actions: [
        {
          from: 'ユーザー',
          to: 'Webアプリケーション',
          message: 'ファイル選択・アップロード要求',
          arrowType: 'sync'
        },
        {
          from: 'Webアプリケーション',
          to: 'ウイルススキャン',
          message: 'ファイルセキュリティチェック',
          arrowType: 'sync'
        },
        {
          from: 'Webアプリケーション',
          to: 'ファイルサーバー',
          message: 'ファイル保存',
          arrowType: 'sync',
          condition: 'セキュリティチェック通過'
        },
        {
          from: 'ファイルサーバー',
          to: 'Webアプリケーション',
          message: '保存完了通知',
          arrowType: 'return'
        },
        {
          from: 'Webアプリケーション',
          to: 'ユーザー',
          message: 'アップロード完了通知',
          arrowType: 'return'
        }
      ]
    };
  }

  /**
   * 通知シナリオ作成
   * @returns {Object} 通知シナリオデータ
   */
  createNotificationScenario() {
    return {
      title: 'システム通知プロセス',
      actors: ['システム', '通知サービス', 'メールサーバー', 'ユーザー'],
      actions: [
        {
          from: 'システム',
          to: '通知サービス',
          message: '通知イベント発生',
          arrowType: 'async'
        },
        {
          from: '通知サービス',
          to: 'メールサーバー',
          message: 'メール送信要求',
          arrowType: 'sync'
        },
        {
          from: 'メールサーバー',
          to: 'ユーザー',
          message: '通知メール配信',
          arrowType: 'async'
        },
        {
          from: 'メールサーバー',
          to: '通知サービス',
          message: '配信ステータス通知',
          arrowType: 'return'
        }
      ]
    };
  }

  /**
   * ECサイトプロセス作成
   * @returns {Object} ECサイトプロセスデータ
   */
  createECommerceProcess() {
    return {
      title: 'ECサイト注文処理プロセス',
      actors: [
        '顧客', 'Webサイト', '在庫管理システム', '決済システム', 
        '配送システム', 'メール通知', '営業部', 'カスタマーサポート'
      ],
      actions: [
        {
          from: '顧客',
          to: 'Webサイト',
          message: '商品検索・選択',
          arrowType: 'sync'
        },
        {
          from: 'Webサイト',
          to: '在庫管理システム',
          message: '在庫数確認',
          arrowType: 'sync'
        },
        {
          from: '顧客',
          to: 'Webサイト',
          message: 'カート追加・注文確定',
          arrowType: 'sync'
        },
        {
          from: 'Webサイト',
          to: '決済システム',
          message: '決済処理要求',
          arrowType: 'sync'
        },
        {
          from: '決済システム',
          to: 'Webサイト',
          message: '決済結果通知',
          arrowType: 'return'
        }
      ],
      conditions: [
        {
          condition: '在庫あり',
          trueAction: '注文処理継続',
          falseAction: '在庫切れ通知'
        },
        {
          condition: '決済成功',
          trueAction: '配送手配開始',
          falseAction: '決済エラー処理'
        }
      ],
      loops: [
        {
          condition: '商品検索結果確認',
          actions: ['検索条件変更', '商品詳細確認', '比較検討']
        }
      ],
      parallel: [
        {
          name: '注文後処理',
          branches: [
            ['在庫更新', '売上記録'],
            ['配送準備', '配送伝票作成'],
            ['顧客通知', 'レシート発行']
          ]
        }
      ]
    };
  }

  /**
   * 銀行業務プロセス作成
   * @returns {Object} 銀行業務プロセスデータ
   */
  createBankingProcess() {
    return {
      title: '銀行振込処理プロセス',
      actors: [
        '顧客', 'ネットバンキング', '認証システム', 'コアバンキング',
        '他行システム', '監査システム', '通知サービス'
      ],
      actions: [
        {
          from: '顧客',
          to: 'ネットバンキング',
          message: '振込依頼（振込先、金額）',
          arrowType: 'sync'
        },
        {
          from: 'ネットバンキング',
          to: '認証システム',
          message: '本人確認（ワンタイムパスワード）',
          arrowType: 'sync'
        },
        {
          from: 'ネットバンキング',
          to: 'コアバンキング',
          message: '残高確認・振込処理',
          arrowType: 'sync'
        },
        {
          from: 'コアバンキング',
          to: '他行システム',
          message: '他行宛振込データ送信',
          arrowType: 'async'
        }
      ],
      conditions: [
        {
          condition: '認証成功',
          trueAction: '振込処理継続',
          falseAction: '認証エラー・処理停止'
        },
        {
          condition: '残高十分',
          trueAction: '振込実行',
          falseAction: '残高不足エラー'
        }
      ]
    };
  }

  /**
   * 医療システムプロセス作成
   * @returns {Object} 医療システムプロセスデータ
   */
  createHealthcareProcess() {
    return {
      title: '電子カルテシステム診療プロセス',
      actors: [
        '患者', '受付', '医師', '看護師', '薬剤師', 
        '電子カルテ', '検査システム', '薬剤管理', '会計システム'
      ],
      actions: [
        {
          from: '患者',
          to: '受付',
          message: '診療申込・保険証提示',
          arrowType: 'sync'
        },
        {
          from: '受付',
          to: '電子カルテ',
          message: '患者情報確認・予約登録',
          arrowType: 'sync'
        },
        {
          from: '医師',
          to: '電子カルテ',
          message: '診療記録入力・診断',
          arrowType: 'sync'
        },
        {
          from: '医師',
          to: '検査システム',
          message: '検査オーダー',
          arrowType: 'sync'
        },
        {
          from: '医師',
          to: '薬剤管理',
          message: '処方箋発行',
          arrowType: 'sync'
        }
      ]
    };
  }

  /**
   * 教育システムプロセス作成
   * @returns {Object} 教育システムプロセスデータ
   */
  createEducationProcess() {
    return {
      title: 'オンライン学習システム',
      actors: [
        '学生', '教師', 'LMS', '動画配信', '課題管理', 
        '成績管理', '通知システム', '親御さん'
      ],
      actions: [
        {
          from: '学生',
          to: 'LMS',
          message: 'ログイン・コース選択',
          arrowType: 'sync'
        },
        {
          from: 'LMS',
          to: '動画配信',
          message: '授業動画要求',
          arrowType: 'sync'
        },
        {
          from: '学生',
          to: '課題管理',
          message: '課題提出',
          arrowType: 'sync'
        },
        {
          from: '教師',
          to: '成績管理',
          message: '課題採点・成績入力',
          arrowType: 'sync'
        }
      ]
    };
  }

  /**
   * マイクロサービスパターン作成
   * @returns {Object} マイクロサービスパターンデータ
   */
  createMicroservicesPattern() {
    return {
      title: 'マイクロサービスアーキテクチャ',
      actors: [
        'クライアント', 'APIゲートウェイ', 'ユーザーサービス', '商品サービス',
        '注文サービス', '決済サービス', '通知サービス', 'データベース群',
        'キャッシュ', 'メッセージキュー', 'ログ収集', 'モニタリング'
      ],
      actions: [
        {
          from: 'クライアント',
          to: 'APIゲートウェイ',
          message: 'API要求（認証ヘッダー付き）',
          arrowType: 'sync'
        },
        {
          from: 'APIゲートウェイ',
          to: 'ユーザーサービス',
          message: 'トークン検証',
          arrowType: 'sync'
        },
        {
          from: 'APIゲートウェイ',
          to: '商品サービス',
          message: '商品情報要求',
          arrowType: 'sync'
        }
      ],
      parallel: [
        {
          name: 'サービス間連携',
          branches: [
            ['ユーザー認証', 'セッション管理'],
            ['商品データ取得', 'キャッシュ更新'],
            ['ログ記録', 'メトリクス収集']
          ]
        }
      ]
    };
  }

  /**
   * イベント駆動パターン作成
   * @returns {Object} イベント駆動パターンデータ
   */
  createEventDrivenPattern() {
    return {
      title: 'イベント駆動アーキテクチャ',
      actors: [
        'Webアプリ', 'イベントストア', 'イベントバス', 'ユーザーサービス',
        '注文サービス', 'メール送信', 'レポート生成', 'データ分析'
      ],
      actions: [
        {
          from: 'Webアプリ',
          to: 'イベントストア',
          message: 'ユーザー登録イベント発行',
          arrowType: 'async'
        },
        {
          from: 'イベントストア',
          to: 'イベントバス',
          message: 'イベント配信',
          arrowType: 'async'
        }
      ]
    };
  }

  /**
   * バッチ処理パターン作成
   * @returns {Object} バッチ処理パターンデータ
   */
  createBatchProcessingPattern() {
    return {
      title: '大規模バッチ処理システム',
      actors: [
        'スケジューラー', 'バッチマネージャー', 'データ取得', 'データ変換',
        'データ検証', 'データ登録', 'エラーハンドリング', '完了通知'
      ],
      actions: [
        {
          from: 'スケジューラー',
          to: 'バッチマネージャー',
          message: 'バッチ処理開始指示',
          arrowType: 'sync'
        }
      ],
      loops: [
        {
          condition: '処理対象データが存在する限り',
          actions: ['データ読み込み', 'データ変換', 'データ検証', 'データ登録']
        }
      ]
    };
  }

  /**
   * リアルタイムパターン作成
   * @returns {Object} リアルタイムパターンデータ
   */
  createRealTimePattern() {
    return {
      title: 'リアルタイム監視システム',
      actors: [
        'センサー', 'データ収集', 'ストリーム処理', 'アラート判定',
        '通知システム', 'ダッシュボード', '管理者', '自動対応'
      ],
      actions: [
        {
          from: 'センサー',
          to: 'データ収集',
          message: 'リアルタイムデータ送信',
          arrowType: 'async'
        }
      ]
    };
  }

  /**
   * ランダムダイアグラムデータ生成
   * @param {string} complexity - 複雑さレベル
   * @returns {Object} ダイアグラムデータ
   */
  generateRandomDiagram(complexity = 'medium') {
    const level = this.complexityLevels[complexity];
    const actors = this.selectRandomActors(level.actors);
    const actions = this.generateRandomActions(actors, level.actions);
    const conditions = this.generateRandomConditions(level.conditions);
    const loops = this.generateRandomLoops(level.loops);
    const parallel = this.generateRandomParallel(level.parallel);

    return {
      id: this.generateDiagramId(),
      type: 'random',
      complexity,
      title: `ランダム生成${complexity}レベルダイアグラム`,
      actors,
      actions,
      conditions,
      loops,
      parallel,
      metadata: {
        createdAt: new Date().toISOString(),
        estimatedComplexity: level
      }
    };
  }

  /**
   * ランダムアクター選択
   * @param {number} count - 選択数
   * @returns {Array} アクター配列
   */
  selectRandomActors(count) {
    const allActors = [
      ...this.businessActors.users,
      ...this.businessActors.systems,
      ...this.businessActors.external,
      ...this.businessActors.services
    ];
    
    const shuffled = [...allActors].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * ランダムアクション生成
   * @param {Array} actors - アクター配列
   * @param {number} count - 生成数
   * @returns {Array} アクション配列
   */
  generateRandomActions(actors, count) {
    const actions = [];
    const allActions = [
      ...this.businessActions.authentication,
      ...this.businessActions.data_operations,
      ...this.businessActions.business_processes,
      ...this.businessActions.communication
    ];

    for (let i = 0; i < count; i++) {
      const from = actors[Math.floor(Math.random() * actors.length)];
      const to = actors[Math.floor(Math.random() * actors.length)];
      const message = allActions[Math.floor(Math.random() * allActions.length)];
      const arrowType = ['sync', 'async', 'return'][Math.floor(Math.random() * 3)];

      if (from !== to) {
        actions.push({ from, to, message, arrowType });
      }
    }

    return actions;
  }

  /**
   * ランダム条件生成
   * @param {number} count - 生成数
   * @returns {Array} 条件配列
   */
  generateRandomConditions(count) {
    const conditions = [];
    const allConditions = [
      ...this.conditionPatterns.authentication,
      ...this.conditionPatterns.validation,
      ...this.conditionPatterns.business_rules
    ];

    for (let i = 0; i < count; i++) {
      const condition = allConditions[Math.floor(Math.random() * allConditions.length)];
      conditions.push({
        condition,
        trueAction: '正常処理継続',
        falseAction: 'エラー処理・代替フロー'
      });
    }

    return conditions;
  }

  /**
   * ランダムループ生成
   * @param {number} count - 生成数
   * @returns {Array} ループ配列
   */
  generateRandomLoops(count) {
    const loops = [];
    const loopConditions = Object.values(this.loopPatterns);

    for (let i = 0; i < count; i++) {
      const condition = loopConditions[Math.floor(Math.random() * loopConditions.length)];
      loops.push({
        condition,
        actions: ['処理実行', '結果確認', '次回準備']
      });
    }

    return loops;
  }

  /**
   * ランダム並列処理生成
   * @param {number} count - 生成数
   * @returns {Array} 並列処理配列
   */
  generateRandomParallel(count) {
    const parallel = [];

    for (let i = 0; i < count; i++) {
      parallel.push({
        name: `並列処理${i + 1}`,
        branches: [
          ['処理A', '結果A'],
          ['処理B', '結果B'],
          ['処理C', '結果C']
        ]
      });
    }

    return parallel;
  }

  /**
   * ダイアグラムID生成
   * @returns {string} ダイアグラムID
   */
  generateDiagramId() {
    return `diagram_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * PlantUMLコード生成
   * @param {Object} diagramData - ダイアグラムデータ
   * @returns {string} PlantUMLコード
   */
  generatePlantUMLCode(diagramData) {
    let code = '@startuml\n';
    code += `title ${diagramData.title}\n\n`;

    // アクション
    if (diagramData.actions) {
      diagramData.actions.forEach(action => {
        const arrow = this.getPlantUMLArrow(action.arrowType);
        code += `${action.from} ${arrow} ${action.to} : ${action.message}\n`;
      });
    }

    // 条件分岐
    if (diagramData.conditions) {
      diagramData.conditions.forEach(condition => {
        code += `alt ${condition.condition}\n`;
        code += `  note right : ${condition.trueAction}\n`;
        code += `else\n`;
        code += `  note right : ${condition.falseAction}\n`;
        code += `end\n`;
      });
    }

    code += '\n@enduml';
    return code;
  }

  /**
   * PlantUML矢印変換
   * @param {string} arrowType - 矢印タイプ
   * @returns {string} PlantUML矢印記号
   */
  getPlantUMLArrow(arrowType) {
    const arrows = {
      sync: '->',
      async: '->>',
      return: '-->'
    };
    return arrows[arrowType] || '->';
  }

  /**
   * 一括ダイアグラム生成
   * @param {number} count - 生成数
   * @param {string} complexity - 複雑さレベル
   * @returns {Array} ダイアグラム配列
   */
  generateBulkDiagrams(count, complexity = 'medium') {
    const diagrams = [];
    for (let i = 0; i < count; i++) {
      diagrams.push(this.generateRandomDiagram(complexity));
    }
    return diagrams;
  }

  /**
   * ファクトリー統計情報取得
   * @returns {Object} 統計情報
   */
  getFactoryStats() {
    return {
      totalActorTypes: Object.keys(this.businessActors).length,
      totalActionTypes: Object.keys(this.businessActions).length,
      complexityLevels: Object.keys(this.complexityLevels),
      supportedPatterns: ['simple', 'complex', 'enterprise'],
      lastGenerated: new Date().toISOString()
    };
  }
}

export default DiagramDataFactory;