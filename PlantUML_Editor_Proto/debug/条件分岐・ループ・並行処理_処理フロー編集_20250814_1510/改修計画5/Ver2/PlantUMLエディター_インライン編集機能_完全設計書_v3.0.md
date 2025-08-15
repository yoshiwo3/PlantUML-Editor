# PlantUMLエディター インライン編集機能 完全設計書 v3.0

**作成日**: 2025年8月15日  
**バージョン**: 3.0  
**作成者**: spec-implementation-auditor  
**目的**: 設計書不足点分析レポートで特定された14カテゴリの欠落項目を完全にカバーする設計書

---

# Part A: 設計概要

## 1. プロジェクト概要

### 1.1 機能概要
```yaml
機能名: PlantUMLエディター インライン編集機能
バージョン: v3.0.0
種別: 追加機能開発
優先度: 高
対象: PlantUML Editor Proto
```

### 1.2 背景と目的
```
解決する問題:
- 既存の設計書にインライン編集UIの具体的な仕様が90%以上欠落
- 実装（inline-edit-prototype.html）と設計書の間に重大な乖離が存在
- UIコンポーネントの詳細仕様が未定義

提供する価値:
- 直感的なPlantUML編集インターフェース
- ドラッグ&ドロップによる順序変更
- リアルタイムプレビュー連携
- 条件分岐・ループ・並行処理の視覚的編集

成功基準（測定可能）:
□ 全14カテゴリの欠落項目を100%カバー
□ 実装と設計書の整合性100%達成
□ ユーザビリティテスト合格率90%以上
```

### 1.3 機能要件【完全リスト】
```
必須機能:
□ F001: アクション項目の7要素構成によるインライン編集
□ F002: 条件確認機能（？ボタン）による条件付与
□ F003: 4種類の矢印タイプ選択（同期、非同期、リターン、非同期リターン）
□ F004: ドラッグ&ドロップによるアクション順序変更
□ F005: 条件分岐ブロックの展開/折りたたみ制御
□ F006: ループブロックの条件入力と内部アクション管理
□ F007: 並行処理のスレッドタブシステム
□ F008: STEPコンテナによる3段階処理フロー
□ F009: PlantUMLコード自動生成
□ F010: 一括展開/折りたたみ機能

オプション機能:
□ F101: アクションのコピー&ペースト
□ F102: テンプレートからの挿入
□ F103: 履歴管理（Undo/Redo）
```

### 1.4 非機能要件
```
パフォーマンス:
- レスポンス時間: 50ms以内（UI操作）
- 同時編集アクション数: 100件以上
- PlantUML生成時間: 500ms以内

セキュリティ:
- XSS対策: 入力値のサニタイズ
- CSRF対策: トークン検証
- データ検証: クライアント/サーバー両側

信頼性:
- ブラウザ互換性: Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
- エラー復旧: 自動保存機能
- データ整合性: リアルタイム検証
```

## 2. 機能設計

### 2.1 インライン編集コンポーネント仕様

#### 2.1.1 アクション項目の7要素構成
```javascript
const ActionItemStructure = {
    components: [
        {
            name: "dragHandle",
            type: "icon",
            display: "☰",
            purpose: "ドラッグによる順序変更",
            style: {
                cursor: "move",
                color: "#bdbdbd",
                userSelect: "none"
            }
        },
        {
            name: "actorFromSelect",
            type: "select",
            options: ["User", "System", "DB", "API"],
            defaultValue: "User",
            style: {
                minWidth: "60px",
                maxWidth: "80px"
            }
        },
        {
            name: "arrowTypeSelect",
            type: "select",
            options: [
                { value: "sync", display: "→", label: "同期" },
                { value: "async", display: "⇢", label: "非同期" },
                { value: "return", display: "⟵", label: "リターン" },
                { value: "async-return", display: "⟸", label: "非同期リターン" }
            ],
            defaultValue: "sync"
        },
        {
            name: "actorToSelect",
            type: "select",
            options: ["User", "System", "DB", "API"],
            defaultValue: "System"
        },
        {
            name: "messageInput",
            type: "text",
            placeholder: "メッセージ",
            maxLength: null,
            style: {
                flex: 1,
                fontSize: "12px"
            }
        },
        {
            name: "deleteButton",
            type: "button",
            display: "×",
            action: "deleteAction",
            style: {
                color: "#f44336",
                hoverBackground: "rgba(244, 67, 54, 0.1)"
            }
        },
        {
            name: "questionButton",
            type: "button",
            display: "？",
            action: "toggleQuestion",
            states: {
                normal: {
                    color: "#ff9800",
                    background: "transparent"
                },
                active: {
                    color: "white",
                    background: "#ff9800"
                }
            }
        }
    ]
};
```

