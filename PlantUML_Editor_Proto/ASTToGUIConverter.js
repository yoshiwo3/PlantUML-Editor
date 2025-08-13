/**
 * ASTToGUIConverter.js
 * PlantUML ASTからGUIアクションへの変換を行うクラス
 * PlantUMLコード双方向同期機能において、ASTをGUIで編集可能な形式に変換する
 */

// グローバル変数から参照
const IDManager = window.IDManager;

window.ASTToGUIConverter = class ASTToGUIConverter {
    constructor(app) {
        this.app = app;
        this.idManager = new window.IDManager();
        
        // 変換統計
        this.stats = {
            totalConverted: 0,
            messageCount: 0,
            loopCount: 0,
            conditionCount: 0,
            parallelCount: 0,
            noteCount: 0,
            activationCount: 0,
            errors: []
        };
        
        // 変換オプション
        this.options = {
            preserveExistingIds: true,
            generateFallbackActions: true,
            strictValidation: false,
            debugMode: false
        };
    }
    
    /**
     * ASTをGUIアクション配列に変換
     * @param {Object} ast - PlantUML AST
     * @returns {Array} GUIアクション配列
     */
    convertToActions(ast) {
        this.resetStats();
        
        if (!ast) {
            this.addError('AST is null or undefined');
            return [];
        }
        
        const actions = [];
        
        try {
            // アクターの更新
            if (ast.actors && Array.isArray(ast.actors)) {
                this.updateActors(ast.actors);
            }
            
            // ダイアグラムの処理
            if (ast.diagrams && Array.isArray(ast.diagrams)) {
                for (const diagram of ast.diagrams) {
                    const diagramActions = this.convertDiagram(diagram);
                    actions.push(...diagramActions);
                }
            }
            
            // 直接ステートメントがある場合
            if (ast.statements && Array.isArray(ast.statements)) {
                for (const statement of ast.statements) {
                    const action = this.convertStatement(statement);
                    if (action) {
                        actions.push(action);
                    }
                }
            }
            
            // 子ノードの処理
            if (ast.children && Array.isArray(ast.children)) {
                for (const child of ast.children) {
                    const childActions = this.convertNode(child);
                    actions.push(...childActions);
                }
            }
            
            this.stats.totalConverted = actions.length;
            
            if (this.options.debugMode) {
                console.log('AST to GUI conversion completed:', this.stats);
            }
            
            return actions;
            
        } catch (error) {
            this.addError(`AST conversion failed: ${error.message}`);
            console.error('AST conversion error:', error);
            return actions; // 部分的な結果を返す
        }
    }
    
    /**
     * アクターリストを更新
     * @param {Array} actors - アクター配列
     */
    updateActors(actors) {
        if (!this.app) return;
        
        const actorNames = actors
            .filter(actor => actor && actor.name)
            .map(actor => actor.name);
        
        // アプリケーションのアクターリストを更新
        if (this.app.selectedActors) {
            if (Array.isArray(this.app.selectedActors)) {
                this.app.selectedActors.push(...actorNames);
            } else if (this.app.selectedActors instanceof Set) {
                actorNames.forEach(name => this.app.selectedActors.add(name));
            }
        }
    }
    
    /**
     * ダイアグラムノードを変換
     * @param {Object} diagram - ダイアグラムノード
     * @returns {Array} アクション配列
     */
    convertDiagram(diagram) {
        const actions = [];
        
        if (!diagram || !diagram.children) {
            return actions;
        }
        
        for (const child of diagram.children) {
            const childActions = this.convertNode(child);
            actions.push(...childActions);
        }
        
        return actions;
    }
    
    /**
     * ASTノードを変換
     * @param {Object} node - ASTノード
     * @returns {Array} アクション配列
     */
    convertNode(node) {
        if (!node || !node.type) {
            return [];
        }
        
        const action = this.convertStatement(node);
        if (action) {
            return Array.isArray(action) ? action : [action];
        }
        
        return [];
    }
    
    /**
     * ステートメントを変換
     * @param {Object} node - ASTノード
     * @returns {Object|Array|null} 変換されたアクション
     */
    convertStatement(node) {
        if (!node || !node.type) {
            return null;
        }
        
        try {
            switch (node.type) {
                case 'message':
                    return this.convertMessage(node);
                    
                case 'loop':
                    return this.convertLoop(node);
                    
                case 'alt':
                case 'alternative':
                    return this.convertCondition(node);
                    
                case 'par':
                case 'parallel':
                    return this.convertParallel(node);
                    
                case 'note':
                    return this.convertNote(node);
                    
                case 'activation':
                case 'deactivation':
                    return this.convertActivation(node);
                    
                case 'participant':
                case 'actor':
                    return this.convertParticipant(node);
                    
                default:
                    if (this.options.generateFallbackActions) {
                        return this.convertGeneric(node);
                    }
                    this.addError(`Unknown node type: ${node.type}`);
                    return null;
            }
        } catch (error) {
            this.addError(`Statement conversion failed for ${node.type}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * メッセージノードを変換
     * @param {Object} node - メッセージノード
     * @returns {Object} メッセージアクション
     */
    convertMessage(node) {
        const action = {
            type: 'message',
            from: node.from || node.sender || '',
            to: node.to || node.receiver || '',
            message: node.text || node.message || node.label || '',
            id: this.generateOrPreserveId(node)
        };
        
        // 矢印の種類やスタイルを保持
        if (node.arrow) {
            action.arrow = node.arrow;
        }
        if (node.isAsync) {
            action.async = true;
        }
        if (node.isReturn) {
            action.return = true;
        }
        
        this.stats.messageCount++;
        return action;
    }
    
    /**
     * ループノードを変換
     * @param {Object} node - ループノード
     * @returns {Object} ループアクション
     */
    convertLoop(node) {
        const action = {
            type: 'loop',
            condition: node.condition || '',
            actions: [],
            id: this.generateOrPreserveId(node)
        };
        
        // ループ内のアクションを変換
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const childAction = this.convertStatement(child);
                if (childAction) {
                    if (Array.isArray(childAction)) {
                        action.actions.push(...childAction);
                    } else {
                        action.actions.push(childAction);
                    }
                }
            }
        }
        
        // ボディ配列がある場合（alternative parser形式）
        if (node.body && Array.isArray(node.body)) {
            for (const bodyItem of node.body) {
                const bodyAction = this.convertStatement(bodyItem);
                if (bodyAction) {
                    if (Array.isArray(bodyAction)) {
                        action.actions.push(...bodyAction);
                    } else {
                        action.actions.push(bodyAction);
                    }
                }
            }
        }
        
        this.stats.loopCount++;
        return action;
    }
    
    /**
     * 条件分岐ノードを変換
     * @param {Object} node - 条件分岐ノード
     * @returns {Object} 条件分岐アクション
     */
    convertCondition(node) {
        const action = {
            type: 'condition',
            conditions: [],
            id: this.generateOrPreserveId(node)
        };
        
        // ブランチの処理
        if (node.branches && Array.isArray(node.branches)) {
            for (const branch of node.branches) {
                const conditionBranch = {
                    condition: branch.condition || '',
                    actions: []
                };
                
                // ブランチ内のアクションを変換
                if (branch.body && Array.isArray(branch.body)) {
                    for (const bodyItem of branch.body) {
                        const bodyAction = this.convertStatement(bodyItem);
                        if (bodyAction) {
                            if (Array.isArray(bodyAction)) {
                                conditionBranch.actions.push(...bodyAction);
                            } else {
                                conditionBranch.actions.push(bodyAction);
                            }
                        }
                    }
                }
                
                // statements配列がある場合
                if (branch.statements && Array.isArray(branch.statements)) {
                    for (const statement of branch.statements) {
                        const statementAction = this.convertStatement(statement);
                        if (statementAction) {
                            if (Array.isArray(statementAction)) {
                                conditionBranch.actions.push(...statementAction);
                            } else {
                                conditionBranch.actions.push(statementAction);
                            }
                        }
                    }
                }
                
                action.conditions.push(conditionBranch);
            }
        }
        
        // 単純なif-else構造の場合
        if (node.children && Array.isArray(node.children)) {
            const mainBranch = {
                condition: node.condition || '',
                actions: []
            };
            
            for (const child of node.children) {
                const childAction = this.convertStatement(child);
                if (childAction) {
                    if (Array.isArray(childAction)) {
                        mainBranch.actions.push(...childAction);
                    } else {
                        mainBranch.actions.push(childAction);
                    }
                }
            }
            
            action.conditions.push(mainBranch);
        }
        
        this.stats.conditionCount++;
        return action;
    }
    
    /**
     * 並列処理ノードを変換
     * @param {Object} node - 並列処理ノード
     * @returns {Object} 並列処理アクション
     */
    convertParallel(node) {
        const action = {
            type: 'parallel',
            threads: [],
            id: this.generateOrPreserveId(node)
        };
        
        // ブランチの処理
        if (node.branches && Array.isArray(node.branches)) {
            for (const branch of node.branches) {
                const thread = [];
                
                // ブランチ内のアクションを変換
                if (branch.statements && Array.isArray(branch.statements)) {
                    for (const statement of branch.statements) {
                        const statementAction = this.convertStatement(statement);
                        if (statementAction) {
                            if (Array.isArray(statementAction)) {
                                thread.push(...statementAction);
                            } else {
                                thread.push(statementAction);
                            }
                        }
                    }
                }
                
                action.threads.push(thread);
            }
        }
        
        // threads配列が直接ある場合
        if (node.threads && Array.isArray(node.threads)) {
            for (const thread of node.threads) {
                const threadActions = [];
                
                if (Array.isArray(thread)) {
                    for (const threadItem of thread) {
                        const threadAction = this.convertStatement(threadItem);
                        if (threadAction) {
                            if (Array.isArray(threadAction)) {
                                threadActions.push(...threadAction);
                            } else {
                                threadActions.push(threadAction);
                            }
                        }
                    }
                }
                
                action.threads.push(threadActions);
            }
        }
        
        this.stats.parallelCount++;
        return action;
    }
    
    /**
     * ノートノードを変換
     * @param {Object} node - ノートノード
     * @returns {Object} ノートアクション
     */
    convertNote(node) {
        const action = {
            type: 'note',
            text: node.text || node.message || '',
            target: node.target || '',
            side: node.side || 'right',
            id: this.generateOrPreserveId(node)
        };
        
        this.stats.noteCount++;
        return action;
    }
    
    /**
     * アクティベーションノードを変換
     * @param {Object} node - アクティベーションノード
     * @returns {Object} アクティベーションアクション
     */
    convertActivation(node) {
        const action = {
            type: 'activation',
            target: node.target || '',
            activate: node.type === 'activation',
            id: this.generateOrPreserveId(node)
        };
        
        this.stats.activationCount++;
        return action;
    }
    
    /**
     * 参加者ノードを変換
     * @param {Object} node - 参加者ノード
     * @returns {Object} 参加者アクション
     */
    convertParticipant(node) {
        // 参加者は通常、アクションとしてではなくアクターリストに追加される
        if (this.app && this.app.selectedActors) {
            const actorName = node.name || node.value || '';
            if (actorName) {
                if (Array.isArray(this.app.selectedActors)) {
                    if (!this.app.selectedActors.includes(actorName)) {
                        this.app.selectedActors.push(actorName);
                    }
                } else if (this.app.selectedActors instanceof Set) {
                    this.app.selectedActors.add(actorName);
                }
            }
        }
        
        return null; // 参加者はアクションリストには含めない
    }
    
    /**
     * 汎用ノードを変換（フォールバック）
     * @param {Object} node - 汎用ノード
     * @returns {Object} 汎用アクション
     */
    convertGeneric(node) {
        const action = {
            type: 'generic',
            nodeType: node.type,
            data: {
                ...node
            },
            id: this.generateOrPreserveId(node)
        };
        
        // 子ノードがある場合は変換
        if (node.children && Array.isArray(node.children)) {
            action.children = [];
            for (const child of node.children) {
                const childAction = this.convertStatement(child);
                if (childAction) {
                    action.children.push(childAction);
                }
            }
        }
        
        return action;
    }
    
    /**
     * IDを生成または既存IDを保持
     * @param {Object} node - ASTノード
     * @returns {string} ID
     */
    generateOrPreserveId(node) {
        // 既存のIDがある場合は保持
        if (this.options.preserveExistingIds && node.id) {
            return this.idManager.preserveId(this.generateNodeKey(node), node.id);
        }
        
        // 新しいIDを生成
        const key = this.generateNodeKey(node);
        return this.idManager.getOrCreateId(key, node.type || 'action');
    }
    
    /**
     * ノードから一意キーを生成
     * @param {Object} node - ASTノード
     * @returns {string} 一意キー
     */
    generateNodeKey(node) {
        const parts = [];
        
        parts.push(node.type || 'unknown');
        
        if (node.from) parts.push(node.from);
        if (node.to) parts.push(node.to);
        if (node.text) parts.push(node.text);
        if (node.message) parts.push(node.message);
        if (node.condition) parts.push(node.condition);
        if (node.target) parts.push(node.target);
        
        // 位置情報があれば追加
        if (node.position) {
            parts.push(`line:${node.position.line}`, `col:${node.position.column}`);
        }
        
        return parts.join('|');
    }
    
    /**
     * アクションからキーを生成（IDManagerと連携）
     * @param {Object} action - GUIアクション
     * @returns {string} 生成されたキー
     */
    generateActionKey(action) {
        return this.idManager.generateActionKey(action);
    }
    
    /**
     * 統計をリセット
     */
    resetStats() {
        this.stats = {
            totalConverted: 0,
            messageCount: 0,
            loopCount: 0,
            conditionCount: 0,
            parallelCount: 0,
            noteCount: 0,
            activationCount: 0,
            errors: []
        };
    }
    
    /**
     * エラーを追加
     * @param {string} message - エラーメッセージ
     */
    addError(message) {
        this.stats.errors.push({
            message,
            timestamp: Date.now()
        });
        
        if (this.options.debugMode) {
            console.error('ASTToGUIConverter error:', message);
        }
    }
    
    /**
     * 変換統計を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        return {
            ...this.stats,
            idManagerStats: this.idManager.getStatistics()
        };
    }
    
    /**
     * 設定オプションを更新
     * @param {Object} options - 新しいオプション
     */
    setOptions(options) {
        this.options = {
            ...this.options,
            ...options
        };
    }
    
    /**
     * IDマネージャーを取得
     * @returns {IDManager} IDマネージャーインスタンス
     */
    getIdManager() {
        return this.idManager;
    }
    
    /**
     * デバッグ情報を出力
     */
    debug() {
        console.group('ASTToGUIConverter Debug Info');
        console.log('Conversion Statistics:', this.stats);
        console.log('Options:', this.options);
        this.idManager.debug();
        console.groupEnd();
    }
}

// グローバル変数として設定済み