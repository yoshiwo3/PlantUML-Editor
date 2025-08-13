/**
 * PlantUML AST Parser
 * PlantUMLコードをトークン化してASTに変換する
 */

// グローバル変数から参照
const TokenType = window.TokenType;
const Token = window.Token;
const TokenFactory = window.TokenFactory;
const Keywords = window.Keywords;
const ArrowPatterns = window.ArrowPatterns;
const TokenValidator = window.TokenValidator;
const ASTNodeType = window.ASTNodeType;
const ASTNode = window.ASTNode;
const DocumentNode = window.DocumentNode;
const UMLDiagramNode = window.UMLDiagramNode;
const ParticipantNode = window.ParticipantNode;
const MessageNode = window.MessageNode;
const ControlStructureNode = window.ControlStructureNode;
const AlternativeNode = window.AlternativeNode;
const LoopNode = window.LoopNode;
const ParallelNode = window.ParallelNode;
const OptionalNode = window.OptionalNode;
const BranchNode = window.BranchNode;
const NoteNode = window.NoteNode;
const ActivationNode = window.ActivationNode;
const ErrorNode = window.ErrorNode;
const ASTBuilder = window.ASTBuilder;
const ASTUtils = window.ASTUtils;

// レキサー（字句解析器）
window.PlantUMLLexer = class PlantUMLLexer {
    constructor(input) {
        this.input = input || '';
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.errors = [];
    }
    
    // 入力をトークン化
    tokenize() {
        this.tokens = [];
        this.errors = [];
        this.position = 0;
        this.line = 1;
        this.column = 1;
        
        while (!this.isAtEnd()) {
            this.scanToken();
        }
        
        // EOF トークンを追加
        this.tokens.push(TokenFactory.createEOF(this.position));
        
        return {
            tokens: this.tokens,
            errors: this.errors
        };
    }
    
    // 現在位置から1つのトークンをスキャン
    scanToken() {
        const start = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        
        const c = this.advance();
        
        switch (c) {
            case ' ':
            case '\t':
            case '\r':
                // 空白は無視（必要に応じてトークンとして保持）
                break;
            case '\n':
                this.addToken(TokenType.NEWLINE, c, startLine, startColumn, start);
                this.line++;
                this.column = 1;
                break;
            case ':':
                this.addToken(TokenType.COLON, c, startLine, startColumn, start);
                break;
            case ';':
                this.addToken(TokenType.SEMICOLON, c, startLine, startColumn, start);
                break;
            case ',':
                this.addToken(TokenType.COMMA, c, startLine, startColumn, start);
                break;
            case '(':
                this.addToken(TokenType.LPAREN, c, startLine, startColumn, start);
                break;
            case ')':
                this.addToken(TokenType.RPAREN, c, startLine, startColumn, start);
                break;
            case '[':
                this.addToken(TokenType.LBRACKET, c, startLine, startColumn, start);
                break;
            case ']':
                this.addToken(TokenType.RBRACKET, c, startLine, startColumn, start);
                break;
            case '/':
                if (this.match("'")) {
                    this.comment();
                } else if (this.match('-')) {
                    this.arrow(startLine, startColumn, start);
                } else {
                    this.addToken(TokenType.UNKNOWN, c, startLine, startColumn, start);
                }
                break;
            case '-':
                this.arrow(startLine, startColumn, start);
                break;
            case '<':
                this.arrow(startLine, startColumn, start);
                break;
            case '"':
                this.string(startLine, startColumn, start);
                break;
            case '@':
                this.directive(startLine, startColumn, start);
                break;
            default:
                if (this.isAlpha(c)) {
                    this.identifier(startLine, startColumn, start);
                } else if (this.isDigit(c)) {
                    this.number(startLine, startColumn, start);
                } else {
                    this.addToken(TokenType.UNKNOWN, c, startLine, startColumn, start);
                }
                break;
        }
    }
    
    // コメント処理
    comment() {
        const start = this.position - 2; // "/' をカウント
        const startLine = this.line;
        const startColumn = this.column - 2;
        
        // '/ の開始を探す
        while (!this.isAtEnd()) {
            if (this.peek() === "'" && this.peekNext() === '/') {
                this.advance(); // '
                this.advance(); // /
                break;
            }
            if (this.peek() === '\n') this.line++;
            this.advance();
        }
        
        const value = this.input.substring(start, this.position);
        this.addToken(TokenType.COMMENT, value, startLine, startColumn, start);
    }
    
    // 文字列処理
    string(startLine, startColumn, start) {
        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') this.line++;
            this.advance();
        }
        
        if (this.isAtEnd()) {
            this.addError('Unterminated string', startLine, startColumn);
            return;
        }
        
        // 閉じる "
        this.advance();
        
        // 引用符を含まない値を取得
        const value = this.input.substring(start + 1, this.position - 1);
        this.addToken(TokenType.STRING, value, startLine, startColumn, start);
    }
    
    // 矢印処理
    arrow(startLine, startColumn, start) {
        let arrowText = this.input.charAt(this.position - 1);
        
        // 矢印パターンを確認
        while (!this.isAtEnd()) {
            const currentChar = this.peek();
            if (currentChar === '-' || currentChar === '>' || currentChar === '<' || currentChar === '\\') {
                arrowText += this.advance();
            } else {
                break;
            }
        }
        
        // 矢印パターンの検証
        if (ArrowPatterns[arrowText]) {
            this.addToken(TokenType.ARROW, arrowText, startLine, startColumn, start);
        } else {
            // 単なる文字として扱う
            this.position = start + 1; // 1文字だけ進める
            this.addToken(TokenType.UNKNOWN, this.input.charAt(start), startLine, startColumn, start);
        }
    }
    
    // ディレクティブ処理（@startuml, @enduml等）
    directive(startLine, startColumn, start) {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        
        const value = this.input.substring(start, this.position);
        const type = Keywords[value.toLowerCase()] || TokenType.UNKNOWN;
        
        this.addToken(type, value, startLine, startColumn, start);
    }
    
    // 識別子処理
    identifier(startLine, startColumn, start) {
        while (this.isAlphaNumeric(this.peek()) || this.isJapanese(this.peek())) {
            this.advance();
        }
        
        const value = this.input.substring(start, this.position);
        const type = Keywords[value.toLowerCase()] || TokenType.IDENTIFIER;
        
        this.addToken(type, value, startLine, startColumn, start);
    }
    
    // 数値処理
    number(startLine, startColumn, start) {
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        
        // 小数点
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance(); // .
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        
        const value = this.input.substring(start, this.position);
        this.addToken(TokenType.IDENTIFIER, value, startLine, startColumn, start); // 数値も識別子として扱う
    }
    
    // ヘルパーメソッド
    isAtEnd() {
        return this.position >= this.input.length;
    }
    
    advance() {
        if (!this.isAtEnd()) {
            this.column++;
            return this.input.charAt(this.position++);
        }
        return '\0';
    }
    
    match(expected) {
        if (this.isAtEnd()) return false;
        if (this.input.charAt(this.position) !== expected) return false;
        
        this.position++;
        this.column++;
        return true;
    }
    
    peek() {
        if (this.isAtEnd()) return '\0';
        return this.input.charAt(this.position);
    }
    
    peekNext() {
        if (this.position + 1 >= this.input.length) return '\0';
        return this.input.charAt(this.position + 1);
    }
    
    isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }
    
    isDigit(c) {
        return c >= '0' && c <= '9';
    }
    
    isAlphaNumeric(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }
    
    isJapanese(c) {
        const code = c.charCodeAt(0);
        return (code >= 0x3040 && code <= 0x309F) ||  // ひらがな
               (code >= 0x30A0 && code <= 0x30FF) ||  // カタカナ
               (code >= 0x4E00 && code <= 0x9FAF);    // 漢字
    }
    
    addToken(type, value, line, column, start) {
        const token = new Token(type, value, line, column, start);
        this.tokens.push(token);
    }
    
    addError(message, line, column) {
        this.errors.push({
            message,
            line,
            column,
            position: this.position
        });
    }
}

