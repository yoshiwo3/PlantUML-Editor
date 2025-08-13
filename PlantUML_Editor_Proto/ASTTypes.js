/**
 * PlantUML AST (Abstract Syntax Tree) 型定義
 * PlantUMLコードの構文解析結果を表現するAST型を定義
 */

// AST ノードタイプの定義
window.ASTNodeType = Object.freeze({
    // ドキュメント構造
    DOCUMENT: 'DOCUMENT',                    // ルートドキュメント
    UML_DIAGRAM: 'UML_DIAGRAM',             // @startuml...@enduml
    
    // メタ情報
    TITLE: 'TITLE',                         // タイトル宣言
    SKINPARAM: 'SKINPARAM',                 // スキンパラメータ
    
    // 参加者定義
    PARTICIPANT_DECLARATION: 'PARTICIPANT_DECLARATION',  // participant宣言
    ACTOR_DECLARATION: 'ACTOR_DECLARATION',              // actor宣言
    BOUNDARY_DECLARATION: 'BOUNDARY_DECLARATION',        // boundary宣言
    CONTROL_DECLARATION: 'CONTROL_DECLARATION',          // control宣言
    ENTITY_DECLARATION: 'ENTITY_DECLARATION',            // entity宣言
    DATABASE_DECLARATION: 'DATABASE_DECLARATION',        // database宣言
    
    // メッセージとコミュニケーション
    MESSAGE: 'MESSAGE',                     // メッセージ送信
    NOTE: 'NOTE',                          // ノート
    AUTONUMBER: 'AUTONUMBER',              // 自動番号
    
    // 制御構造
    ALTERNATIVE: 'ALTERNATIVE',             // alt...else...end
    ALTERNATIVE_BRANCH: 'ALTERNATIVE_BRANCH', // altのブランチ
    LOOP: 'LOOP',                          // loop...end
    PARALLEL: 'PARALLEL',                  // par...else...end
    PARALLEL_BRANCH: 'PARALLEL_BRANCH',    // parのブランチ
    OPTIONAL: 'OPTIONAL',                  // opt...end
    BREAK: 'BREAK',                        // break...end
    CRITICAL: 'CRITICAL',                  // critical...end
    GROUP: 'GROUP',                        // group...end
    
    // アクティベーション
    ACTIVATION: 'ACTIVATION',              // activate
    DEACTIVATION: 'DEACTIVATION',          // deactivate
    
    // コメント
    COMMENT: 'COMMENT',                    // コメント
    
    // 基本要素
    IDENTIFIER: 'IDENTIFIER',              // 識別子
    STRING_LITERAL: 'STRING_LITERAL',      // 文字列リテラル
    
    // エラー・不明
    ERROR: 'ERROR',                        // パースエラー
    UNKNOWN: 'UNKNOWN'                     // 不明なノード
});

// ベースASTノードクラス
window.ASTNode = class ASTNode {
    constructor(type, position = null) {
        this.type = type;
        this.position = position || { line: 0, column: 0, start: 0, end: 0 };
        this.parent = null;
        this.children = [];
        this.metadata = {};
        this.errors = [];
    }
    
    // 子ノードを追加
    addChild(node) {
        if (node instanceof window.ASTNode) {
            node.parent = this;
            this.children.push(node);
        }
        return this;
    }
    
    // 子ノードを削除
    removeChild(node) {
        const index = this.children.indexOf(node);
        if (index !== -1) {
            this.children.splice(index, 1);
            node.parent = null;
        }
        return this;
    }
    
    // 特定タイプの子ノードを検索
    findChildren(type) {
        return this.children.filter(child => child.type === type);
    }
    
    // 最初の特定タイプの子ノードを取得
    findChild(type) {
        return this.children.find(child => child.type === type) || null;
    }
    
    // ノードの深度優先探索
    traverse(callback) {
        callback(this);
        this.children.forEach(child => child.traverse(callback));
    }
    
    // ノードのクローン作成
    clone() {
        const cloned = new this.constructor(this.type, { ...this.position });
        cloned.metadata = { ...this.metadata };
        cloned.errors = [...this.errors];
        this.children.forEach(child => cloned.addChild(child.clone()));
        return cloned;
    }
    
    // エラーの追加
    addError(message, severity = 'error') {
        this.errors.push({
            message,
            severity,
            position: this.position,
            timestamp: new Date()
        });
    }
    
    // ノードの検証
    validate() {
        const errors = [];
        
        // 基本検証
        if (!this.type || !Object.values(window.ASTNodeType).includes(this.type)) {
            errors.push(`Invalid node type: ${this.type}`);
        }
        
        // 子ノードの検証
        this.children.forEach(child => {
            errors.push(...child.validate());
        });
        
        return errors;
    }
    
    // JSON表現に変換
    toJSON() {
        return {
            type: this.type,
            position: this.position,
            metadata: this.metadata,
            errors: this.errors,
            children: this.children.map(child => child.toJSON())
        };
    }
    
    // 文字列表現
    toString() {
        return `${this.type}(${this.children.length} children)`;
    }
}

