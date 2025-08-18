/**
 * ActionDataFactory - アクションデータファクトリー
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - アクション項目テストデータ生成
 * - 7要素構成データ（dragHandle, actorFrom, arrowType, actorTo, message, deleteButton, questionButton）
 * - 日本語ビジネスアクション
 * - バリデーションテストケース
 */

export class ActionDataFactory {
  constructor() {
    // 日本語アクター名（業界別）
    this.actorCategories = {
      technology: [
        'ユーザー', 'Webアプリケーション', 'データベース', 'API サーバー', 'キャッシュサーバー',
        'ロードバランサー', 'CDN', 'メールサーバー', 'ファイルサーバー', 'バックアップシステム'
      ],
      business: [
        '顧客', '営業担当', '経理部', '人事部', '総務部', '管理者',
        '承認者', 'プロジェクトマネージャー', 'チームリーダー', '外部パートナー'
      ],
      finance: [
        '顧客', '銀行システム', '決済システム', '会計システム', '監査システム',
        '税務システム', 'レポートシステム', '承認システム', 'コンプライアンス', 'セキュリティ'
      ],
      healthcare: [
        '患者', '医師', '看護師', '薬剤師', '受付', '電子カルテ',
        '検査システム', '薬剤管理', '会計システム', '保険システム'
      ],
      education: [
        '学生', '教師', '保護者', '管理者', 'LMSシステム', '動画配信',
        '課題管理', '成績管理', '出席管理', '図書館システム'
      ]
    };

    // 矢印タイプ定義（設計書準拠）
    this.arrowTypes = {
      sync: {
        symbol: '→',
        code: 'sync',
        label: '同期通信',
        description: '即座に応答を待つ通信'
      },
      async: {
        symbol: '⇢',
        code: 'async',
        label: '非同期通信',
        description: '応答を待たない通信'
      },
      return: {
        symbol: '⟵',
        code: 'return',
        label: '戻り通信',
        description: 'レスポンスまたは戻り値'
      },
      asyncReturn: {
        symbol: '⟸',
        code: 'async-return',
        label: '非同期戻り',
        description: '非同期でのレスポンス'
      }
    };

    // 日本語メッセージパターン（業務別）
    this.messagePatterns = {
      authentication: [
        'ログイン要求', 'パスワード確認', '認証結果通知', 'セッション開始',
        'ログアウト処理', 'トークン発行', 'トークン検証', '権限確認'
      ],
      data_operations: [
        'データ取得要求', 'データ更新', 'データ削除', 'データ検索',
        'データ検証', 'データ保存', 'データ復元', 'データ同期'
      ],
      business_processes: [
        '申請受付', '承認処理', '決裁完了', '処理実行',
        '結果通知', '進捗報告', 'ステータス更新', '完了確認'
      ],
      communication: [
        'メール送信', 'SMS通知', 'プッシュ通知', 'アラート発信',
        '案内送付', '確認要求', 'レポート送信', '報告書提出'
      ],
      financial: [
        '残高確認', '振込処理', '決済実行', '精算処理',
        '請求書発行', '支払い確認', '入金通知', '領収書発行'
      ],
      system_operations: [
        'バックアップ実行', 'ログ出力', 'メンテナンス開始', 'システム再起動',
        '設定更新', '監視開始', 'パフォーマンス測定', 'セキュリティスキャン'
      ]
    };

    // 条件パターン
    this.conditionPatterns = [
      '認証済みの場合', '権限確認済み', 'データ形式正常', '在庫数量十分',
      '予算範囲内', '承認完了', '営業時間内', 'システム稼働中',
      'ネットワーク接続正常', 'メンテナンス時間外', '緊急度高', '優先度高'
    ];

    // アクションテンプレート
    this.actionTemplates = {
      simple: {
        complexity: 1,
        requiredFields: ['actorFrom', 'actorTo', 'message'],
        optionalFields: ['arrowType'],
        validation: 'basic'
      },
      standard: {
        complexity: 2,
        requiredFields: ['actorFrom', 'arrowType', 'actorTo', 'message'],
        optionalFields: ['condition'],
        validation: 'standard'
      },
      complete: {
        complexity: 3,
        requiredFields: ['actorFrom', 'arrowType', 'actorTo', 'message'],
        optionalFields: ['condition', 'note', 'timing'],
        validation: 'comprehensive'
      }
    };
  }

