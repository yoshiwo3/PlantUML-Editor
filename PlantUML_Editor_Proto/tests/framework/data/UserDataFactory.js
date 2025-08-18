/**
 * UserDataFactory - ユーザーデータファクトリー
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - ユーザー情報の生成
 * - 日本語ペルソナデータ
 * - ユーザージャーニーテストデータ
 * - 権限・ロールパターン
 */

export class UserDataFactory {
  constructor() {
    // 日本語ユーザーペルソナ
    this.japanesePersonas = [
      {
        id: 'persona_developer_01',
        name: '田中太郎',
        role: 'システム開発者',
        experience: 'senior',
        department: 'IT開発部',
        skills: ['Java', 'JavaScript', 'PlantUML', 'システム設計'],
        preferences: {
          language: 'ja',
          theme: 'dark',
          shortcuts: 'enabled'
        }
      },
      {
        id: 'persona_analyst_01',
        name: '佐藤花子',
        role: 'システムアナリスト',
        experience: 'intermediate',
        department: '企画開発室',
        skills: ['要件定義', 'UML', 'プロセス設計', 'ドキュメント作成'],
        preferences: {
          language: 'ja',
          theme: 'light',
          shortcuts: 'disabled'
        }
      },
      {
        id: 'persona_manager_01',
        name: '鈴木一郎',
        role: 'プロジェクトマネージャー',
        experience: 'expert',
        department: 'プロジェクト推進室',
        skills: ['プロジェクト管理', '進捗管理', 'リスク分析', 'レポート作成'],
        preferences: {
          language: 'ja',
          theme: 'light',
          shortcuts: 'partial'
        }
      },
      {
        id: 'persona_newcomer_01',
        name: '山田次郎',
        role: '新人エンジニア',
        experience: 'beginner',
        department: 'IT開発部',
        skills: ['基本プログラミング', '学習意欲'],
        preferences: {
          language: 'ja',
          theme: 'light',
          shortcuts: 'learning'
        }
      }
    ];

    // 権限・ロールパターン
    this.rolePatterns = {
      admin: {
        permissions: ['create', 'read', 'update', 'delete', 'export', 'import', 'manage_users'],
        restrictions: [],
        features: ['all']
      },
      editor: {
        permissions: ['create', 'read', 'update', 'export'],
        restrictions: ['delete', 'import', 'manage_users'],
        features: ['editor', 'preview', 'save']
      },
      viewer: {
        permissions: ['read'],
        restrictions: ['create', 'update', 'delete', 'export', 'import', 'manage_users'],
        features: ['preview', 'view']
      },
      guest: {
        permissions: ['read'],
        restrictions: ['create', 'update', 'delete', 'export', 'import', 'manage_users', 'save'],
        features: ['preview']
      }
    };

    // 使用パターン
    this.usagePatterns = {
      first_time_user: {
        scenario: '初回利用ユーザー',
        flow: ['landing', 'tutorial', 'basic_diagram', 'save'],
        expected_time: 1800, // 30分
        help_usage: 'high',
        error_tolerance: 'low'
      },
      power_user: {
        scenario: 'パワーユーザー',
        flow: ['direct_edit', 'complex_diagram', 'advanced_features', 'export'],
        expected_time: 300, // 5分
        help_usage: 'none',
        error_tolerance: 'high'
      },
      occasional_user: {
        scenario: '時々利用ユーザー',
        flow: ['review_ui', 'simple_diagram', 'preview', 'save'],
        expected_time: 900, // 15分
        help_usage: 'medium',
        error_tolerance: 'medium'
      }
    };
  }

