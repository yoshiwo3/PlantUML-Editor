// インライン編集機能 - 完全実装版
// 7要素アクション構造、ドラッグ&ドロップ、条件分岐・ループ・並行処理ブロック対応

// グローバル変数
let inlineActionIdCounter = 0;
let inlineBlockIdCounter = 0;
let inlineDraggedElement = null;

// 初期化
function initInlineEditor() {
    console.log('✅ インライン編集機能を初期化しています...');
    
    // 初期アクションを追加
    if (document.getElementById('inline-actions-container')) {
        addInitialInlineAction();
    }
}

// 初期アクションの追加
function addInitialInlineAction() {
    const container = document.getElementById('inline-actions-container');
    if (container && container.children.length === 0) {
        const actionItem = createInlineActionElement();
        container.appendChild(actionItem);
        updateInlineToPlantUML();
    }
}

// アクション要素の作成（7要素構造）
function createInlineActionElement() {
    const actionId = ++inlineActionIdCounter;
    const div = document.createElement('div');
    div.className = 'inline-action-item';
    div.draggable = true;
    div.dataset.actionId = actionId;
    
    div.innerHTML = `
        <span class="inline-drag-handle">☰</span>
        <select class="inline-actor-select actor-from" onchange="updateInlineToPlantUML()">
            <option>Alice</option>
            <option>Bob</option>
            <option>System</option>
            <option>Database</option>
            <option>User</option>
        </select>
        <select class="inline-arrow-select arrow-type" onchange="updateInlineToPlantUML()">
            <option value="->">→ (同期)</option>
            <option value="->>">->> (非同期)</option>
            <option value="-->">--> (返答)</option>
            <option value="-->>">-->> (非同期返答)</option>
        </select>
        <select class="inline-actor-select actor-to" onchange="updateInlineToPlantUML()">
            <option>Bob</option>
            <option>Alice</option>
            <option>System</option>
            <option>Database</option>
            <option>User</option>
        </select>
        <input type="text" class="inline-message-input" placeholder="メッセージを入力" 
               oninput="updateInlineToPlantUML()" value="">
        <button class="inline-action-btn inline-delete-btn" onclick="deleteInlineAction(this)">🗑️</button>
        <button class="inline-action-btn inline-condition-btn" onclick="wrapInlineCondition(this)">🔀</button>
    `;

    // ドラッグイベントの設定
    div.addEventListener('dragstart', handleInlineDragStart);
    div.addEventListener('dragend', handleInlineDragEnd);
    div.addEventListener('dragover', handleInlineDragOver);
    div.addEventListener('drop', handleInlineDrop);
    div.addEventListener('dragenter', handleInlineDragEnter);
    div.addEventListener('dragleave', handleInlineDragLeave);

    return div;
}

// アクション追加
function addInlineAction() {
    const container = document.getElementById('inline-actions-container');
    const actionItem = createInlineActionElement();
    container.appendChild(actionItem);
    updateInlineToPlantUML();
}

// アクション削除
function deleteInlineAction(button) {
    if (confirm('このアクションを削除しますか？')) {
        const item = button.closest('.inline-action-item');
        item.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            item.remove();
            updateInlineToPlantUML();
        }, 300);
    }
}

// ドラッグ&ドロップ機能
function handleInlineDragStart(e) {
    inlineDraggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleInlineDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.inline-action-item');
    items.forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleInlineDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleInlineDragEnter(e) {
    this.classList.add('drag-over');
}

function handleInlineDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleInlineDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (inlineDraggedElement !== this) {
        const container = this.parentNode;
        const allItems = Array.from(container.querySelectorAll('.inline-action-item'));
        const draggedIndex = allItems.indexOf(inlineDraggedElement);
        const targetIndex = allItems.indexOf(this);

        if (draggedIndex < targetIndex) {
            container.insertBefore(inlineDraggedElement, this.nextSibling);
        } else {
            container.insertBefore(inlineDraggedElement, this);
        }

        updateInlineToPlantUML();
    }

    return false;
}