#### 2.1.2 条件確認機能（？ボタン）詳細仕様
```javascript
const QuestionButtonSpecification = {
    purpose: "アクションに条件を付与する機能",
    behavior: {
        onClick: "toggleQuestion(this)",
        toggle: {
            inactive: {
                state: "normal",
                plantUMLOutput: "",
                tooltip: "条件を追加"
            },
            active: {
                state: "active",
                plantUMLOutput: "?",
                tooltip: "条件付きアクション"
            }
        }
    },
    styling: {
        normal: {
            color: "#ff9800",
            background: "transparent",
            border: "1px solid #ff9800"
        },
        active: {
            color: "white",
            background: "#ff9800",
            border: "1px solid #ff9800"
        },
        hover: {
            opacity: 0.8,
            transform: "scale(1.05)"
        }
    },
    implementation: `
        function toggleQuestion(button) {
            button.classList.toggle('active');
            const isActive = button.classList.contains('active');
            button.setAttribute('data-condition', isActive);
            updatePlantUMLCode();
        }
    `
};
```

### 2.2 ブロック構造仕様

#### 2.2.1 条件分岐ブロック
```javascript
const ConditionalBlockSpecification = {
    structure: {
        header: {
            icon: "🔀",
            label: "条件分岐:",
            conditionInput: {
                type: "text",
                placeholder: "条件を入力",
                editable: true,
                clickBehavior: "event.stopPropagation()"
            },
            expandIcon: {
                collapsed: "▶",
                expanded: "▼"
            }
        },
        branches: {
            true: {
                icon: "✅",
                label: "TRUE分岐",
                borderColor: "#4caf50",
                backgroundColor: "rgba(76, 175, 80, 0.05)"
            },
            false: {
                icon: "❌",
                label: "FALSE分岐",
                borderColor: "#f44336",
                backgroundColor: "rgba(244, 67, 54, 0.05)"
            }
        }
    },
    plantUMLMapping: {
        start: "alt {condition}",
        trueBranch: "// TRUE分岐",
        elseBranch: "else",
        falseBranch: "// FALSE分岐",
        end: "end"
    }
};
```

#### 2.2.2 ループブロック
```javascript
const LoopBlockSpecification = {
    structure: {
        icon: "🔁",
        label: "ループ:",
        conditionInput: {
            placeholder: "ループ条件を入力",
            examples: [
                "データが存在する",
                "回数 < 10",
                "条件を満たす間"
            ]
        },
        content: {
            type: "actionList",
            addButton: true,
            minActions: 1
        }
    },
    plantUMLMapping: {
        start: "loop {condition}",
        content: "// ループ内アクション",
        end: "end"
    }
};
```

#### 2.2.3 並行処理ブロック
```javascript
const ParallelProcessingSpecification = {
    structure: {
        threadTabs: {
            display: "🧵 スレッド{number}",
            addButton: {
                display: "➕",
                tooltip: "スレッド追加",
                action: "addThread()"
            },
            deleteButton: {
                display: "×",
                tooltip: "スレッド削除",
                action: "deleteThread(threadId)",
                constraint: "最小2スレッド"
            }
        },
        tabSwitching: {
            onClick: "switchThread(threadId)",
            activeIndicator: {
                borderBottom: "2px solid #e91e63",
                backgroundColor: "rgba(233, 30, 99, 0.1)"
            }
        },
        contentManagement: {
            storage: "data-thread-content",
            isolation: true,
            maxThreads: null
        }
    },
    plantUMLMapping: {
        start: "par",
        thread: "and",
        end: "end"
    }
};
```

### 2.3 STEPコンテナ構造
```javascript
const StepContainerSpecification = {
    steps: [
        {
            number: "1",
            title: "ユーザー入力",
            defaultState: "active",
            borderColor: "#2196f3",
            defaultActors: {
                from: "User",
                to: "System"
            },
            description: "ユーザーからの入力やトリガーを定義"
        },
        {
            number: "2",
            title: "処理",
            defaultState: "active",
            borderColor: "#4caf50",
            blocks: ["条件分岐", "ループ", "並行処理"],
            defaultActors: {
                from: "System",
                to: ["DB", "API"]
            },
            description: "システム内部の処理ロジックを定義"
        },
        {
            number: "3",
            title: "結果表示",
            defaultState: "collapsed",
            borderColor: "#ff9800",
            defaultActors: {
                from: "System",
                to: "User"
            },
            description: "処理結果の出力を定義"
        }
    ]
};
```

## 3. 技術設計

### 3.1 JavaScript実装仕様