  /**
   * ランダムユーザーデータ生成
   * @param {Object} options - 生成オプション
   * @returns {Object} ユーザーデータ
   */
  generateRandomUser(options = {}) {
    const {
      persona = null,
      role = null,
      experience = null,
      includePreferences = true,
      includeUsagePattern = true
    } = options;

    // ペルソナベースまたはランダム選択
    let basePersona;
    if (persona) {
      basePersona = this.japanesePersonas.find(p => p.id === persona) || this.japanesePersonas[0];
    } else {
      basePersona = this.japanesePersonas[Math.floor(Math.random() * this.japanesePersonas.length)];
    }

    const userData = {
      id: this.generateUserId(),
      ...basePersona,
      sessionId: this.generateSessionId(),
      timestamp: new Date().toISOString()
    };

    // ロール上書き
    if (role) {
      userData.role = role;
      userData.permissions = this.rolePatterns[role] || this.rolePatterns.viewer;
    }

    // 経験レベル上書き
    if (experience) {
      userData.experience = experience;
    }

    // 使用パターン追加
    if (includeUsagePattern) {
      const patternKeys = Object.keys(this.usagePatterns);
      const pattern = this.usagePatterns[patternKeys[Math.floor(Math.random() * patternKeys.length)]];
      userData.usagePattern = pattern;
    }

    return userData;
  }

