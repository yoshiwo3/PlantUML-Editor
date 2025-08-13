/**
 * PlantUMLトークン型定義
 * PlantUMLコードをパースするためのトークン型を定義
 */

// トークンタイプの定義
window.TokenType = Object.freeze({
    // 基本トークン
    START_UML: 'START_UML',           // @startuml
    END_UML: 'END_UML',               // @enduml
    TITLE: 'TITLE',                   // title
    
    // 参加者・アクター
    PARTICIPANT: 'PARTICIPANT',       // participant
    ACTOR: 'ACTOR',                   // actor
    BOUNDARY: 'BOUNDARY',             // boundary
    CONTROL: 'CONTROL',               // control
    ENTITY: 'ENTITY',                 // entity
    DATABASE: 'DATABASE',             // database
    
    // メッセージとコミュニケーション
    ARROW: 'ARROW',                   // -> -->
    MESSAGE: 'MESSAGE',               // メッセージテキスト
    NOTE: 'NOTE',                     // note
    AUTONUMBER: 'AUTONUMBER',         // autonumber
    
    // 制御構造
    ALT_START: 'ALT_START',           // alt
    ALT_ELSE: 'ALT_ELSE',             // else
    ALT_END: 'ALT_END',               // end
    LOOP_START: 'LOOP_START',         // loop
    LOOP_END: 'LOOP_END',             // end
    PAR_START: 'PAR_START',           // par
    PAR_ELSE: 'PAR_ELSE',             // else
    PAR_END: 'PAR_END',               // end
    OPT_START: 'OPT_START',           // opt
    OPT_END: 'OPT_END',               // end
    BREAK_START: 'BREAK_START',       // break
    BREAK_END: 'BREAK_END',           // end
    CRITICAL_START: 'CRITICAL_START', // critical
    CRITICAL_END: 'CRITICAL_END',     // end
    GROUP_START: 'GROUP_START',       // group
    GROUP_END: 'GROUP_END',           // end
    
    // アクティベーション
    ACTIVATE: 'ACTIVATE',             // activate
    DEACTIVATE: 'DEACTIVATE',         // deactivate
    
    // スタイリング
    SKINPARAM: 'SKINPARAM',          // skinparam
    
    // 基本要素
    IDENTIFIER: 'IDENTIFIER',         // 識別子（アクター名など）
    STRING: 'STRING',                 // 文字列
    NEWLINE: 'NEWLINE',              // 改行
    WHITESPACE: 'WHITESPACE',        // 空白
    COMMENT: 'COMMENT',              // コメント /'..'/
    
    // 特殊文字
    COLON: 'COLON',                  // :
    SEMICOLON: 'SEMICOLON',          // ;
    COMMA: 'COMMA',                  // ,
    LPAREN: 'LPAREN',                // (
    RPAREN: 'RPAREN',                // )
    LBRACKET: 'LBRACKET',            // [
    RBRACKET: 'RBRACKET',            // ]
    
    // 終端・エラー
    EOF: 'EOF',                      // ファイル終端
    UNKNOWN: 'UNKNOWN'               // 未知のトークン
});

// トークンクラス
window.Token = class Token {
    constructor(type, value, line = 0, column = 0, position = 0) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
        this.position = position;
        this.length = value ? value.length : 0;
    }
    
    toString() {
        return `Token(${this.type}, "${this.value}", ${this.line}:${this.column})`;
    }
    
    // トークンが特定のタイプかチェック
    is(type) {
        return this.type === type;
    }
    
    // トークンが特定の値を持つかチェック
    hasValue(value) {
        return this.value === value;
    }
    
    // トークンが制御構造の開始かチェック
    isControlStart() {
        return [
            window.TokenType.ALT_START,
            window.TokenType.LOOP_START,
            window.TokenType.PAR_START,
            window.TokenType.OPT_START,
            window.TokenType.BREAK_START,
            window.TokenType.CRITICAL_START,
            window.TokenType.GROUP_START
        ].includes(this.type);
    }
    
    // トークンが制御構造の終了かチェック
    isControlEnd() {
        return [
            window.TokenType.ALT_END,
            window.TokenType.LOOP_END,
            window.TokenType.PAR_END,
            window.TokenType.OPT_END,
            window.TokenType.BREAK_END,
            window.TokenType.CRITICAL_END,
            window.TokenType.GROUP_END
        ].includes(this.type);
    }
    
    // アクター・参加者定義かチェック
    isParticipantDefinition() {
        return [
            window.TokenType.PARTICIPANT,
            window.TokenType.ACTOR,
            window.TokenType.BOUNDARY,
            window.TokenType.CONTROL,
            window.TokenType.ENTITY,
            window.TokenType.DATABASE
        ].includes(this.type);
    }
}