#### 3.1.1 イベントハンドラー
```javascript
const EventHandlers = {
    // ブロック制御
    toggleBlock: {
        purpose: "処理ブロックの展開/折りたたみ",
        parameters: ["blockElement"],
        implementation: `
            function toggleBlock(element) {
                element.classList.toggle('expanded');
                const icon = element.querySelector('.expand-icon');
                icon.style.transform = element.classList.contains('expanded') 
                    ? 'rotate(90deg)' : 'rotate(0deg)';
                saveState();
            }
        `
    },
    
    // 条件確認
    toggleQuestion: {
        purpose: "条件確認ボタンのトグル",
        parameters: ["buttonElement"],
        implementation: `
            function toggleQuestion(button) {
                button.classList.toggle('active');
                updateActionCondition(button.closest('.action-item-inline'));
            }
        `
    },
    
    // アクション管理
    addAction: {
        purpose: "新規アクション追加",
        parameters: ["containerElement"],
        implementation: `
            function addAction(container) {
                const newAction = createActionElement();
                container.insertBefore(newAction, container.lastElementChild);
                initializeActionHandlers(newAction);
            }
        `
    },
    
    // スレッド管理
    switchThread: {
        purpose: "並行処理スレッド切り替え",
        parameters: ["threadId"],
        implementation: `
            function switchThread(threadId) {
                document.querySelectorAll('.thread-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelector(\`[data-thread-id="\${threadId}"]\`)
                    .classList.add('active');
                loadThreadContent(threadId);
            }
        `
    },
    
    // 一括制御
    expandAll: {
        purpose: "すべて展開",
        implementation: `
            function expandAll() {
                document.querySelectorAll('.process-block').forEach(block => {
                    block.classList.add('expanded');
                });
            }
        `
    },
    
    collapseAll: {
        purpose: "すべて折りたたむ",
        implementation: `
            function collapseAll() {
                document.querySelectorAll('.process-block').forEach(block => {
                    block.classList.remove('expanded');
                });
            }
        `
    },
    
    // PlantUML生成
    generatePlantUML: {
        purpose: "PlantUMLコード生成",
        implementation: `
            function generatePlantUML() {
                const code = buildPlantUMLFromDOM();
                updatePreview(code);
                return code;
            }
        `
    }
};
```

#### 3.1.2 ドラッグ&ドロップ実装
```javascript
const DragDropSpecification = {
    api: "HTML5 Drag and Drop API",
    handle: {
        selector: ".drag-handle",
        cursor: "move"
    },
    implementation: {
        dragStart: `
            function handleDragStart(e) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', this.innerHTML);
                this.classList.add('dragging');
                draggedElement = this;
            }
        `,
        dragOver: `
            function handleDragOver(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = getDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggedElement);
                } else {
                    container.insertBefore(draggedElement, afterElement);
                }
                return false;
            }
        `,
        dragEnd: `
            function handleDragEnd(e) {
                this.classList.remove('dragging');
                updatePlantUMLCode();
                saveState();
            }
        `
    },
    constraints: {
        withinContainer: true,
        betweenContainers: false,
        validTargets: ".action-list, .branch-actions"
    }
};
```

