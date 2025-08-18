/**
 * ActorMasterMaintenanceUI.js
 * 
 * アクターマスタメンテナンスのためのGUI管理クラス
 * アクター情報の追加・編集・削除・カテゴリー管理を提供
 * 
 * @version 1.0.0
 * @date 2025-08-18
 */

class ActorMasterMaintenanceUI {
    constructor(actorMasterManager) {
        this.actorMasterManager = actorMasterManager;
        this.modal = null;
        this.currentEditingActor = null;
        this.currentEditingCategory = null;
        this.unsavedChanges = false;
        
        console.log('[ActorMasterMaintenanceUI] Initializing...');
        this.initialize();
    }

    /**
     * 初期化
     */
    initialize() {
        this.createModal();
        this.attachEventListeners();
    }

    /**
     * モーダルの作成
     */
    createModal() {
        // 既存のモーダルがある場合は削除
        const existingModal = document.getElementById('actor-master-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'actor-master-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2>⚙️ アクターマスタ管理</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="master-tabs">
                        <button class="master-tab-btn active" data-tab="actors">アクター管理</button>
                        <button class="master-tab-btn" data-tab="categories">カテゴリー管理</button>
                        <button class="master-tab-btn" data-tab="defaults">デフォルト設定</button>
                        <button class="master-tab-btn" data-tab="import-export">インポート/エクスポート</button>
                    </div>
                    
                    <!-- アクター管理タブ -->
                    <div class="master-tab-content" id="actors-tab" style="display: block;">
                        <div class="master-toolbar">
                            <button class="btn-primary" id="btn-add-actor">➕ 新規アクター追加</button>
                            <div class="search-box">
                                <input type="text" id="actor-search" placeholder="アクターを検索...">
                            </div>
                        </div>
                        <div class="actors-grid" id="master-actors-grid">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                    
                    <!-- カテゴリー管理タブ -->
                    <div class="master-tab-content" id="categories-tab" style="display: none;">
                        <div class="master-toolbar">
                            <button class="btn-primary" id="btn-add-category">➕ 新規カテゴリー追加</button>
                        </div>
                        <div class="categories-list" id="master-categories-list">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                    
                    <!-- デフォルト設定タブ -->
                    <div class="master-tab-content" id="defaults-tab" style="display: none;">
                        <div class="defaults-info">
                            <h3>デフォルトアクター設定</h3>
                            <p>起動時に表示されるアクターを選択してください。</p>
                        </div>
                        <div class="defaults-selection" id="defaults-selection">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                    
                    <!-- インポート/エクスポートタブ -->
                    <div class="master-tab-content" id="import-export-tab" style="display: none;">
                        <div class="import-export-section">
                            <h3>エクスポート</h3>
                            <p>現在のアクターマスタ設定をJSONファイルとしてエクスポートします。</p>
                            <button class="btn-primary" id="btn-export-master">📥 エクスポート</button>
                        </div>
                        <div class="import-export-section">
                            <h3>インポート</h3>
                            <p>JSONファイルからアクターマスタ設定をインポートします。</p>
                            <input type="file" id="import-file" accept=".json" style="display: none;">
                            <button class="btn-primary" id="btn-import-master">📤 インポート</button>
                        </div>
                        <div class="import-export-section">
                            <h3>バックアップ</h3>
                            <p>現在の設定をローカルストレージにバックアップします。</p>
                            <button class="btn-secondary" id="btn-backup-local">💾 ローカルバックアップ</button>
                            <button class="btn-secondary" id="btn-restore-local">♻️ 復元</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <span class="status-message" id="master-status"></span>
                    <button class="btn-secondary" id="btn-master-cancel">キャンセル</button>
                    <button class="btn-primary" id="btn-master-save">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        
        // スタイルを追加
        this.addStyles();
    }

    /**
     * スタイルの追加
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #actor-master-modal .large-modal {
                width: 90%;
                max-width: 1200px;
                height: 80vh;
                max-height: 800px;
            }
            
            #actor-master-modal .modal-body {
                height: calc(100% - 120px);
                overflow-y: auto;
            }
            
            .master-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .master-tab-btn {
                padding: 10px 20px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                color: #666;
                transition: all 0.3s;
            }
            
            .master-tab-btn.active {
                color: #2196F3;
                border-bottom: 2px solid #2196F3;
                margin-bottom: -2px;
            }
            
            .master-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .search-box input {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                width: 250px;
            }
            
            .actors-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 15px;
            }
            
            .actor-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                background: white;
                transition: all 0.3s;
            }
            
            .actor-card:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .actor-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .actor-icon-display {
                font-size: 24px;
            }
            
            .actor-actions {
                display: flex;
                gap: 5px;
            }
            
            .actor-actions button {
                padding: 5px 10px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 16px;
            }
            
            .actor-info {
                margin-top: 10px;
            }
            
            .actor-info-item {
                display: flex;
                margin-bottom: 5px;
                font-size: 12px;
            }
            
            .actor-info-label {
                font-weight: bold;
                min-width: 80px;
                color: #666;
            }
            
            .actor-info-value {
                color: #333;
            }
            
            .categories-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .category-item {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                background: white;
            }
            
            .category-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .category-actors-count {
                background: #2196F3;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            
            .defaults-selection {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .default-actor-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .default-actor-item.selected {
                background: #e3f2fd;
                border-color: #2196F3;
            }
            
            .default-actor-item input[type="checkbox"] {
                margin-right: 10px;
            }
            
            .import-export-section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
            }
            
            .import-export-section h3 {
                margin-top: 0;
                color: #333;
            }
            
            .modal-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-top: 1px solid #e0e0e0;
            }
            
            .status-message {
                flex-grow: 1;
                color: #666;
                font-size: 14px;
            }
            
            .status-message.success {
                color: #4CAF50;
            }
            
            .status-message.error {
                color: #f44336;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * イベントリスナーの設定
     */
    attachEventListeners() {
        // モーダル閉じるボタン
        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            this.close();
        });

