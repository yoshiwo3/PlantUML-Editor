/**
 * IDManager.js
 * GUIアクションとPlantUMLコードの要素間でのID管理を行う
 * PlantUMLコード双方向同期機能において、一意性と整合性を保つためのIDマネージャー
 */

window.IDManager = class IDManager {
    constructor() {
        // IDマッピング: キー -> ID
        this.idMap = new Map();
        // 逆引きマッピング: ID -> キー  
        this.reverseMap = new Map();
        // IDカウンター
        this.counter = 0;
        // セッション識別子
        this.sessionId = Date.now().toString(36);
    }
    
    /**
     * 新しいユニークIDを生成
     * @param {string} prefix - IDのプレフィックス（デフォルト: 'action'）
     * @returns {string} 生成されたユニークID
     */
    generateId(prefix = 'action') {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const counterId = (this.counter++).toString(36);
        
        return `${prefix}_${this.sessionId}_${counterId}_${randomStr}`;
    }
    
    /**
     * 既存のIDを保持してマッピングに登録
     * @param {string} key - マッピングキー
     * @param {string} existingId - 既存のID
     * @returns {string} 保持されたID
     */
    preserveId(key, existingId) {
        // 既存のマッピングがある場合は削除
        if (this.idMap.has(key)) {
            const oldId = this.idMap.get(key);
            this.reverseMap.delete(oldId);
        }
        
        // 新しいマッピングを設定
        this.idMap.set(key, existingId);
        this.reverseMap.set(existingId, key);
        
        return existingId;
    }
    
    /**
     * キーに対するIDを取得、存在しない場合は新規作成
     * @param {string} key - マッピングキー
     * @param {string} prefix - IDのプレフィックス（新規作成時）
     * @returns {string} 対応するID
     */
    getOrCreateId(key, prefix = 'action') {
        if (this.idMap.has(key)) {
            return this.idMap.get(key);
        }
        
        const newId = this.generateId(prefix);
        this.idMap.set(key, newId);
        this.reverseMap.set(newId, key);
        
        return newId;
    }
    
    /**
     * IDからキーを逆引き検索
     * @param {string} id - 検索対象のID
     * @returns {string|null} 対応するキー、見つからない場合はnull
     */
    findById(id) {
        return this.reverseMap.get(id) || null;
    }
    
    /**
     * キーが存在するかチェック
     * @param {string} key - チェック対象のキー
     * @returns {boolean} キーの存在有無
     */
    hasKey(key) {
        return this.idMap.has(key);
    }
    
    /**
     * IDが存在するかチェック
     * @param {string} id - チェック対象のID
     * @returns {boolean} IDの存在有無
     */
    hasId(id) {
        return this.reverseMap.has(id);
    }
    
    /**
     * キーとIDのマッピングを削除
     * @param {string} key - 削除対象のキー
     * @returns {boolean} 削除の成功有無
     */
    removeKey(key) {
        if (!this.idMap.has(key)) {
            return false;
        }
        
        const id = this.idMap.get(key);
        this.idMap.delete(key);
        this.reverseMap.delete(id);
        
        return true;
    }
    
    /**
     * IDを指定してマッピングを削除
     * @param {string} id - 削除対象のID
     * @returns {boolean} 削除の成功有無
     */
    removeId(id) {
        if (!this.reverseMap.has(id)) {
            return false;
        }
        
        const key = this.reverseMap.get(id);
        this.idMap.delete(key);
        this.reverseMap.delete(id);
        
        return true;
    }
    
    /**
     * すべてのマッピングをクリア
     */
    clear() {
        this.idMap.clear();
        this.reverseMap.clear();
        this.counter = 0;
    }
    
    /**
     * 現在のマッピング状況を取得
     * @returns {Object} マッピング状況のサマリー
     */
    getStatus() {
        return {
            totalMappings: this.idMap.size,
            sessionId: this.sessionId,
            currentCounter: this.counter,
            mappings: Array.from(this.idMap.entries())
        };
    }
    
    /**
     * アクションからキーを生成（一意性を保つため）
     * @param {Object} action - GUIアクション
     * @returns {string} 生成されたキー
     */
    generateActionKey(action) {
        const parts = [];
        
        // アクションタイプを追加
        parts.push(action.type || 'unknown');
        
        // アクションの詳細情報を追加
        switch (action.type) {
            case 'message':
                parts.push(action.from || '');
                parts.push(action.to || '');
                parts.push(action.message || '');
                break;
                
            case 'loop':
                parts.push('loop');
                parts.push(action.condition || '');
                break;
                
            case 'condition':
            case 'alt':
                parts.push('condition');
                if (action.conditions && action.conditions.length > 0) {
                    parts.push(action.conditions[0].condition || '');
                }
                break;
                
            case 'parallel':
            case 'par':
                parts.push('parallel');
                parts.push(action.threads ? action.threads.length.toString() : '2');
                break;
                
            case 'note':
                parts.push('note');
                parts.push(action.target || '');
                parts.push(action.text || '');
                break;
                
            case 'activation':
                parts.push('activation');
                parts.push(action.target || '');
                break;
                
            default:
                parts.push(JSON.stringify(action).substr(0, 50));
        }
        
        // ハッシュ化して一意性を確保
        const keyString = parts.join('|');
        const hash = this.simpleHash(keyString);
        
        return `${action.type}_${hash}`;
    }
    
    /**
     * 文字列の簡単なハッシュ値を生成
     * @param {string} str - ハッシュ化対象の文字列
     * @returns {string} ハッシュ値
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * IDマッピングのバックアップを作成
     * @returns {Object} バックアップデータ
     */
    createBackup() {
        return {
            idMap: new Map(this.idMap),
            reverseMap: new Map(this.reverseMap),
            counter: this.counter,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };
    }
    
    /**
     * バックアップからIDマッピングを復元
     * @param {Object} backup - バックアップデータ
     * @returns {boolean} 復元の成功有無
     */
    restoreFromBackup(backup) {
        try {
            if (!backup || !backup.idMap || !backup.reverseMap) {
                return false;
            }
            
            this.idMap = new Map(backup.idMap);
            this.reverseMap = new Map(backup.reverseMap);
            this.counter = backup.counter || 0;
            this.sessionId = backup.sessionId || this.sessionId;
            
            return true;
        } catch (error) {
            console.error('IDManager backup restoration failed:', error);
            return false;
        }
    }
    
    /**
     * デバッグ用: マッピング状況をコンソールに出力
     */
    debug() {
        console.group('IDManager Debug Info');
        console.log('Session ID:', this.sessionId);
        console.log('Counter:', this.counter);
        console.log('Total mappings:', this.idMap.size);
        
        console.group('Key -> ID mappings');
        for (const [key, id] of this.idMap) {
            console.log(`"${key}" -> "${id}"`);
        }
        console.groupEnd();
        
        console.group('ID -> Key mappings');
        for (const [id, key] of this.reverseMap) {
            console.log(`"${id}" -> "${key}"`);
        }
        console.groupEnd();
        
        console.groupEnd();
    }
    
    /**
     * 統計情報を収集
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const actionTypes = new Map();
        
        // アクションタイプ別の統計を収集
        for (const key of this.idMap.keys()) {
            const type = key.split('_')[0];
            actionTypes.set(type, (actionTypes.get(type) || 0) + 1);
        }
        
        return {
            totalMappings: this.idMap.size,
            actionTypeStats: Object.fromEntries(actionTypes),
            sessionId: this.sessionId,
            counter: this.counter,
            memoryUsage: {
                idMapSize: this.idMap.size,
                reverseMapSize: this.reverseMap.size
            }
        };
    }
}

// グローバル変数として設定済み