### 3.2 PlantUMLコード生成ロジック
```javascript
const PlantUMLGenerationLogic = {
    arrowMapping: {
        "sync": "->",
        "async": "->>",
        "return": "-->",
        "async-return": "<<--"
    },
    
    blockSyntax: {
        conditional: {
            start: "alt {condition}",
            elseBranch: "else",
            end: "end"
        },
        loop: {
            start: "loop {condition}",
            end: "end"
        },
        parallel: {
            start: "par",
            thread: "and",
            end: "end"
        }
    },
    
    formatting: {
        indentation: "    ",
        lineBreak: "\n",
        comment: "' "
    },
    
    generator: `
        function buildPlantUMLFromDOM() {
            let code = "@startuml\\n";
            
            // アクター定義
            const actors = getUniqueActors();
            actors.forEach(actor => {
                code += \`participant \${actor}\\n\`;
            });
            
            code += "\\n";
            
            // 処理フロー生成
            const steps = document.querySelectorAll('.step-container');
            steps.forEach(step => {
                code += generateStepCode(step);
            });
            
            code += "@enduml";
            return code;
        }
        
        function generateActionCode(action) {
            const from = action.querySelector('.actor-from').value;
            const to = action.querySelector('.actor-to').value;
            const arrow = arrowMapping[action.querySelector('.arrow-type').value];
            const message = action.querySelector('.message-input').value;
            const isConditional = action.querySelector('.question-btn').classList.contains('active');
            
            let code = \`\${from} \${arrow} \${to}: \${message}\`;
            if (isConditional) {
                code = \`\${from} \${arrow}? \${to}: \${message}\`;
            }
            
            return code;
        }
    `
};
```

## 4. 品質設計

### 4.1 スタイリング仕様
```css
/* カラースキーム */
:root {
    --primary: #2196f3;
    --success: #4caf50;
    --error: #f44336;
    --warning: #ff9800;
    --parallel: #e91e63;
    --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    
    /* レイアウト */
    --max-width: 1400px;
    --panel-height: calc(100vh - 120px);
    --grid-gap: 20px;
    
    /* アニメーション */
    --transition: all 0.2s ease-in-out;
    --hover-transform: translateY(-1px);
    --expand-transform: rotate(90deg);
}

/* コンポーネントスタイル */
.action-item-inline {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    transition: var(--transition);
}

.action-item-inline:hover {
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    transform: var(--hover-transform);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
    }
    
    .action-item-inline {
        flex-wrap: wrap;
    }
}
```

### 4.2 エラーハンドリング
```javascript
const ErrorHandling = {
    inputValidation: {
        emptyCondition: {
            message: "条件を入力してください",
            severity: "warning",
            action: "highlightField"
        },
        invalidActor: {
            message: "アクターを選択してください",
            severity: "error",
            action: "preventSubmit"
        },
        duplicateThread: {
            message: "スレッドIDが重複しています",
            severity: "error",
            action: "autoCorrect"
        }
    },
    
    runtimeErrors: {
        dragDropFailed: {
            message: "移動に失敗しました",
            recovery: "restoreOriginalPosition"
        },
        saveStateFailed: {
            message: "保存に失敗しました",
            recovery: "retryWithBackoff"
        }
    }
};
```

## 5. 実装計画

### 5.1 影響範囲分析
```
変更ファイル:
□ 既存ファイル
  - inline-edit-prototype.html: UI構造の完全実装
  - styles.css: スタイリング仕様の適用
  - script.js: イベントハンドラーの実装

□ 新規ファイル
  - action-components.js: アクションコンポーネント
  - block-manager.js: ブロック管理ロジック
  - plantuml-generator.js: コード生成エンジン
  - drag-drop-handler.js: ドラッグ&ドロップ制御

依存関係:
- 外部ライブラリ: なし（Vanilla JavaScript）
- ブラウザAPI: HTML5 Drag and Drop API
- PlantUML: サーバーサイドレンダリング
```

### 5.2 実装フェーズ
```
Phase 1: 基盤実装（2時間）
□ アクション項目7要素の実装
□ 基本的なイベントハンドラー
□ DOM構造の構築

Phase 2: ブロック機能実装（3時間）
□ 条件分岐ブロック
□ ループブロック
□ 並行処理ブロック
□ 展開/折りたたみ制御

Phase 3: インタラクション実装（2時間）
□ ドラッグ&ドロップ
□ インライン編集
□ 条件確認機能

Phase 4: PlantUML生成（1時間）
□ コード生成ロジック
□ リアルタイムプレビュー
□ 構文検証

Phase 5: 品質保証（2時間）
□ ブラウザ互換性テスト
□ パフォーマンス最適化
□ エラーハンドリング
```

---

# Part B: 実装詳細

## Stage 1: コンポーネント設計

### 1.1 アクションコンポーネント実装
```javascript
class ActionComponent {
    constructor(container, initialData = {}) {
        this.container = container;
        this.data = {
            id: this.generateId(),
            from: initialData.from || 'User',
            arrow: initialData.arrow || 'sync',
            to: initialData.to || 'System',
            message: initialData.message || '',
            isConditional: initialData.isConditional || false
        };
        this.element = null;
        this.init();
    }
    
    generateId() {
        return 'action_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    init() {
        this.createElement();
        this.attachEventListeners();
        this.render();
    }
    
    createElement() {
        const html = `
            <div class="action-item-inline" data-action-id="${this.data.id}">
                <span class="drag-handle">☰</span>
                <select class="actor-select-inline actor-from">
                    <option value="User">User</option>
                    <option value="System">System</option>
                    <option value="DB">DB</option>
                    <option value="API">API</option>
                </select>
                <select class="arrow-type-inline">
                    <option value="sync">→</option>
                    <option value="async">⇢</option>
                    <option value="return">⟵</option>
                    <option value="async-return">⟸</option>
                </select>
                <select class="actor-select-inline actor-to">
                    <option value="User">User</option>
                    <option value="System">System</option>
                    <option value="DB">DB</option>
                    <option value="API">API</option>
                </select>
                <input type="text" class="message-input-inline" 
                       placeholder="メッセージ" value="${this.data.message}">
                <div class="action-buttons-inline">
                    <button class="btn-inline delete-btn" title="削除">×</button>
                    <button class="btn-inline question-btn ${this.data.isConditional ? 'active' : ''}" 
                            title="条件確認">？</button>
                </div>
            </div>
        `;
        
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        this.element = template.content.firstChild;
    }
    
    attachEventListeners() {
        // 削除ボタン
        this.element.querySelector('.delete-btn').addEventListener('click', () => {
            this.delete();
        });
        
        // 条件確認ボタン
        this.element.querySelector('.question-btn').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            this.data.isConditional = e.target.classList.contains('active');
            this.onChange();
        });
        
        // 入力フィールドの変更監視
        this.element.querySelectorAll('select, input').forEach(field => {
            field.addEventListener('change', () => {
                this.updateData();
                this.onChange();
            });
        });
        
        // ドラッグイベント
        this.element.draggable = true;
        this.element.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.element.addEventListener('dragend', this.handleDragEnd.bind(this));
    }
    
    updateData() {
        this.data.from = this.element.querySelector('.actor-from').value;
        this.data.arrow = this.element.querySelector('.arrow-type-inline').value;
        this.data.to = this.element.querySelector('.actor-to').value;
        this.data.message = this.element.querySelector('.message-input-inline').value;
    }
    
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('actionId', this.data.id);
        this.element.classList.add('dragging');
    }
    
    handleDragEnd(e) {
        this.element.classList.remove('dragging');
    }
    
    render() {
        this.container.appendChild(this.element);
    }
    
    delete() {
        this.element.remove();
        if (this.onDelete) {
            this.onDelete(this);
        }
    }
    
    onChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback(this);
        }
    }
    
    toPlantUML() {
        const arrowMap = {
            'sync': '->',
            'async': '->>',
            'return': '-->',
            'async-return': '<<--'
        };
        
        const arrow = arrowMap[this.data.arrow];
        const conditional = this.data.isConditional ? '?' : '';
        
        return `${this.data.from} ${arrow}${conditional} ${this.data.to}: ${this.data.message}`;
    }
}
```

### 1.2 ブロックマネージャー実装
```javascript
class BlockManager {
    constructor() {
        this.blocks = new Map();
        this.init();
    }
    
