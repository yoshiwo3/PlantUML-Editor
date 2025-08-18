/**
 * ActorMasterManager.js
 * 
 * アクターマスタ管理システム
 * actors-master.jsonからアクター情報を読み込み、動的にUIを生成
 * 
 * @version 1.0.0
 * @date 2025-08-18
 */

class ActorMasterManager {
    constructor() {
        this.masterData = null;
        this.actorsMap = new Map();
        this.categoriesMap = new Map();
        this.defaultActors = [];
        this.customActors = [];
        this.isLoaded = false;
        
        console.log('[ActorMasterManager] Initializing...');
    }

    /**
     * マスタデータの読み込み
     * @returns {Promise<boolean>} 読み込み成功/失敗
     */
    async loadMasterData() {
        try {
            const response = await fetch('/config/actors-master.json?t=' + Date.now());
            if (!response.ok) {
                throw new Error(`Failed to load master data: ${response.status}`);
            }
            
            this.masterData = await response.json();
            this.processMasterData();
            this.isLoaded = true;
            
            console.log('[ActorMasterManager] Master data loaded successfully');
            return true;
        } catch (error) {
            console.error('[ActorMasterManager] Failed to load master data:', error);
            // フォールバック：デフォルトデータを使用
            this.loadFallbackData();
            return false;
        }
    }

    /**
     * マスタデータの処理
     */
    processMasterData() {
        if (!this.masterData) return;

        // カテゴリーごとにアクターを処理
        for (const [categoryId, category] of Object.entries(this.masterData.categories)) {
            this.categoriesMap.set(categoryId, category);
            
            for (const actor of category.actors) {
                // アクター情報を拡張
                const actorInfo = {
                    ...actor,
                    categoryId: categoryId,
                    categoryName: category.name
                };
                
                this.actorsMap.set(actor.id, actorInfo);
                
                // デフォルトアクターの判定
                if (this.masterData.defaultActors.includes(actor.id)) {
                    this.defaultActors.push(actorInfo);
                }
            }
        }
        
        console.log(`[ActorMasterManager] Processed ${this.actorsMap.size} actors in ${this.categoriesMap.size} categories`);
    }

    /**
     * フォールバックデータの読み込み
     */
    loadFallbackData() {
        console.log('[ActorMasterManager] Loading fallback data...');
        
        // ハードコードされた最小限のデフォルトアクター
        const fallbackActors = [
            { id: 'customer', name: '顧客', icon: '👤', categoryId: 'business' },
            { id: 'manager', name: '管理者', icon: '👨‍💼', categoryId: 'business' },
            { id: 'ecsite', name: 'ECサイト', icon: '🛒', categoryId: 'ecommerce' },
            { id: 'inventory', name: '在庫システム', icon: '📦', categoryId: 'ecommerce' },
            { id: 'payment', name: '決済サービス', icon: '💳', categoryId: 'ecommerce' },
            { id: 'delivery', name: '配送業者', icon: '🚚', categoryId: 'ecommerce' }
        ];
        
        fallbackActors.forEach(actor => {
            this.actorsMap.set(actor.id, actor);
            this.defaultActors.push(actor);
        });
        
        this.isLoaded = true;
    }

    /**
     * デフォルトアクターの取得
     * @returns {Array} デフォルトアクターのリスト
     */
    getDefaultActors() {
        return this.defaultActors;
    }

    /**
     * すべてのアクターを取得
     * @returns {Array} すべてのアクター
     */
    getAllActors() {
        return Array.from(this.actorsMap.values());
    }

    /**
     * カテゴリー別アクターの取得
     * @param {string} categoryId - カテゴリーID
     * @returns {Array} 指定カテゴリーのアクター
     */
    getActorsByCategory(categoryId) {
        return Array.from(this.actorsMap.values())
            .filter(actor => actor.categoryId === categoryId);
    }

    /**
     * アクター情報の取得
     * @param {string} actorId - アクターID
     * @returns {Object|null} アクター情報
     */
    getActor(actorId) {
        return this.actorsMap.get(actorId) || null;
    }

