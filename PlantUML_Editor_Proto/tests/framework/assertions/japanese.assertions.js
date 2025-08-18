/**
 * 日本語対応カスタムアサーション
 * 
 * ひらがな、カタカナ、漢字、混合文字列、エンコーディングの包括的検証
 * Unicode正規化、濁点・半濁点処理、日本語固有の文字列操作をテスト
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

/**
 * 日本語文字範囲定義
 */
const JAPANESE_RANGES = {
    // ひらがな (U+3040-U+309F)
    HIRAGANA: {
        start: 0x3040,
        end: 0x309F,
        pattern: /[\u3040-\u309F]/g,
        name: 'ひらがな'
    },
    
    // カタカナ (U+30A0-U+30FF)
    KATAKANA: {
        start: 0x30A0,
        end: 0x30FF,
        pattern: /[\u30A0-\u30FF]/g,
        name: 'カタカナ'
    },
    
    // 漢字 (U+4E00-U+9FAF)
    KANJI: {
        start: 0x4E00,
        end: 0x9FAF,
        pattern: /[\u4E00-\u9FAF]/g,
        name: '漢字'
    },
    
    // 日本語句読点 (U+3000-U+303F)
    PUNCTUATION: {
        start: 0x3000,
        end: 0x303F,
        pattern: /[\u3000-\u303F]/g,
        name: '句読点'
    },
    
    // 半角カタカナ (U+FF65-U+FF9F)
    HALFWIDTH_KATAKANA: {
        start: 0xFF65,
        end: 0xFF9F,
        pattern: /[\uFF65-\uFF9F]/g,
        name: '半角カタカナ'
    },
    
    // 全角英数字 (U+FF01-U+FF5E)
    FULLWIDTH_ALPHANUMERIC: {
        start: 0xFF01,
        end: 0xFF5E,
        pattern: /[\uFF01-\uFF5E]/g,
        name: '全角英数字'
    }
};

/**
 * 日本語包括パターン
 */
const JAPANESE_PATTERNS = {
    ALL: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF65-\uFF9F\uFF01-\uFF5E]/g,
    HIRAGANA_ONLY: /^[\u3040-\u309F\u3000-\u303F]*$/,
    KATAKANA_ONLY: /^[\u30A0-\u30FF\u3000-\u303F]*$/,
    KANJI_ONLY: /^[\u4E00-\u9FAF\u3000-\u303F]*$/,
    MIXED: /[\u3040-\u309F].*[\u30A0-\u30FF]|[\u30A0-\u30FF].*[\u3040-\u309F]/,
    WITH_KANJI: /[\u4E00-\u9FAF]/,
    NO_JAPANESE: /^[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF65-\uFF9F\uFF01-\uFF5E]*$/
};

/**
 * 濁点・半濁点マッピング
 */
const DAKUTEN_MAPPING = {
    // ひらがな濁点
    'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
    'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
    'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
    'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
    // ひらがな半濁点
    'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
    // カタカナ濁点
    'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
    'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
    'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
    'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ',
    // カタカナ半濁点
    'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
};

/**
 * ひらがな・カタカナ変換マッピング
 */
const KANA_CONVERSION = {
    // ひらがな → カタカナ
    hiraganaToKatakana: {
        'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ',
        'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
        'が': 'ガ', 'ぎ': 'ギ', 'ぐ': 'グ', 'げ': 'ゲ', 'ご': 'ゴ',
        'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
        'ざ': 'ザ', 'じ': 'ジ', 'ず': 'ズ', 'ぜ': 'ゼ', 'ぞ': 'ゾ',
        'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
        'だ': 'ダ', 'ぢ': 'ヂ', 'づ': 'ヅ', 'で': 'デ', 'ど': 'ド',
        'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
        'は': 'ハ', 'ひ': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
        'ば': 'バ', 'び': 'ビ', 'ぶ': 'ブ', 'べ': 'ベ', 'ぼ': 'ボ',
        'ぱ': 'パ', 'ぴ': 'ピ', 'ぷ': 'プ', 'ぺ': 'ペ', 'ぽ': 'ポ',
        'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
        'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
        'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
        'わ': 'ワ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'を': 'ヲ', 'ん': 'ン',
        'ー': 'ー', '・': '・'
    }
};

// カタカナ → ひらがな変換マッピングを生成
KANA_CONVERSION.katakanaToHiragana = Object.fromEntries(
    Object.entries(KANA_CONVERSION.hiraganaToKatakana).map(([h, k]) => [k, h])
);

/**
 * エンコーディング検証用パターン
 */
