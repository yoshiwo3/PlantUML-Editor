/**
 * DiffCalculator.js
 * PlantUMLコードとGUI状態の差分を効率的に計算するエンジン
 * 
 * 機能:
 * - テキスト差分の高速計算
 * - GUI状態の差分検出
 * - 最小変更セットの特定
 * - 変更の種類分類（追加、削除、更新、移動）
 * - パフォーマンス最適化
 */

// グローバルスコープ対応
window.DiffCalculator = class DiffCalculator {
    constructor() {
        // 差分アルゴリズムの設定
        this.options = {
            ignoreWhitespace: false,     // 空白文字を無視するか
            ignoreCase: false,           // 大文字小文字を無視するか
            contextLines: 3,             // コンテキスト行数
            maxDiffSize: 10000          // 最大差分サイズ（文字数）
        };
        
        // キャッシュ
        this.diffCache = new Map();
        this.maxCacheSize = 100;
        
        // パフォーマンス統計
        this.stats = {
            calculations: 0,
            cacheHits: 0,
            averageTime: 0,
            totalTime: 0
        };
        
        console.log('[DiffCalculator] 初期化完了');
    }
    
    /**
     * PlantUMLコードの差分を計算
     * @param {string} oldCode - 元のコード
     * @param {string} newCode - 新しいコード
     * @returns {Object} 差分結果
     */
    calculateCodeDiff(oldCode, newCode) {
        const startTime = performance.now();
        
        try {
            // 基本チェック
            if (oldCode === newCode) {
                return this.createEmptyDiff('code');
            }
            
            // キャッシュチェック
            const cacheKey = this.generateCacheKey(oldCode, newCode);
            if (this.diffCache.has(cacheKey)) {
                this.stats.cacheHits++;
                return this.diffCache.get(cacheKey);
            }
            
            // 前処理
            const oldLines = this.preprocessCode(oldCode);
            const newLines = this.preprocessCode(newCode);
            
            // 行レベルの差分計算
            const lineDiff = this.calculateLineDiff(oldLines, newLines);
            
            // 意味レベルの差分計算
            const semanticDiff = this.calculateSemanticDiff(oldCode, newCode);
            
            // 結果の統合
            const result = {
                type: 'code',
                hasChanges: lineDiff.hasChanges || semanticDiff.hasChanges,
                timestamp: Date.now(),
                
                // 行レベルの変更
                lines: {
                    added: lineDiff.added,
                    removed: lineDiff.removed,
                    modified: lineDiff.modified,
                    moved: lineDiff.moved
                },
                
                // 意味レベルの変更
                semantic: {
                    participants: semanticDiff.participants,
                    messages: semanticDiff.messages,
                    structures: semanticDiff.structures,
                    directives: semanticDiff.directives
                },
                
                // 統計情報
                stats: {
                    oldLength: oldCode.length,
                    newLength: newCode.length,
                    linesAdded: lineDiff.added.length,
                    linesRemoved: lineDiff.removed.length,
                    linesModified: lineDiff.modified.length
                },
                
                // 変更の重要度
                severity: this.calculateChangeSeverity(lineDiff, semanticDiff)
            };
            
            // キャッシュに保存
            this.addToCache(cacheKey, result);
            
            // 統計更新
            this.updateStats(performance.now() - startTime);
            
            return result;
            
        } catch (error) {
            console.error('[DiffCalculator] コード差分計算エラー:', error);
            return this.createErrorDiff('code', error);
        }
    }
    
    /**
     * GUI状態の差分を計算
     * @param {Object} oldState - 元のGUI状態
     * @param {Object} newState - 新しいGUI状態
     * @returns {Object} 差分結果
     */
    calculateGUIDiff(oldState, newState) {
        const startTime = performance.now();
        
        try {
            // Nullチェック
            if (!oldState && !newState) {
                return this.createEmptyDiff('gui');
            }
            
            if (!oldState || !newState) {
                return this.createFullReplaceDiff(oldState, newState);
            }
            
            // 基本比較
            if (this.deepEqual(oldState, newState)) {
                return this.createEmptyDiff('gui');
            }
            
            const result = {
                type: 'gui',
                hasChanges: false,
                timestamp: Date.now(),
                
                // アクター変更
                actors: this.calculateActorsDiff(
                    oldState.selectedActors, 
                    newState.selectedActors
                ),
                
                // アクション変更
                actions: this.calculateActionsDiff(
                    oldState.actions || [], 
                    newState.actions || []
                ),
                
                // モード変更
                mode: {
                    changed: oldState.currentMode !== newState.currentMode,
                    oldValue: oldState.currentMode,
                    newValue: newState.currentMode
                },
                
                // その他のプロパティ変更
                properties: this.calculatePropertiesDiff(oldState, newState)
            };
            
            // 変更フラグの設定
            result.hasChanges = result.actors.hasChanges || 
                               result.actions.hasChanges || 
                               result.mode.changed ||
                               result.properties.hasChanges;
            
            // 統計更新
            this.updateStats(performance.now() - startTime);
            
            return result;
            
        } catch (error) {
            console.error('[DiffCalculator] GUI差分計算エラー:', error);
            return this.createErrorDiff('gui', error);
        }
    }
    
    /**
     * コードの前処理
     */
    preprocessCode(code) {
        if (!code) return [];
        
        let lines = code.split('\n');
        
        // オプションに応じた前処理
        if (this.options.ignoreWhitespace) {
            lines = lines.map(line => line.trim());
        }
        
        if (this.options.ignoreCase) {
            lines = lines.map(line => line.toLowerCase());
        }
        
        // 空行の扱い
        return lines.filter(line => line.length > 0 || !this.options.ignoreWhitespace);
    }
    
    /**
     * 行レベルの差分計算（LCS改良アルゴリズム）
     */
    calculateLineDiff(oldLines, newLines) {
        const lcs = this.longestCommonSubsequence(oldLines, newLines);
        
        const added = [];
        const removed = [];
        const modified = [];
        const moved = [];
        
        let oldIndex = 0;
        let newIndex = 0;
        let lcsIndex = 0;
        
        while (oldIndex < oldLines.length || newIndex < newLines.length) {
            if (lcsIndex < lcs.length && 
                oldIndex < oldLines.length &&
                newIndex < newLines.length &&
                oldLines[oldIndex] === lcs[lcsIndex] &&
                newLines[newIndex] === lcs[lcsIndex]) {
                // 共通行
                oldIndex++;
                newIndex++;
                lcsIndex++;
            } else if (oldIndex < oldLines.length && 
                      (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
                // 削除された行
                removed.push({
                    lineNumber: oldIndex + 1,
                    content: oldLines[oldIndex]
                });
                oldIndex++;
            } else if (newIndex < newLines.length &&
                      (lcsIndex >= lcs.length || newLines[newIndex] !== lcs[lcsIndex])) {
                // 追加された行
                added.push({
                    lineNumber: newIndex + 1,
                    content: newLines[newIndex]
                });
                newIndex++;
            }
        }
        
        // 移動の検出
        const moveDetection = this.detectMoves(removed, added);
        moved.push(...moveDetection.moves);
        
        // 修正の検出（削除＋追加の組み合わせから）
        const modificationDetection = this.detectModifications(
            moveDetection.remainingRemoved,
            moveDetection.remainingAdded
        );
        modified.push(...modificationDetection);
        
        return {
            hasChanges: added.length > 0 || removed.length > 0 || 
                       modified.length > 0 || moved.length > 0,
            added: added.filter(item => !moveDetection.processedAdded.has(item)),
            removed: removed.filter(item => !moveDetection.processedRemoved.has(item)),
            modified,
            moved
        };
    }
    
    /**
     * 意味レベルの差分計算
     */
    calculateSemanticDiff(oldCode, newCode) {
        try {
            const oldElements = this.extractSemanticElements(oldCode);
            const newElements = this.extractSemanticElements(newCode);
            
            return {
                hasChanges: !this.deepEqual(oldElements, newElements),
                participants: this.calculateElementDiff(
                    oldElements.participants, 
                    newElements.participants
                ),
                messages: this.calculateElementDiff(
                    oldElements.messages, 
                    newElements.messages
                ),
                structures: this.calculateElementDiff(
                    oldElements.structures, 
                    newElements.structures
                ),
                directives: this.calculateElementDiff(
                    oldElements.directives, 
                    newElements.directives
                )
            };
        } catch (error) {
            console.warn('[DiffCalculator] 意味レベル差分計算エラー:', error);
            return { hasChanges: true, error: error.message };
        }
    }
    
    /**
     * PlantUMLコードから意味要素を抽出
     */
    extractSemanticElements(code) {
        const elements = {
            participants: [],
            messages: [],
            structures: [],
            directives: []
        };
        
        if (!code) return elements;
        
        const lines = code.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("'")) return;
            
            // 参加者（actor, participant）
            if (trimmed.match(/^(actor|participant|entity|boundary|control|database)\s+/)) {
                elements.participants.push({
                    line: index + 1,
                    type: 'participant',
                    content: trimmed
                });
            }
            
            // メッセージ（->、<-、->>など）
            else if (trimmed.match(/.*[-=]>.*:/)) {
                elements.messages.push({
                    line: index + 1,
                    type: 'message',
                    content: trimmed
                });
            }
            
            // 制御構造（alt、loop、par、opt）
            else if (trimmed.match(/^(alt|loop|par|opt|critical|break|ignore)\s+/)) {
                elements.structures.push({
                    line: index + 1,
                    type: 'structure_start',
                    subtype: trimmed.split(/\s+/)[0],
                    content: trimmed
                });
            }
            
            // 構造終了
            else if (trimmed === 'end') {
                elements.structures.push({
                    line: index + 1,
                    type: 'structure_end',
                    content: trimmed
                });
            }
            
            // ディレクティブ（@startuml、@enduml、skinparamなど）
            else if (trimmed.match(/^(@|!|skinparam)/)) {
                elements.directives.push({
                    line: index + 1,
                    type: 'directive',
                    content: trimmed
                });
            }
        });
        
        return elements;
    }
    
    /**
     * アクターの差分計算
     */
    calculateActorsDiff(oldActors, newActors) {
        const oldSet = new Set(oldActors || []);
        const newSet = new Set(newActors || []);
        
        const added = [...newSet].filter(actor => !oldSet.has(actor));
        const removed = [...oldSet].filter(actor => !newSet.has(actor));
        
        return {
            hasChanges: added.length > 0 || removed.length > 0,
            added,
            removed,
            unchanged: [...oldSet].filter(actor => newSet.has(actor))
        };
    }
    
    /**
     * アクションの差分計算
     */
    calculateActionsDiff(oldActions, newActions) {
        const changes = {
            hasChanges: false,
            added: [],
            removed: [],
            modified: [],
            reordered: []
        };
        
        // 長さの違いをチェック
        if (oldActions.length !== newActions.length) {
            changes.hasChanges = true;
        }
        
        // インデックスベースの比較
        const maxLength = Math.max(oldActions.length, newActions.length);
        
        for (let i = 0; i < maxLength; i++) {
            const oldAction = oldActions[i];
            const newAction = newActions[i];
            
            if (!oldAction && newAction) {
                // 追加
                changes.added.push({
                    index: i,
                    action: newAction
                });
                changes.hasChanges = true;
            } else if (oldAction && !newAction) {
                // 削除
                changes.removed.push({
                    index: i,
                    action: oldAction
                });
                changes.hasChanges = true;
            } else if (oldAction && newAction) {
                // 修正チェック
                if (!this.deepEqual(oldAction, newAction)) {
                    changes.modified.push({
                        index: i,
                        oldAction,
                        newAction,
                        differences: this.findActionDifferences(oldAction, newAction)
                    });
                    changes.hasChanges = true;
                }
            }
        }
        
        // 順序変更の検出
        const reorderDetection = this.detectActionReordering(oldActions, newActions);
        if (reorderDetection.length > 0) {
            changes.reordered = reorderDetection;
            changes.hasChanges = true;
        }
        
        return changes;
    }
    
    /**
     * プロパティの差分計算
     */
    calculatePropertiesDiff(oldState, newState) {
        const changes = {
            hasChanges: false,
            properties: {}
        };
        
        // 基本プロパティのチェック
        const propsToCheck = ['currentMode', 'currentActionType', 'currentZoom'];
        
        propsToCheck.forEach(prop => {
            if (oldState[prop] !== newState[prop]) {
                changes.properties[prop] = {
                    oldValue: oldState[prop],
                    newValue: newState[prop]
                };
                changes.hasChanges = true;
            }
        });
        
        return changes;
    }
    
    /**
     * LCS（最長共通部分列）アルゴリズム
     */
    longestCommonSubsequence(seq1, seq2) {
        const m = seq1.length;
        const n = seq2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        // DPテーブルの構築
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (seq1[i - 1] === seq2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // LCSの復元
        const lcs = [];
        let i = m, j = n;
        
        while (i > 0 && j > 0) {
            if (seq1[i - 1] === seq2[j - 1]) {
                lcs.unshift(seq1[i - 1]);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return lcs;
    }
    
    /**
     * 移動の検出
     */
    detectMoves(removed, added) {
        const moves = [];
        const processedRemoved = new Set();
        const processedAdded = new Set();
        
        removed.forEach(removedItem => {
            added.forEach(addedItem => {
                if (removedItem.content === addedItem.content &&
                    !processedRemoved.has(removedItem) &&
                    !processedAdded.has(addedItem)) {
                    
                    moves.push({
                        type: 'move',
                        content: removedItem.content,
                        fromLine: removedItem.lineNumber,
                        toLine: addedItem.lineNumber
                    });
                    
                    processedRemoved.add(removedItem);
                    processedAdded.add(addedItem);
                }
            });
        });
        
        const remainingRemoved = removed.filter(item => !processedRemoved.has(item));
        const remainingAdded = added.filter(item => !processedAdded.has(item));
        
        return {
            moves,
            processedRemoved,
            processedAdded,
            remainingRemoved,
            remainingAdded
        };
    }
    
    /**
     * 修正の検出（類似行のペアリング）
     */
    detectModifications(removed, added) {
        const modifications = [];
        const threshold = 0.6; // 類似度閾値
        
        removed.forEach(removedItem => {
            added.forEach(addedItem => {
                const similarity = this.calculateSimilarity(
                    removedItem.content, 
                    addedItem.content
                );
                
                if (similarity >= threshold) {
                    modifications.push({
                        type: 'modification',
                        lineNumber: removedItem.lineNumber,
                        oldContent: removedItem.content,
                        newContent: addedItem.content,
                        similarity
                    });
                }
            });
        });
        
        return modifications;
    }
    
    /**
     * 文字列の類似度計算（編集距離ベース）
     */
    calculateSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
    }
    
    /**
     * レーベンシュタイン距離の計算
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,    // 削除
                        dp[i][j - 1] + 1,    // 挿入
                        dp[i - 1][j - 1] + 1 // 置換
                    );
                }
            }
        }
        
        return dp[m][n];
    }
    
    /**
     * アクション間の差分検出
     */
    findActionDifferences(oldAction, newAction) {
        const differences = [];
        
        Object.keys(oldAction).forEach(key => {
            if (oldAction[key] !== newAction[key]) {
                differences.push({
                    property: key,
                    oldValue: oldAction[key],
                    newValue: newAction[key]
                });
            }
        });
        
        Object.keys(newAction).forEach(key => {
            if (!(key in oldAction)) {
                differences.push({
                    property: key,
                    oldValue: undefined,
                    newValue: newAction[key]
                });
            }
        });
        
        return differences;
    }
    
    /**
     * アクションの順序変更検出
     */
    detectActionReordering(oldActions, newActions) {
        // 簡単なハッシュベースの順序比較
        const oldHashes = oldActions.map(action => this.hashAction(action));
        const newHashes = newActions.map(action => this.hashAction(action));
        
        const reordering = [];
        
        oldHashes.forEach((hash, oldIndex) => {
            const newIndex = newHashes.indexOf(hash);
            if (newIndex !== -1 && newIndex !== oldIndex) {
                reordering.push({
                    hash,
                    oldIndex,
                    newIndex,
                    action: oldActions[oldIndex]
                });
            }
        });
        
        return reordering;
    }
    
    /**
     * アクションのハッシュ化
     */
    hashAction(action) {
        return JSON.stringify(action);
    }
    
    /**
     * 要素の差分計算（汎用）
     */
    calculateElementDiff(oldElements, newElements) {
        return {
            hasChanges: !this.deepEqual(oldElements, newElements),
            added: newElements.filter(newEl => 
                !oldElements.some(oldEl => this.deepEqual(oldEl, newEl))
            ),
            removed: oldElements.filter(oldEl => 
                !newElements.some(newEl => this.deepEqual(oldEl, newEl))
            )
        };
    }
    
    /**
     * 変更の重要度計算
     */
    calculateChangeSeverity(lineDiff, semanticDiff) {
        let score = 0;
        
        // 行変更のスコア
        score += lineDiff.added.length * 1;
        score += lineDiff.removed.length * 1;
        score += lineDiff.modified.length * 2;
        score += lineDiff.moved.length * 0.5;
        
        // 意味変更のスコア
        if (semanticDiff.participants?.hasChanges) score += 5;
        if (semanticDiff.messages?.hasChanges) score += 3;
        if (semanticDiff.structures?.hasChanges) score += 4;
        if (semanticDiff.directives?.hasChanges) score += 2;
        
        // 重要度レベルの判定
        if (score === 0) return 'none';
        if (score <= 2) return 'minor';
        if (score <= 5) return 'moderate';
        if (score <= 10) return 'major';
        return 'critical';
    }
    
    /**
     * ユーティリティメソッド
     */
    
    createEmptyDiff(type) {
        return {
            type,
            hasChanges: false,
            timestamp: Date.now()
        };
    }
    
    createErrorDiff(type, error) {
        return {
            type,
            hasChanges: true,
            error: error.message || error,
            timestamp: Date.now()
        };
    }
    
    createFullReplaceDiff(oldState, newState) {
        return {
            type: 'gui',
            hasChanges: true,
            fullReplace: true,
            oldState,
            newState,
            timestamp: Date.now()
        };
    }
    
    deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        
        if (obj1 == null || obj2 == null) return obj1 === obj2;
        
        if (typeof obj1 !== typeof obj2) return false;
        
        if (typeof obj1 !== 'object') return obj1 === obj2;
        
        if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.deepEqual(obj1[key], obj2[key])) return false;
        }
        
        return true;
    }
    
    generateCacheKey(str1, str2) {
        // 簡単なハッシュ生成（実際のプロダクションではより堅牢なハッシュを使用）
        const hash1 = this.simpleHash(str1);
        const hash2 = this.simpleHash(str2);
        return `${hash1}-${hash2}`;
    }
    
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        
        return Math.abs(hash);
    }
    
    addToCache(key, value) {
        // キャッシュサイズの制限
        if (this.diffCache.size >= this.maxCacheSize) {
            // LRU: 最も古いエントリを削除
            const firstKey = this.diffCache.keys().next().value;
            this.diffCache.delete(firstKey);
        }
        
        this.diffCache.set(key, value);
    }
    
    updateStats(duration) {
        this.stats.calculations++;
        this.stats.totalTime += duration;
        this.stats.averageTime = this.stats.totalTime / this.stats.calculations;
    }
    
    // 公開メソッド
    
    /**
     * キャッシュのクリア
     */
    clearCache() {
        this.diffCache.clear();
        console.log('[DiffCalculator] キャッシュをクリアしました');
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.diffCache.size,
            cacheHitRate: this.stats.calculations > 0 
                ? (this.stats.cacheHits / this.stats.calculations * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * オプションの設定
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
        this.clearCache(); // オプション変更時はキャッシュをクリア
    }
    
    /**
     * バッチ差分計算（複数のペアを一度に処理）
     */
    calculateBatchDiff(pairs) {
        return pairs.map(pair => {
            if (pair.type === 'code') {
                return this.calculateCodeDiff(pair.old, pair.new);
            } else if (pair.type === 'gui') {
                return this.calculateGUIDiff(pair.old, pair.new);
            } else {
                throw new Error(`Unknown diff type: ${pair.type}`);
            }
        });
    }
    
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        this.clearCache();
        this.stats = {
            calculations: 0,
            cacheHits: 0,
            averageTime: 0,
            totalTime: 0
        };
        console.log('[DiffCalculator] リソースをクリーンアップしました');
    }
}

// グローバル変数として設定済み