    /**
     * アクターの検索
     * @param {string} query - 検索クエリ
     * @returns {Array} 検索結果
     */
    searchActors(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.actorsMap.values()).filter(actor => {
            // 名前、説明、エイリアスで検索
            if (actor.name.toLowerCase().includes(lowerQuery)) return true;
            if (actor.description && actor.description.toLowerCase().includes(lowerQuery)) return true;
            if (actor.aliases && actor.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))) return true;
            return false;
        });
    }

    /**
     * カスタムアクターの追加
     * @param {Object} actorData - アクター情報
     * @returns {boolean} 追加成功/失敗
     */
    addCustomActor(actorData) {
        if (!this.masterData || !this.masterData.customActors.enabled) {
            console.warn('[ActorMasterManager] Custom actors are disabled');
            return false;
        }
        
        if (this.customActors.length >= this.masterData.customActors.maxCount) {
            console.warn('[ActorMasterManager] Maximum custom actors reached');
            return false;
        }
        
        const customActor = {
            id: `custom_${Date.now()}`,
            name: actorData.name,
            icon: actorData.icon || this.masterData.customActors.defaultIcon || '👤',
            color: actorData.color || this.masterData.customActors.defaultColor || '#95a5a6',
            categoryId: 'custom',
            categoryName: 'カスタム',
            isCustom: true,
            ...actorData
        };
        
        this.actorsMap.set(customActor.id, customActor);
        this.customActors.push(customActor);
        
        console.log('[ActorMasterManager] Added custom actor:', customActor.name);
        return true;
    }

    /**
     * カスタムアクターの削除
     * @param {string} actorId - アクターID
     * @returns {boolean} 削除成功/失敗
     */
    removeCustomActor(actorId) {
        const actor = this.actorsMap.get(actorId);
        if (!actor || !actor.isCustom) {
            console.warn('[ActorMasterManager] Cannot remove non-custom actor');
            return false;
        }
        
        this.actorsMap.delete(actorId);
        this.customActors = this.customActors.filter(a => a.id !== actorId);
        
        console.log('[ActorMasterManager] Removed custom actor:', actor.name);
        return true;
    }

    /**
     * アクターグリッドHTMLの生成
     * @param {Array} selectedActors - 選択済みアクターのIDリスト
     * @returns {string} HTML文字列
     */
    generateActorGridHTML(selectedActors = []) {
        const actors = this.getDefaultActors();
        let html = '';
        
        actors.forEach(actor => {
            const isSelected = selectedActors.includes(actor.name);
            html += `
                <button class="actor-btn ${isSelected ? 'selected' : ''}" data-actor="${actor.name}">
                    <span class="actor-icon">${actor.icon}</span>
                    <span>${actor.name}</span>
                </button>
            `;
        });
        
        // カスタムアクターを追加
        this.customActors.forEach(actor => {
            const isSelected = selectedActors.includes(actor.name);
            html += `
                <button class="actor-btn custom-actor ${isSelected ? 'selected' : ''}" data-actor="${actor.name}">
                    <span class="actor-icon">${actor.icon}</span>
                    <span>${actor.name}</span>
                </button>
            `;
        });
        
        return html;
    }

    /**
     * カテゴリー別アクター選択モーダルのHTML生成
     * @returns {string} HTML文字列
     */
    generateCategoryModalHTML() {
        let html = '<div class="actor-categories">';
        
        for (const [categoryId, category] of this.categoriesMap.entries()) {
            html += `
                <div class="actor-category" data-category="${categoryId}">
                    <h4>${category.name}</h4>
                    <p class="category-description">${category.description}</p>
                    <div class="category-actors">
            `;
            
            const actors = this.getActorsByCategory(categoryId);
            actors.forEach(actor => {
                html += `
                    <div class="category-actor-item" data-actor-id="${actor.id}">
                        <span class="actor-icon">${actor.icon}</span>
                        <span class="actor-name">${actor.name}</span>
                        ${actor.description ? `<span class="actor-desc">${actor.description}</span>` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * マスタデータの保存（カスタムアクターの永続化用）
     * @returns {Object} 保存用データ
     */
    exportCustomActors() {
        return {
            customActors: this.customActors,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * カスタムアクターのインポート
     * @param {Object} data - インポートデータ
     */
    importCustomActors(data) {
        if (!data || !data.customActors) return;
        
        data.customActors.forEach(actor => {
            this.addCustomActor(actor);
        });
        
        console.log(`[ActorMasterManager] Imported ${data.customActors.length} custom actors`);
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.ActorMasterManager = ActorMasterManager;
}

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActorMasterManager;
}