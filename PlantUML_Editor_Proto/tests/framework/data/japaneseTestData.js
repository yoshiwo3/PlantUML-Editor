/**
 * Japanese Test Data
 * Sprint3 TEST-005-5: テストデータ管理実装
 * 
 * 機能:
 * - 日本語テストデータの集約
 * - IME入力テストパターン
 * - 文字エンコーディングテスト
 * - ビジネス用語テストセット
 */

export const japaneseTestData = {
  // 基本文字種別テストデータ
  characterTypes: {
    hiragana: [
      'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
      'はひふへほ', 'まみむめも', 'やゆよ', 'らりるれろ', 'わをん',
      'がぎぐげご', 'ざじずぜぞ', 'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ'
    ],
    katakana: [
      'アイウエオ', 'カキクケコ', 'サシスセソ', 'タチツテト', 'ナニヌネノ',
      'ハヒフヘホ', 'マミムメモ', 'ヤユヨ', 'ラリルレロ', 'ワヲン',
      'ガギグゲゴ', 'ザジズゼゾ', 'ダヂヅデド', 'バビブベボ', 'パピプペポ'
    ],
    kanji: [
      '一二三四五', '東西南北中', '金木水火土', '山川海空風',
      '学校会社病院', '電話番号住所', '時間分秒日月年', '大小高低新古'
    ],
    mixed: [
      'ユーザー認証', 'データベース接続', 'システム管理者', 'プロジェクト管理',
      'Webアプリケーション', 'APIサーバー', 'セキュリティ設定', 'バックアップ処理'
    ]
  },

  // ビジネス専門用語
  businessTerms: {
    it: [
      'クラウドコンピューティング', 'マイクロサービス', 'DevOps', 'CI/CD',
      'レスポンシブデザイン', 'アジャイル開発', 'スクラム', 'カンバン',
      'Infrastructure as Code', 'サーバーレス', 'コンテナ化', 'オーケストレーション'
    ],
    business: [
      '売上高営業利益率', '顧客満足度', 'KPI', 'ROI', 'PDCA',
      '品質管理', 'コスト削減', '業務効率化', 'デジタルトランスフォーメーション',
      'ステークホルダー', 'コーポレートガバナンス', 'コンプライアンス'
    ],
    finance: [
      '損益計算書', '貸借対照表', 'キャッシュフロー', '減価償却',
      '売掛金', '買掛金', '流動資産', '固定資産', '自己資本比率',
      '投資利回り', 'リスク管理', 'ポートフォリオ'
    ]
  },

  // アクター名（業界別）
  actors: {
    general: [
      'ユーザー', 'システム', 'データベース', '管理者', 'ゲスト',
      'API', 'サーバー', 'クライアント', 'ブラウザ', 'アプリケーション'
    ],
    business: [
      '営業担当者', '経理部', '人事部', '総務部', '企画部',
      '取締役', 'プロジェクトマネージャー', 'チームリーダー', '顧客', 'パートナー企業'
    ],
    manufacturing: [
      '製造ライン', '品質管理部', '物流部門', '調達部門', '設計部',
      '工場長', '作業員', '検査員', '保守要員', '安全管理者'
    ],
    healthcare: [
      '患者', '医師', '看護師', '薬剤師', '受付',
      '検査技師', '放射線技師', '理学療法士', '栄養士', '事務員'
    ],
    education: [
      '学生', '教師', '教授', '事務職員', '保護者',
      '図書館司書', 'IT管理者', '研究員', '学部長', '理事長'
    ]
  },

  // メッセージパターン（業務別）
  messages: {
    authentication: [
      'ログイン要求', 'パスワード確認', '二段階認証', 'トークン発行',
      'セッション開始', 'ログアウト処理', '権限確認', 'アクセス許可'
    ],
    data_operations: [
      'データ取得要求', 'データ更新', 'データ削除', 'データ検索',
      'データ検証', 'データ同期', 'バックアップ作成', 'データ復元'
    ],
    business_process: [
      '申請受付', '承認依頼', '決裁完了', '処理実行',
      '進捗報告', 'ステータス更新', '完了通知', '結果確認'
    ],
    communication: [
      'メール送信', 'SMS通知', 'プッシュ通知', 'アラート発信',
      '報告書提出', '会議招集', '資料共有', '確認依頼'
    ],
    ecommerce: [
      '商品検索', 'カート追加', '注文確定', '決済処理',
      '在庫確認', '配送手配', '受注確認', '発送通知'
    ],
    manufacturing: [
      '生産計画', '製造指示', '品質検査', '完成報告',
      '在庫管理', '出荷準備', '保守点検', '安全確認'
    ]
  },

  // 条件分岐パターン
  conditions: [
    '認証が成功した場合', '権限が確認された場合', 'データ形式が正常な場合',
    '在庫が十分な場合', '予算範囲内の場合', '承認が完了した場合',
    '営業時間内の場合', 'システムが稼働中の場合', 'ネットワーク接続が正常な場合',
    'メンテナンス時間外の場合', '緊急度が高い場合', '優先度が高い場合'
  ],

  // エラーメッセージ
  errorMessages: [
    '認証に失敗しました', 'データが見つかりません', 'システムエラーが発生しました',
    '権限がありません', 'タイムアウトしました', 'ネットワークエラー',
    'データ形式が正しくありません', '処理中にエラーが発生しました',
    'サーバーが応答しません', '容量が不足しています'
  ],

  // 成功メッセージ
  successMessages: [
    '処理が完了しました', 'ログインしました', 'データを保存しました',
    '送信が完了しました', '更新しました', '削除しました',
    'バックアップを作成しました', '同期が完了しました',
    '承認されました', '設定を変更しました'
  ],

  // 特殊文字・記号テスト
  specialCharacters: {
    punctuation: ['。', '、', '！', '？', '：', '；', '「', '」', '『', '』'],
    symbols: ['※', '○', '●', '□', '■', '△', '▲', '◇', '◆', '★'],
    brackets: ['（', '）', '【', '】', '〈', '〉', '［', '］', '｛', '｝'],
    math: ['＋', '－', '×', '÷', '＝', '≠', '≒', '≦', '≧', '∞'],
    units: ['円', '個', '本', '台', '人', '件', '回', '度', '％', '時間']
  },

  // IME入力シミュレーションパターン
  imePatterns: [
    {
      input: 'shisutemukanrisha',
      stages: ['しすてむかんりしゃ', 'システムかんりしゃ', 'システム管理者'],
      final: 'システム管理者'
    },
    {
      input: 'de-tabe-susetten',
      stages: ['でーたべーすせってん', 'データベースせってん', 'データベース設定'],
      final: 'データベース設定'
    },
    {
      input: 'yu-za-ninnshou',
      stages: ['ゆーざーにんしょう', 'ユーザーにんしょう', 'ユーザー認証'],
      final: 'ユーザー認証'
    },
    {
      input: 'purojekutomanejyaa',
      stages: ['ぷろじぇくとまねじゃー', 'プロジェクトまねじゃー', 'プロジェクトマネージャー'],
      final: 'プロジェクトマネージャー'
    }
  ],

  // 長文テストデータ
  longTexts: [
    'この処理では、まずユーザーの認証情報を確認し、権限レベルをチェックした後、要求されたデータにアクセスします。',
    'システムの設定変更を行う際は、必ず管理者権限での認証が必要となり、変更内容はログに記録されます。',
    'データベースへの接続が確立されると、トランザクション処理が開始され、すべての操作が正常に完了するまで継続されます。',
    'エラーが発生した場合は、システムは自動的にロールバック処理を実行し、データの整合性を保持します。'
  ],

  // 複雑な日本語テストケース
  complexCases: [
    {
      name: '敬語混在テスト',
      data: ['いたします', 'させていただきます', 'お送りします', 'ご確認ください']
    },
    {
      name: '業界専門用語',
      data: ['レスポンシブWebデザイン', 'RESTful API', 'NoSQLデータベース', 'CI/CDパイプライン']
    },
    {
      name: '数値・単位混在',
      data: ['1,000件のデータ', '99.9%の稼働率', '24時間365日', '約3.14秒']
    },
    {
      name: 'カッコ・記号混在',
      data: ['処理結果（成功）', 'エラーコード[E001]', 'バージョン{v2.1.0}', '完了※確認済み']
    }
  ],

  // 文字エンコーディングテスト
  encodingTests: [
    {
      name: 'UTF-8基本',
      text: 'こんにちは世界',
      bytes: 'E38193E38293E381ABE381A1E381AFE4B896E7958C'
    },
    {
      name: '絵文字混在',
      text: 'テスト🚀データ📊',
      description: '絵文字を含む日本語テキスト'
    },
    {
      name: '外字・拡張文字',
      text: '髙橋、﨑田、栁沢',
      description: '人名用漢字・拡張漢字'
    }
  ],

  // パフォーマンステスト用データ
  performanceData: {
    shortTexts: Array.from({ length: 100 }, (_, i) => `テスト${i + 1}`),
    mediumTexts: Array.from({ length: 50 }, (_, i) => `中程度のテストデータ${i + 1}番目の項目です`),
    longTexts: Array.from({ length: 10 }, (_, i) => 
      `これは長いテストデータの${i + 1}番目の項目で、日本語の様々な文字種を含んでいます。ひらがな、カタカナ、漢字、記号、数字（123）などが混在しています。`
    )
  },

  // バリデーションテスト用無効データ
  invalidData: {
    emptyStrings: ['', '   ', '\t', '\n'],
    controlCharacters: ['\u0001', '\u0002', '\u0003', '\u0004'],
    extremelyLong: 'あ'.repeat(10000),
    malformedUnicode: ['\\uFFFE', '\\uFFFF', '\\uD800'],
    sqlInjection: ['\'; DROP TABLE users; --', '\' OR \'1\'=\'1'],
    xssAttempts: ['<script>alert("XSS")</script>', 'javascript:alert("XSS")']
  },

  // 地域・方言テストデータ
  regionalData: {
    kansai: ['おおきに', 'あかん', 'なんぼ', 'はんなり'],
    tohoku: ['だっぺ', 'んだ', 'ずら', 'べ'],
    kyushu: ['ばい', 'たい', 'けん', 'ちゃ'],
    okinawa: ['ちゅら', 'めんそーれ', 'ちゃー', 'はいさい']
  }
};