// トークン生成ヘルパー
window.TokenFactory = class TokenFactory {
    static create(type, value, line = 0, column = 0, position = 0) {
        return new window.Token(type, value, line, column, position);
    }
    
    static createEOF(position = 0) {
        return new window.Token(window.TokenType.EOF, '', 0, 0, position);
    }
    
    static createUnknown(value, line = 0, column = 0, position = 0) {
        return new window.Token(window.TokenType.UNKNOWN, value, line, column, position);
    }
}

// キーワードマッピング
window.Keywords = Object.freeze({
    '@startuml': window.TokenType.START_UML,
    '@enduml': window.TokenType.END_UML,
    'title': window.TokenType.TITLE,
    'participant': window.TokenType.PARTICIPANT,
    'actor': window.TokenType.ACTOR,
    'boundary': window.TokenType.BOUNDARY,
    'control': window.TokenType.CONTROL,
    'entity': window.TokenType.ENTITY,
    'database': window.TokenType.DATABASE,
    'note': window.TokenType.NOTE,
    'autonumber': window.TokenType.AUTONUMBER,
    'alt': window.TokenType.ALT_START,
    'else': window.TokenType.ALT_ELSE,
    'end': window.TokenType.ALT_END, // 文脈によって変わるが、デフォルトでALT_END
    'loop': window.TokenType.LOOP_START,
    'par': window.TokenType.PAR_START,
    'opt': window.TokenType.OPT_START,
    'break': window.TokenType.BREAK_START,
    'critical': window.TokenType.CRITICAL_START,
    'group': window.TokenType.GROUP_START,
    'activate': window.TokenType.ACTIVATE,
    'deactivate': window.TokenType.DEACTIVATE,
    'skinparam': window.TokenType.SKINPARAM
});

// 矢印パターン
window.ArrowPatterns = Object.freeze({
    '->': { type: 'sync', style: 'solid' },
    '-->': { type: 'async', style: 'dashed' },
    '->>': { type: 'sync', style: 'solid' },
    '-->>': { type: 'async', style: 'dashed' },
    '<<-': { type: 'return', style: 'solid' },
    '<<--': { type: 'return', style: 'dashed' },
    '-\\': { type: 'lost', style: 'solid' },
    '--\\': { type: 'lost', style: 'dashed' },
    '/-': { type: 'found', style: 'solid' },
    '/--': { type: 'found', style: 'dashed' }
});

// トークン検証関数
window.TokenValidator = class TokenValidator {
    static isValidIdentifier(value) {
        if (!value || typeof value !== 'string') return false;
        // PlantUMLの識別子規則：文字、数字、アンダースコア、日本語を許可
        return /^[a-zA-Z_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]*$/.test(value);
    }
    
    static isValidString(value) {
        if (!value || typeof value !== 'string') return false;
        // 基本的な文字列検証（引用符で囲まれている必要はない）
        return value.length > 0;
    }
    
    static isValidArrow(value) {
        return Object.hasOwnProperty.call(window.ArrowPatterns, value);
    }
    
    static isKeyword(value) {
        return Object.hasOwnProperty.call(window.Keywords, value.toLowerCase());
    }
}

// グローバル変数として設定済み
// window.TokenType, window.Token, window.TokenFactory, window.Keywords, window.ArrowPatterns, window.TokenValidator