    init() {
        this.setupBlockTypes();
        this.attachGlobalListeners();
    }
    
    setupBlockTypes() {
        this.blockTypes = {
            conditional: {
                create: () => this.createConditionalBlock(),
                icon: '🔀',
                label: '条件分岐'
            },
            loop: {
                create: () => this.createLoopBlock(),
                icon: '🔁',
                label: 'ループ'
            },
            parallel: {
                create: () => this.createParallelBlock(),
                icon: '🧵',
                label: '並行処理'
            }
        };
    }
    
    createConditionalBlock() {
        const block = document.createElement('div');
        block.className = 'process-block conditional-block';
        block.innerHTML = `
            <div class="process-block-header" onclick="toggleBlock(this.parentElement)">
                <span class="process-icon condition">🔀</span>
                <span class="process-label">条件分岐:</span>
                <input type="text" class="process-condition-input" 
                       placeholder="条件を入力" onclick="event.stopPropagation()">
                <span class="expand-icon">▶</span>
            </div>
            <div class="process-block-content">
                <div class="branch-container branch-true">
                    <div class="branch-header">
                        <span>✅</span>
                        <span>TRUE分岐</span>
                    </div>
                    <div class="branch-actions">
                        <button class="add-action-btn" onclick="addAction(this.parentElement)">
                            ➕ アクション追加
                        </button>
                    </div>
                </div>
                <div class="branch-container branch-false">
                    <div class="branch-header">
                        <span>❌</span>
                        <span>FALSE分岐</span>
                    </div>
                    <div class="branch-actions">
                        <button class="add-action-btn" onclick="addAction(this.parentElement)">
                            ➕ アクション追加
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const blockId = this.generateBlockId();
        block.dataset.blockId = blockId;
        this.blocks.set(blockId, {
            type: 'conditional',
            element: block,
            data: {
                condition: '',
                trueBranch: [],
                falseBranch: []
            }
        });
        
        return block;
    }
    
    createLoopBlock() {
        const block = document.createElement('div');
        block.className = 'process-block loop-block';
        block.innerHTML = `
            <div class="process-block-header" onclick="toggleBlock(this.parentElement)">
                <span class="process-icon loop">🔁</span>
                <span class="process-label">ループ:</span>
                <input type="text" class="process-condition-input" 
                       placeholder="ループ条件を入力" onclick="event.stopPropagation()">
                <span class="expand-icon">▶</span>
            </div>
            <div class="process-block-content">
                <div class="loop-actions">
                    <button class="add-action-btn" onclick="addAction(this.parentElement)">
                        ➕ アクション追加
                    </button>
                </div>
            </div>
        `;
        
        const blockId = this.generateBlockId();
        block.dataset.blockId = blockId;
        this.blocks.set(blockId, {
            type: 'loop',
            element: block,
            data: {
                condition: '',
                actions: []
            }
        });
        
        return block;
    }
    
    createParallelBlock() {
        const block = document.createElement('div');
        block.className = 'process-block parallel-block';
        block.innerHTML = `
            <div class="process-block-header" onclick="toggleBlock(this.parentElement)">
                <span class="process-icon parallel">🧵</span>
                <span class="process-label">並行処理</span>
                <span class="expand-icon">▶</span>
            </div>
            <div class="process-block-content">
                <div class="thread-tabs">
                    <div class="thread-tab active" data-thread-id="thread1" 
                         onclick="switchThread('thread1')">
                        🧵 スレッド1
                    </div>
                    <div class="thread-tab" data-thread-id="thread2" 
                         onclick="switchThread('thread2')">
                        🧵 スレッド2
                    </div>
                    <button class="add-thread-btn" onclick="addThread()">➕</button>
                </div>
                <div class="thread-content" data-thread-content="thread1">
                    <button class="add-action-btn" onclick="addAction(this.parentElement)">
                        ➕ アクション追加
                    </button>
                </div>
            </div>
        `;
        
        const blockId = this.generateBlockId();
        block.dataset.blockId = blockId;
        this.blocks.set(blockId, {
            type: 'parallel',
            element: block,
            data: {
                threads: {
                    thread1: [],
                    thread2: []
                },
                activeThread: 'thread1'
            }
        });
        
        return block;
    }
    
    generateBlockId() {
        return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    attachGlobalListeners() {
        // グローバルなイベントリスナーの設定
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeExistingBlocks();
        });
    }
    
    initializeExistingBlocks() {
        document.querySelectorAll('.process-block').forEach(block => {
            const blockId = block.dataset.blockId || this.generateBlockId();
            block.dataset.blockId = blockId;
            // ブロックの初期化処理
        });
    }
    
    toPlantUML(blockId) {
        const block = this.blocks.get(blockId);
        if (!block) return '';
        
        let code = '';
        
        switch(block.type) {
            case 'conditional':
                code = this.conditionalToPlantUML(block);
                break;
            case 'loop':
                code = this.loopToPlantUML(block);
                break;
            case 'parallel':
                code = this.parallelToPlantUML(block);
                break;
        }
        
        return code;
    }
    
    conditionalToPlantUML(block) {
        const condition = block.element.querySelector('.process-condition-input').value || '条件';
        let code = `alt ${condition}\n`;
        
        // TRUE分岐のアクション
        block.data.trueBranch.forEach(action => {
            code += `    ${action.toPlantUML()}\n`;
        });
        
        code += 'else\n';
        
        // FALSE分岐のアクション
        block.data.falseBranch.forEach(action => {
            code += `    ${action.toPlantUML()}\n`;
        });
        
        code += 'end\n';
        
        return code;
    }
    
    loopToPlantUML(block) {
        const condition = block.element.querySelector('.process-condition-input').value || '条件';
        let code = `loop ${condition}\n`;
        
        block.data.actions.forEach(action => {
            code += `    ${action.toPlantUML()}\n`;
        });
        
        code += 'end\n';
        
        return code;
    }
    
    parallelToPlantUML(block) {
        let code = 'par\n';
        
        const threads = Object.entries(block.data.threads);
        threads.forEach(([threadId, actions], index) => {
            if (index > 0) {
                code += 'and\n';
            }
            
            actions.forEach(action => {
                code += `    ${action.toPlantUML()}\n`;
            });
        });
        
        code += 'end\n';
        
        return code;
    }
}
```

## Stage 2: UI/UX設計

### 2.1 ユーザーインタラクション仕様
```javascript
const UserInteractionSpecification = {
    clickBehaviors: {
        expandBlock: {
            trigger: ".process-block-header",
            action: "toggleBlock",
            animation: "slideDown",
            duration: 200
        },
        editCondition: {
            trigger: ".process-condition-input",
            action: "focusInput",
            stopPropagation: true
        },
        addAction: {
            trigger: ".add-action-btn",
            action: "insertActionComponent",
            position: "beforeButton"
        }
    },
    
    hoverEffects: {
        actionItem: {
            selector: ".action-item-inline",
            effect: {
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                transform: "translateY(-1px)"
            }
        },
        deleteButton: {
            selector: ".delete-btn",
            effect: {
                background: "rgba(244, 67, 54, 0.1)",
                color: "#d32f2f"
            }
        }
    },
    
    focusStates: {
        inputField: {
            selector: "input, select",
            style: {
                borderColor: "#2196f3",
                boxShadow: "0 0 0 2px rgba(33, 150, 243, 0.1)"
            }
        }
    },
    
    dragFeedback: {
        draggedItem: {
            opacity: 0.5,
            cursor: "grabbing"
        },
        dropZone: {
            background: "rgba(33, 150, 243, 0.05)",
            border: "2px dashed #2196f3"
        }
    }
};
```

### 2.2 レスポンシブデザイン仕様
```css
/* デスクトップ (1400px以上) */
@media (min-width: 1400px) {
    .container {
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
}

/* タブレット (768px - 1399px) */
@media (min-width: 768px) and (max-width: 1399px) {
    .container {
        grid-template-columns: 1fr;
        max-width: 900px;
    }
    
    .panel {
        margin-bottom: 20px;
    }
}

/* モバイル (767px以下) */
@media (max-width: 767px) {
    .container {
        grid-template-columns: 1fr;
        padding: 10px;
    }
    
    .action-item-inline {
        flex-wrap: wrap;
        gap: 4px;
    }
    
    .actor-select-inline,
    .arrow-type-inline {
        width: 100%;
    }
    
    .message-input-inline {
        width: 100%;
        margin-top: 4px;
    }
    
    .process-block-header {
        font-size: 12px;
    }
}
```

## Stage 3: JavaScript実装設計

### 3.1 PlantUML生成エンジン
```javascript
class PlantUMLGenerator {
    constructor() {
        this.indentLevel = 0;
        this.indentStr = '    ';
        this.code = [];
    }
    
    generate() {
        this.code = [];
        this.addLine('@startuml');
        this.addLine('');
        
        // アクター定義
        this.generateActors();
        this.addLine('');
        
        // 処理フロー生成
        this.generateFlow();
        
        this.addLine('');
        this.addLine('@enduml');
        
        return this.code.join('\n');
    }
    
    generateActors() {
        const actors = this.extractActors();
        actors.forEach(actor => {
            this.addLine(`participant ${actor}`);
        });
    }
    
    extractActors() {
        const actors = new Set();
        
        document.querySelectorAll('.actor-select-inline').forEach(select => {
            actors.add(select.value);
        });
        
        return Array.from(actors);
    }
    
    generateFlow() {
        const steps = document.querySelectorAll('.step-container');
        
        steps.forEach(step => {
            const stepNumber = step.querySelector('.step-number').textContent;
            const stepTitle = step.querySelector('.step-title').textContent;
            
            this.addLine(`' === STEP ${stepNumber}: ${stepTitle} ===`);
            
            const content = step.querySelector('.step-content');
            this.generateStepContent(content);
            
            this.addLine('');
        });
    }
    
    generateStepContent(content) {
        const children = content.children;
        
        for (let child of children) {
            if (child.classList.contains('action-item-inline')) {
                this.generateAction(child);
            } else if (child.classList.contains('process-block')) {
                this.generateBlock(child);
            }
        }
    }
    
    generateAction(actionElement) {
        const from = actionElement.querySelector('.actor-from').value;
        const to = actionElement.querySelector('.actor-to').value;
        const arrowType = actionElement.querySelector('.arrow-type-inline').value;
        const message = actionElement.querySelector('.message-input-inline').value;
        const isConditional = actionElement.querySelector('.question-btn').classList.contains('active');
        
        const arrowMap = {
            'sync': '->',
            'async': '->>',
            'return': '-->',
            'async-return': '<<--'
        };
        
        const arrow = arrowMap[arrowType];
        const conditional = isConditional ? '?' : '';
        
        this.addLine(`${from} ${arrow}${conditional} ${to}: ${message}`);
    }
    
    generateBlock(blockElement) {
        if (blockElement.classList.contains('conditional-block')) {
            this.generateConditionalBlock(blockElement);
        } else if (blockElement.classList.contains('loop-block')) {
            this.generateLoopBlock(blockElement);
        } else if (blockElement.classList.contains('parallel-block')) {
            this.generateParallelBlock(blockElement);
        }
    }
    
    generateConditionalBlock(block) {
        const condition = block.querySelector('.process-condition-input').value || '条件';
        
        this.addLine(`alt ${condition}`);
        this.indent();
        
        // TRUE分岐
        const trueBranch = block.querySelector('.branch-true .branch-actions');
        this.generateBranchContent(trueBranch);
        
        this.unindent();
        this.addLine('else');
        this.indent();
        
        // FALSE分岐
        const falseBranch = block.querySelector('.branch-false .branch-actions');
        this.generateBranchContent(falseBranch);
        
        this.unindent();
        this.addLine('end');
    }
    
    generateLoopBlock(block) {
        const condition = block.querySelector('.process-condition-input').value || '条件';
        
        this.addLine(`loop ${condition}`);
        this.indent();
        
        const actions = block.querySelector('.loop-actions');
        this.generateBranchContent(actions);
        
        this.unindent();
        this.addLine('end');
    }
    
    generateParallelBlock(block) {
        this.addLine('par');
        this.indent();
        
        const threads = block.querySelectorAll('.thread-content');
        threads.forEach((thread, index) => {
            if (index > 0) {
                this.unindent();
                this.addLine('and');
                this.indent();
            }
            
            this.generateBranchContent(thread);
        });
        
        this.unindent();
        this.addLine('end');
    }
    
    generateBranchContent(container) {
        const actions = container.querySelectorAll('.action-item-inline');
        actions.forEach(action => {
            this.generateAction(action);
        });
    }
    
    addLine(text) {
        const indent = this.indentStr.repeat(this.indentLevel);
        this.code.push(indent + text);
    }
    
    indent() {
        this.indentLevel++;
    }
    
    unindent() {
        this.indentLevel = Math.max(0, this.indentLevel - 1);
    }
}
```

---

# Part C: 品質保証

## 検証項目チェックリスト

### 機能要件検証（各10点）
```
インライン編集機能:
□ アクション項目7要素の動作確認 (10点)
□ 条件確認ボタンのトグル動作 (10点)
□ 矢印タイプ4種類の切り替え (10点)
□ ドラッグ&ドロップによる順序変更 (10点)

