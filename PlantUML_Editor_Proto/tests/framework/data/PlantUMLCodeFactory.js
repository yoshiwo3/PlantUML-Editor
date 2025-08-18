/**
 * PlantUMLCodeFactory - PlantUMLコードファクトリー
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - PlantUMLシーケンス図コード生成
 * - 日本語コメント・タイトル対応
 * - 複雑さレベル別コード生成
 * - バリデーション・パース機能
 */

export class PlantUMLCodeFactory {
  constructor() {
    // PlantUML基本構文
    this.syntax = {
      start: '@startuml',
      end: '@enduml',
      title: 'title',
      participant: 'participant',
      note: 'note',
      group: 'group',
      alt: 'alt',
      else: 'else',
      loop: 'loop',
      par: 'par',
      end_block: 'end'
    };

    // 矢印タイプマッピング
    this.arrowMappings = {
      sync: '->',           // 同期通信
      async: '->>',         // 非同期通信  
      return: '-->', 
      asyncReturn: '-->>',
      self: '->',           // 自己呼び出し
      lost: '-x',           // 失われたメッセージ
      found: '->o'          // 見つかったメッセージ
    };

    // スタイル定義
    this.styles = {
      participant: {
        actor: 'actor',
        boundary: 'boundary', 
        control: 'control',
        entity: 'entity',
        database: 'database',
        collections: 'collections',
        queue: 'queue'
      },
      colors: [
        '#FFB6C1', '#87CEEB', '#98FB98', '#F0E68C', 
        '#DDA0DD', '#F4A460', '#20B2AA', '#87CEFA'
      ],
      themes: {
        default: '',
        modern: '!theme blueprint',
        dark: '!theme _none_',
        corporate: '!theme plain'
      }
    };

    // テンプレート
    this.templates = {
      simple: {
        maxParticipants: 3,
        maxMessages: 5,
        hasConditions: false,
        hasLoops: false,
        hasParallel: false
      },
      standard: {
        maxParticipants: 5,
        maxMessages: 10,
        hasConditions: true,
        hasLoops: false,
        hasParallel: false
      },
      complex: {
        maxParticipants: 8,
        maxMessages: 20,
        hasConditions: true,
        hasLoops: true,
        hasParallel: true
      },
      enterprise: {
        maxParticipants: 12,
        maxMessages: 35,
        hasConditions: true,
        hasLoops: true,
        hasParallel: true
      }
    };

    // 日本語コメントパターン
    this.japaneseComments = {
      process: [
        'メイン処理フロー', 'ビジネスロジック実行', 'データ処理',
        'ユーザー操作', 'システム内部処理', 'エラーハンドリング'
      ],
      timing: [
        '即座に実行', '非同期で実行', '遅延実行', 
        'バックグラウンド処理', 'リアルタイム処理'
      ],
      conditions: [
        '正常な場合', 'エラーの場合', '例外処理',
        '権限がある場合', 'データが存在する場合'
      ]
    };
  }

  /**
   * シンプルなPlantUMLコード生成
   * @param {Object} options - 生成オプション
   * @returns {string} PlantUMLコード
   */
  generateSimpleCode(options = {}) {
    const {
      title = 'シンプルシーケンス図',
      participants = ['ユーザー', 'システム', 'データベース'],
      theme = 'default',
      includeComments = true
    } = options;

    let code = this.syntax.start + '\n';
    
    // テーマ追加
    if (this.styles.themes[theme]) {
      code += this.styles.themes[theme] + '\n';
    }
    
    // タイトル追加
    code += `${this.syntax.title} ${title}\n\n`;
    
    // 参加者定義
    participants.forEach((participant, index) => {
      const color = this.styles.colors[index % this.styles.colors.length];
      code += `${this.syntax.participant} "${participant}" ${participant} ${color}\n`;
    });
    code += '\n';
    
    // 基本的なメッセージフロー
    code += `${participants[0]} ${this.arrowMappings.sync} ${participants[1]} : ログイン要求\n`;
    if (includeComments) {
      code += `note right : 認証情報を送信\n`;
    }
    
    code += `${participants[1]} ${this.arrowMappings.sync} ${participants[2]} : ユーザー情報確認\n`;
    code += `${participants[2]} ${this.arrowMappings.return} ${participants[1]} : 認証結果\n`;
    code += `${participants[1]} ${this.arrowMappings.return} ${participants[0]} : ログイン結果\n`;
    
    if (includeComments) {
      code += '\nnote over ' + participants.join(', ') + ' : 認証プロセス完了\n';
    }
    
    code += '\n' + this.syntax.end;
    
    return code;
  }

