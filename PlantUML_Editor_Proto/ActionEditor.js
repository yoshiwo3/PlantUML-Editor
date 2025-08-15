/**
 * ActionEditor.js
 * 
 * アクション編集用コンポーネント集
 * 条件分岐・ループ・並行処理内のアクション管理
 * SafeDOMManagerを使用してDOM操作を安全化
 * 
 * @version 1.1.0 - SafeDOMManager統合版
 * @date 2025-08-15
 */

// SafeDOMManagerが利用可能かチェック
if (typeof window !== 'undefined' && !window.SafeDOMManager) {
    console.error('[ActionEditor] SafeDOMManager is required but not found');
}

/**
 * ActionList - アクション一覧表示コンポーネント
 */
class ActionList {
    constructor(container, actions = [], options = {}) {
        this.container = container;
        this.actions = actions;
        this.options = {
            editable: true,
            draggable: true,
            deletable: true,
            addable: true,
            ...options
        };
        
        this.selectedAction = null;
        this.listeners = new Map();
        
        // SafeDOMManager インスタンス作成
        this.safeDOMManager = new window.SafeDOMManager({
            enableLogging: true,
            strictMode: false
        });
        
        this.initialize();
    }

    /**
     * 初期化
     */
    initialize() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * レンダリング（SafeDOMManager使用）
     */
    render() {
        // コンテナをクリア
        this.container.innerHTML = '';
        
        // ヘッダー作成
        const header = this.safeDOMManager.createElement('div', {
            'class': 'action-list-header'
        });
        
        // タイトル作成
        const title = this.safeDOMManager.createElement('h4', {}, 'アクション一覧');
        header.appendChild(title);
        
        // 追加ボタン作成（オプション）
        if (this.options.addable) {
            const addButton = this.safeDOMManager.createElement('button', {
                'class': 'btn-add-action',
                'title': '新規アクション追加'
            }, '+');
            header.appendChild(addButton);
        }
        
        this.container.appendChild(header);
        
        // アクションリストコンテナ作成
        const listContainer = this.safeDOMManager.createElement('div', {
            'class': 'action-list-container'
        });
        
        if (this.actions.length === 0) {
            // 空のメッセージ表示
            const emptyMessage = this.safeDOMManager.createElement('div', {
                'class': 'action-list-empty'
            }, 'アクションがありません');
            listContainer.appendChild(emptyMessage);
        } else {
            // アクションリスト作成
            const ul = this.safeDOMManager.createElement('ul', {
                'class': 'action-list'
            });
            
            this.actions.forEach((action, index) => {
                const li = this.createActionItem(action, index);
                ul.appendChild(li);
            });
            
            listContainer.appendChild(ul);
        }
        
        this.container.appendChild(listContainer);
        
        // ドラッグ&ドロップ設定
        if (this.options.draggable) {
            this.setupDragAndDrop();
        }
    }

    /**
     * アクションアイテム作成
     */
    createActionItem(action, index) {
        const li = document.createElement('li');
        li.className = 'action-item';
        li.dataset.index = index;
        li.dataset.actionId = action.id || `action_${index}`;
        
        if (this.options.draggable) {
            li.draggable = true;
        }
        
        // アクションタイプアイコン
        const icon = this.getActionIcon(action.type);
        
        // アクション内容
        const content = document.createElement('div');
        content.className = 'action-item-content';
        content.innerHTML = `
            <span class="action-icon">${icon}</span>
            <span class="action-label">${this.getActionLabel(action)}</span>
        `;
        
        // コントロールボタン
        const controls = document.createElement('div');
        controls.className = 'action-item-controls';
        
        if (this.options.editable) {
            controls.innerHTML += `
                <button class="btn-edit-action" title="編集">✏️</button>
            `;
        }
        
        if (this.options.deletable) {
            controls.innerHTML += `
                <button class="btn-delete-action" title="削除">🗑️</button>
            `;
        }
        
        li.appendChild(content);
        li.appendChild(controls);
        
        return li;
    }

    /**
     * アクションアイコン取得
     */
    getActionIcon(type) {
        const iconMap = {
            'message': '📨',
            'condition': '❓',
            'loop': '🔄',
            'parallel': '⚡',
            'note': '📝',
            'delay': '⏱️',
            'activate': '▶️',
            'deactivate': '⏸️',
            'return': '↩️',
            'group': '📁',
            'default': '📌'
        };
        
        return iconMap[type] || iconMap.default;
    }