// 日本語テストデータのヘルパー関数
export const japaneseTestHelpers = {
  /**
   * ランダムな日本語文字列生成
   * @param {string} type - 文字種別
   * @param {number} length - 長さ
   * @returns {string} 生成された文字列
   */
  generateRandomString(type = 'mixed', length = 10) {
    const chars = japaneseTestData.characterTypes[type] || japaneseTestData.characterTypes.mixed;
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      result += randomChar[Math.floor(Math.random() * randomChar.length)];
    }
    return result;
  },

  /**
   * ランダムアクター選択
   * @param {string} category - カテゴリ
   * @returns {string} アクター名
   */
  getRandomActor(category = 'general') {
    const actors = japaneseTestData.actors[category] || japaneseTestData.actors.general;
    return actors[Math.floor(Math.random() * actors.length)];
  },

  /**
   * ランダムメッセージ選択
   * @param {string} type - メッセージタイプ
   * @returns {string} メッセージ
   */
  getRandomMessage(type = 'data_operations') {
    const messages = japaneseTestData.messages[type] || japaneseTestData.messages.data_operations;
    return messages[Math.floor(Math.random() * messages.length)];
  },

  /**
   * IME入力シミュレーション
   * @param {string} romajiInput - ローマ字入力
   * @returns {Object} IME変換結果
   */
  simulateIMEInput(romajiInput) {
    const pattern = japaneseTestData.imePatterns.find(p => p.input === romajiInput);
    if (pattern) {
      return {
        input: romajiInput,
        stages: pattern.stages,
        final: pattern.final,
        success: true
      };
    }
    
    // パターンが見つからない場合のフォールバック
    return {
      input: romajiInput,
      stages: [romajiInput],
      final: romajiInput,
      success: false
    };
  },

  /**
   * 文字種別判定
   * @param {string} text - 判定するテキスト
   * @returns {Object} 文字種別情報
   */
  analyzeCharacterTypes(text) {
    const analysis = {
      hiragana: 0,
      katakana: 0,
      kanji: 0,
      ascii: 0,
      symbols: 0,
      total: text.length
    };

    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code >= 0x3040 && code <= 0x309F) {
        analysis.hiragana++;
      } else if (code >= 0x30A0 && code <= 0x30FF) {
        analysis.katakana++;
      } else if (code >= 0x4E00 && code <= 0x9FAF) {
        analysis.kanji++;
      } else if (code < 0x80) {
        analysis.ascii++;
      } else {
        analysis.symbols++;
      }
    }

    return analysis;
  },

  /**
   * テストデータバリデーション
   * @param {string} text - テストするテキスト
   * @returns {Object} バリデーション結果
   */
  validateJapaneseText(text) {
    const errors = [];
    const warnings = [];

    if (!text || text.trim().length === 0) {
      errors.push('テキストが空です');
    }

    if (text.length > 1000) {
      warnings.push('テキストが長すぎます（1000文字以上）');
    }

    // 制御文字チェック
    if (/[\u0000-\u001F\u007F-\u009F]/.test(text)) {
      warnings.push('制御文字が含まれています');
    }

    // SQLインジェクションチェック
    if (/('|(\\')|(;)|(\|)|(\*)|(%)|(<|>)|(\+)|(\||=)/.test(text)) {
      warnings.push('SQLインジェクションの可能性があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      analysis: this.analyzeCharacterTypes(text)
    };
  }
};

export default japaneseTestData;