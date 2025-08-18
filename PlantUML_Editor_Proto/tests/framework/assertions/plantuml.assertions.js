/**
 * PlantUML固有カスタムアサーション
 * 
 * PlantUML構文、アクター、矢印タイプ、条件分岐、ループ、並行処理の検証
 * 日本語対応とセキュリティ検証を含む包括的なテストユーティリティ
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

/**
 * PlantUML構文パターン定義
 */
const PLANTUML_PATTERNS = {
    // 基本構文
    START_UML: /@startuml\b/i,
    END_UML: /@enduml\b/i,
    
    // アクター関連
    ACTOR: /(?:actor|participant)\s+([^\s\n]+)/gi,
    ACTOR_JAPANESE: /(?:actor|participant)\s+([^\s\n]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][^\s\n]*)/gi,
    
    // 矢印タイプ
    ARROW_SYNC: /->/g,
    ARROW_ASYNC: /->>/g,
    ARROW_RETURN: /-->/g,
    ARROW_CREATE: /->+/g,
    ARROW_DESTROY: /->x/g,
    ARROW_LOST: /->]/g,
    ARROW_FOUND: /\[->]/g,
    
    // 条件分岐
    CONDITION_IF: /(?:alt|opt|break|critical|group|loop|par|seq|strict|neg|ignore|consider|assert)\s*\[/gi,
    CONDITION_ELSE: /else\s*\[/gi,
    CONDITION_END: /end\b/gi,
    
    // ループ構造
    LOOP_WHILE: /loop\s*\[/gi,
    LOOP_FOR: /loop\s+\d+\s+times/gi,
    
    // 並行処理
    PARALLEL_FORK: /(?:fork|par)\b/gi,
    PARALLEL_JOIN: /end\s+(?:fork|par)\b/gi,
    
    // ノート
    NOTE: /note\s+(?:left|right|over|top|bottom)/gi,
    
    // アクティベーション
    ACTIVATE: /activate\s+([^\s\n]+)/gi,
    DEACTIVATE: /deactivate\s+([^\s\n]+)/gi,
    
    // 分岐・合流
    SPLIT: /split\b/gi,
    SPLIT_AGAIN: /split\s+again\b/gi,
    
    // 色とスタイル
    COLOR: /#[0-9A-Fa-f]{6}\b/g,
    BACKGROUND: /(?:skinparam|!theme)/gi
};

/**
 * 日本語文字パターン
 */
const JAPANESE_PATTERNS = {
    HIRAGANA: /[\u3040-\u309F]/g,
    KATAKANA: /[\u30A0-\u30FF]/g,
    KANJI: /[\u4E00-\u9FAF]/g,
    JAPANESE_ALL: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g,
    JAPANESE_PUNCTUATION: /[\u3000-\u303F]/g
};

/**
 * セキュリティ脆弱性パターン
 */
const SECURITY_PATTERNS = {
    XSS_SCRIPT: /<script[^>]*>.*?<\/script>/gi,
    XSS_ONCLICK: /on\w+\s*=\s*["'][^"']*["']/gi,
    XSS_JAVASCRIPT: /javascript:/gi,
    SQL_INJECTION: /(?:union|select|insert|update|delete|drop|create|alter)\s+/gi,
    COMMAND_INJECTION: /(?:[;&|`$(){}]|\.\.\/|\.\.\\)/g,
    HTML_TAGS: /<[^>]+>/g
};

/**
 * PlantUML構文の有効性を検証
 * @param {string} code - PlantUMLコード
 * @returns {boolean} 有効かどうか
 */
function isValidPlantUMLSyntax(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    
    const hasStart = PLANTUML_PATTERNS.START_UML.test(code);
    const hasEnd = PLANTUML_PATTERNS.END_UML.test(code);
    
    return hasStart && hasEnd;
}

/**
 * 指定されたアクターが含まれているかを検証
 * @param {string} code - PlantUMLコード
 * @param {string} actorName - アクター名
 * @returns {boolean} 含まれているかどうか
 */
function containsActor(code, actorName) {
    if (!code || !actorName) {
        return false;
    }
    
    const actorRegex = new RegExp(`(?:actor|participant)\\s+["']?${actorName}["']?`, 'gi');
    const mentionRegex = new RegExp(`\\b${actorName}\\b`, 'gi');
    
    return actorRegex.test(code) || mentionRegex.test(code);
}

/**
 * 指定された矢印タイプが含まれているかを検証
 * @param {string} code - PlantUMLコード
 * @param {string} arrowType - 矢印タイプ
 * @returns {boolean} 含まれているかどうか
 */
function hasArrowType(code, arrowType) {
    if (!code || !arrowType) {
        return false;
    }
    
    const patternMap = {
        '->': PLANTUML_PATTERNS.ARROW_SYNC,
        '->>': PLANTUML_PATTERNS.ARROW_ASYNC,
        '-->': PLANTUML_PATTERNS.ARROW_RETURN,
        '->+': PLANTUML_PATTERNS.ARROW_CREATE,
        '->x': PLANTUML_PATTERNS.ARROW_DESTROY,
        '->]': PLANTUML_PATTERNS.ARROW_LOST,
        '[->': PLANTUML_PATTERNS.ARROW_FOUND
    };
    
    const pattern = patternMap[arrowType];
    return pattern ? pattern.test(code) : false;
}

/**
 * 条件分岐が含まれているかを検証
 * @param {string} code - PlantUMLコード
 * @param {string} conditionType - 条件タイプ (if, else, end)
 * @returns {boolean} 含まれているかどうか
 */
function hasCondition(code, conditionType) {
    if (!code || !conditionType) {
        return false;
    }
    
    switch (conditionType.toLowerCase()) {
        case 'if':
        case 'alt':
        case 'opt':
            return PLANTUML_PATTERNS.CONDITION_IF.test(code);
        case 'else':
            return PLANTUML_PATTERNS.CONDITION_ELSE.test(code);
        case 'end':
            return PLANTUML_PATTERNS.CONDITION_END.test(code);
        default:
            return false;
    }
}

/**
 * ループ構造が含まれているかを検証
 * @param {string} code - PlantUMLコード
 * @param {string} loopType - ループタイプ (while, for)
 * @returns {boolean} 含まれているかどうか
 */
function hasLoop(code, loopType) {
    if (!code || !loopType) {
        return false;
    }
    
    switch (loopType.toLowerCase()) {
        case 'while':
        case 'loop':
            return PLANTUML_PATTERNS.LOOP_WHILE.test(code);
        case 'for':
        case 'times':
            return PLANTUML_PATTERNS.LOOP_FOR.test(code);
        default:
            return false;
    }
}

/**
 * 並行処理が含まれているかを検証
 * @param {string} code - PlantUMLコード
 * @param {string} parallelType - 並行処理タイプ (fork, par)
 * @returns {boolean} 含まれているかどうか
 */
function hasParallel(code, parallelType) {
    if (!code || !parallelType) {
        return false;
    }
    
    switch (parallelType.toLowerCase()) {
        case 'fork':
        case 'par':
            return PLANTUML_PATTERNS.PARALLEL_FORK.test(code);
        case 'join':
        case 'end':
            return PLANTUML_PATTERNS.PARALLEL_JOIN.test(code);
        default:
            return false;
    }
}

/**
 * 日本語文字が含まれているかを検証
 * @param {string} text - テキスト
 * @returns {boolean} 含まれているかどうか
 */
function containsJapanese(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.JAPANESE_ALL.test(text);
}

/**
 * 有効なひらがなかどうかを検証
 * @param {string} text - テキスト
 * @returns {boolean} 有効かどうか
 */
function isValidHiragana(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.HIRAGANA.test(text);
}

/**
 * 有効なカタカナかどうかを検証
 * @param {string} text - テキスト
 * @returns {boolean} 有効かどうか
 */
function isValidKatakana(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.KATAKANA.test(text);
}

/**
 * 有効な漢字かどうかを検証
 * @param {string} text - テキスト
 * @returns {boolean} 有効かどうか
 */
function isValidKanji(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.KANJI.test(text);
}

/**
 * XSSセキュアかどうかを検証
 * @param {string} input - 入力テキスト
 * @returns {boolean} セキュアかどうか
 */
function isXSSSecure(input) {
    if (!input || typeof input !== 'string') {
        return true;
    }
    
    return !SECURITY_PATTERNS.XSS_SCRIPT.test(input) &&
           !SECURITY_PATTERNS.XSS_ONCLICK.test(input) &&
           !SECURITY_PATTERNS.XSS_JAVASCRIPT.test(input);
}

/**
 * インジェクション攻撃フリーかどうかを検証
 * @param {string} data - データ
 * @returns {boolean} フリーかどうか
 */
function isInjectionFree(data) {
    if (!data || typeof data !== 'string') {
        return true;
    }
    
    return !SECURITY_PATTERNS.SQL_INJECTION.test(data) &&
           !SECURITY_PATTERNS.COMMAND_INJECTION.test(data);
}

/**
 * PlantUMLアクターリストを抽出
 * @param {string} code - PlantUMLコード
 * @returns {Array<string>} アクターリスト
 */
function extractActors(code) {
    if (!code || typeof code !== 'string') {
        return [];
    }
    
    const actors = [];
    let match;
    
    const actorPattern = /(?:actor|participant)\s+["']?([^"'\s\n]+)["']?/gi;
    while ((match = actorPattern.exec(code)) !== null) {
        actors.push(match[1]);
    }
    
    return [...new Set(actors)]; // 重複除去
}

/**
 * PlantUML矢印リストを抽出
 * @param {string} code - PlantUMLコード
 * @returns {Array<Object>} 矢印リスト
 */
function extractArrows(code) {
    if (!code || typeof code !== 'string') {
        return [];
    }
    
    const arrows = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
        const arrowMatch = line.match(/([^-]+)(-+>+[\+x\]]?)([^:]*):?\s*(.*)$/);
        if (arrowMatch) {
            arrows.push({
                line: index + 1,
                from: arrowMatch[1].trim(),
                arrow: arrowMatch[2],
                to: arrowMatch[3].trim(),
                message: arrowMatch[4].trim()
            });
        }
    });
    
    return arrows;
}

/**
 * PlantUMLの構造解析
 * @param {string} code - PlantUMLコード
 * @returns {Object} 構造情報
 */
function analyzeStructure(code) {
    if (!code || typeof code !== 'string') {
        return {
            actors: [],
            arrows: [],
            conditions: 0,
            loops: 0,
            parallels: 0,
            notes: 0
        };
    }
    
    return {
        actors: extractActors(code),
        arrows: extractArrows(code),
        conditions: (code.match(PLANTUML_PATTERNS.CONDITION_IF) || []).length,
        loops: (code.match(PLANTUML_PATTERNS.LOOP_WHILE) || []).length,
        parallels: (code.match(PLANTUML_PATTERNS.PARALLEL_FORK) || []).length,
        notes: (code.match(PLANTUML_PATTERNS.NOTE) || []).length
    };
}

/**
 * Jest カスタムマッチャーの定義
 */
const customMatchers = {
    /**
     * PlantUML構文が有効かどうかをテスト
     */
    toBeValidPlantUML(received) {
        const pass = isValidPlantUMLSyntax(received);
        
        if (pass) {
            return {
                message: () => `期待: PlantUML構文が無効であること\n受信: 有効なPlantUML構文`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 有効なPlantUML構文\n受信: 無効な構文 (@ startuml / @ enduml が見つかりません)`,
                pass: false
            };
        }
    },

    /**
     * 指定されたアクターが含まれているかをテスト
     */
    toContainActor(received, actorName) {
        const pass = containsActor(received, actorName);
        
        if (pass) {
            return {
                message: () => `期待: アクター "${actorName}" が含まれていないこと\n受信: アクターが含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: アクター "${actorName}" が含まれていること\n受信: アクターが見つかりません`,
                pass: false
            };
        }
    },

    /**
     * 指定された矢印タイプが含まれているかをテスト
     */
    toHaveArrowType(received, arrowType) {
        const pass = hasArrowType(received, arrowType);
        
        if (pass) {
            return {
                message: () => `期待: 矢印タイプ "${arrowType}" が含まれていないこと\n受信: 矢印タイプが含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 矢印タイプ "${arrowType}" が含まれていること\n受信: 矢印タイプが見つかりません`,
                pass: false
            };
        }
    },

    /**
     * 条件分岐が含まれているかをテスト
     */
    toHaveCondition(received, conditionType) {
        const pass = hasCondition(received, conditionType);
        
        if (pass) {
            return {
                message: () => `期待: 条件 "${conditionType}" が含まれていないこと\n受信: 条件が含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 条件 "${conditionType}" が含まれていること\n受信: 条件が見つかりません`,
                pass: false
            };
        }
    },

    /**
     * ループが含まれているかをテスト
     */
    toHaveLoop(received, loopType) {
        const pass = hasLoop(received, loopType);
        
        if (pass) {
            return {
                message: () => `期待: ループ "${loopType}" が含まれていないこと\n受信: ループが含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ループ "${loopType}" が含まれていること\n受信: ループが見つかりません`,
                pass: false
            };
        }
    },

    /**
     * 並行処理が含まれているかをテスト
     */
    toHaveParallel(received, parallelType) {
        const pass = hasParallel(received, parallelType);
        
        if (pass) {
            return {
                message: () => `期待: 並行処理 "${parallelType}" が含まれていないこと\n受信: 並行処理が含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 並行処理 "${parallelType}" が含まれていること\n受信: 並行処理が見つかりません`,
                pass: false
            };
        }
    },

    /**
     * 日本語が含まれているかをテスト
     */
    toContainJapanese(received) {
        const pass = containsJapanese(received);
        
        if (pass) {
            return {
                message: () => `期待: 日本語が含まれていないこと\n受信: 日本語が含まれています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 日本語が含まれていること\n受信: 日本語が見つかりません`,
                pass: false
            };
        }
    },

    /**
     * XSSセキュアかどうかをテスト
     */
    toBeXSSSecure(received) {
        const pass = isXSSSecure(received);
        
        if (pass) {
            return {
                message: () => `期待: XSS脆弱性があること\n受信: XSSセキュアです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: XSSセキュアであること\n受信: XSS脆弱性が検出されました`,
                pass: false
            };
        }
    },

    /**
     * インジェクション攻撃フリーかどうかをテスト
     */
    toBeInjectionFree(received) {
        const pass = isInjectionFree(received);
        
        if (pass) {
            return {
                message: () => `期待: インジェクション脆弱性があること\n受信: インジェクションフリーです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: インジェクションフリーであること\n受信: インジェクション脆弱性が検出されました`,
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
    // バリデーション関数
    isValidPlantUMLSyntax,
    containsActor,
    hasArrowType,
    hasCondition,
    hasLoop,
    hasParallel,
    containsJapanese,
    isValidHiragana,
    isValidKatakana,
    isValidKanji,
    isXSSSecure,
    isInjectionFree,
    
    // 解析関数
    extractActors,
    extractArrows,
    analyzeStructure,
    
    // パターン定義
    PLANTUML_PATTERNS,
    JAPANESE_PATTERNS,
    SECURITY_PATTERNS,
    
    // カスタムマッチャー
    customMatchers
};