  /**
   * 特定ペルソナのユーザーデータ取得
   * @param {string} personaId - ペルソナID
   * @returns {Object} ユーザーデータ
   */
  getPersonaUser(personaId) {
    const persona = this.japanesePersonas.find(p => p.id === personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    return {
      ...persona,
      sessionId: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      permissions: this.getRolePermissions(persona.role)
    };
  }

  /**
   * ユーザージャーニーテストデータ生成
   * @param {string} journeyType - ジャーニータイプ
   * @returns {Object} ジャーニーデータ
   */
  generateUserJourney(journeyType) {
    const journeys = {
      first_time: {
        user: this.generateRandomUser({ experience: 'beginner' }),
        steps: [
          { action: 'visit_site', duration: 30, help_needed: false },
          { action: 'explore_interface', duration: 120, help_needed: true },
          { action: 'read_tutorial', duration: 300, help_needed: false },
          { action: 'create_first_diagram', duration: 600, help_needed: true },
          { action: 'preview_diagram', duration: 60, help_needed: false },
          { action: 'save_diagram', duration: 90, help_needed: true },
          { action: 'export_diagram', duration: 120, help_needed: true }
        ],
        success_criteria: {
          completion_rate: 0.8,
          satisfaction_score: 7,
          help_usage_count: 4
        }
      },
      power_user: {
        user: this.generateRandomUser({ experience: 'expert' }),
        steps: [
          { action: 'direct_edit', duration: 15, help_needed: false },
          { action: 'create_complex_diagram', duration: 180, help_needed: false },
          { action: 'use_advanced_features', duration: 120, help_needed: false },
          { action: 'bulk_operations', duration: 60, help_needed: false },
          { action: 'export_multiple_formats', duration: 45, help_needed: false }
        ],
        success_criteria: {
          completion_rate: 0.95,
          satisfaction_score: 9,
          help_usage_count: 0
        }
      },
      collaborative: {
        users: [
          this.generateRandomUser({ role: 'システム開発者' }),
          this.generateRandomUser({ role: 'システムアナリスト' }),
          this.generateRandomUser({ role: 'プロジェクトマネージャー' })
        ],
        steps: [
          { action: 'share_diagram', duration: 30, participants: 'all' },
          { action: 'collaborative_edit', duration: 300, participants: 'developer,analyst' },
          { action: 'review_changes', duration: 120, participants: 'manager' },
          { action: 'approve_diagram', duration: 60, participants: 'manager' },
          { action: 'finalize_export', duration: 90, participants: 'developer' }
        ],
        success_criteria: {
          completion_rate: 0.9,
          satisfaction_score: 8,
          collaboration_score: 8
        }
      }
    };

    const journey = journeys[journeyType];
    if (!journey) {
      throw new Error(`Journey type not found: ${journeyType}`);
    }

    return {
      ...journey,
      id: this.generateJourneyId(),
      type: journeyType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ロール別権限取得
   * @param {string} role - ロール名
   * @returns {Object} 権限情報
   */
  getRolePermissions(role) {
    // ロール名から権限パターンをマッピング
    const roleMapping = {
      'システム開発者': 'editor',
      'システムアナリスト': 'editor',
      'プロジェクトマネージャー': 'admin',
      '新人エンジニア': 'viewer'
    };

    const permissionKey = roleMapping[role] || 'guest';
    return this.rolePatterns[permissionKey];
  }

  /**
   * 一括ユーザーデータ生成
   * @param {number} count - 生成数
   * @param {Object} options - 生成オプション
   * @returns {Array} ユーザーデータ配列
   */
  generateBulkUsers(count, options = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(this.generateRandomUser(options));
    }
    return users;
  }

  /**
   * テストシナリオ用ユーザーセット生成
   * @param {string} scenario - シナリオ名
   * @returns {Array} ユーザーセット
   */
  generateScenarioUsers(scenario) {
    const scenarios = {
      accessibility_test: [
        this.generateRandomUser({ persona: 'persona_newcomer_01' }),
        this.generateRandomUser({ experience: 'senior' })
      ],
      performance_test: [
        this.generateRandomUser({ experience: 'expert' })
      ],
      security_test: [
        this.generateRandomUser({ role: 'admin' }),
        this.generateRandomUser({ role: 'guest' })
      ],
      usability_test: this.japanesePersonas.map(persona => 
        this.generateRandomUser({ persona: persona.id })
      )
    };

    return scenarios[scenario] || [];
  }

  /**
   * A/Bテスト用ユーザー分割
   * @param {Array} users - ユーザー配列
   * @param {number} splitRatio - 分割比率 (0.5 = 50/50)
   * @returns {Object} A/Bグループ
   */
  splitUsersForABTest(users, splitRatio = 0.5) {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * splitRatio);
    
    return {
      groupA: shuffled.slice(0, splitIndex),
      groupB: shuffled.slice(splitIndex),
      metadata: {
        totalUsers: users.length,
        groupASize: splitIndex,
        groupBSize: shuffled.length - splitIndex,
        splitRatio,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * ユーザーID生成
   * @returns {string} ユーザーID
   */
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * セッションID生成
   * @returns {string} セッションID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * ジャーニーID生成
   * @returns {string} ジャーニーID
   */
  generateJourneyId() {
    return `journey_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * ユーザーデータ検証
   * @param {Object} userData - ユーザーデータ
   * @returns {Object} 検証結果
   */
  validateUserData(userData) {
    const required = ['id', 'name', 'role', 'experience'];
    const missing = required.filter(field => !userData[field]);
    
    return {
      isValid: missing.length === 0,
      missingFields: missing,
      warnings: this.getValidationWarnings(userData)
    };
  }

  /**
   * バリデーション警告取得
   * @param {Object} userData - ユーザーデータ
   * @returns {Array} 警告配列
   */
  getValidationWarnings(userData) {
    const warnings = [];
    
    if (!userData.preferences) {
      warnings.push('User preferences not set');
    }
    
    if (!userData.permissions) {
      warnings.push('User permissions not defined');
    }
    
    if (userData.experience === 'beginner' && !userData.usagePattern) {
      warnings.push('Beginner user should have usage pattern defined');
    }
    
    return warnings;
  }

  /**
   * ファクトリー統計情報取得
   * @returns {Object} 統計情報
   */
  getFactoryStats() {
    return {
      availablePersonas: this.japanesePersonas.length,
      availableRoles: Object.keys(this.rolePatterns).length,
      availableUsagePatterns: Object.keys(this.usagePatterns).length,
      supportedJourneys: ['first_time', 'power_user', 'collaborative'],
      lastGenerated: new Date().toISOString()
    };
  }
}

export default UserDataFactory;