// 条件分岐ブロックの追加
function addInlineConditionBlock() {
    const container = document.getElementById('inline-actions-container');
    const blockId = ++inlineBlockIdCounter;
    
    const blockDiv = document.createElement('div');
    blockDiv.className = 'inline-block-container';
    blockDiv.dataset.blockId = blockId;
    blockDiv.dataset.blockType = 'condition';
    
    blockDiv.innerHTML = `
        <div class="inline-block-header">
            <span class="inline-block-type">条件分岐 (alt)</span>
            <input class="inline-block-condition" value="条件" onchange="updateInlineToPlantUML()">
            <button class="inline-action-btn inline-delete-btn" onclick="deleteInlineBlock(this)">削除</button>
        </div>
        <div class="inline-branch-container">
            <div class="inline-branch">
                <div class="inline-branch-label">TRUE (条件成立)</div>
                <div class="inline-block-body" data-branch="true"></div>
                <button class="inline-btn inline-btn-primary" onclick="addActionToInlineBlock(this, 'true')">
                    ➕ アクション追加
                </button>
            </div>
            <div class="inline-branch">
                <div class="inline-branch-label">FALSE (条件不成立)</div>
                <div class="inline-block-body" data-branch="false"></div>
                <button class="inline-btn inline-btn-primary" onclick="addActionToInlineBlock(this, 'false')">
                    ➕ アクション追加
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(blockDiv);
    updateInlineToPlantUML();
}

// ループブロックの追加
function addInlineLoopBlock() {
    const container = document.getElementById('inline-actions-container');
    const blockId = ++inlineBlockIdCounter;
    
    const blockDiv = document.createElement('div');
    blockDiv.className = 'inline-block-container';
    blockDiv.dataset.blockId = blockId;
    blockDiv.dataset.blockType = 'loop';
    
    blockDiv.innerHTML = `
        <div class="inline-block-header">
            <span class="inline-block-type">ループ (loop)</span>
            <input class="inline-block-condition" value="条件" onchange="updateInlineToPlantUML()">
            <button class="inline-action-btn inline-delete-btn" onclick="deleteInlineBlock(this)">削除</button>
        </div>
        <div class="inline-block-body" data-loop="body"></div>
        <button class="inline-btn inline-btn-primary" onclick="addActionToInlineBlock(this, 'loop')">
            ➕ アクション追加
        </button>
    `;
    
    container.appendChild(blockDiv);
    updateInlineToPlantUML();
}

// 並行処理ブロックの追加
function addInlineParallelBlock() {
    const container = document.getElementById('inline-actions-container');
    const blockId = ++inlineBlockIdCounter;
    
    const blockDiv = document.createElement('div');
    blockDiv.className = 'inline-block-container';
    blockDiv.dataset.blockId = blockId;
    blockDiv.dataset.blockType = 'parallel';
    
    blockDiv.innerHTML = `
        <div class="inline-block-header">
            <span class="inline-block-type">並行処理 (par)</span>
            <button class="inline-action-btn inline-delete-btn" onclick="deleteInlineBlock(this)">削除</button>
        </div>
        <div class="inline-branch-container">
            <div class="inline-branch">
                <div class="inline-branch-label">並列パス1</div>
                <div class="inline-block-body" data-parallel="1"></div>
                <button class="inline-btn inline-btn-primary" onclick="addActionToInlineBlock(this, 'parallel1')">
                    ➕ アクション追加
                </button>
            </div>
            <div class="inline-branch">
                <div class="inline-branch-label">並列パス2</div>
                <div class="inline-block-body" data-parallel="2"></div>
                <button class="inline-btn inline-btn-primary" onclick="addActionToInlineBlock(this, 'parallel2')">
                    ➕ アクション追加
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(blockDiv);
    updateInlineToPlantUML();
}

// ブロック内にアクション追加
function addActionToInlineBlock(button, branch) {
    const blockBody = button.previousElementSibling;
    const actionItem = createInlineActionElement();
    blockBody.appendChild(actionItem);
    updateInlineToPlantUML();
}

// ブロック削除
function deleteInlineBlock(button) {
    if (confirm('このブロックを削除しますか？')) {
        const block = button.closest('.inline-block-container');
        block.remove();
        updateInlineToPlantUML();
    }
}

// すべてクリア
function clearInlineAll() {
    if (confirm('すべてのアクションとブロックをクリアしますか？')) {
        document.getElementById('inline-actions-container').innerHTML = '';
        inlineActionIdCounter = 0;
        inlineBlockIdCounter = 0;
        updateInlineToPlantUML();
    }
}