        // タブ切り替え
        this.modal.querySelectorAll('.master-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // アクター追加ボタン
        this.modal.querySelector('#btn-add-actor').addEventListener('click', () => {
            this.showActorEditDialog();
        });

        // カテゴリー追加ボタン
        this.modal.querySelector('#btn-add-category').addEventListener('click', () => {
            this.showCategoryEditDialog();
        });

        // エクスポートボタン
        this.modal.querySelector('#btn-export-master').addEventListener('click', () => {
            this.exportMasterData();
        });

        // インポートボタン
        this.modal.querySelector('#btn-import-master').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        // インポートファイル選択
        this.modal.querySelector('#import-file').addEventListener('change', (e) => {
            this.importMasterData(e.target.files[0]);
        });

        // バックアップボタン
        this.modal.querySelector('#btn-backup-local').addEventListener('click', () => {
            this.backupToLocal();
        });

        // 復元ボタン
        this.modal.querySelector('#btn-restore-local').addEventListener('click', () => {
            this.restoreFromLocal();
        });

        // 保存ボタン
        this.modal.querySelector('#btn-master-save').addEventListener('click', () => {
            this.saveChanges();
        });

        // キャンセルボタン
        this.modal.querySelector('#btn-master-cancel').addEventListener('click', () => {
            this.close();
        });

        // 検索ボックス
        this.modal.querySelector('#actor-search').addEventListener('input', (e) => {
            this.filterActors(e.target.value);
        });
    }

    /**
     * モーダルを表示
     */
    show() {
        this.modal.style.display = 'flex';
        this.refreshActorsDisplay();
        this.refreshCategoriesDisplay();
        this.refreshDefaultsDisplay();
    }

    /**
     * モーダルを閉じる
     */
    close() {
        if (this.unsavedChanges) {
            if (!confirm('保存されていない変更があります。閉じてもよろしいですか？')) {
                return;
            }
        }
        this.modal.style.display = 'none';
    }