const ENCODING_PATTERNS = {
    UTF8_BOM: /^\uFEFF/,
    MOJIBAKE: /[ï¿½â€žâ€¦â€œâ€]/g, // 文字化けパターン
    INVALID_SURROGATE: /[\uD800-\uDFFF]/g,
    CONTROL_CHARS: /[\x00-\x1F\x7F-\x9F]/g
};

/**
 * 文字列が指定された日本語文字種かを検証
 * @param {string} text - 検証対象の文字列
 * @param {string} charType - 文字種 ('hiragana', 'katakana', 'kanji')
 * @returns {boolean} 指定された文字種かどうか
 */
function isJapaneseCharType(text, charType) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    const range = JAPANESE_RANGES[charType.toUpperCase()];
    if (!range) {
        return false;
    }
    
    return range.pattern.test(text);
}

/**
 * 文字列に日本語が含まれているかを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 日本語が含まれているかどうか
 */
function containsJapanese(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.ALL.test(text);
}

/**
 * 有効なひらがなかどうかを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 有効なひらがなかどうか
 */
function isValidHiragana(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.HIRAGANA_ONLY.test(text) && 
           JAPANESE_RANGES.HIRAGANA.pattern.test(text);
}

/**
 * 有効なカタカナかどうかを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 有効なカタカナかどうか
 */
function isValidKatakana(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.KATAKANA_ONLY.test(text) && 
           JAPANESE_RANGES.KATAKANA.pattern.test(text);
}

/**
 * 有効な漢字かどうかを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 有効な漢字かどうか
 */
function isValidKanji(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    return JAPANESE_PATTERNS.KANJI_ONLY.test(text) && 
           JAPANESE_RANGES.KANJI.pattern.test(text);
}

/**
 * 混合文字列（ひらがな・カタカナ・漢字の組み合わせ）かを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 混合文字列かどうか
 */
function isMixedJapanese(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    const hasHiragana = JAPANESE_RANGES.HIRAGANA.pattern.test(text);
    const hasKatakana = JAPANESE_RANGES.KATAKANA.pattern.test(text);
    const hasKanji = JAPANESE_RANGES.KANJI.pattern.test(text);
    
    const typeCount = [hasHiragana, hasKatakana, hasKanji].filter(Boolean).length;
    return typeCount >= 2;
}

/**
 * 適切なエンコーディングかを検証
 * @param {string} text - 検証対象の文字列
 * @returns {boolean} 適切なエンコーディングかどうか
 */
function hasProperEncoding(text) {
    if (!text || typeof text !== 'string') {
        return true;
    }
    
    // 文字化けパターンの検出
    if (ENCODING_PATTERNS.MOJIBAKE.test(text)) {
        return false;
    }
    
    // 無効なサロゲートペアの検出
    if (ENCODING_PATTERNS.INVALID_SURROGATE.test(text)) {
        return false;
    }
    
    // 制御文字の検出（改行・タブを除く）
    const controlChars = text.match(ENCODING_PATTERNS.CONTROL_CHARS);
    if (controlChars) {
        const allowedControlChars = ['\n', '\r', '\t'];
        return controlChars.every(char => allowedControlChars.includes(char));
    }
    
    return true;
}

/**
 * 文字列の日本語文字数をカウント
 * @param {string} text - 検証対象の文字列
 * @returns {Object} 文字種別カウント
 */
function countJapaneseChars(text) {
    if (!text || typeof text !== 'string') {
        return {
            hiragana: 0,
            katakana: 0,
            kanji: 0,
            punctuation: 0,
            total: 0
        };
    }
    
    const hiragana = (text.match(JAPANESE_RANGES.HIRAGANA.pattern) || []).length;
    const katakana = (text.match(JAPANESE_RANGES.KATAKANA.pattern) || []).length;
    const kanji = (text.match(JAPANESE_RANGES.KANJI.pattern) || []).length;
    const punctuation = (text.match(JAPANESE_RANGES.PUNCTUATION.pattern) || []).length;
    
    return {
        hiragana,
        katakana,
        kanji,
        punctuation,
        total: hiragana + katakana + kanji + punctuation
    };
}

/**
 * ひらがなをカタカナに変換
 * @param {string} text - 変換対象の文字列
 * @returns {string} カタカナに変換された文字列
 */
function hiraganaToKatakana(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text.replace(/[\u3040-\u309F]/g, char => 
        KANA_CONVERSION.hiraganaToKatakana[char] || char
    );
}

/**
 * カタカナをひらがなに変換
 * @param {string} text - 変換対象の文字列
 * @returns {string} ひらがなに変換された文字列
 */
function katakanaToHiragana(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text.replace(/[\u30A0-\u30FF]/g, char => 
        KANA_CONVERSION.katakanaToHiragana[char] || char
    );
}