// PlantUML変換と同期
function updateInlineToPlantUML() {
    const container = document.getElementById('inline-actions-container');
    if (!container) return;
    
    let plantuml = '@startuml\n';
    plantuml += 'title インライン編集によるシーケンス図\n\n';
    
    // アクターの定義
    const actors = new Set();
    container.querySelectorAll('.actor-from, .actor-to').forEach(select => {
        actors.add(select.value);
    });
    
    actors.forEach(actor => {
        plantuml += `participant ${actor}\n`;
    });
    plantuml += '\n';
    
    // 各要素の処理
    const children = container.children;
    for (let child of children) {
        if (child.classList.contains('inline-action-item')) {
            // 通常のアクション
            const from = child.querySelector('.actor-from').value;
            const arrow = child.querySelector('.arrow-type').value;
            const to = child.querySelector('.actor-to').value;
            const message = child.querySelector('.inline-message-input').value || 'メッセージ';
            plantuml += `${from} ${arrow} ${to}: ${message}\n`;
            
        } else if (child.classList.contains('inline-block-container')) {
            // ブロック構造
            const blockType = child.dataset.blockType;
            
            if (blockType === 'condition') {
                const condition = child.querySelector('.inline-block-condition').value;
                const trueBranch = child.querySelector('[data-branch="true"]');
                const falseBranch = child.querySelector('[data-branch="false"]');
                
                plantuml += `alt ${condition}\n`;
                
                // TRUE分岐
                trueBranch.querySelectorAll('.inline-action-item').forEach(action => {
                    const from = action.querySelector('.actor-from').value;
                    const arrow = action.querySelector('.arrow-type').value;
                    const to = action.querySelector('.actor-to').value;
                    const message = action.querySelector('.inline-message-input').value || 'メッセージ';
                    plantuml += `  ${from} ${arrow} ${to}: ${message}\n`;
                });
                
                plantuml += `else 条件不成立\n`;
                
                // FALSE分岐
                falseBranch.querySelectorAll('.inline-action-item').forEach(action => {
                    const from = action.querySelector('.actor-from').value;
                    const arrow = action.querySelector('.arrow-type').value;
                    const to = action.querySelector('.actor-to').value;
                    const message = action.querySelector('.inline-message-input').value || 'メッセージ';
                    plantuml += `  ${from} ${arrow} ${to}: ${message}\n`;
                });
                
                plantuml += `end\n`;
                
            } else if (blockType === 'loop') {
                const condition = child.querySelector('.inline-block-condition').value;
                const loopBody = child.querySelector('[data-loop="body"]');
                
                plantuml += `loop ${condition}\n`;
                
                loopBody.querySelectorAll('.inline-action-item').forEach(action => {
                    const from = action.querySelector('.actor-from').value;
                    const arrow = action.querySelector('.arrow-type').value;
                    const to = action.querySelector('.actor-to').value;
                    const message = action.querySelector('.inline-message-input').value || 'メッセージ';
                    plantuml += `  ${from} ${arrow} ${to}: ${message}\n`;
                });
                
                plantuml += `end\n`;
                
            } else if (blockType === 'parallel') {
                const parallel1 = child.querySelector('[data-parallel="1"]');
                const parallel2 = child.querySelector('[data-parallel="2"]');
                
                plantuml += `par\n`;
                
                parallel1.querySelectorAll('.inline-action-item').forEach(action => {
                    const from = action.querySelector('.actor-from').value;
                    const arrow = action.querySelector('.arrow-type').value;
                    const to = action.querySelector('.actor-to').value;
                    const message = action.querySelector('.inline-message-input').value || 'メッセージ';
                    plantuml += `  ${from} ${arrow} ${to}: ${message}\n`;
                });
                
                plantuml += `else\n`;
                
                parallel2.querySelectorAll('.inline-action-item').forEach(action => {
                    const from = action.querySelector('.actor-from').value;
                    const arrow = action.querySelector('.arrow-type').value;
                    const to = action.querySelector('.actor-to').value;
                    const message = action.querySelector('.inline-message-input').value || 'メッセージ';
                    plantuml += `  ${from} ${arrow} ${to}: ${message}\n`;
                });
                
                plantuml += `end\n`;
            }
        }
    }
    
    plantuml += '@enduml';
    
    // PlantUMLコードエディタに反映
    const codeEditor = document.getElementById('plantuml-code');
    if (codeEditor) {
        codeEditor.value = plantuml;
        // 変更イベントを発火して他の処理と同期
        const event = new Event('input', { bubbles: true });
        codeEditor.dispatchEvent(event);
    }
    
    console.log('✅ PlantUML同期完了');
}

