/**
 * VirtualList.js
 * 
 * PERF-002: 仮想スクロール実装
 * 大量のアクション項目を効率的に表示する高性能リストコンポーネント
 * 
 * @version 4.0.0
 * @date 2025-08-16
 */

export class VirtualList {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: options.itemHeight || 60,          // デフォルトアイテム高さ
            overscan: options.overscan || 5,               // 表示外のバッファアイテム数
            debug: options.debug || false,                 // デバッグモード
            enableSmoothScrolling: options.enableSmoothScrolling !== false,
            recycleThreshold: options.recycleThreshold || 100, // DOM要素リサイクル閾値
            estimatedItemHeight: options.estimatedItemHeight || 60,
            ...options
        };
        
        this.items = [];                    // データアイテム
        this.renderedItems = new Map();     // レンダリング済みDOM要素のマップ
        this.recycledElements = [];         // リサイクル用DOM要素プール
        this.renderFunction = null;         // アイテムレンダリング関数
        this.heightCache = new Map();       // アイテム高さキャッシュ
        
        // スクロール状態
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        // パフォーマンス最適化
        this.resizeObserver = null;
        this.intersectionObserver = null;
        this.rafId = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        // 統計情報
        this.stats = {
            totalItems: 0,
            renderedItems: 0,
            recycledItems: 0,
            scrollEvents: 0,
            renderCalls: 0
        };
        
        this.initializeContainer();
        this.setupEventListeners();
        this.setupObservers();
    }
    
    /**
     * コンテナの初期化
     */
    initializeContainer() {
        // コンテナスタイルの設定
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        
        // 仮想スクロールコンテナの作成
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.style.position = 'absolute';
        this.scrollContainer.style.top = '0';
        this.scrollContainer.style.left = '0';
        this.scrollContainer.style.right = '0';
        this.scrollContainer.style.willChange = 'height';
        
        // 可視領域コンテナの作成
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.viewport.style.willChange = 'transform';
        
        this.scrollContainer.appendChild(this.viewport);
        this.container.appendChild(this.scrollContainer);
        
        // 初期サイズの取得
        this.updateContainerSize();
        
        this.log('Container initialized', {
            height: this.containerHeight,
            itemHeight: this.options.itemHeight
        });
    }
    
    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // スクロールイベント（パフォーマンス最適化済み）
        this.container.addEventListener('scroll', this.throttledScrollHandler.bind(this), {
            passive: true
        });
        
        // リサイズイベント
        window.addEventListener('resize', this.debounceResize.bind(this));
        
        // マウスホイールイベント（スムーススクロール対応）
        if (this.options.enableSmoothScrolling) {
            this.container.addEventListener('wheel', this.handleWheel.bind(this), {
                passive: false
            });
        }
    }
    
    /**
     * オブザーバーの設定
     */
    setupObservers() {
        // Intersection Observer（可視性検知）
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                this.handleIntersection.bind(this),
                { threshold: [0, 0.1, 0.9, 1] }
            );
        }
        
        // Resize Observer（サイズ変更検知）
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(
                this.handleContainerResize.bind(this)
            );
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * データの設定
     */
    setData(items, renderFunction) {
        this.items = items;
        this.renderFunction = renderFunction;
        this.stats.totalItems = items.length;
        
        // 高さキャッシュをリセット
        this.heightCache.clear();
        
        // トータル高さの計算
        this.calculateTotalHeight();
        
        // 初期レンダリング
        this.render();
        
        this.log('Data set', { itemCount: items.length });
    }
    
    /**
     * トータル高さの計算
     */
    calculateTotalHeight() {
        if (this.items.length === 0) {
            this.totalHeight = 0;
            return;
        }
        
        // 動的高さをサポートする場合
        if (this.options.dynamicHeight) {
            this.totalHeight = this.items.reduce((total, item, index) => {
                return total + this.getItemHeight(index);
            }, 0);
        } else {
            // 固定高さの場合
            this.totalHeight = this.items.length * this.options.itemHeight;
        }
        
        // スクロールコンテナの高さを更新
        this.scrollContainer.style.height = `${this.totalHeight}px`;
    }
    
    /**
     * アイテム高さの取得
     */
    getItemHeight(index) {
        if (this.heightCache.has(index)) {
            return this.heightCache.get(index);
        }
        
        // 推定高さを返す（実際の測定は必要時に行う）
        return this.options.estimatedItemHeight;
    }
    
    /**
     * 可視範囲の計算
     */
    calculateVisibleRange() {
        const start = Math.floor(this.scrollTop / this.options.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.options.itemHeight);
        
        // オーバースキャンを適用
        this.visibleStart = Math.max(0, start - this.options.overscan);
        this.visibleEnd = Math.min(
            this.items.length - 1,
            start + visibleCount + this.options.overscan
        );
        
        this.log('Visible range calculated', {
            start: this.visibleStart,
            end: this.visibleEnd,
            total: this.items.length
        });
    }
    
    /**
     * レンダリング実行
     */
    render() {
        if (!this.renderFunction || this.items.length === 0) {
            return;
        }
        
        this.stats.renderCalls++;
        
        // 可視範囲を計算
        this.calculateVisibleRange();
        
        // 現在レンダリングされているアイテムで不要なものを特定
        const itemsToRemove = [];
        this.renderedItems.forEach((element, index) => {
            if (index < this.visibleStart || index > this.visibleEnd) {
                itemsToRemove.push(index);
            }
        });
        
        // 不要なアイテムを削除・リサイクル
        itemsToRemove.forEach(index => {
            this.recycleItem(index);
        });
        
        // 必要なアイテムをレンダリング
        for (let i = this.visibleStart; i <= this.visibleEnd; i++) {
            if (!this.renderedItems.has(i)) {
                this.renderItem(i);
            }
        }
        
        // ビューポートの位置を更新
        this.updateViewportPosition();
        
        this.stats.renderedItems = this.renderedItems.size;
        
        this.log('Render complete', {
            rendered: this.renderedItems.size,
            recycled: this.recycledElements.length
        });
    }
    
    /**
     * 個別アイテムのレンダリング
     */
    renderItem(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        
        const item = this.items[index];
        let element = this.getRecycledElement();
        
        if (!element) {
            element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.left = '0';
            element.style.right = '0';
            element.style.willChange = 'transform';
        }
        
        // アイテムの内容をレンダリング
        try {
            const content = this.renderFunction(item, index);
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                element.innerHTML = '';
                element.appendChild(content);
            }
        } catch (error) {
            console.error('Error rendering item:', error);
            element.innerHTML = '<div style="color: red;">Render Error</div>';
        }
        
        // 位置とサイズの設定
        const top = this.getItemOffset(index);
        const height = this.getItemHeight(index);
        
        element.style.transform = `translateY(${top}px)`;
        element.style.height = `${height}px`;
        element.dataset.index = index;
        
        // DOMに追加
        this.viewport.appendChild(element);
        this.renderedItems.set(index, element);
        
        // Intersection Observerに登録
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        }
        
        // 実際の高さを測定（動的高さの場合）
        if (this.options.dynamicHeight) {
            requestAnimationFrame(() => {
                this.measureItemHeight(element, index);
            });
        }
    }
    
    /**
     * アイテムの位置オフセット計算
     */
    getItemOffset(index) {
        if (this.options.dynamicHeight) {
            let offset = 0;
            for (let i = 0; i < index; i++) {
                offset += this.getItemHeight(i);
            }
            return offset;
        } else {
            return index * this.options.itemHeight;
        }
    }
    
    /**
     * アイテムの実際の高さを測定
     */
    measureItemHeight(element, index) {
        const rect = element.getBoundingClientRect();
        const actualHeight = rect.height;
        
        // キャッシュに保存
        this.heightCache.set(index, actualHeight);
        
        // 推定高さと大きく異なる場合は再計算
        if (Math.abs(actualHeight - this.options.estimatedItemHeight) > 10) {
            this.calculateTotalHeight();
            this.render();
        }
    }
    
    /**
     * アイテムのリサイクル
     */
    recycleItem(index) {
        const element = this.renderedItems.get(index);
        if (element) {
            // Intersection Observerから削除
            if (this.intersectionObserver) {
                this.intersectionObserver.unobserve(element);
            }
            
            // DOMから削除
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            
            // リサイクルプールに追加
            if (this.recycledElements.length < this.options.recycleThreshold) {
                element.innerHTML = '';
                delete element.dataset.index;
                this.recycledElements.push(element);
                this.stats.recycledItems++;
            }
            
            this.renderedItems.delete(index);
        }
    }
    
    /**
     * リサイクル済み要素の取得
     */
    getRecycledElement() {
        return this.recycledElements.pop() || null;
    }
    
    /**
     * ビューポート位置の更新
     */
    updateViewportPosition() {
        // 最初の可視アイテムのオフセットを計算
        const offset = this.getItemOffset(this.visibleStart);
        this.viewport.style.transform = `translateY(${offset}px)`;
    }
    
    /**
     * コンテナサイズの更新
     */
    updateContainerSize() {
        const rect = this.container.getBoundingClientRect();
        this.containerHeight = rect.height;
        
        this.log('Container size updated', { height: this.containerHeight });
    }
    
    /**
     * スクロールハンドラー（スロットル処理済み）
     */
    throttledScrollHandler() {
        if (this.rafId) {
            return;
        }
        
        this.rafId = requestAnimationFrame(() => {
            this.handleScroll();
            this.rafId = null;
        });
    }
    
    /**
     * スクロール処理
     */
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.stats.scrollEvents++;
        
        this.isScrolling = true;
        
        // スクロール終了の検知
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.onScrollEnd();
        }, 150);
        
        // レンダリング実行
        this.render();
        
        this.log('Scroll handled', { scrollTop: this.scrollTop });
    }
    
    /**
     * スクロール終了時の処理
     */
    onScrollEnd() {
        // 不要なDOM要素のクリーンアップ
        this.cleanupUnusedElements();
        
        // パフォーマンス統計のレポート
        if (this.options.debug) {
            this.reportPerformanceStats();
        }
    }
    
    /**
     * ホイールイベントハンドラー（スムーススクロール）
     */
    handleWheel(event) {
        if (!this.options.enableSmoothScrolling) {
            return;
        }
        
        // スムーススクロールの実装
        event.preventDefault();
        
        const delta = event.deltaY;
        const targetScrollTop = this.scrollTop + delta;
        
        this.container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }
    
    /**
     * リサイズハンドラー（デバウンス処理済み）
     */
    debounceResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateContainerSize();
            this.render();
        }, 100);
    }
    
    /**
     * コンテナリサイズハンドラー
     */
    handleContainerResize(entries) {
        for (const entry of entries) {
            if (entry.target === this.container) {
                this.updateContainerSize();
                this.render();
            }
        }
    }
    
    /**
     * Intersection Observer ハンドラー
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            const element = entry.target;
            const index = parseInt(element.dataset.index);
            
            if (entry.isIntersecting) {
                // 可視状態になった時の処理
                element.style.willChange = 'transform';
            } else {
                // 非可視状態になった時の処理
                element.style.willChange = 'auto';
            }
        });
    }
    
    /**
     * 不要な要素のクリーンアップ
     */
    cleanupUnusedElements() {
        // 過剰なリサイクル要素を削除
        const maxRecycled = Math.min(this.options.recycleThreshold, 50);
        if (this.recycledElements.length > maxRecycled) {
            this.recycledElements.splice(maxRecycled);
        }
    }
    
    /**
     * パフォーマンス統計のレポート
     */
    reportPerformanceStats() {
        console.table([
            ['Total Items', this.stats.totalItems],
            ['Rendered Items', this.stats.renderedItems],
            ['Recycled Elements', this.recycledElements.length],
            ['Scroll Events', this.stats.scrollEvents],
            ['Render Calls', this.stats.renderCalls],
            ['Cache Hit Rate', `${((this.heightCache.size / this.stats.totalItems) * 100).toFixed(1)}%`]
        ]);
    }
    
    /**
     * 特定インデックスにスクロール
     */
    scrollToIndex(index, behavior = 'smooth') {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        
        const targetScrollTop = this.getItemOffset(index);
        
        this.container.scrollTo({
            top: targetScrollTop,
            behavior
        });
        
        this.log('Scrolled to index', { index, scrollTop: targetScrollTop });
    }
    
    /**
     * アイテムの追加
     */
    addItem(item, index = this.items.length) {
        this.items.splice(index, 0, item);
        this.stats.totalItems = this.items.length;
        
        // 高さキャッシュの調整
        const newCache = new Map();
        this.heightCache.forEach((height, cachedIndex) => {
            if (cachedIndex >= index) {
                newCache.set(cachedIndex + 1, height);
            } else {
                newCache.set(cachedIndex, height);
            }
        });
        this.heightCache = newCache;
        
        this.calculateTotalHeight();
        this.render();
        
        this.log('Item added', { index, totalItems: this.items.length });
    }
    
    /**
     * アイテムの削除
     */
    removeItem(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        
        this.items.splice(index, 1);
        this.stats.totalItems = this.items.length;
        
        // レンダリング済みアイテムの削除
        if (this.renderedItems.has(index)) {
            this.recycleItem(index);
        }
        
        // 高さキャッシュの調整
        const newCache = new Map();
        this.heightCache.forEach((height, cachedIndex) => {
            if (cachedIndex > index) {
                newCache.set(cachedIndex - 1, height);
            } else if (cachedIndex < index) {
                newCache.set(cachedIndex, height);
            }
        });
        this.heightCache = newCache;
        
        this.calculateTotalHeight();
        this.render();
        
        this.log('Item removed', { index, totalItems: this.items.length });
    }
    
    /**
     * データの更新
     */
    updateItem(index, newItem) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        
        this.items[index] = newItem;
        
        // レンダリング済みの場合は再レンダリング
        if (this.renderedItems.has(index)) {
            this.recycleItem(index);
            this.renderItem(index);
        }
        
        this.log('Item updated', { index });
    }
    
    /**
     * ログ出力
     */
    log(message, data = null) {
        if (this.options.debug || localStorage.getItem('debug_virtual_list') === 'true') {
            console.group(`[VirtualList] ${message}`);
            if (data) console.log(data);
            console.groupEnd();
        }
    }
    
    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            recycledElements: this.recycledElements.length,
            heightCacheSize: this.heightCache.size,
            totalHeight: this.totalHeight,
            containerHeight: this.containerHeight,
            visibleRange: {
                start: this.visibleStart,
                end: this.visibleEnd
            }
        };
    }
    
    /**
     * 破棄処理
     */
    destroy() {
        // イベントリスナーの削除
        this.container.removeEventListener('scroll', this.throttledScrollHandler);
        window.removeEventListener('resize', this.debounceResize);
        
        if (this.options.enableSmoothScrolling) {
            this.container.removeEventListener('wheel', this.handleWheel);
        }
        
        // オブザーバーの削除
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // タイマーのクリア
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        clearTimeout(this.scrollTimeout);
        clearTimeout(this.resizeTimeout);
        
        // DOM要素のクリーンアップ
        this.renderedItems.forEach((element, index) => {
            this.recycleItem(index);
        });
        
        if (this.scrollContainer && this.scrollContainer.parentNode) {
            this.scrollContainer.parentNode.removeChild(this.scrollContainer);
        }
        
        this.log('VirtualList destroyed');
    }
}