/**
 * 半角カナを全角カナに変換
 * @param {string} text - 変換対象の文字列
 * @returns {string} 全角カナに変換された文字列
 */
function halfwidthToFullwidth(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const halfwidthMap = {
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｰ': 'ー', '･': '・'
    };
    
    return text.replace(/[\uFF65-\uFF9F]/g, char => halfwidthMap[char] || char);
}

/**
 * Unicode正規化を実行
 * @param {string} text - 正規化対象の文字列
 * @param {string} form - 正規化形式 ('NFC', 'NFD', 'NFKC', 'NFKD')
 * @returns {string} 正規化された文字列
 */
function normalizeUnicode(text, form = 'NFC') {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    try {
        return text.normalize(form);
    } catch (error) {
        console.warn('Unicode正規化エラー:', error);
        return text;
    }
}

/**
 * 文字列の長さを正確に測定（サロゲートペアを考慮）
 * @param {string} text - 測定対象の文字列
 * @returns {number} 正確な文字数
 */
function getActualLength(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }
    
    return Array.from(text).length;
}

/**
 * Jest カスタムマッチャーの定義
 */
const customMatchers = {
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
     * 有効なひらがなかをテスト
     */
    toBeValidHiragana(received) {
        const pass = isValidHiragana(received);
        
        if (pass) {
            return {
                message: () => `期待: 無効なひらがな\n受信: 有効なひらがなです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 有効なひらがな\n受信: 無効なひらがなまたは他の文字が含まれています`,
                pass: false
            };
        }
    },

    /**
     * 有効なカタカナかをテスト
     */
    toBeValidKatakana(received) {
        const pass = isValidKatakana(received);
        
        if (pass) {
            return {
                message: () => `期待: 無効なカタカナ\n受信: 有効なカタカナです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 有効なカタカナ\n受信: 無効なカタカナまたは他の文字が含まれています`,
                pass: false
            };
        }
    },

    /**
     * 有効な漢字かをテスト
     */
    toBeValidKanji(received) {
        const pass = isValidKanji(received);
        
        if (pass) {
            return {
                message: () => `期待: 無効な漢字\n受信: 有効な漢字です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 有効な漢字\n受信: 無効な漢字または他の文字が含まれています`,
                pass: false
            };
        }
    },

    /**
     * 混合日本語文字列かをテスト
     */
    toBeMixedJapanese(received) {
        const pass = isMixedJapanese(received);
        
        if (pass) {
            return {
                message: () => `期待: 単一文字種\n受信: 混合日本語文字列です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 混合日本語文字列\n受信: 単一文字種または日本語ではありません`,
                pass: false
            };
        }
    },

    /**
     * 適切なエンコーディングかをテスト
     */
    toHaveProperEncoding(received) {
        const pass = hasProperEncoding(received);
        
        if (pass) {
            return {
                message: () => `期待: 不適切なエンコーディング\n受信: 適切なエンコーディングです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 適切なエンコーディング\n受信: 文字化けまたは無効な文字が検出されました`,
                pass: false
            };
        }
    },

    /**
     * 指定された文字数を持つかをテスト
     */
    toHaveJapaneseCharCount(received, expectedCount) {
        const count = countJapaneseChars(received);
        const pass = count.total === expectedCount;
        
        if (pass) {
            return {
                message: () => `期待: 日本語文字数が ${expectedCount} 以外\n受信: ${count.total} 文字です`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 日本語文字数 ${expectedCount}\n受信: ${count.total} 文字 (ひらがな: ${count.hiragana}, カタカナ: ${count.katakana}, 漢字: ${count.kanji})`,
                pass: false
            };
        }
    },

    /**
     * Unicode正規化が正しく行われているかをテスト
     */
    toBeNormalizedUnicode(received, form = 'NFC') {
        const normalized = normalizeUnicode(received, form);
        const pass = received === normalized;
        
        if (pass) {
            return {
                message: () => `期待: 正規化されていない文字列\n受信: 既に ${form} 正規化されています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: ${form} 正規化された文字列\n受信: 正規化が必要です`,
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
    // 定数
    JAPANESE_RANGES,
    JAPANESE_PATTERNS,
    DAKUTEN_MAPPING,
    KANA_CONVERSION,
    ENCODING_PATTERNS,
    
    // バリデーション関数
    isJapaneseCharType,
    containsJapanese,
    isValidHiragana,
    isValidKatakana,
    isValidKanji,
    isMixedJapanese,
    hasProperEncoding,
    
    // ユーティリティ関数
    countJapaneseChars,
    hiraganaToKatakana,
    katakanaToHiragana,
    halfwidthToFullwidth,
    normalizeUnicode,
    getActualLength,
    
    // カスタムマッチャー
    customMatchers
};