// 既存のアクションを条件分岐でラップする関数
function wrapInlineCondition(button) {
    const actionItem = button.closest('.inline-action-item');
    if (!actionItem) return;
    
    // アクションのデータを取得
    const from = actionItem.querySelector('.actor-from').value;
    const arrow = actionItem.querySelector('.arrow-type').value;
    const to = actionItem.querySelector('.actor-to').value;
    const message = actionItem.querySelector('.inline-message-input').value;
    
    // 条件分岐ブロックを作成
    const conditionBlock = document.createElement('div');
    conditionBlock.className = 'inline-condition-block';
    conditionBlock.innerHTML = `
        <div class="condition-header">
            <span>条件分岐 (alt)</span>
            <input type="text" class="condition-text" placeholder="条件を入力" value="条件">
            <button onclick="deleteInlineBlock(this)">削除</button>
        </div>
        <div class="condition-branches">
            <div class="branch-true">
                <div class="branch-label">TRUE (条件成立)</div>
                <div class="inline-action-item">
                    <span class="drag-handle">☰</span>
                    <select class="actor-from">
                        <option value="Alice">Alice</option>
                        <option value="Bob">Bob</option>
                        <option value="System">System</option>
                        <option value="Database">Database</option>
                        <option value="User">User</option>
                    </select>
                    <select class="arrow-type">
                        <option value="->">→ (同期)</option>
                        <option value="->>">->> (非同期)</option>
                        <option value="-->">--> (返答)</option>
                        <option value="-->>">-->> (非同期返答)</option>
                    </select>
                    <select class="actor-to">
                        <option value="Bob">Bob</option>
                        <option value="Alice">Alice</option>
                        <option value="System">System</option>
                        <option value="Database">Database</option>
                        <option value="User">User</option>
                    </select>
                    <input type="text" class="inline-message-input" placeholder="メッセージを入力" value="${message || 'メッセージ'}">
                    <button class="inline-action-btn inline-delete-btn" onclick="deleteInlineAction(this)">🗑️</button>
                    <button class="inline-action-btn inline-condition-btn" onclick="wrapInlineCondition(this)">🔀</button>
                </div>
                <button class="btn-add-inline-action" onclick="addActionToInlineBlock(this, 'true')">➕ アクション追加</button>
            </div>
            <div class="branch-false">
                <div class="branch-label">FALSE (条件不成立)</div>
                <button class="btn-add-inline-action" onclick="addActionToInlineBlock(this, 'false')">➕ アクション追加</button>
            </div>
        </div>
    `;
    
    // 元のアクションの値を設定
    const trueBranch = conditionBlock.querySelector('.branch-true .inline-action-item');
    trueBranch.querySelector('.actor-from').value = from;
    trueBranch.querySelector('.arrow-type').value = arrow;
    trueBranch.querySelector('.actor-to').value = to;
    trueBranch.querySelector('.inline-message-input').value = message;
    
    // 元のアクションを条件分岐ブロックで置き換え
    actionItem.replaceWith(conditionBlock);
    
    // PlantUMLコードを更新
    updateInlineToPlantUML();
}

// エクスポート関数
window.initInlineEditor = initInlineEditor;
window.addInlineAction = addInlineAction;
window.deleteInlineAction = deleteInlineAction;
window.addInlineConditionBlock = addInlineConditionBlock;
window.addInlineLoopBlock = addInlineLoopBlock;
window.addInlineParallelBlock = addInlineParallelBlock;
window.addActionToInlineBlock = addActionToInlineBlock;
window.deleteInlineBlock = deleteInlineBlock;
window.clearInlineAll = clearInlineAll;
window.updateInlineToPlantUML = updateInlineToPlantUML;
window.wrapInlineCondition = wrapInlineCondition;

console.log('✅ インライン編集機能スクリプトロード完了');