// パーサー（構文解析器）
window.PlantUMLParser = class PlantUMLParser {
    constructor(tokens) {
        this.tokens = tokens || [];
        this.current = 0;
        this.errors = [];
    }
    
    // トークン列をASTに変換
    parse() {
        try {
            const document = ASTBuilder.createDocument();
            
            while (!this.isAtEnd()) {
                // 空行やコメントをスキップ
                if (this.match(TokenType.NEWLINE, TokenType.COMMENT, TokenType.WHITESPACE)) {
                    continue;
                }
                
                // UML図の開始
                if (this.check(TokenType.START_UML)) {
                    const diagram = this.parseUMLDiagram();
                    if (diagram) {
                        document.addDiagram(diagram);
                    }
                } else {
                    // 予期しないトークン
                    this.addError(`Unexpected token: ${this.peek().value}`);
                    this.advance();
                }
            }
            
            return {
                ast: document,
                errors: this.errors
            };
        } catch (error) {
            this.addError(`Parse error: ${error.message}`);
            return {
                ast: null,
                errors: this.errors
            };
        }
    }
    
    // UML図の解析
    parseUMLDiagram() {
        const startToken = this.advance(); // @startuml
        const diagram = ASTBuilder.createUMLDiagram(this.getPosition(startToken));
        
        while (!this.isAtEnd() && !this.check(TokenType.END_UML)) {
            if (this.match(TokenType.NEWLINE, TokenType.COMMENT, TokenType.WHITESPACE)) {
                continue;
            }
            
            const statement = this.parseStatement();
            if (statement) {
                diagram.addChild(statement);
            }
        }
        
        // @enduml の確認
        if (this.check(TokenType.END_UML)) {
            this.advance();
        } else {
            this.addError('Expected @enduml');
        }
        
        return diagram;
    }
    
    // ステートメントの解析
    parseStatement() {
        try {
            // 参加者定義
            if (this.current < this.tokens.length && this.peek().isParticipantDefinition()) {
                return this.parseParticipantDeclaration();
            }
            
            // タイトル
            if (this.check(TokenType.TITLE)) {
                return this.parseTitle();
            }
            
            // ノート
            if (this.check(TokenType.NOTE)) {
                return this.parseNote();
            }
            
            // 制御構造
            if (this.check(TokenType.ALT_START)) {
                return this.parseAlternative();
            }
            if (this.check(TokenType.LOOP_START)) {
                return this.parseLoop();
            }
            if (this.check(TokenType.PAR_START)) {
                return this.parseParallel();
            }
            if (this.check(TokenType.OPT_START)) {
                return this.parseOptional();
            }
            
            // アクティベーション
            if (this.check(TokenType.ACTIVATE)) {
                return this.parseActivation();
            }
            if (this.check(TokenType.DEACTIVATE)) {
                return this.parseDeactivation();
            }
            
            // メッセージ（デフォルト）
            return this.parseMessage();
            
        } catch (error) {
            this.addError(`Error parsing statement: ${error.message}`);
            this.synchronize();
            return null;
        }
    }
    
    // 参加者宣言の解析
    parseParticipantDeclaration() {
        const typeToken = this.advance();
        
        if (!this.check(TokenType.IDENTIFIER)) {
            this.addError('Expected participant name');
            return null;
        }
        
        const nameToken = this.advance();
        let alias = null;
        
        // "as" エイリアスの確認
        if (this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === 'as') {
            this.advance(); // as
            if (this.check(TokenType.IDENTIFIER)) {
                alias = this.advance().value;
            }
        }
        
        const participant = ASTBuilder.createParticipant(
            typeToken.type,
            nameToken.value,
            alias,
            this.getPosition(typeToken)
        );
        
        return participant;
    }
    
    // メッセージの解析
    parseMessage() {
        // 送信者
        if (!this.check(TokenType.IDENTIFIER)) {
            this.addError('Expected message sender');
            return null;
        }
        
        const fromToken = this.advance();
        
        // 矢印
        if (!this.check(TokenType.ARROW)) {
            this.addError('Expected arrow');
            return null;
        }
        
        const arrowToken = this.advance();
        
        // 受信者
        if (!this.check(TokenType.IDENTIFIER)) {
            this.addError('Expected message receiver');
            return null;
        }
        
        const toToken = this.advance();
        
        // コロンとメッセージテキスト
        let messageText = '';
        if (this.check(TokenType.COLON)) {
            this.advance(); // :
            if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
                messageText = this.advance().value;
            }
        }
        
        const message = ASTBuilder.createMessage(
            fromToken.value,
            toToken.value,
            messageText,
            arrowToken.value,
            this.getPosition(fromToken)
        );
        
        // 矢印の種類に応じて属性を設定
        const arrowInfo = ArrowPatterns[arrowToken.value];
        if (arrowInfo) {
            if (arrowInfo.type === 'async') {
                message.setAsync(true);
            }
            if (arrowInfo.type === 'return') {
                message.setReturn(true);
            }
        }
        
        return message;
    }
    
    // タイトルの解析
    parseTitle() {
        const titleToken = this.advance(); // title
        
        let titleText = '';
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
            titleText = this.advance().value;
        }
        
        const titleNode = new ASTNode(ASTNodeType.TITLE, this.getPosition(titleToken));
        titleNode.metadata.text = titleText;
        
        return titleNode;
    }
    
    // ノートの解析
    parseNote() {
        const noteToken = this.advance(); // note
        
        // note の位置指定（left, right, over）
        let side = 'right';
        let target = null;
        
        if (this.check(TokenType.IDENTIFIER)) {
            const sideOrTarget = this.peek().value.toLowerCase();
            if (['left', 'right', 'over'].includes(sideOrTarget)) {
                side = sideOrTarget;
                this.advance();
                
                // of target
                if (this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === 'of') {
                    this.advance(); // of
                    if (this.check(TokenType.IDENTIFIER)) {
                        target = this.advance().value;
                    }
                }
            } else {
                target = this.advance().value;
            }
        }
        
        // コロンとノートテキスト
        let noteText = '';
        if (this.check(TokenType.COLON)) {
            this.advance(); // :
            if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
                noteText = this.advance().value;
            }
        }
        
        const note = ASTBuilder.createNote(noteText, target, this.getPosition(noteToken));
        note.setSide(side);
        
        return note;
    }
    
    // Alternative（alt）の解析（拡張版 - 複数elseブランチ対応）
    parseAlt() {
        const altToken = this.advance(); // alt
        
        let condition = '';
        // 条件文の完全な取得
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
            condition = this.collectCompleteCondition();
        }
        
        const alternative = ASTBuilder.createAlternative(condition, this.getPosition(altToken));
        
        // メインブランチの解析
        const mainBranch = ASTBuilder.createBranch(ASTNodeType.ALTERNATIVE_BRANCH, condition);
        const mainStatements = this.parseBlock(TokenType.ALT_ELSE, TokenType.ALT_END);
        mainStatements.forEach(statement => {
            if (statement) {
                mainBranch.addStatement(statement);
            }
        });
        alternative.addBranch(mainBranch);
        
        // 複数のelseブランチを処理
        while (this.check(TokenType.ALT_ELSE)) {
            this.advance(); // else
            
            let elseCondition = '';
            if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
                elseCondition = this.collectCompleteCondition();
            }
            
            const elseBranch = ASTBuilder.createBranch(ASTNodeType.ALTERNATIVE_BRANCH, elseCondition);
            const elseStatements = this.parseBlock(TokenType.ALT_ELSE, TokenType.ALT_END);
            elseStatements.forEach(statement => {
                if (statement) {
                    elseBranch.addStatement(statement);
                }
            });
            alternative.addBranch(elseBranch);
        }
        
        // end の確認
        if (this.check(TokenType.ALT_END)) {
            this.advance();
        } else {
            this.addError('Expected end for alt block');
        }
        
        return alternative;
    }
    
    // Alternative（alt）の解析（後方互換性のため残す）
    parseAlternative() {
        return this.parseAlt();
    }
    
    // Loop の解析（拡張版 - ネスト対応）
    parseLoop() {
        const loopToken = this.advance(); // loop
        
        let condition = '';
        // 条件文の完全な取得（複数トークンにまたがる場合を考慮）
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
            condition = this.collectCompleteCondition();
        }
        
        const loop = ASTBuilder.createLoop(condition, this.getPosition(loopToken));
        
        // ネスト構造を考慮したブロック解析
        const blockStatements = this.parseBlock(TokenType.LOOP_END);
        blockStatements.forEach(statement => {
            if (statement) {
                loop.addChild(statement);
            }
        });
        
        // end の確認
        if (this.check(TokenType.LOOP_END)) {
            this.advance();
        } else {
            this.addError('Expected end for loop block');
        }
        
        return loop;
    }
    
    // Parallel（par）の解析（拡張版 - 複数ブランチとネスト対応）
    parsePar() {
        const parToken = this.advance(); // par
        
        const parallel = ASTBuilder.createParallel(this.getPosition(parToken));
        
        // 最初のブランチの解析
        const firstBranch = ASTBuilder.createBranch(ASTNodeType.PARALLEL_BRANCH);
        const firstStatements = this.parseBlock(TokenType.PAR_ELSE, TokenType.PAR_END);
        firstStatements.forEach(statement => {
            if (statement) {
                firstBranch.addStatement(statement);
            }
        });
        parallel.addBranch(firstBranch);
        
        // 追加のパラレルブランチ（複数のelse対応）
        while (this.check(TokenType.PAR_ELSE)) {
            this.advance(); // else
            
            const elseBranch = ASTBuilder.createBranch(ASTNodeType.PARALLEL_BRANCH);
            const elseStatements = this.parseBlock(TokenType.PAR_ELSE, TokenType.PAR_END);
            elseStatements.forEach(statement => {
                if (statement) {
                    elseBranch.addStatement(statement);
                }
            });
            parallel.addBranch(elseBranch);
        }
        
        // end の確認
        if (this.check(TokenType.PAR_END)) {
            this.advance();
        } else {
            this.addError('Expected end for par block');
        }
        
        return parallel;
    }
    
    // Parallel（par）の解析（後方互換性のため残す）
    parseParallel() {
        return this.parsePar();
    }
    
    // Optional（opt）の解析
    parseOptional() {
        const optToken = this.advance(); // opt
        
        let condition = '';
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
            condition = this.advance().value;
        }
        
        const optional = ASTBuilder.createOptional(condition, this.getPosition(optToken));
        
        // opt の内容
        while (!this.isAtEnd() && !this.check(TokenType.OPT_END)) {
            if (this.match(TokenType.NEWLINE, TokenType.COMMENT, TokenType.WHITESPACE)) {
                continue;
            }
            const statement = this.parseStatement();
            if (statement) {
                optional.addChild(statement);
            }
        }
        
        // end
        if (this.check(TokenType.OPT_END)) {
            this.advance();
        } else {
            this.addError('Expected end for opt block');
        }
        
        return optional;
    }
    
    // アクティベーションの解析
    parseActivation() {
        const activateToken = this.advance(); // activate
        
        if (!this.check(TokenType.IDENTIFIER)) {
            this.addError('Expected target for activation');
            return null;
        }
        
        const target = this.advance().value;
        
        return ASTBuilder.createActivation(
            ASTNodeType.ACTIVATION,
            target,
            this.getPosition(activateToken)
        );
    }
    
    // ディアクティベーションの解析
    parseDeactivation() {
        const deactivateToken = this.advance(); // deactivate
        
        if (!this.check(TokenType.IDENTIFIER)) {
            this.addError('Expected target for deactivation');
            return null;
        }
        
        const target = this.advance().value;
        
        return ASTBuilder.createActivation(
            ASTNodeType.DEACTIVATION,
            target,
            this.getPosition(deactivateToken)
        );
    }
    
    // ヘルパーメソッド
    isAtEnd() {
        return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
    }
    
    peek() {
        if (this.current >= this.tokens.length) {
            return TokenFactory.createEOF();
        }
        return this.tokens[this.current];
    }
    
    previous() {
        return this.tokens[this.current - 1];
    }
    
    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }
    
    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }
    
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    
    synchronize() {
        this.advance();
        
        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.NEWLINE) return;
            
            switch (this.peek().type) {
                case TokenType.START_UML:
                case TokenType.END_UML:
                case TokenType.PARTICIPANT:
                case TokenType.ACTOR:
                case TokenType.ALT_START:
                case TokenType.LOOP_START:
                case TokenType.PAR_START:
                case TokenType.OPT_START:
                    return;
            }
            
            this.advance();
        }
    }
    
    getPosition(token) {
        return {
            line: token.line,
            column: token.column,
            start: token.position,
            end: token.position + token.length
        };
    }
    
    addError(message) {
        const token = this.peek();
        this.errors.push({
            message,
            line: token.line,
            column: token.column,
            position: token.position,
            token: token
        });
    }
    
    // 複雑構造解析用のヘルパーメソッド
    
    // 対応するendトークンを見つける（ネスト対応）
    findMatchingEnd(startType, endType) {
        let nestLevel = 1;
        let current = this.current;
        
        while (current < this.tokens.length && nestLevel > 0) {
            const token = this.tokens[current];
            
            if (token.type === startType) {
                nestLevel++;
            } else if (token.type === endType) {
                nestLevel--;
            }
            
            current++;
        }
        
        return nestLevel === 0 ? current - 1 : -1; // -1 if not found
    }
    
    // ブロック内のステートメント解析（複数の終了条件対応）
    parseBlock(...endTypes) {
        const statements = [];
        
        while (!this.isAtEnd() && !this.checkAny(...endTypes)) {
            if (this.match(TokenType.NEWLINE, TokenType.COMMENT, TokenType.WHITESPACE)) {
                continue;
            }
            
            const statement = this.parseStatement();
            if (statement) {
                statements.push(statement);
            }
        }
        
        return statements;
    }
    
    // 複数のトークンタイプをチェック
    checkAny(...types) {
        for (const type of types) {
            if (this.check(type)) {
                return true;
            }
        }
        return false;
    }
    
    // 完全な条件文を取得（空白を含む複数トークンにまたがる場合）
    collectCompleteCondition() {
        let condition = '';
        
        // 最初のトークンを取得
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
            condition = this.advance().value;
        }
        
        // 続くトークンがある場合は結合
        while (!this.isAtEnd() && 
               !this.check(TokenType.NEWLINE) && 
               !this.checkAny(TokenType.ALT_ELSE, TokenType.ALT_END, TokenType.LOOP_END, TokenType.PAR_ELSE, TokenType.PAR_END, TokenType.OPT_END)) {
            
            const token = this.peek();
            if (token.type === TokenType.IDENTIFIER || 
                token.type === TokenType.STRING || 
                token.type === TokenType.ARROW ||
                token.type === TokenType.COLON ||
                token.type === TokenType.COMMA) {
                condition += ' ' + this.advance().value;
            } else {
                break;
            }
        }
        
        return condition.trim();
    }
    
    // ネストレベルを考慮したブロック境界の検出
    isBlockBoundary(token) {
        const blockStarts = [
            TokenType.ALT_START, TokenType.LOOP_START, TokenType.PAR_START, TokenType.OPT_START
        ];
        const blockEnds = [
            TokenType.ALT_END, TokenType.LOOP_END, TokenType.PAR_END, TokenType.OPT_END
        ];
        const blockElses = [
            TokenType.ALT_ELSE, TokenType.PAR_ELSE
        ];
        
        return blockStarts.includes(token.type) || 
               blockEnds.includes(token.type) || 
               blockElses.includes(token.type);
    }
    
    // より安全なステートメント解析（エラー耐性向上）
    parseStatementSafely() {
        try {
            return this.parseStatement();
        } catch (error) {
            this.addError(`Statement parsing error: ${error.message}`);
            // エラー回復: 次の安全な位置まで進む
            this.recoverToNextStatement();
            return null;
        }
    }
    
    // エラー回復: 次の安全なステートメント位置まで進む
    recoverToNextStatement() {
        while (!this.isAtEnd()) {
            const token = this.peek();
            
            // 新しい行、または構造の境界で停止
            if (token.type === TokenType.NEWLINE || this.isBlockBoundary(token)) {
                break;
            }
            
            this.advance();
        }
    }
}