    /**
     * タブの切り替え
     */
    switchTab(tabName) {
        // タブボタンのアクティブ状態を更新
        this.modal.querySelectorAll('.master-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // タブコンテンツの表示切り替え
        this.modal.querySelectorAll('.master-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        const tabContent = this.modal.querySelector(`#${tabName}-tab`);
        if (tabContent) {
            tabContent.style.display = 'block';
        }
    }

    /**
     * アクター一覧の更新
     */
    refreshActorsDisplay() {
        const grid = this.modal.querySelector('#master-actors-grid');
        grid.innerHTML = '';

        const actors = this.actorMasterManager.getAllActors();
        actors.forEach(actor => {
            const card = this.createActorCard(actor);
            grid.appendChild(card);
        });
    }

    /**
     * アクターカードの作成
     */
    createActorCard(actor) {
        const card = document.createElement('div');
        card.className = 'actor-card';
        card.dataset.actorId = actor.id;
        
        card.innerHTML = `
            <div class="actor-card-header">
                <div class="actor-display">
                    <span class="actor-icon-display">${actor.icon}</span>
                    <strong>${actor.name}</strong>
                </div>
                <div class="actor-actions">
                    <button class="btn-edit-actor" title="編集">✏️</button>
                    <button class="btn-delete-actor" title="削除">🗑️</button>
                </div>
            </div>
            <div class="actor-info">
                <div class="actor-info-item">
                    <span class="actor-info-label">カテゴリー:</span>
                    <span class="actor-info-value">${actor.categoryName || 'なし'}</span>
                </div>
                ${actor.description ? `
                <div class="actor-info-item">
                    <span class="actor-info-label">説明:</span>
                    <span class="actor-info-value">${actor.description}</span>
                </div>
                ` : ''}
                ${actor.aliases && actor.aliases.length > 0 ? `
                <div class="actor-info-item">
                    <span class="actor-info-label">別名:</span>
                    <span class="actor-info-value">${actor.aliases.join(', ')}</span>
                </div>
                ` : ''}
                ${actor.isCustom ? `
                <div class="actor-info-item">
                    <span class="actor-info-label">タイプ:</span>
                    <span class="actor-info-value">カスタム</span>
                </div>
                ` : ''}
            </div>
        `;

        // イベントリスナー
        card.querySelector('.btn-edit-actor').addEventListener('click', () => {
            this.showActorEditDialog(actor);
        });

        card.querySelector('.btn-delete-actor').addEventListener('click', () => {
            this.deleteActor(actor);
        });

        return card;
    }

    /**
     * カテゴリー一覧の更新
     */
    refreshCategoriesDisplay() {
        const list = this.modal.querySelector('#master-categories-list');
        list.innerHTML = '';

        const categories = this.actorMasterManager.categoriesMap;
        categories.forEach((category, categoryId) => {
            const item = this.createCategoryItem(categoryId, category);
            list.appendChild(item);
        });
    }

    /**
     * カテゴリーアイテムの作成
     */
    createCategoryItem(categoryId, category) {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.categoryId = categoryId;

        const actorsCount = this.actorMasterManager.getActorsByCategory(categoryId).length;

        item.innerHTML = `
            <div class="category-header">
                <div>
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                </div>
                <div>
                    <span class="category-actors-count">${actorsCount} アクター</span>
                    <button class="btn-edit-category" title="編集">✏️</button>
                    <button class="btn-delete-category" title="削除">🗑️</button>
                </div>
            </div>
        `;

        // イベントリスナー
        item.querySelector('.btn-edit-category').addEventListener('click', () => {
            this.showCategoryEditDialog(categoryId, category);
        });

        item.querySelector('.btn-delete-category').addEventListener('click', () => {
            this.deleteCategory(categoryId);
        });

        return item;
    }

    /**
     * デフォルト設定の更新
     */
    refreshDefaultsDisplay() {
        const selection = this.modal.querySelector('#defaults-selection');
        selection.innerHTML = '';

        const actors = this.actorMasterManager.getAllActors();
        const defaultActors = this.actorMasterManager.getDefaultActors();
        const defaultIds = defaultActors.map(a => a.id);

        actors.forEach(actor => {
            const item = document.createElement('div');
            item.className = 'default-actor-item';
            if (defaultIds.includes(actor.id)) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <input type="checkbox" id="default-${actor.id}" ${defaultIds.includes(actor.id) ? 'checked' : ''}>
                <label for="default-${actor.id}">
                    <span>${actor.icon}</span>
                    <span>${actor.name}</span>
                    <span style="color: #999; font-size: 12px;">(${actor.categoryName || 'なし'})</span>
                </label>
            `;

            item.addEventListener('click', (e) => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                item.classList.toggle('selected', checkbox.checked);
                this.unsavedChanges = true;
            });

            selection.appendChild(item);
        });
    }

    /**
     * アクター編集ダイアログの表示
     */
    showActorEditDialog(actor = null) {
        const isNew = !actor;
        const title = isNew ? '新規アクター追加' : 'アクター編集';
        
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';
        dialog.style.zIndex = '10001';
        
        dialog.innerHTML = `
            <div class="modal-content" style="width: 500px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>名前 *</label>
                        <input type="text" id="edit-actor-name" value="${actor ? actor.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>アイコン *</label>
                        <input type="text" id="edit-actor-icon" value="${actor ? actor.icon : '👤'}" required>
                    </div>
                    <div class="form-group">
                        <label>カテゴリー</label>
                        <select id="edit-actor-category">
                            <option value="">なし</option>
                            ${Array.from(this.actorMasterManager.categoriesMap.entries()).map(([id, cat]) => `
                                <option value="${id}" ${actor && actor.categoryId === id ? 'selected' : ''}>${cat.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>説明</label>
                        <textarea id="edit-actor-description" rows="3">${actor ? actor.description || '' : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>別名（カンマ区切り）</label>
                        <input type="text" id="edit-actor-aliases" value="${actor && actor.aliases ? actor.aliases.join(', ') : ''}">
                    </div>
                    <div class="form-group">
                        <label>カラー</label>
                        <input type="color" id="edit-actor-color" value="${actor ? actor.color || '#3498db' : '#3498db'}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="btn-cancel-edit">キャンセル</button>
                    <button class="btn-primary" id="btn-save-edit">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // イベントリスナー
        dialog.querySelector('.modal-close').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.querySelector('#btn-cancel-edit').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.querySelector('#btn-save-edit').addEventListener('click', () => {
            const name = dialog.querySelector('#edit-actor-name').value.trim();
            const icon = dialog.querySelector('#edit-actor-icon').value.trim();
            const categoryId = dialog.querySelector('#edit-actor-category').value;
            const description = dialog.querySelector('#edit-actor-description').value.trim();
            const aliases = dialog.querySelector('#edit-actor-aliases').value
                .split(',')
                .map(a => a.trim())
                .filter(a => a);
            const color = dialog.querySelector('#edit-actor-color').value;

            if (!name || !icon) {
                alert('名前とアイコンは必須です');
                return;
            }

            const actorData = {
                name,
                icon,
                categoryId,
                description,
                aliases,
                color
            };

            if (isNew) {
                this.actorMasterManager.addCustomActor(actorData);
            } else {
                // 既存アクターの更新
                Object.assign(actor, actorData);
            }

            this.unsavedChanges = true;
            this.refreshActorsDisplay();
            this.showStatus('アクターを保存しました', 'success');
            dialog.remove();
        });
    }

    /**
     * アクターの削除
     */
    deleteActor(actor) {
        if (!confirm(`「${actor.name}」を削除してもよろしいですか？`)) {
            return;
        }

        if (actor.isCustom) {
            this.actorMasterManager.removeCustomActor(actor.id);
        } else {
            // マスタアクターは削除できないため、非表示フラグを設定
            actor.hidden = true;
        }

        this.unsavedChanges = true;
        this.refreshActorsDisplay();
        this.showStatus('アクターを削除しました', 'success');
    }

    /**
     * カテゴリー編集ダイアログの表示
     */
    showCategoryEditDialog(categoryId = null, category = null) {
        // 実装省略（アクター編集と同様の構造）
        alert('カテゴリー編集機能は開発中です');
    }

    /**
     * カテゴリーの削除
     */
    deleteCategory(categoryId) {
        const actors = this.actorMasterManager.getActorsByCategory(categoryId);
        if (actors.length > 0) {
            alert('アクターが存在するカテゴリーは削除できません');
            return;
        }

        if (confirm('このカテゴリーを削除してもよろしいですか？')) {
            this.actorMasterManager.categoriesMap.delete(categoryId);
            this.unsavedChanges = true;
            this.refreshCategoriesDisplay();
            this.showStatus('カテゴリーを削除しました', 'success');
        }
    }

    /**
     * アクターのフィルタリング
     */
    filterActors(query) {
        const cards = this.modal.querySelectorAll('.actor-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('strong').textContent.toLowerCase();
            const visible = name.includes(lowerQuery);
            card.style.display = visible ? '' : 'none';
        });
    }

    /**
     * マスタデータのエクスポート
     */
    exportMasterData() {
        const data = {
            ...this.actorMasterManager.masterData,
            customActors: this.actorMasterManager.exportCustomActors(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `actors-master-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showStatus('マスタデータをエクスポートしました', 'success');
    }

    /**
     * マスタデータのインポート
     */
    importMasterData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // データの妥当性チェック
                if (!data.categories || !data.version) {
                    throw new Error('無効なマスタデータファイルです');
                }

                // インポート処理
                this.actorMasterManager.masterData = data;
                this.actorMasterManager.processMasterData();
                
                if (data.customActors) {
                    this.actorMasterManager.importCustomActors(data.customActors);
                }

                this.refreshActorsDisplay();
                this.refreshCategoriesDisplay();
                this.refreshDefaultsDisplay();
                this.showStatus('マスタデータをインポートしました', 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.showStatus('インポートに失敗しました: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * ローカルストレージへのバックアップ
     */
    backupToLocal() {
        const data = {
            masterData: this.actorMasterManager.masterData,
            customActors: this.actorMasterManager.exportCustomActors(),
            backupDate: new Date().toISOString()
        };

        localStorage.setItem('actorMasterBackup', JSON.stringify(data));
        this.showStatus('ローカルストレージにバックアップしました', 'success');
    }

    /**
     * ローカルストレージからの復元
     */
    restoreFromLocal() {
        const backup = localStorage.getItem('actorMasterBackup');
        if (!backup) {
            this.showStatus('バックアップが見つかりません', 'error');
            return;
        }

        if (!confirm('現在の設定を破棄してバックアップから復元しますか？')) {
            return;
        }

        try {
            const data = JSON.parse(backup);
            this.actorMasterManager.masterData = data.masterData;
            this.actorMasterManager.processMasterData();
            
            if (data.customActors) {
                this.actorMasterManager.importCustomActors(data.customActors);
            }

            this.refreshActorsDisplay();
            this.refreshCategoriesDisplay();
            this.refreshDefaultsDisplay();
            this.showStatus(`バックアップから復元しました (${new Date(data.backupDate).toLocaleString()})`, 'success');
        } catch (error) {
            console.error('Restore error:', error);
            this.showStatus('復元に失敗しました', 'error');
        }
    }

    /**
     * 変更の保存
     */
    async saveChanges() {
        // デフォルトアクターの更新
        const selectedDefaults = [];
        this.modal.querySelectorAll('#defaults-selection input[type="checkbox"]:checked').forEach(checkbox => {
            const actorId = checkbox.id.replace('default-', '');
            selectedDefaults.push(actorId);
        });
        
        this.actorMasterManager.masterData.defaultActors = selectedDefaults;
        this.actorMasterManager.processMasterData();

        // メインアプリケーションのアクターグリッドを更新
        if (window.app && window.app.generateActorGrid) {
            window.app.generateActorGrid();
        }

        this.unsavedChanges = false;
        this.showStatus('変更を保存しました', 'success');
        
        // 1秒後にメッセージをクリア
        setTimeout(() => {
            this.showStatus('', '');
        }, 1000);
    }

    /**
     * ステータスメッセージの表示
     */
    showStatus(message, type = '') {
        const statusElement = this.modal.querySelector('#master-status');
        statusElement.textContent = message;
        statusElement.className = 'status-message ' + type;
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.ActorMasterMaintenanceUI = ActorMasterMaintenanceUI;
}

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActorMasterMaintenanceUI;
}