// ドキュメントノード
window.DocumentNode = class DocumentNode extends window.ASTNode {
    constructor(position) {
        super(window.ASTNodeType.DOCUMENT, position);
        this.diagrams = [];
    }
    
    addDiagram(diagram) {
        this.diagrams.push(diagram);
        return this.addChild(diagram);
    }
    
    getDiagrams() {
        return this.diagrams;
    }
}

// UML図ノード
window.UMLDiagramNode = class UMLDiagramNode extends window.ASTNode {
    constructor(position) {
        super(window.ASTNodeType.UML_DIAGRAM, position);
        this.title = null;
        this.participants = new Map();
        this.messages = [];
        this.controlStructures = [];
    }
    
    setTitle(title) {
        this.title = title;
    }
    
    addParticipant(participant) {
        this.participants.set(participant.name, participant);
        return this.addChild(participant);
    }
    
    getParticipant(name) {
        return this.participants.get(name);
    }
    
    addMessage(message) {
        this.messages.push(message);
        return this.addChild(message);
    }
    
    addControlStructure(structure) {
        this.controlStructures.push(structure);
        return this.addChild(structure);
    }
}

// 参加者宣言ノード
window.ParticipantNode = class ParticipantNode extends window.ASTNode {
    constructor(type, name, alias = null, position = null) {
        super(type, position);
        this.name = name;
        this.alias = alias;
        this.stereotype = null;
        this.color = null;
    }
    
    setStereotype(stereotype) {
        this.stereotype = stereotype;
        return this;
    }
    
    setColor(color) {
        this.color = color;
        return this;
    }
    
    toString() {
        return `${this.type}(${this.name}${this.alias ? ` as ${this.alias}` : ''})`;
    }
}

// メッセージノード
window.MessageNode = class MessageNode extends window.ASTNode {
    constructor(from, to, text, arrow, position = null) {
        super(window.ASTNodeType.MESSAGE, position);
        this.from = from;
        this.to = to;
        this.text = text;
        this.arrow = arrow;
        this.isAsync = false;
        this.isReturn = false;
        this.activationBox = null;
    }
    
    setAsync(isAsync = true) {
        this.isAsync = isAsync;
        return this;
    }
    
    setReturn(isReturn = true) {
        this.isReturn = isReturn;
        return this;
    }
    
    setActivationBox(activationBox) {
        this.activationBox = activationBox;
        return this;
    }
    
    toString() {
        return `Message(${this.from} ${this.arrow} ${this.to}: ${this.text})`;
    }
}

// 制御構造ノード
window.ControlStructureNode = class ControlStructureNode extends window.ASTNode {
    constructor(type, condition = null, position = null) {
        super(type, position);
        this.condition = condition;
        this.branches = [];
    }
    
    addBranch(branch) {
        this.branches.push(branch);
        return this.addChild(branch);
    }
    
    getBranches() {
        return this.branches;
    }
}

// 代替（alt）ノード
window.AlternativeNode = class AlternativeNode extends window.ControlStructureNode {
    constructor(condition, position = null) {
        super(window.ASTNodeType.ALTERNATIVE, condition, position);
        this.elseCondition = null;
    }
    
    setElseCondition(condition) {
        this.elseCondition = condition;
        return this;
    }
}

// ループノード
window.LoopNode = class LoopNode extends window.ControlStructureNode {
    constructor(condition, position = null) {
        super(window.ASTNodeType.LOOP, condition, position);
    }
}

// 並列（par）ノード
window.ParallelNode = class ParallelNode extends window.ControlStructureNode {
    constructor(position = null) {
        super(window.ASTNodeType.PARALLEL, null, position);
    }
}

// オプショナル（opt）ノード
window.OptionalNode = class OptionalNode extends window.ControlStructureNode {
    constructor(condition, position = null) {
        super(window.ASTNodeType.OPTIONAL, condition, position);
    }
}

// ブランチノード
window.BranchNode = class BranchNode extends window.ASTNode {
    constructor(type, condition = null, position = null) {
        super(type, position);
        this.condition = condition;
        this.statements = [];
    }
    
    addStatement(statement) {
        this.statements.push(statement);
        return this.addChild(statement);
    }
}