    /**
     * アクションラベル取得
     */
    getActionLabel(action) {
        if (action.label) {
            return action.label;
        }
        
        switch (action.type) {
            case 'message':
                return `${action.from} → ${action.to}: ${action.message}`;
            case 'condition':
                return `条件: ${action.condition}`;
            case 'loop':
                return `ループ: ${action.loopCondition}`;
            case 'parallel':
                return `並行処理 (${action.threads ? action.threads.length : 0}スレッド)`;
            case 'note':
                return `ノート: ${action.text}`;
            case 'delay':
                return `遅延: ${action.duration || '...'}`;
            default:
                return action.description || action.type;
        }
    }

    /**
     * ドラッグ&ドロップ設定
     */
    setupDragAndDrop() {
        const list = this.container.querySelector('.action-list');
        if (!list) return;
        
        let draggedItem = null;
        let draggedIndex = null;
        
        // ドラッグ開始
        list.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('action-item')) {
                draggedItem = e.target;
                draggedIndex = parseInt(e.target.dataset.index);
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
            }
        });
        
        // ドラッグ中
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggedItem);
            } else {
                list.insertBefore(draggedItem, afterElement);
            }
        });
        
        // ドラッグ終了
        list.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('action-item')) {
                e.target.classList.remove('dragging');
                
                // 新しい順序を計算
                const newOrder = Array.from(list.querySelectorAll('.action-item'))
                    .map(item => parseInt(item.dataset.index));
                
                // 順序変更イベント発火
                this.triggerEvent('orderChanged', {
                    oldIndex: draggedIndex,
                    newOrder: newOrder
                });
                
                // アクション配列を並び替え
                this.reorderActions(newOrder);
                
                draggedItem = null;
                draggedIndex = null;
            }
        });
    }

    /**
     * ドラッグ位置から挿入位置を計算
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.action-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * アクション並び替え
     */
    reorderActions(newOrder) {
        const reorderedActions = newOrder.map(index => this.actions[index]);
        this.actions = reorderedActions;
        this.render();
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 追加ボタン
        const addBtn = this.container.querySelector('.btn-add-action');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.triggerEvent('addAction');
            });
        }
        
        // 編集・削除ボタン
        this.container.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (!actionItem) return;
            
            const index = parseInt(actionItem.dataset.index);
            const action = this.actions[index];
            
            if (e.target.classList.contains('btn-edit-action')) {
                this.triggerEvent('editAction', { action, index });
            } else if (e.target.classList.contains('btn-delete-action')) {
                this.triggerEvent('deleteAction', { action, index });
            }
        });
        
        // アイテム選択
        this.container.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.action-item');
            if (actionItem && !e.target.closest('.action-item-controls')) {
                this.selectAction(actionItem);
            }
        });
    }

    /**
     * アクション選択
     */
    selectAction(item) {
        // 既存の選択を解除
        this.container.querySelectorAll('.action-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 新しい選択
        item.classList.add('selected');
        const index = parseInt(item.dataset.index);
        this.selectedAction = this.actions[index];
        
        this.triggerEvent('selectAction', { 
            action: this.selectedAction, 
            index 
        });
    }

    /**
     * アクション追加
     */
    addAction(action) {
        this.actions.push(action);
        this.render();
        this.triggerEvent('actionsChanged', { actions: this.actions });
    }

    /**
     * アクション更新
     */
    updateAction(index, action) {
        if (index >= 0 && index < this.actions.length) {
            this.actions[index] = action;
            this.render();
            this.triggerEvent('actionsChanged', { actions: this.actions });
        }
    }

    /**
     * アクション削除
     */
    deleteAction(index) {
        if (index >= 0 && index < this.actions.length) {
            this.actions.splice(index, 1);
            this.render();
            this.triggerEvent('actionsChanged', { actions: this.actions });
        }
    }

    /**
     * イベントリスナー登録
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * イベント発火
     */
    triggerEvent(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                callback(data);
            });
        }
    }

    /**
     * アクション取得
     */
    getActions() {
        return this.actions;
    }

    /**
     * クリア
     */
    clear() {
        this.actions = [];
        this.selectedAction = null;
        this.render();
    }

    /**
     * 破棄
     */
    destroy() {
        this.container.innerHTML = '';
        this.listeners.clear();
    }
}

/**
 * ActionForm - アクション追加・編集フォーム
 */
class ActionForm {
    constructor(container, action = null, options = {}) {
        this.container = container;
        this.action = action || {};
        this.options = {
            mode: action ? 'edit' : 'add',
            types: ['message', 'note', 'delay', 'activate', 'deactivate', 'return'],
            actors: [],
            ...options
        };
        
        this.listeners = new Map();
        this.initialize();
    }

