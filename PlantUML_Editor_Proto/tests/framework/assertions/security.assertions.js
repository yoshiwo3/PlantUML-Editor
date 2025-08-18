/**
 * セキュリティカスタムアサーション
 * 
 * XSS、CSP、SQLインジェクション、コマンドインジェクション、セキュリティヘッダーの包括的検証
 * OWASP Top 10に準拠したセキュリティテストユーティリティ
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

/**
 * XSS攻撃パターン定義
 */
const XSS_PATTERNS = {
    // スクリプトタグ
    SCRIPT_TAG: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    SCRIPT_TAG_SIMPLE: /<script[^>]*>.*?<\/script>/gi,
    
    // イベントハンドラー
    EVENT_HANDLERS: /on\w+\s*=\s*["'][^"']*["']/gi,
    EVENT_HANDLERS_UNQUOTED: /on\w+\s*=\s*[^>\s]+/gi,
    
    // JavaScript プロトコル
    JAVASCRIPT_PROTOCOL: /javascript\s*:/gi,
    
    // データ URI
    DATA_URI_SCRIPT: /data\s*:\s*[^,]*script/gi,
    
    // HTML エンティティエンコーディング回避
    ENCODED_SCRIPT: /&lt;script/gi,
    UNICODE_BYPASS: /\\u[0-9a-f]{4}/gi,
    
    // 危険なHTML要素
    DANGEROUS_TAGS: /<(iframe|object|embed|applet|form|meta|link|base)[^>]*>/gi,
    
    // CSS式
    CSS_EXPRESSION: /expression\s*\(/gi,
    CSS_JAVASCRIPT: /-moz-binding|behavior\s*:/gi,
    
    // 属性インジェクション
    ATTRIBUTE_INJECTION: /["\'][\s]*javascript\s*:/gi,
    
    // SVG XSS
    SVG_SCRIPT: /<svg[^>]*>.*?<script.*?<\/script>.*?<\/svg>/gi
};

/**
 * SQLインジェクションパターン定義
 */
const SQL_INJECTION_PATTERNS = {
    // 基本的なSQLキーワード
    UNION_SELECT: /union\s+select/gi,
    OR_INJECTION: /(\s|^)(or\s+1\s*=\s*1|or\s+true)/gi,
    AND_INJECTION: /(\s|^)(and\s+1\s*=\s*1|and\s+true)/gi,
    
    // SQLコメント
    SQL_COMMENTS: /(--|\/\*|\*\/|#)/g,
    
    // SQLメタ文字
    SINGLE_QUOTE: /'/g,
    DOUBLE_QUOTE: /"/g,
    SEMICOLON: /;/g,
    
    // 時間ベース攻撃
    TIME_BASED: /(waitfor\s+delay|sleep\s*\(|benchmark\s*\()/gi,
    
    // 情報収集
    INFORMATION_SCHEMA: /information_schema/gi,
    VERSION_FUNCTIONS: /(@@version|version\(\)|user\(\)|database\(\))/gi,
    
    // 危険な関数
    DANGEROUS_FUNCTIONS: /(exec|sp_executesql|xp_cmdshell|load_file|into\s+outfile)/gi
};

/**
 * コマンドインジェクションパターン定義
 */
const COMMAND_INJECTION_PATTERNS = {
    // シェルメタ文字
    SHELL_METACHAR: /[;&|`$(){}]/g,
    
    // パス操作
    PATH_TRAVERSAL: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/gi,
    
    // システムコマンド
    SYSTEM_COMMANDS: /(ls|dir|cat|type|echo|whoami|id|ps|netstat)/gi,
    
    // 危険なコマンド
    DANGEROUS_COMMANDS: /(rm|del|format|shutdown|reboot|passwd)/gi,
    
    // 環境変数
    ENV_VARIABLES: /\$\w+|%\w+%/g
};

/**
 * CSPディレクティブ定義
 */
const CSP_DIRECTIVES = {
    REQUIRED: [
        'default-src',
        'script-src',
        'style-src',
        'img-src'
    ],
    RECOMMENDED: [
        'connect-src',
        'font-src',
        'frame-src',
        'media-src',
        'object-src'
    ],
    SECURITY: [
        'base-uri',
        'form-action',
        'frame-ancestors',
        'upgrade-insecure-requests'
    ]
};

/**
 * セキュリティヘッダー定義
 */
const SECURITY_HEADERS = {
    REQUIRED: {
        'Content-Security-Policy': {
            present: true,
            pattern: /default-src|script-src/i
        },
        'X-Content-Type-Options': {
            present: true,
            value: 'nosniff'
        },
        'X-Frame-Options': {
            present: true,
            values: ['DENY', 'SAMEORIGIN']
        },
        'X-XSS-Protection': {
            present: true,
            value: '1; mode=block'
        }
    },
    RECOMMENDED: {
        'Strict-Transport-Security': {
            present: true,
            pattern: /max-age=\d+/
        },
        'Referrer-Policy': {
            present: true,
            values: ['no-referrer', 'strict-origin-when-cross-origin', 'same-origin']
        },
        'Permissions-Policy': {
            present: true,
            pattern: /camera|microphone|geolocation/
        }
    }
};

/**
 * 危険な文字列パターン
 */
const DANGEROUS_PATTERNS = {
    // プロトコルハンドラー
    DANGEROUS_PROTOCOLS: /(javascript|data|vbscript|livescript|mocha):/gi,
    
    // ファイルパス
    ABSOLUTE_PATHS: /^(\/|\\|[a-z]:\\)/i,
    
    // URL
    SUSPICIOUS_URLS: /(localhost|127\.0\.0\.1|0\.0\.0\.0|file:\/\/)/gi,
    
    // バイナリデータ
    NULL_BYTES: /\x00/g,
    
    // 制御文字
    CONTROL_CHARS: /[\x00-\x1f\x7f-\x9f]/g
};

/**
 * XSSセキュリティ検証
 * @param {string} input - 検証対象の入力
 * @returns {Object} 検証結果
 */
function validateXSSSecurity(input) {
    if (!input || typeof input !== 'string') {
        return { secure: true, threats: [], message: '入力が空またはnullです' };
    }
    
    const threats = [];
    
    // スクリプトタグの検出
    if (XSS_PATTERNS.SCRIPT_TAG.test(input)) {
        threats.push('スクリプトタグが検出されました');
    }
    
    // イベントハンドラーの検出
    if (XSS_PATTERNS.EVENT_HANDLERS.test(input)) {
        threats.push('危険なイベントハンドラーが検出されました');
    }
    
    // JavaScriptプロトコルの検出
    if (XSS_PATTERNS.JAVASCRIPT_PROTOCOL.test(input)) {
        threats.push('JavaScriptプロトコルが検出されました');
    }
    
    // 危険なHTMLタグの検出
    if (XSS_PATTERNS.DANGEROUS_TAGS.test(input)) {
        threats.push('危険なHTMLタグが検出されました');
    }
    
    // CSS式の検出
    if (XSS_PATTERNS.CSS_EXPRESSION.test(input)) {
        threats.push('危険なCSS式が検出されました');
    }
    
    return {
        secure: threats.length === 0,
        threats,
        message: threats.length === 0 ? 'XSSセキュア' : `XSS脅威検出: ${threats.join(', ')}`
    };
}

/**
 * SQLインジェクション検証
 * @param {string} input - 検証対象の入力
 * @returns {Object} 検証結果
 */
function validateSQLInjection(input) {
    if (!input || typeof input !== 'string') {
        return { secure: true, threats: [], message: '入力が空またはnullです' };
    }
    
    const threats = [];
    
    // UNION SELECT攻撃
    if (SQL_INJECTION_PATTERNS.UNION_SELECT.test(input)) {
        threats.push('UNION SELECT攻撃パターンが検出されました');
    }
    
    // OR/AND インジェクション
    if (SQL_INJECTION_PATTERNS.OR_INJECTION.test(input) || 
        SQL_INJECTION_PATTERNS.AND_INJECTION.test(input)) {
        threats.push('論理演算子インジェクションが検出されました');
    }
    
    // SQLコメント
    if (SQL_INJECTION_PATTERNS.SQL_COMMENTS.test(input)) {
        threats.push('SQLコメント文字が検出されました');
    }
    
    // 時間ベース攻撃
    if (SQL_INJECTION_PATTERNS.TIME_BASED.test(input)) {
        threats.push('時間ベース攻撃パターンが検出されました');
    }
    
    // 危険な関数
    if (SQL_INJECTION_PATTERNS.DANGEROUS_FUNCTIONS.test(input)) {
        threats.push('危険なSQL関数が検出されました');
    }
    
    return {
        secure: threats.length === 0,
        threats,
        message: threats.length === 0 ? 'SQLインジェクション対策済み' : `SQLインジェクション脅威検出: ${threats.join(', ')}`
    };
}

/**
 * コマンドインジェクション検証
 * @param {string} input - 検証対象の入力
 * @returns {Object} 検証結果
 */
function validateCommandInjection(input) {
    if (!input || typeof input !== 'string') {
        return { secure: true, threats: [], message: '入力が空またはnullです' };
    }
    
    const threats = [];
    
    // シェルメタ文字
    if (COMMAND_INJECTION_PATTERNS.SHELL_METACHAR.test(input)) {
        threats.push('シェルメタ文字が検出されました');
    }
    
    // パス操作
    if (COMMAND_INJECTION_PATTERNS.PATH_TRAVERSAL.test(input)) {
        threats.push('パストラバーサル攻撃が検出されました');
    }
    
    // 危険なコマンド
    if (COMMAND_INJECTION_PATTERNS.DANGEROUS_COMMANDS.test(input)) {
        threats.push('危険なシステムコマンドが検出されました');
    }
    
    return {
        secure: threats.length === 0,
        threats,
        message: threats.length === 0 ? 'コマンドインジェクション対策済み' : `コマンドインジェクション脅威検出: ${threats.join(', ')}`
    };
}

/**
 * CSP準拠性検証
 * @param {string} cspHeader - CSPヘッダー文字列
 * @returns {Object} 検証結果
 */
function validateCSPCompliance(cspHeader) {
    if (!cspHeader || typeof cspHeader !== 'string') {
        return { compliant: false, missing: CSP_DIRECTIVES.REQUIRED, message: 'CSPヘッダーが設定されていません' };
    }
    
    const missing = [];
    const recommendations = [];
    
    // 必須ディレクティブのチェック
    CSP_DIRECTIVES.REQUIRED.forEach(directive => {
        if (!cspHeader.includes(directive)) {
            missing.push(directive);
        }
    });
    
    // 推奨ディレクティブのチェック
    CSP_DIRECTIVES.RECOMMENDED.forEach(directive => {
        if (!cspHeader.includes(directive)) {
            recommendations.push(directive);
        }
    });
    
    // 危険な設定のチェック
    const unsafeInline = cspHeader.includes("'unsafe-inline'");
    const unsafeEval = cspHeader.includes("'unsafe-eval'");
    const wildcardSource = cspHeader.includes('*');
    
    const warnings = [];
    if (unsafeInline) warnings.push("'unsafe-inline'の使用");
    if (unsafeEval) warnings.push("'unsafe-eval'の使用");
    if (wildcardSource) warnings.push("ワイルドカードソースの使用");
    
    return {
        compliant: missing.length === 0,
        missing,
        recommendations,
        warnings,
        message: missing.length === 0 ? 'CSP準拠' : `CSP未準拠: ${missing.join(', ')}が不足`
    };
}

/**
 * セキュリティヘッダー検証
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} 検証結果
 */
function validateSecurityHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return { secure: false, missing: Object.keys(SECURITY_HEADERS.REQUIRED), message: 'ヘッダー情報が提供されていません' };
    }
    
    const missing = [];
    const invalid = [];
    const recommendations = [];
    
    // 必須ヘッダーのチェック
    Object.entries(SECURITY_HEADERS.REQUIRED).forEach(([header, config]) => {
        const value = headers[header] || headers[header.toLowerCase()];
        
        if (!value) {
            missing.push(header);
        } else {
            // 値の検証
            if (config.value && value !== config.value) {
                invalid.push(`${header}: 期待値 "${config.value}", 実際 "${value}"`);
            }
            if (config.values && !config.values.includes(value)) {
                invalid.push(`${header}: 許可された値 [${config.values.join(', ')}], 実際 "${value}"`);
            }
            if (config.pattern && !config.pattern.test(value)) {
                invalid.push(`${header}: パターンが一致しません`);
            }
        }
    });
    
    // 推奨ヘッダーのチェック
    Object.keys(SECURITY_HEADERS.RECOMMENDED).forEach(header => {
        const value = headers[header] || headers[header.toLowerCase()];
        if (!value) {
            recommendations.push(header);
        }
    });
    
    return {
        secure: missing.length === 0 && invalid.length === 0,
        missing,
        invalid,
        recommendations,
        message: missing.length === 0 && invalid.length === 0 ? 
            'セキュリティヘッダー適切' : 
            `セキュリティヘッダー問題: 不足 [${missing.join(', ')}], 無効 [${invalid.join(', ')}]`
    };
}

/**
 * 入力サニタイゼーション検証
 * @param {string} input - 原文
 * @param {string} sanitized - サニタイズ後
 * @returns {Object} 検証結果
 */
function validateInputSanitization(input, sanitized) {
    if (!input || !sanitized) {
        return { valid: false, message: '入力またはサニタイズ後の値が提供されていません' };
    }
    
    const inputThreats = validateXSSSecurity(input);
    const sanitizedThreats = validateXSSSecurity(sanitized);
    
    const removed = inputThreats.threats.filter(threat => 
        !sanitizedThreats.threats.includes(threat)
    );
    
    return {
        valid: sanitizedThreats.secure,
        removed,
        remaining: sanitizedThreats.threats,
        message: sanitizedThreats.secure ? 
            `サニタイゼーション成功: ${removed.length}件の脅威を除去` :
            `サニタイゼーション不完全: ${sanitizedThreats.threats.length}件の脅威が残存`
    };
}

/**
 * 総合セキュリティ評価
 * @param {Object} securityData - セキュリティ検証データ
 * @returns {Object} 総合評価結果
 */
function evaluateOverallSecurity(securityData) {
    const {
        xss = { secure: true },
        sql = { secure: true },
        command = { secure: true },
        csp = { compliant: true },
        headers = { secure: true }
    } = securityData;
    
    const scores = {
        xss: xss.secure ? 20 : 0,
        sql: sql.secure ? 20 : 0,
        command: command.secure ? 20 : 0,
        csp: csp.compliant ? 20 : 0,
        headers: headers.secure ? 20 : 0
    };
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    let level = 'poor';
    if (totalScore >= 90) level = 'excellent';
    else if (totalScore >= 70) level = 'good';
    else if (totalScore >= 50) level = 'moderate';
    
    return {
        score: totalScore,
        level,
        breakdown: scores,
        message: `セキュリティレベル: ${level} (${totalScore}/100点)`
    };
}

/**
 * Jest カスタムマッチャーの定義
 */
const customMatchers = {
    /**
     * XSSセキュアかをテスト
     */
    toBeXSSSecure(received) {
        const validation = validateXSSSecurity(received);
        const pass = validation.secure;
        
        if (pass) {
            return {
                message: () => `期待: XSS脆弱性があること\n受信: XSSセキュアです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: XSSセキュアであること\n受信: ${validation.message}`,
                pass: false
            };
        }
    },

    /**
     * CSP準拠かをテスト
     */
    toBeCSPCompliant(received) {
        const validation = validateCSPCompliance(received);
        const pass = validation.compliant;
        
        if (pass) {
            return {
                message: () => `期待: CSP非準拠\n受信: CSP準拠です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: CSP準拠\n受信: ${validation.message}`,
                pass: false
            };
        }
    },

    /**
     * インジェクション攻撃フリーかをテスト
     */
    toBeInjectionFree(received) {
        const sqlValidation = validateSQLInjection(received);
        const cmdValidation = validateCommandInjection(received);
        const pass = sqlValidation.secure && cmdValidation.secure;
        
        if (pass) {
            return {
                message: () => `期待: インジェクション脆弱性があること\n受信: インジェクションフリーです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: インジェクションフリー\n受信: SQL: ${sqlValidation.message}, CMD: ${cmdValidation.message}`,
                pass: false
            };
        }
    },

    /**
     * セキュリティヘッダーが適切かをテスト
     */
    toHaveSecurityHeaders(received) {
        const validation = validateSecurityHeaders(received);
        const pass = validation.secure;
        
        if (pass) {
            return {
                message: () => `期待: セキュリティヘッダーが不適切\n受信: セキュリティヘッダーが適切です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 適切なセキュリティヘッダー\n受信: ${validation.message}`,
                pass: false
            };
        }
    },

    /**
     * 入力サニタイゼーションが適切かをテスト
     */
    toHaveProperSanitization(received) {
        const { input, sanitized } = received;
        const validation = validateInputSanitization(input, sanitized);
        const pass = validation.valid;
        
        if (pass) {
            return {
                message: () => `期待: サニタイゼーションが不適切\n受信: サニタイゼーションが適切です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 適切なサニタイゼーション\n受信: ${validation.message}`,
                pass: false
            };
        }
    },

    /**
     * セキュリティレベルが基準を満たすかをテスト
     */
    toMeetSecurityLevel(received, minimumLevel = 'good') {
        const evaluation = evaluateOverallSecurity(received);
        
        const levelOrder = ['poor', 'moderate', 'good', 'excellent'];
        const receivedIndex = levelOrder.indexOf(evaluation.level);
        const minimumIndex = levelOrder.indexOf(minimumLevel);
        
        const pass = receivedIndex >= minimumIndex;
        
        if (pass) {
            return {
                message: () => `期待: ${minimumLevel}未満のセキュリティレベル\n受信: ${evaluation.level} (${evaluation.score}点)`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${minimumLevel}以上のセキュリティレベル\n受信: ${evaluation.level} (${evaluation.score}点)`,
                pass: false
            };
        }
    },

    /**
     * HTTPS強制がされているかをテスト
     */
    toEnforceHTTPS(received) {
        const hstsHeader = received['Strict-Transport-Security'] || 
                          received['strict-transport-security'];
        
        const pass = !!hstsHeader && /max-age=\d+/.test(hstsHeader);
        
        if (pass) {
            return {
                message: () => `期待: HTTPS強制なし\n受信: HTTPS強制されています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: HTTPS強制\n受信: Strict-Transport-Securityヘッダーが適切に設定されていません`,
                pass: false
            };
        }
    }
};

// Jestに追加
if (typeof expect !== 'undefined') {
    expect.extend(customMatchers);
}

module.exports = {
    // パターン定義
    XSS_PATTERNS,
    SQL_INJECTION_PATTERNS,
    COMMAND_INJECTION_PATTERNS,
    CSP_DIRECTIVES,
    SECURITY_HEADERS,
    DANGEROUS_PATTERNS,
    
    // バリデーション関数
    validateXSSSecurity,
    validateSQLInjection,
    validateCommandInjection,
    validateCSPCompliance,
    validateSecurityHeaders,
    validateInputSanitization,
    evaluateOverallSecurity,
    
    // カスタムマッチャー
    customMatchers
};