  /**
   * 完全なアクション項目データ生成（7要素構成）
   * @param {Object} options - 生成オプション
   * @returns {Object} 完全なアクション項目データ
   */
  generateCompleteActionItem(options = {}) {
    const {
      category = 'technology',
      messageType = 'data_operations',
      arrowType = null,
      includeCondition = false,
      includeValidation = true
    } = options;

    const actors = this.actorCategories[category] || this.actorCategories.technology;
    const messages = this.messagePatterns[messageType] || this.messagePatterns.data_operations;
    
    const actorFrom = actors[Math.floor(Math.random() * actors.length)];
    const actorTo = actors.filter(a => a !== actorFrom)[Math.floor(Math.random() * (actors.length - 1))];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    const selectedArrowType = arrowType || this.selectRandomArrowType();
    
    const actionItem = {
      // 7要素構成（設計書準拠）
      id: this.generateActionId(),
      dragHandle: {
        visible: true,
        enabled: true,
        icon: '☰'
      },
      actorFrom: {
        value: actorFrom,
        options: actors,
        validation: includeValidation ? this.validateActor(actorFrom) : null
      },
      arrowType: {
        value: selectedArrowType.code,
        symbol: selectedArrowType.symbol,
        label: selectedArrowType.label,
        options: Object.values(this.arrowTypes)
      },
      actorTo: {
        value: actorTo,
        options: actors,
        validation: includeValidation ? this.validateActor(actorTo) : null
      },
      message: {
        value: message,
        maxLength: 100,
        validation: includeValidation ? this.validateMessage(message) : null
      },
      deleteButton: {
        visible: true,
        enabled: true,
        icon: '🗑️',
        confirmRequired: true
      },
      questionButton: {
        visible: true,
        enabled: includeCondition,
        active: includeCondition,
        icon: '？',
        condition: includeCondition ? this.generateCondition() : null
      },
      
      // メタデータ
      metadata: {
        category,
        messageType,
        complexity: this.calculateComplexity(actorFrom, actorTo, message),
        createdAt: new Date().toISOString(),
        isValid: true
      }
    };

    // バリデーション実行
    if (includeValidation) {
      actionItem.validation = this.validateCompleteActionItem(actionItem);
    }

    return actionItem;
  }