// PlantUMLエディター専用のアクションリストクラス
export class ActionVirtualList extends VirtualList {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 80,
            overscan: 3,
            dynamicHeight: true,
            enableSmoothScrolling: true,
            ...options
        });
        
        this.actionHandlers = {
            onEdit: options.onEdit || (() => {}),
            onDelete: options.onDelete || (() => {}),
            onMove: options.onMove || (() => {}),
            onQuestion: options.onQuestion || (() => {})
        };
    }
    
    /**
     * アクション項目専用のレンダリング関数
     */
    setActions(actions) {
        this.setData(actions, this.renderActionItem.bind(this));
    }
    
    /**
     * アクション項目のレンダリング
     */
    renderActionItem(action, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'action-item-virtual';
        wrapper.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            margin: 4px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
        `;
        
        // ドラッグハンドル
        const dragHandle = document.createElement('div');
        dragHandle.innerHTML = '☰';
        dragHandle.style.cssText = `
            cursor: grab;
            margin-right: 8px;
            color: #666;
            font-size: 16px;
        `;
        
        // アクター選択（FROM）
        const actorFrom = document.createElement('select');
        actorFrom.style.cssText = 'margin-right: 8px; padding: 4px;';
        actorFrom.innerHTML = this.generateActorOptions(action.actorFrom);
        
        // 矢印タイプ選択
        const arrowType = document.createElement('select');
        arrowType.style.cssText = 'margin-right: 8px; padding: 4px;';
        arrowType.innerHTML = `
            <option value="→" ${action.arrowType === '→' ? 'selected' : ''}>→</option>
            <option value="⇢" ${action.arrowType === '⇢' ? 'selected' : ''}>⇢</option>
            <option value="⟵" ${action.arrowType === '⟵' ? 'selected' : ''}>⟵</option>
            <option value="⟸" ${action.arrowType === '⟸' ? 'selected' : ''}>⟸</option>
        `;
        
        // アクター選択（TO）
        const actorTo = document.createElement('select');
        actorTo.style.cssText = 'margin-right: 8px; padding: 4px;';
        actorTo.innerHTML = this.generateActorOptions(action.actorTo);
        
        // メッセージ入力
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.value = action.message || '';
        messageInput.placeholder = 'メッセージを入力';
        messageInput.style.cssText = 'flex: 1; margin-right: 8px; padding: 4px;';
        
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            cursor: pointer;
            margin-right: 4px;
        `;
        
        // 条件確認ボタン
        const questionBtn = document.createElement('button');
        questionBtn.innerHTML = '？';
        questionBtn.style.cssText = `
            background: ${action.hasCondition ? '#ff9800' : 'transparent'};
            color: ${action.hasCondition ? 'white' : '#ff9800'};
            border: 1px solid #ff9800;
            border-radius: 3px;
            padding: 4px 8px;
            cursor: pointer;
        `;
        
        // イベントハンドラーの設定
        actorFrom.addEventListener('change', (e) => {
            this.actionHandlers.onEdit(index, 'actorFrom', e.target.value);
        });
        
        arrowType.addEventListener('change', (e) => {
            this.actionHandlers.onEdit(index, 'arrowType', e.target.value);
        });
        
        actorTo.addEventListener('change', (e) => {
            this.actionHandlers.onEdit(index, 'actorTo', e.target.value);
        });
        
        messageInput.addEventListener('input', (e) => {
            this.actionHandlers.onEdit(index, 'message', e.target.value);
        });
        
        deleteBtn.addEventListener('click', () => {
            this.actionHandlers.onDelete(index);
        });
        
        questionBtn.addEventListener('click', () => {
            this.actionHandlers.onQuestion(index);
        });
        
        // ドラッグ&ドロップの設定
        this.setupDragAndDrop(wrapper, dragHandle, index);
        
        // 要素の組み立て
        wrapper.appendChild(dragHandle);
        wrapper.appendChild(actorFrom);
        wrapper.appendChild(arrowType);
        wrapper.appendChild(actorTo);
        wrapper.appendChild(messageInput);
        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(questionBtn);
        
        return wrapper;
    }
    
    /**
     * アクター選択肢の生成
     */
    generateActorOptions(selectedActor = '') {
        // 実際のアクターリストは外部から提供される想定
        const actors = window.PlantUMLEditor?.getInstance()?.actors || ['ユーザー', 'システム', 'データベース'];
        
        return actors.map(actor => 
            `<option value="${actor}" ${actor === selectedActor ? 'selected' : ''}>${actor}</option>`
        ).join('');
    }
    
    /**
     * ドラッグ&ドロップの設定
     */
    setupDragAndDrop(wrapper, handle, index) {
        let isDragging = false;
        let dragStartY = 0;
        let dragStartIndex = 0;
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartY = e.clientY;
            dragStartIndex = index;
            
            wrapper.style.zIndex = '1000';
            wrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        });
        
        const handleDragMove = (e) => {
            if (!isDragging) return;
            
            const deltaY = e.clientY - dragStartY;
            wrapper.style.transform = `translateY(${deltaY}px)`;
        };
        
        const handleDragEnd = (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            wrapper.style.zIndex = '';
            wrapper.style.boxShadow = '';
            wrapper.style.transform = '';
            
            // ドロップ位置の計算
            const deltaY = e.clientY - dragStartY;
            const itemsMoved = Math.round(deltaY / this.options.itemHeight);
            const newIndex = Math.max(0, Math.min(this.items.length - 1, dragStartIndex + itemsMoved));
            
            if (newIndex !== dragStartIndex) {
                this.actionHandlers.onMove(dragStartIndex, newIndex);
            }
            
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.VirtualList = VirtualList;
    window.ActionVirtualList = ActionVirtualList;
}