  /**
   * 複雑なPlantUMLコード生成
   * @param {Object} diagramData - ダイアグラムデータ
   * @returns {string} PlantUMLコード
   */
  generateComplexCode(diagramData) {
    const {
      title = '複雑なビジネスプロセス',
      actors = [],
      actions = [],
      conditions = [],
      loops = [],
      parallel = [],
      theme = 'modern',
      includeNotes = true,
      includeGrouping = true
    } = diagramData;

    let code = this.syntax.start + '\n';
    
    // テーマとスタイル
    if (this.styles.themes[theme]) {
      code += this.styles.themes[theme] + '\n';
    }
    
    code += `${this.syntax.title} ${title}\n\n`;
    
    // 参加者定義（スタイル付き）
    actors.forEach((actor, index) => {
      const style = this.determineActorStyle(actor);
      const color = this.styles.colors[index % this.styles.colors.length];
      code += `${style} "${actor}" as ${this.sanitizeId(actor)} ${color}\n`;
    });
    code += '\n';
    
    // メインフロー
    if (includeGrouping) {
      code += `${this.syntax.group} メインプロセス\n`;
    }
    
    // アクション処理
    actions.forEach((action, index) => {
      const fromId = this.sanitizeId(action.from);
      const toId = this.sanitizeId(action.to);
      const arrow = this.arrowMappings[action.arrowType] || this.arrowMappings.sync;
      
      code += `${fromId} ${arrow} ${toId} : ${action.message}\n`;
      
      if (includeNotes && action.note) {
        code += `note right : ${action.note}\n`;
      }
      
      // アクション間の条件処理
      const relatedCondition = conditions.find(c => c.actionIndex === index);
      if (relatedCondition) {
        code += this.generateConditionBlock(relatedCondition, fromId, toId);
      }
    });
    
    if (includeGrouping) {
      code += `${this.syntax.end_block}\n\n`;
    }
    
    // ループ処理
    loops.forEach(loop => {
      code += this.generateLoopBlock(loop);
    });
    
    // 並列処理
    parallel.forEach(par => {
      code += this.generateParallelBlock(par);
    });
    
    // エラーハンドリング
    if (diagramData.includeErrorHandling) {
      code += this.generateErrorHandlingSection();
    }
    
    code += '\n' + this.syntax.end;
    
    return code;
  }

  /**
   * エンタープライズレベルコード生成
   * @param {Object} enterpriseData - エンタープライズデータ
   * @returns {string} PlantUMLコード
   */
  generateEnterpriseCode(enterpriseData) {
    const {
      title = 'エンタープライズアーキテクチャ',
      services = [],
      integrations = [],
      securityFlow = true,
      auditTrail = true,
      performanceMetrics = true
    } = enterpriseData;

    let code = this.syntax.start + '\n';
    code += '!theme blueprint\n';
    code += `${this.syntax.title} ${title}\n\n`;
    
    // サービス定義（カテゴリ別）
    const serviceCategories = {
      external: services.filter(s => s.category === 'external'),
      api: services.filter(s => s.category === 'api'),
      database: services.filter(s => s.category === 'database'),
      messaging: services.filter(s => s.category === 'messaging')
    };
    
    Object.entries(serviceCategories).forEach(([category, categoryServices]) => {
      if (categoryServices.length > 0) {
        code += `== ${category.toUpperCase()} SERVICES ==\n`;
        categoryServices.forEach(service => {
          const style = this.getServiceStyle(service.category);
          code += `${style} "${service.name}" as ${this.sanitizeId(service.name)}\n`;
        });
        code += '\n';
      }
    });
    
    // セキュリティフロー
    if (securityFlow) {
      code += `${this.syntax.group} セキュリティ検証\n`;
      code += this.generateSecurityFlow();
      code += `${this.syntax.end_block}\n\n`;
    }
    
    // インテグレーションフロー
    integrations.forEach(integration => {
      code += this.generateIntegrationFlow(integration);
    });
    
    // 監査ログ
    if (auditTrail) {
      code += this.generateAuditTrail();
    }
    
    // パフォーマンス監視
    if (performanceMetrics) {
      code += this.generatePerformanceMonitoring();
    }
    
    code += '\n' + this.syntax.end;
    
    return code;
  }