    /**
     * 初期化
     */
    initialize() {
        this.render();
        this.setupEventListeners();
        this.loadFormData();
    }

    /**
     * レンダリング
     */
    render() {
        const title = this.options.mode === 'edit' ? 'アクション編集' : '新規アクション';
        
        this.container.innerHTML = `
            <div class="action-form">
                <div class="action-form-header">
                    <h4>${title}</h4>
                </div>
                <div class="action-form-body">
                    <div class="form-group">
                        <label for="action-type">アクションタイプ</label>
                        <select id="action-type" class="form-control">
                            ${this.options.types.map(type => 
                                `<option value="${type}" ${this.action.type === type ? 'selected' : ''}>
                                    ${this.getTypeLabel(type)}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div id="type-specific-fields">
                        <!-- タイプ別フィールドが動的に挿入される -->
                    </div>
                    
                    <div class="form-group">
                        <label for="action-description">説明（任意）</label>
                        <input type="text" id="action-description" class="form-control" 
                               value="${this.action.description || ''}" 
                               placeholder="アクションの説明を入力">
                    </div>
                </div>
                <div class="action-form-footer">
                    <button class="btn btn-primary btn-save">保存</button>
                    <button class="btn btn-secondary btn-cancel">キャンセル</button>
                </div>
            </div>
        `;
        
        // 初期タイプのフィールドを表示
        this.updateTypeSpecificFields(this.action.type || this.options.types[0]);
    }

    /**
     * タイプラベル取得
     */
    getTypeLabel(type) {
        const labels = {
            'message': 'メッセージ',
            'note': 'ノート',
            'delay': '遅延',
            'activate': 'アクティベート',
            'deactivate': 'ディアクティベート',
            'return': 'リターン'
        };
        return labels[type] || type;
    }

    /**
     * タイプ別フィールド更新
     */
    updateTypeSpecificFields(type) {
        const container = this.container.querySelector('#type-specific-fields');
        
        switch (type) {
            case 'message':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="action-from">送信元</label>
                        <select id="action-from" class="form-control">
                            ${this.renderActorOptions(this.action.from)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="action-to">送信先</label>
                        <select id="action-to" class="form-control">
                            ${this.renderActorOptions(this.action.to)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="action-message">メッセージ</label>
                        <input type="text" id="action-message" class="form-control" 
                               value="${this.action.message || ''}" 
                               placeholder="メッセージ内容">
                    </div>
                    <div class="form-group">
                        <label for="action-arrow">矢印タイプ</label>
                        <select id="action-arrow" class="form-control">
                            <option value="->" ${this.action.arrow === '->' ? 'selected' : ''}>同期 (->)</option>
                            <option value="-->" ${this.action.arrow === '-->' ? 'selected' : ''}>非同期 (-->)</option>
                            <option value="->>" ${this.action.arrow === '->>' ? 'selected' : ''}>応答 (->>)</option>
                            <option value="-->>

" ${this.action.arrow === '-->>' ? 'selected' : ''}>非同期応答 (-->>)</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'note':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="action-note-position">位置</label>
                        <select id="action-note-position" class="form-control">
                            <option value="right" ${this.action.position === 'right' ? 'selected' : ''}>右</option>
                            <option value="left" ${this.action.position === 'left' ? 'selected' : ''}>左</option>
                            <option value="over" ${this.action.position === 'over' ? 'selected' : ''}>上</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="action-note-actor">対象アクター</label>
                        <select id="action-note-actor" class="form-control">
                            ${this.renderActorOptions(this.action.actor)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="action-note-text">ノート内容</label>
                        <textarea id="action-note-text" class="form-control" rows="3"
                                  placeholder="ノートの内容">${this.action.text || ''}</textarea>
                    </div>
                `;
                break;
                
            case 'delay':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="action-delay-text">遅延テキスト（任意）</label>
                        <input type="text" id="action-delay-text" class="form-control" 
                               value="${this.action.text || ''}" 
                               placeholder="遅延の説明（省略可）">
                    </div>
                `;
                break;
                
            case 'activate':
            case 'deactivate':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="action-activate-actor">対象アクター</label>
                        <select id="action-activate-actor" class="form-control">
                            ${this.renderActorOptions(this.action.actor)}
                        </select>
                    </div>
                `;
                break;
                
            case 'return':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="action-return-message">リターンメッセージ</label>
                        <input type="text" id="action-return-message" class="form-control" 
                               value="${this.action.message || ''}" 
                               placeholder="リターン値やメッセージ">
                    </div>
                `;
                break;
                
            default:
                container.innerHTML = '';
        }
    }

    /**
     * アクターオプション生成
     */
    renderActorOptions(selected) {
        if (this.options.actors.length === 0) {
            return '<option value="">アクターが定義されていません</option>';
        }
        
        return this.options.actors.map(actor => 
            `<option value="${actor.id || actor.name}" 
                    ${(selected === actor.id || selected === actor.name) ? 'selected' : ''}>
                ${actor.displayName || actor.name}
            </option>`
        ).join('');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // タイプ変更
        const typeSelect = this.container.querySelector('#action-type');
        typeSelect.addEventListener('change', (e) => {
            this.updateTypeSpecificFields(e.target.value);
        });
        
        // 保存ボタン
        const saveBtn = this.container.querySelector('.btn-save');
        saveBtn.addEventListener('click', () => {
            this.save();
        });
        
        // キャンセルボタン
        const cancelBtn = this.container.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => {
            this.triggerEvent('cancel');
        });
    }

    /**
     * フォームデータ読み込み
     */
    loadFormData() {
        if (this.action && this.action.type) {
            const typeSelect = this.container.querySelector('#action-type');
            typeSelect.value = this.action.type;
            this.updateTypeSpecificFields(this.action.type);
        }
    }

    /**
     * 保存処理
     */
    save() {
        const formData = this.collectFormData();
        
        // バリデーション
        const validation = this.validate(formData);
        if (!validation.valid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // イベント発火
        this.triggerEvent('save', { 
            action: formData, 
            mode: this.options.mode 
        });
    }

    /**
     * フォームデータ収集
     */
    collectFormData() {
        const data = {
            type: this.container.querySelector('#action-type').value,
            description: this.container.querySelector('#action-description').value
        };
        
        // 既存のIDがあれば保持
        if (this.action.id) {
            data.id = this.action.id;
        }
        
        // タイプ別のデータ収集
        switch (data.type) {
            case 'message':
                data.from = this.container.querySelector('#action-from')?.value;
                data.to = this.container.querySelector('#action-to')?.value;
                data.message = this.container.querySelector('#action-message')?.value;
                data.arrow = this.container.querySelector('#action-arrow')?.value;
                break;
                
            case 'note':
                data.position = this.container.querySelector('#action-note-position')?.value;
                data.actor = this.container.querySelector('#action-note-actor')?.value;
                data.text = this.container.querySelector('#action-note-text')?.value;
                break;
                
            case 'delay':
                data.text = this.container.querySelector('#action-delay-text')?.value;
                break;
                
            case 'activate':
            case 'deactivate':
                data.actor = this.container.querySelector('#action-activate-actor')?.value;
                break;
                
            case 'return':
                data.message = this.container.querySelector('#action-return-message')?.value;
                break;
        }
        
        return data;
    }

    /**
     * バリデーション
     */
    validate(data) {
        const errors = [];
        
        // 共通バリデーション
        if (!data.type) {
            errors.push({ field: 'type', message: 'アクションタイプは必須です' });
        }
        
        // タイプ別バリデーション
        switch (data.type) {
            case 'message':
                if (!data.from) {
                    errors.push({ field: 'from', message: '送信元は必須です' });
                }
                if (!data.to) {
                    errors.push({ field: 'to', message: '送信先は必須です' });
                }
                if (!data.message) {
                    errors.push({ field: 'message', message: 'メッセージは必須です' });
                }
                break;
                
            case 'note':
                if (!data.actor) {
                    errors.push({ field: 'actor', message: '対象アクターは必須です' });
                }
                if (!data.text) {
                    errors.push({ field: 'text', message: 'ノート内容は必須です' });
                }
                break;
                
            case 'activate':
            case 'deactivate':
                if (!data.actor) {
                    errors.push({ field: 'actor', message: '対象アクターは必須です' });
                }
                break;
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * バリデーションエラー表示
     */
    showValidationErrors(errors) {
        // 既存のエラー表示をクリア
        this.container.querySelectorAll('.form-error').forEach(el => el.remove());
        this.container.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        
        // エラー表示
        errors.forEach(error => {
            const field = this.container.querySelector(`#action-${error.field}`);
            if (field) {
                field.classList.add('has-error');
                const errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                errorEl.textContent = error.message;
                field.parentElement.appendChild(errorEl);
            }
        });
    }

    /**
     * イベントリスナー登録
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * イベント発火
     */
    triggerEvent(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                callback(data);
            });
        }
    }

    /**
     * 破棄
     */
    destroy() {
        this.container.innerHTML = '';
        this.listeners.clear();
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.ActionList = ActionList;
    window.ActionForm = ActionForm;
}

// ES6モジュールとしてもエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ActionList,
        ActionForm
    };
}