  /**
   * 複数アクション項目の一括生成
   * @param {number} count - 生成数
   * @param {Object} options - 生成オプション
   * @returns {Array} アクション項目配列
   */
  generateActionItemSet(count, options = {}) {
    const {
      sequentialFlow = false,
      mixedCategories = false,
      includeVariations = true
    } = options;

    const actionItems = [];
    let previousActor = null;

    for (let i = 0; i < count; i++) {
      const itemOptions = { ...options };
      
      // 順次フローの場合、前のアクションの宛先を次の送信者に
      if (sequentialFlow && previousActor) {
        itemOptions.forceActorFrom = previousActor;
      }
      
      // カテゴリーミックス
      if (mixedCategories) {
        const categories = Object.keys(this.actorCategories);
        itemOptions.category = categories[i % categories.length];
      }
      
      // バリエーション追加
      if (includeVariations) {
        itemOptions.includeCondition = i % 3 === 0; // 3つに1つは条件付き
        itemOptions.arrowType = i % 2 === 0 ? 'sync' : 'async'; // 同期/非同期交互
      }

      const actionItem = this.generateCompleteActionItem(itemOptions);
      actionItems.push(actionItem);
      
      if (sequentialFlow) {
        previousActor = actionItem.actorTo.value;
      }
    }

    return {
      items: actionItems,
      metadata: {
        count,
        sequentialFlow,
        mixedCategories,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * 特定業界向けアクションセット生成
   * @param {string} industry - 業界名
   * @param {string} scenario - シナリオ名
   * @returns {Array} 業界特化アクション配列
   */
  generateIndustryActionSet(industry, scenario) {
    const industryScenarios = {
      ecommerce: {
        order_process: [
          { from: '顧客', to: 'Webサイト', message: '商品検索', arrow: 'sync' },
          { from: 'Webサイト', to: '在庫システム', message: '在庫確認', arrow: 'sync' },
          { from: '顧客', to: 'Webサイト', message: '注文確定', arrow: 'sync' },
          { from: 'Webサイト', to: '決済システム', message: '決済処理', arrow: 'sync' },
          { from: '決済システム', to: 'Webサイト', message: '決済結果', arrow: 'return' },
          { from: 'Webサイト', to: '配送システム', message: '配送手配', arrow: 'async' }
        ]
      },
      banking: {
        transfer_process: [
          { from: '顧客', to: 'ネットバンキング', message: '振込依頼', arrow: 'sync' },
          { from: 'ネットバンキング', to: '認証システム', message: '本人確認', arrow: 'sync' },
          { from: 'ネットバンキング', to: 'コアバンキング', message: '残高確認', arrow: 'sync' },
          { from: 'コアバンキング', to: '他行システム', message: '振込実行', arrow: 'async' }
        ]
      },
      healthcare: {
        examination_process: [
          { from: '患者', to: '受付', message: '診療申込', arrow: 'sync' },
          { from: '受付', to: '電子カルテ', message: '患者情報確認', arrow: 'sync' },
          { from: '医師', to: '電子カルテ', message: '診療記録入力', arrow: 'sync' },
          { from: '医師', to: '検査システム', message: '検査オーダー', arrow: 'sync' }
        ]
      }
    };

    const scenarioData = industryScenarios[industry]?.[scenario];
    if (!scenarioData) {
      throw new Error(`Scenario not found: ${industry}.${scenario}`);
    }

    return scenarioData.map((action, index) => ({
      id: this.generateActionId(),
      index,
      dragHandle: { visible: true, enabled: true },
      actorFrom: { value: action.from },
      arrowType: { 
        value: action.arrow,
        symbol: this.arrowTypes[action.arrow]?.symbol || '→'
      },
      actorTo: { value: action.to },
      message: { value: action.message },
      deleteButton: { visible: true, enabled: true },
      questionButton: { visible: true, enabled: false },
      metadata: {
        industry,
        scenario,
        position: index + 1,
        createdAt: new Date().toISOString()
      }
    }));
  }

  /**
   * バリデーションテストケース生成
   * @param {string} testType - テストタイプ
   * @returns {Array} バリデーションテストケース
   */
  generateValidationTestCases(testType) {
    const testCases = {
      valid_data: [
        {
          name: '完全な有効データ',
          data: this.generateCompleteActionItem({ includeValidation: false }),
          expectedResult: { isValid: true, errors: [] }
        },
        {
          name: '最小限の有効データ',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: 'システム' },
            message: { value: 'リクエスト' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { isValid: true, errors: [] }
        }
      ],
      invalid_data: [
        {
          name: '送信者が空',
          data: {
            actorFrom: { value: '' },
            actorTo: { value: 'システム' },
            message: { value: 'リクエスト' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['actorFrom is required'] 
          }
        },
        {
          name: '宛先が空',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: '' },
            message: { value: 'リクエスト' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['actorTo is required'] 
          }
        },
        {
          name: 'メッセージが空',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: 'システム' },
            message: { value: '' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['message is required'] 
          }
        },
        {
          name: 'メッセージが長すぎる',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: 'システム' },
            message: { value: 'あ'.repeat(101) }, // 101文字
            arrowType: { value: 'sync' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['message exceeds maximum length'] 
          }
        },
        {
          name: '無効な矢印タイプ',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: 'システム' },
            message: { value: 'リクエスト' },
            arrowType: { value: 'invalid_arrow' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['invalid arrow type'] 
          }
        },
        {
          name: '送信者と宛先が同じ',
          data: {
            actorFrom: { value: 'ユーザー' },
            actorTo: { value: 'ユーザー' },
            message: { value: 'リクエスト' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { 
            isValid: false, 
            errors: ['actorFrom and actorTo cannot be the same'] 
          }
        }
      ],
      edge_cases: [
        {
          name: '日本語の複雑な文字',
          data: {
            actorFrom: { value: '🏢企業システム' },
            actorTo: { value: '👤ユーザー' },
            message: { value: '🔐セキュリティチェック完了📋' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { isValid: true, errors: [] }
        },
        {
          name: '特殊文字を含むアクター名',
          data: {
            actorFrom: { value: 'DB-Server_01' },
            actorTo: { value: 'Web-App@v2.0' },
            message: { value: 'API呼び出し (GET /api/v1/users)' },
            arrowType: { value: 'sync' }
          },
          expectedResult: { isValid: true, errors: [] }
        }
      ]
    };

    return testCases[testType] || [];
  }

  /**
   * パフォーマンステスト用大量データ生成
   * @param {number} count - 生成数
   * @param {Object} options - 生成オプション
   * @returns {Array} 大量アクションデータ
   */
  generatePerformanceTestData(count, options = {}) {
    const {
      complexity = 'medium',
      includeValidation = false,
      batchSize = 100
    } = options;

    const allActions = [];
    const startTime = Date.now();

    for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
      const batchActions = [];
      const remainingCount = Math.min(batchSize, count - (batch * batchSize));

      for (let i = 0; i < remainingCount; i++) {
        const action = this.generateCompleteActionItem({
          includeValidation,
          category: this.selectRandomCategory(),
          messageType: this.selectRandomMessageType()
        });
        
        // パフォーマンス測定データ追加
        action.performanceData = {
          batchNumber: batch + 1,
          indexInBatch: i + 1,
          globalIndex: (batch * batchSize) + i + 1,
          generatedAt: Date.now()
        };
        
        batchActions.push(action);
      }

      allActions.push(...batchActions);
    }

    const endTime = Date.now();

    return {
      actions: allActions,
      performance: {
        totalCount: count,
        batchSize,
        totalBatches: Math.ceil(count / batchSize),
        generationTime: endTime - startTime,
        averageTimePerAction: (endTime - startTime) / count,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * ランダム矢印タイプ選択
   * @returns {Object} 矢印タイプオブジェクト
   */
  selectRandomArrowType() {
    const types = Object.values(this.arrowTypes);
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * ランダムカテゴリー選択
   * @returns {string} カテゴリー名
   */
  selectRandomCategory() {
    const categories = Object.keys(this.actorCategories);
    return categories[Math.floor(Math.random() * categories.length)];
  }

  /**
   * ランダムメッセージタイプ選択
   * @returns {string} メッセージタイプ
   */
  selectRandomMessageType() {
    const types = Object.keys(this.messagePatterns);
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 条件生成
   * @returns {Object} 条件オブジェクト
   */
  generateCondition() {
    const condition = this.conditionPatterns[Math.floor(Math.random() * this.conditionPatterns.length)];
    return {
      text: condition,
      trueAction: '正常処理継続',
      falseAction: 'エラー処理・代替フロー',
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
  }

  /**
   * アクターバリデーション
   * @param {string} actor - アクター名
   * @returns {Object} バリデーション結果
   */
  validateActor(actor) {
    const errors = [];
    const warnings = [];

    if (!actor || actor.trim().length === 0) {
      errors.push('Actor name is required');
    } else if (actor.length > 50) {
      errors.push('Actor name is too long (max 50 characters)');
    } else if (actor.length < 2) {
      warnings.push('Actor name is very short');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * メッセージバリデーション
   * @param {string} message - メッセージ
   * @returns {Object} バリデーション結果
   */
  validateMessage(message) {
    const errors = [];
    const warnings = [];

    if (!message || message.trim().length === 0) {
      errors.push('Message is required');
    } else if (message.length > 100) {
      errors.push('Message is too long (max 100 characters)');
    } else if (message.length < 3) {
      warnings.push('Message is very short');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 完全なアクション項目バリデーション
   * @param {Object} actionItem - アクション項目
   * @returns {Object} バリデーション結果
   */
  validateCompleteActionItem(actionItem) {
    const errors = [];
    const warnings = [];

    // 必須フィールドチェック
    if (!actionItem.actorFrom?.value) {
      errors.push('actorFrom is required');
    }
    if (!actionItem.actorTo?.value) {
      errors.push('actorTo is required');
    }
    if (!actionItem.message?.value) {
      errors.push('message is required');
    }
    if (!actionItem.arrowType?.value) {
      errors.push('arrowType is required');
    }

    // 論理チェック
    if (actionItem.actorFrom?.value === actionItem.actorTo?.value) {
      errors.push('actorFrom and actorTo cannot be the same');
    }

    // 矢印タイプチェック
    if (actionItem.arrowType?.value && !Object.keys(this.arrowTypes).includes(actionItem.arrowType.value)) {
      errors.push('invalid arrow type');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * 複雑さ計算
   * @param {string} actorFrom - 送信者
   * @param {string} actorTo - 宛先
   * @param {string} message - メッセージ
   * @returns {number} 複雑さスコア
   */
  calculateComplexity(actorFrom, actorTo, message) {
    let complexity = 1;
    
    // アクター名の複雑さ
    if (actorFrom.length > 10) complexity += 0.5;
    if (actorTo.length > 10) complexity += 0.5;
    
    // メッセージの複雑さ
    if (message.length > 20) complexity += 1;
    if (message.includes('（') || message.includes('(')) complexity += 0.5;
    
    return Math.round(complexity * 10) / 10;
  }

  /**
   * アクションID生成
   * @returns {string} アクションID
   */
  generateActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * ファクトリー統計情報取得
   * @returns {Object} 統計情報
   */
  getFactoryStats() {
    return {
      actorCategories: Object.keys(this.actorCategories).length,
      totalActors: Object.values(this.actorCategories).flat().length,
      messageTypes: Object.keys(this.messagePatterns).length,
      totalMessages: Object.values(this.messagePatterns).flat().length,
      arrowTypes: Object.keys(this.arrowTypes).length,
      conditionPatterns: this.conditionPatterns.length,
      supportedIndustries: ['ecommerce', 'banking', 'healthcare'],
      lastGenerated: new Date().toISOString()
    };
  }
}

export default ActionDataFactory;