  /**
   * 条件ブロック生成
   * @param {Object} condition - 条件オブジェクト
   * @param {string} fromId - 送信者ID
   * @param {string} toId - 宛先ID
   * @returns {string} 条件ブロックコード
   */
  generateConditionBlock(condition, fromId, toId) {
    let code = `${this.syntax.alt} ${condition.condition}\n`;
    code += `  ${fromId} ${this.arrowMappings.sync} ${toId} : ${condition.trueAction}\n`;
    code += `${this.syntax.else}\n`;
    code += `  ${fromId} ${this.arrowMappings.sync} ${toId} : ${condition.falseAction}\n`;
    code += `${this.syntax.end_block}\n`;
    return code;
  }

  /**
   * ループブロック生成
   * @param {Object} loop - ループオブジェクト
   * @returns {string} ループブロックコード
   */
  generateLoopBlock(loop) {
    let code = `${this.syntax.loop} ${loop.condition}\n`;
    loop.actions.forEach(action => {
      const fromId = this.sanitizeId(action.from);
      const toId = this.sanitizeId(action.to);
      const arrow = this.arrowMappings[action.arrowType] || this.arrowMappings.sync;
      code += `  ${fromId} ${arrow} ${toId} : ${action.message}\n`;
    });
    code += `${this.syntax.end_block}\n`;
    return code;
  }

  /**
   * 並列ブロック生成
   * @param {Object} parallel - 並列オブジェクト
   * @returns {string} 並列ブロックコード
   */
  generateParallelBlock(parallel) {
    let code = `${this.syntax.par} ${parallel.name}\n`;
    
    parallel.branches.forEach((branch, index) => {
      if (index > 0) {
        code += `${this.syntax.else}\n`;
      }
      branch.forEach(action => {
        const fromId = this.sanitizeId(action.from);
        const toId = this.sanitizeId(action.to);
        const arrow = this.arrowMappings[action.arrowType] || this.arrowMappings.sync;
        code += `  ${fromId} ${arrow} ${toId} : ${action.message}\n`;
      });
    });
    
    code += `${this.syntax.end_block}\n`;
    return code;
  }

  /**
   * セキュリティフロー生成
   * @returns {string} セキュリティフローコード
   */
  generateSecurityFlow() {
    let code = '';
    code += 'Client -> APIGateway : Request with Token\n';
    code += 'APIGateway -> AuthService : Validate Token\n';
    code += 'AuthService -> APIGateway : Validation Result\n';
    code += 'alt Token Valid\n';
    code += '  APIGateway -> Backend : Forward Request\n';
    code += 'else Token Invalid\n';
    code += '  APIGateway -> Client : 401 Unauthorized\n';
    code += 'end\n';
    return code;
  }

  /**
   * インテグレーションフロー生成
   * @param {Object} integration - インテグレーション情報
   * @returns {string} インテグレーションフローコード
   */
  generateIntegrationFlow(integration) {
    let code = `${this.syntax.group} ${integration.name}\n`;
    
    integration.steps.forEach(step => {
      const fromId = this.sanitizeId(step.from);
      const toId = this.sanitizeId(step.to);
      const arrow = this.arrowMappings[step.type] || this.arrowMappings.sync;
      code += `${fromId} ${arrow} ${toId} : ${step.message}\n`;
    });
    
    code += `${this.syntax.end_block}\n\n`;
    return code;
  }

  /**
   * 監査ログ生成
   * @returns {string} 監査ログコード
   */
  generateAuditTrail() {
    let code = `${this.syntax.group} 監査ログ\n`;
    code += 'Service -> AuditLog : Record Operation\n';
    code += 'AuditLog -> Database : Store Audit Entry\n';
    code += 'note right : すべての操作を記録\n';
    code += `${this.syntax.end_block}\n\n`;
    return code;
  }

  /**
   * パフォーマンス監視生成
   * @returns {string} パフォーマンス監視コード
   */
  generatePerformanceMonitoring() {
    let code = `${this.syntax.group} パフォーマンス監視\n`;
    code += 'Service -> MetricsCollector : Send Metrics\n';
    code += 'MetricsCollector -> Dashboard : Update Metrics\n';
    code += 'alt Performance Threshold Exceeded\n';
    code += '  MetricsCollector -> AlertManager : Send Alert\n';
    code += 'end\n';
    code += `${this.syntax.end_block}\n\n`;
    return code;
  }