// 統合パーサークラス
window.PlantUMLASTParser = class PlantUMLASTParser {
    constructor() {
        this.lexer = null;
        this.parser = null;
        this.lastResult = null;
    }
    
    // PlantUMLコードをパースしてASTを生成
    parse(input) {
        try {
            // 字句解析
            this.lexer = new window.PlantUMLLexer(input);
            const lexResult = this.lexer.tokenize();
            
            if (lexResult.errors.length > 0) {
                console.warn('Lexical analysis errors:', lexResult.errors);
            }
            
            // 構文解析
            this.parser = new window.PlantUMLParser(lexResult.tokens);
            const parseResult = this.parser.parse();
            
            // 結果を統合
            this.lastResult = {
                input: input,
                tokens: lexResult.tokens,
                ast: parseResult.ast,
                errors: [...lexResult.errors, ...parseResult.errors],
                statistics: parseResult.ast ? ASTUtils.getStatistics(parseResult.ast) : null
            };
            
            return this.lastResult;
            
        } catch (error) {
            this.lastResult = {
                input: input,
                tokens: [],
                ast: null,
                errors: [{
                    message: `Parser error: ${error.message}`,
                    line: 0,
                    column: 0,
                    position: 0
                }],
                statistics: null
            };
            
            return this.lastResult;
        }
    }
    
    // 最後のパース結果を取得
    getLastResult() {
        return this.lastResult;
    }
    
    // エラーがあるかチェック
    hasErrors() {
        return this.lastResult && this.lastResult.errors.length > 0;
    }
    
    // エラー一覧を取得
    getErrors() {
        return this.lastResult ? this.lastResult.errors : [];
    }
    
    // 統計情報を取得
    getStatistics() {
        return this.lastResult ? this.lastResult.statistics : null;
    }
    
    // AST を可視化用の JSON に変換
    toJSON() {
        if (!this.lastResult || !this.lastResult.ast) {
            return null;
        }
        
        return this.lastResult.ast.toJSON();
    }
}

// グローバル変数として設定済み
// window.PlantUMLLexer, window.PlantUMLParser, window.PlantUMLASTParser