// ノートノード
window.NoteNode = class NoteNode extends window.ASTNode {
    constructor(text, target = null, position = null) {
        super(window.ASTNodeType.NOTE, position);
        this.text = text;
        this.target = target;
        this.side = 'right'; // 'left', 'right', 'over'
    }
    
    setSide(side) {
        this.side = side;
        return this;
    }
}

// アクティベーションノード
window.ActivationNode = class ActivationNode extends window.ASTNode {
    constructor(type, target, position = null) {
        super(type, position);
        this.target = target;
    }
}

// エラーノード
window.ErrorNode = class ErrorNode extends window.ASTNode {
    constructor(message, token = null, position = null) {
        super(window.ASTNodeType.ERROR, position);
        this.message = message;
        this.token = token;
        this.severity = 'error';
    }
    
    setSeverity(severity) {
        this.severity = severity;
        return this;
    }
    
    toString() {
        return `ErrorNode(${this.message})`;
    }
}

// AST構築ヘルパークラス
window.ASTBuilder = class ASTBuilder {
    static createDocument(position = null) {
        return new window.DocumentNode(position);
    }
    
    static createUMLDiagram(position = null) {
        return new window.UMLDiagramNode(position);
    }
    
    static createParticipant(type, name, alias = null, position = null) {
        return new window.ParticipantNode(type, name, alias, position);
    }
    
    static createMessage(from, to, text, arrow, position = null) {
        return new window.MessageNode(from, to, text, arrow, position);
    }
    
    static createAlternative(condition, position = null) {
        return new window.AlternativeNode(condition, position);
    }
    
    static createLoop(condition, position = null) {
        return new window.LoopNode(condition, position);
    }
    
    static createParallel(position = null) {
        return new window.ParallelNode(position);
    }
    
    static createOptional(condition, position = null) {
        return new window.OptionalNode(condition, position);
    }
    
    static createBranch(type, condition = null, position = null) {
        return new window.BranchNode(type, condition, position);
    }
    
    static createNote(text, target = null, position = null) {
        return new window.NoteNode(text, target, position);
    }
    
    static createActivation(type, target, position = null) {
        return new window.ActivationNode(type, target, position);
    }
    
    static createError(message, token = null, position = null) {
        return new window.ErrorNode(message, token, position);
    }
}

// AST操作ユーティリティ
window.ASTUtils = class ASTUtils {
    // AST全体を検索
    static findNodes(root, predicate) {
        const results = [];
        root.traverse(node => {
            if (predicate(node)) {
                results.push(node);
            }
        });
        return results;
    }
    
    // 特定タイプのノードを検索
    static findNodesByType(root, type) {
        return this.findNodes(root, node => node.type === type);
    }
    
    // 参加者一覧を取得
    static getParticipants(root) {
        const participants = new Map();
        this.findNodes(root, node => {
            if (node instanceof window.ParticipantNode) {
                participants.set(node.name, node);
            }
            return false;
        });
        return participants;
    }
    
    // メッセージ一覧を取得
    static getMessages(root) {
        return this.findNodes(root, node => node instanceof window.MessageNode);
    }
    
    // エラー一覧を取得
    static getErrors(root) {
        const errors = [];
        root.traverse(node => {
            errors.push(...node.errors);
            if (node instanceof window.ErrorNode) {
                errors.push({
                    message: node.message,
                    severity: node.severity,
                    position: node.position,
                    token: node.token
                });
            }
        });
        return errors;
    }
    
    // AST統計情報を取得
    static getStatistics(root) {
        const stats = {
            totalNodes: 0,
            nodeTypes: new Map(),
            participants: 0,
            messages: 0,
            controlStructures: 0,
            errors: 0
        };
        
        root.traverse(node => {
            stats.totalNodes++;
            
            const count = stats.nodeTypes.get(node.type) || 0;
            stats.nodeTypes.set(node.type, count + 1);
            
            if (node instanceof window.ParticipantNode) stats.participants++;
            if (node instanceof window.MessageNode) stats.messages++;
            if (node instanceof window.ControlStructureNode) stats.controlStructures++;
            if (node instanceof window.ErrorNode) stats.errors++;
        });
        
        return stats;
    }
}

// グローバル変数として設定済み
// window.ASTNodeType, window.ASTNode, window.DocumentNode, 
// window.UMLDiagramNode, window.ParticipantNode, window.MessageNode,
// window.ControlStructureNode, window.AlternativeNode, window.LoopNode,
// window.ParallelNode, window.OptionalNode, window.BranchNode,
// window.NoteNode, window.ActivationNode, window.ErrorNode,
// window.ASTBuilder, window.ASTUtils