  /**
   * アクタースタイル決定
   * @param {string} actor - アクター名
   * @returns {string} PlantUMLスタイル
   */
  determineActorStyle(actor) {
    if (actor.includes('ユーザー') || actor.includes('顧客')) {
      return this.styles.participant.actor;
    } else if (actor.includes('データベース') || actor.includes('DB')) {
      return this.styles.participant.database;
    } else if (actor.includes('API') || actor.includes('サービス')) {
      return this.styles.participant.control;
    } else if (actor.includes('システム') || actor.includes('サーバー')) {
      return this.styles.participant.entity;
    } else {
      return this.syntax.participant;
    }
  }

  /**
   * サービススタイル取得
   * @param {string} category - サービスカテゴリ
   * @returns {string} PlantUMLスタイル
   */
  getServiceStyle(category) {
    const styleMap = {
      external: this.styles.participant.boundary,
      api: this.styles.participant.control,
      database: this.styles.participant.database,
      messaging: this.styles.participant.queue
    };
    return styleMap[category] || this.syntax.participant;
  }

  /**
   * ID サニタイズ
   * @param {string} name - 名前
   * @returns {string} サニタイズされたID
   */
  sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/^(\d)/, '_$1');
  }

  /**
   * コードバリデーション
   * @param {string} plantUMLCode - PlantUMLコード
   * @returns {Object} バリデーション結果
   */
  validatePlantUMLCode(plantUMLCode) {
    const errors = [];
    const warnings = [];
    const lines = plantUMLCode.split('\n');
    
    // 基本構造チェック
    if (!plantUMLCode.includes('@startuml')) {
      errors.push('Missing @startuml directive');
    }
    if (!plantUMLCode.includes('@enduml')) {
      errors.push('Missing @enduml directive');
    }
    
    // 構文チェック
    let inBlock = false;
    let blockStack = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // ブロック構造チェック
      if (trimmed.startsWith('alt') || trimmed.startsWith('loop') || 
          trimmed.startsWith('par') || trimmed.startsWith('group')) {
        blockStack.push({ type: trimmed.split(' ')[0], line: index + 1 });
      } else if (trimmed === 'end') {
        if (blockStack.length === 0) {
          errors.push(`Unexpected 'end' at line ${index + 1}`);
        } else {
          blockStack.pop();
        }
      }
      
      // 矢印構文チェック
      if (trimmed.includes('->') || trimmed.includes('->>') || trimmed.includes('-->')) {
        const arrowMatch = trimmed.match(/(.+?)\s*(->|->|-->|-->>)\s*(.+?)\s*:\s*(.+)/);
        if (!arrowMatch) {
          warnings.push(`Potentially malformed message at line ${index + 1}`);
        }
      }
    });
    
    // 未閉鎖ブロックチェック
    if (blockStack.length > 0) {
      blockStack.forEach(block => {
        errors.push(`Unclosed '${block.type}' block started at line ${block.line}`);
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      lineCount: lines.length,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * コードパース
   * @param {string} plantUMLCode - PlantUMLコード
   * @returns {Object} パース結果
   */
  parsePlantUMLCode(plantUMLCode) {
    const result = {
      title: null,
      participants: [],
      messages: [],
      blocks: [],
      metadata: {}
    };
    
    const lines = plantUMLCode.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // タイトル抽出
      if (trimmed.startsWith('title ')) {
        result.title = trimmed.substring(6);
      }
      
      // 参加者抽出
      const participantMatch = trimmed.match(/^(participant|actor|boundary|control|entity|database|collections|queue)\s+"([^"]+)"\s+as\s+(\w+)/);
      if (participantMatch) {
        result.participants.push({
          type: participantMatch[1],
          name: participantMatch[2],
          id: participantMatch[3]
        });
      }
      
      // メッセージ抽出
      const messageMatch = trimmed.match(/(.+?)\s*(->|-->|->|-->>)\s*(.+?)\s*:\s*(.+)/);
      if (messageMatch) {
        result.messages.push({
          from: messageMatch[1].trim(),
          arrow: messageMatch[2],
          to: messageMatch[3].trim(),
          message: messageMatch[4].trim(),
          lineNumber: index + 1
        });
      }
      
      // ブロック抽出
      if (trimmed.startsWith('alt ') || trimmed.startsWith('loop ') || 
          trimmed.startsWith('par ') || trimmed.startsWith('group ')) {
        const blockType = trimmed.split(' ')[0];
        const blockContent = trimmed.substring(blockType.length + 1);
        result.blocks.push({
          type: blockType,
          content: blockContent,
          startLine: index + 1
        });
      }
    });
    
    result.metadata = {
      totalLines: lines.length,
      participantCount: result.participants.length,
      messageCount: result.messages.length,
      blockCount: result.blocks.length,
      parsedAt: new Date().toISOString()
    };
    
    return result;
  }

  /**
   * テストデータ用コード生成
   * @param {string} testType - テストタイプ
   * @param {Object} options - オプション
   * @returns {Array} テストコード配列
   */
  generateTestCodes(testType, options = {}) {
    const { count = 5, complexity = 'standard' } = options;
    const testCodes = [];
    
    for (let i = 0; i < count; i++) {
      let code;
      
      switch (testType) {
        case 'validation':
          code = this.generateValidationTestCode(i);
          break;
        case 'performance':
          code = this.generatePerformanceTestCode(complexity);
          break;
        case 'japanese':
          code = this.generateJapaneseTestCode();
          break;
        default:
          code = this.generateSimpleCode({ title: `テストコード ${i + 1}` });
      }
      
      testCodes.push({
        id: `test_${testType}_${i + 1}`,
        code,
        metadata: {
          testType,
          complexity,
          generatedAt: new Date().toISOString()
        }
      });
    }
    
    return testCodes;
  }

  /**
   * バリデーションテスト用コード生成
   * @param {number} index - インデックス
   * @returns {string} テストコード
   */
  generateValidationTestCode(index) {
    const testCases = [
      // 正常ケース
      '@startuml\ntitle 正常テスト\nA -> B : メッセージ\n@enduml',
      // 未閉鎖ブロック
      '@startuml\nalt 条件\nA -> B : メッセージ\n@enduml',
      // 不正な矢印
      '@startuml\nA => B : 不正な矢印\n@enduml',
      // 日本語含有
      '@startuml\ntitle 日本語テスト\nユーザー -> システム : 処理要求\n@enduml',
      // 複雑な構造
      '@startuml\nalt 条件1\n  A -> B : メッセージ1\nelse\n  A -> C : メッセージ2\nend\n@enduml'
    ];
    
    return testCases[index % testCases.length];
  }

  /**
   * パフォーマンステスト用コード生成
   * @param {string} complexity - 複雑さ
   * @returns {string} テストコード
   */
  generatePerformanceTestCode(complexity) {
    const template = this.templates[complexity] || this.templates.standard;
    const participantCount = template.maxParticipants;
    const messageCount = template.maxMessages;
    
    let code = '@startuml\n';
    code += 'title パフォーマンステスト\n\n';
    
    // 参加者生成
    for (let i = 0; i < participantCount; i++) {
      code += `participant "参加者${i + 1}" as P${i + 1}\n`;
    }
    code += '\n';
    
    // メッセージ生成
    for (let i = 0; i < messageCount; i++) {
      const from = `P${(i % participantCount) + 1}`;
      const to = `P${((i + 1) % participantCount) + 1}`;
      code += `${from} -> ${to} : メッセージ${i + 1}\n`;
    }
    
    code += '\n@enduml';
    return code;
  }

  /**
   * 日本語テスト用コード生成
   * @returns {string} 日本語テストコード
   */
  generateJapaneseTestCode() {
    return `@startuml
title 日本語シーケンス図テスト

participant "ユーザー" as User
participant "Webアプリケーション" as WebApp
participant "データベース" as DB

User -> WebApp : ログイン要求（ユーザーID、パスワード）
note right : 認証情報を送信

WebApp -> DB : ユーザー情報確認
DB -> WebApp : 認証結果
note left : 認証成功の場合

alt 認証成功
    WebApp -> User : ログイン成功
    note over User, WebApp : セッション開始
else 認証失敗
    WebApp -> User : ログイン失敗
    note right : エラーメッセージ表示
end

@enduml`;
  }

  /**
   * ファクトリー統計情報取得
   * @returns {Object} 統計情報
   */
  getFactoryStats() {
    return {
      supportedArrowTypes: Object.keys(this.arrowMappings).length,
      supportedStyles: Object.keys(this.styles.participant).length,
      availableThemes: Object.keys(this.styles.themes).length,
      templateComplexities: Object.keys(this.templates).length,
      syntaxElements: Object.keys(this.syntax).length,
      lastGenerated: new Date().toISOString()
    };
  }
}

export default PlantUMLCodeFactory;