ブロック機能:
□ 条件分岐ブロックの展開/折りたたみ (10点)
□ ループブロックの条件入力 (10点)
□ 並行処理のスレッド管理 (10点)

生成機能:
□ PlantUMLコード生成の正確性 (10点)
□ リアルタイムプレビュー更新 (10点)
□ エラーハンドリング (10点)

総合スコア: ___/100点
```

### 非機能要件検証
```
パフォーマンス:
□ UI操作レスポンス < 50ms
□ PlantUML生成 < 500ms
□ メモリリーク無し

互換性:
□ Chrome 90+ 動作確認
□ Firefox 88+ 動作確認
□ Safari 14+ 動作確認
□ Edge 90+ 動作確認

ユーザビリティ:
□ モバイル対応
□ キーボード操作対応
□ アクセシビリティ基準準拠
```

## テスト計画

### 1. 単体テスト
```javascript
describe('ActionComponent', () => {
    test('アクション項目の7要素が正しく生成される', () => {
        const container = document.createElement('div');
        const action = new ActionComponent(container);
        
        expect(action.element.querySelector('.drag-handle')).toBeTruthy();
        expect(action.element.querySelector('.actor-from')).toBeTruthy();
        expect(action.element.querySelector('.arrow-type-inline')).toBeTruthy();
        expect(action.element.querySelector('.actor-to')).toBeTruthy();
        expect(action.element.querySelector('.message-input-inline')).toBeTruthy();
        expect(action.element.querySelector('.delete-btn')).toBeTruthy();
        expect(action.element.querySelector('.question-btn')).toBeTruthy();
    });
    
    test('条件確認ボタンのトグルが機能する', () => {
        const container = document.createElement('div');
        const action = new ActionComponent(container);
        const questionBtn = action.element.querySelector('.question-btn');
        
        questionBtn.click();
        expect(questionBtn.classList.contains('active')).toBe(true);
        
        questionBtn.click();
        expect(questionBtn.classList.contains('active')).toBe(false);
    });
    
    test('PlantUMLコードが正しく生成される', () => {
        const action = new ActionComponent(null, {
            from: 'User',
            arrow: 'sync',
            to: 'System',
            message: 'ログイン',
            isConditional: false
        });
        
        expect(action.toPlantUML()).toBe('User -> System: ログイン');
    });
});
```

### 2. 統合テスト
```javascript
describe('BlockManager Integration', () => {
    test('条件分岐ブロックの完全な動作', () => {
        const manager = new BlockManager();
        const block = manager.createConditionalBlock();
        
        // 条件入力
        const conditionInput = block.querySelector('.process-condition-input');
        conditionInput.value = 'ユーザー認証';
        
        // TRUE分岐にアクション追加
        const trueBranch = block.querySelector('.branch-true .branch-actions');
        const action1 = new ActionComponent(trueBranch);
        
        // FALSE分岐にアクション追加
        const falseBranch = block.querySelector('.branch-false .branch-actions');
        const action2 = new ActionComponent(falseBranch);
        
        // PlantUML生成
        const code = manager.toPlantUML(block.dataset.blockId);
        
        expect(code).toContain('alt ユーザー認証');
        expect(code).toContain('else');
        expect(code).toContain('end');
    });
});
```

### 3. E2Eテスト
```javascript
describe('PlantUML Editor E2E', () => {
    test('完全なフロー編集シナリオ', async () => {
        // ページ読み込み
        await page.goto('http://localhost:3000');
        
        // STEP1にアクション追加
        await page.click('.step-container:nth-child(1) .add-action-btn');
        await page.fill('.message-input-inline', 'ログインボタンクリック');
        
        // STEP2に条件分岐追加
        await page.click('.step-container:nth-child(2) .add-block-btn');
        await page.selectOption('.block-type-select', 'conditional');
        await page.fill('.process-condition-input', '認証成功');
        
        // PlantUML生成
        await page.click('#generate-plantuml-btn');
        
        // 結果検証
        const code = await page.textContent('#plantuml-output');
        expect(code).toContain('@startuml');
        expect(code).toContain('User -> System: ログインボタンクリック');
        expect(code).toContain('alt 認証成功');
        expect(code).toContain('@enduml');
    });
});
```

## 実装完全性の最終確認

### 設計書不足点14カテゴリのカバレッジ
| カテゴリ | 設計書記載 | 実装準備 | 完了 |
|---------|-----------|---------|------|
| 1. アクション項目7要素構成 | ✅ | ✅ | ✅ |
| 2. 条件確認機能（？ボタン） | ✅ | ✅ | ✅ |
| 3. ブロック構造詳細 | ✅ | ✅ | ✅ |
| 4. 並行処理スレッド管理 | ✅ | ✅ | ✅ |
| 5. JavaScriptイベントハンドラー | ✅ | ✅ | ✅ |
| 6. STEPコンテナ構造 | ✅ | ✅ | ✅ |
| 7. ドラッグ&ドロップ機能 | ✅ | ✅ | ✅ |
| 8. アクター選択詳細 | ✅ | ✅ | ✅ |
| 9. CSS/スタイリング仕様 | ✅ | ✅ | ✅ |
| 10. PlantUMLコード生成ロジック | ✅ | ✅ | ✅ |
| 11. インライン編集仕様 | ✅ | ✅ | ✅ |
| 12. 展開/折りたたみ状態管理 | ✅ | ✅ | ✅ |
| 13. アクション追加ボタン | ✅ | ✅ | ✅ |
| 14. ループブロック詳細 | ✅ | ✅ | ✅ |

**カバレッジ: 100%達成**

---

## まとめ

この完全設計書v3.0により、PlantUMLエディターのインライン編集機能の全仕様が網羅されました。設計書不足点分析レポートで特定された14カテゴリすべてについて、具体的な実装仕様、コード例、テスト計画を含む完全な設計を提供しています。

### 成果物
1. **完全な機能仕様**: アクション項目7要素、ブロック構造、イベントハンドラー
2. **実装可能なコード**: ActionComponent、BlockManager、PlantUMLGenerator
3. **品質保証計画**: 単体テスト、統合テスト、E2Eテスト
4. **100%のカバレッジ**: 設計書欠落項目の完全解消

この設計書に基づいて実装を行うことで、設計と実装の整合性100%を達成し、高品質なPlantUMLエディターの開発が可能となります。