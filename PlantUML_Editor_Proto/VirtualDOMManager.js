/**
 * VirtualDOMManager.js
 * 
 * 仮想DOM実装による効率的なUI更新管理
 * Phase 4: パフォーマンス最適化
 * 
 * @version 4.0.0
 * @date 2025-08-13
 */

class VirtualDOMManager {
    constructor(options = {}) {
        this.debugMode = options.debugMode || false;
        this.currentVDOM = null;
        this.rootElement = null;
        this.updateQueue = [];
        this.isUpdating = false;
        this.batchTimeout = null;
        this.batchDelay = options.batchDelay || 16; // 60fps
        this.maxBatchSize = options.maxBatchSize || 100;
        this.listeners = new Map();
        this.componentCache = new Map();
        this.diffCache = new WeakMap();
    }
    
    /**
     * デバッグログ
     */
    log(message, data = null) {
        if (this.debugMode || localStorage.getItem('debug_vdom') === 'true') {
            console.group(`[VirtualDOM] ${message}`);
            if (data) console.log(data);
            console.groupEnd();
        }
    }
    
    /**
     * ルート要素の設定
     */
    mount(element) {
        if (typeof element === 'string') {
            this.rootElement = document.querySelector(element);
        } else {
            this.rootElement = element;
        }
        
        if (!this.rootElement) {
            throw new Error('Root element not found');
        }
        
        // 初期VDOMの構築
        this.currentVDOM = this.createVNodeFromDOM(this.rootElement);
        this.log('Mounted', { element: this.rootElement.tagName });
        
        return this;
    }
    
    /**
     * 仮想ノードの作成
     */
    h(type, props = {}, ...children) {
        // テキストノードの処理
        const flatChildren = children.flat().map(child => {
            if (typeof child === 'string' || typeof child === 'number') {
                return { type: 'text', props: { nodeValue: String(child) } };
            }
            return child;
        }).filter(Boolean);
        
        return {
            type,
            props,
            children: flatChildren,
            key: props.key || null
        };
    }
    
    /**
     * コンポーネントのレンダリング
     */
    render(vnode) {
        if (typeof vnode === 'function') {
            // 関数コンポーネント
            const cached = this.componentCache.get(vnode);
            if (cached && !this.shouldComponentUpdate(vnode, cached)) {
                return cached.vnode;
            }
            
            const result = vnode();
            this.componentCache.set(vnode, {
                vnode: result,
                timestamp: Date.now()
            });
            return result;
        }
        
        return vnode;
    }
    
    /**
     * 更新のスケジューリング
     */
    update(vnode) {
        this.updateQueue.push(vnode);
        
        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => {
                this.flushUpdateQueue();
            }, this.batchDelay);
        }
    }
    
    /**
     * 更新キューのフラッシュ
     */
    flushUpdateQueue() {
        if (this.isUpdating || this.updateQueue.length === 0) {
            return;
        }
        
        this.isUpdating = true;
        const startTime = performance.now();
        
        // バッチ処理
        const updates = this.updateQueue.splice(0, this.maxBatchSize);
        
        for (const vnode of updates) {
            const newVDOM = this.render(vnode);
            const patches = this.diff(this.currentVDOM, newVDOM);
            this.patch(this.rootElement, patches);
            this.currentVDOM = newVDOM;
        }
        
        const duration = performance.now() - startTime;
        this.log('Update completed', { 
            updates: updates.length, 
            duration: `${duration.toFixed(2)}ms`,
            remaining: this.updateQueue.length
        });
        
        this.isUpdating = false;
        this.batchTimeout = null;
        
        // 残りの更新がある場合は次のバッチをスケジュール
        if (this.updateQueue.length > 0) {
            this.update(this.updateQueue[0]);
        }
        
        // 更新完了イベント
        this.emit('updated', { duration, count: updates.length });
    }
    
    /**
     * 差分検出アルゴリズム
     */
    diff(oldVNode, newVNode) {
        const patches = [];
        
        // キャッシュチェック
        if (this.diffCache.has(oldVNode)) {
            const cached = this.diffCache.get(oldVNode);
            if (cached.newVNode === newVNode) {
                return cached.patches;
            }
        }
        
        this.diffNode(oldVNode, newVNode, patches, []);
        
        // キャッシュ保存
        this.diffCache.set(oldVNode, { newVNode, patches });
        
        return patches;
    }
    
    /**
     * ノードの差分検出
     */
    diffNode(oldVNode, newVNode, patches, path) {
        // 削除
        if (!newVNode) {
            patches.push({ type: 'REMOVE', path });
            return;
        }
        
        // 追加
        if (!oldVNode) {
            patches.push({ type: 'ADD', path, vnode: newVNode });
            return;
        }
        
        // テキストノードの更新
        if (oldVNode.type === 'text' && newVNode.type === 'text') {
            if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
                patches.push({ 
                    type: 'UPDATE_TEXT', 
                    path, 
                    value: newVNode.props.nodeValue 
                });
            }
            return;
        }
        
        // タイプが異なる場合は置換
        if (oldVNode.type !== newVNode.type) {
            patches.push({ type: 'REPLACE', path, vnode: newVNode });
            return;
        }
        
        // 属性の差分
        this.diffProps(oldVNode.props, newVNode.props, patches, path);
        
        // 子要素の差分（キー付き最適化）
        if (oldVNode.children || newVNode.children) {
            this.diffChildren(
                oldVNode.children || [],
                newVNode.children || [],
                patches,
                path
            );
        }
    }
    
    /**
     * 属性の差分検出
     */
    diffProps(oldProps = {}, newProps = {}, patches, path) {
        const allProps = new Set([
            ...Object.keys(oldProps),
            ...Object.keys(newProps)
        ]);
        
        const updates = {};
        
        for (const prop of allProps) {
            if (prop === 'key' || prop === 'children') continue;
            
            const oldValue = oldProps[prop];
            const newValue = newProps[prop];
            
            if (oldValue !== newValue) {
                updates[prop] = newValue;
            }
        }
        
        if (Object.keys(updates).length > 0) {
            patches.push({ type: 'UPDATE_PROPS', path, props: updates });
        }
    }
    
    /**
     * 子要素の差分検出（キー最適化）
     */
    diffChildren(oldChildren, newChildren, patches, path) {
        // キー付き要素のマップ作成
        const oldKeyed = new Map();
        const newKeyed = new Map();
        
        oldChildren.forEach((child, index) => {
            if (child.key) oldKeyed.set(child.key, { child, index });
        });
        
        newChildren.forEach((child, index) => {
            if (child.key) newKeyed.set(child.key, { child, index });
        });
        
        // 移動、更新、削除の検出
        const maxLength = Math.max(oldChildren.length, newChildren.length);
        
        for (let i = 0; i < maxLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];
            const childPath = [...path, i];
            
            // キー付き要素の処理
            if (newChild?.key) {
                const oldKeyedItem = oldKeyed.get(newChild.key);
                if (oldKeyedItem) {
                    // 移動が必要な場合
                    if (oldKeyedItem.index !== i) {
                        patches.push({
                            type: 'MOVE',
                            path: [...path, oldKeyedItem.index],
                            toPath: childPath
                        });
                    }
                    // 更新の検出
                    this.diffNode(oldKeyedItem.child, newChild, patches, childPath);
                } else {
                    // 新規追加
                    this.diffNode(null, newChild, patches, childPath);
                }
            } else {
                // キーなし要素の通常差分
                this.diffNode(oldChild, newChild, patches, childPath);
            }
        }
    }
    
    /**
     * パッチの適用
     */
    patch(rootElement, patches) {
        const operations = this.optimizePatches(patches);
        
        for (const op of operations) {
            this.applyPatch(rootElement, op);
        }
    }
    
    /**
     * パッチの最適化
     */
    optimizePatches(patches) {
        // 同じパスへの複数の操作を統合
        const grouped = new Map();
        
        for (const patch of patches) {
            const key = patch.path.join('.');
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(patch);
        }
        
        // 最適化された操作リストを作成
        const optimized = [];
        for (const [path, ops] of grouped) {
            // REMOVE > REPLACE > UPDATE の優先順位で処理
            const remove = ops.find(op => op.type === 'REMOVE');
            if (remove) {
                optimized.push(remove);
                continue;
            }
            
            const replace = ops.find(op => op.type === 'REPLACE');
            if (replace) {
                optimized.push(replace);
                continue;
            }
            
            // その他の操作を統合
            optimized.push(...ops);
        }
        
        return optimized;
    }
    
    /**
     * 個別パッチの適用
     */
    applyPatch(rootElement, patch) {
        const element = this.getElementByPath(rootElement, patch.path);
        if (!element) return;
        
        switch (patch.type) {
            case 'ADD':
                const newElement = this.createElement(patch.vnode);
                element.appendChild(newElement);
                break;
                
            case 'REMOVE':
                element.remove();
                break;
                
            case 'REPLACE':
                const replacement = this.createElement(patch.vnode);
                element.replaceWith(replacement);
                break;
                
            case 'UPDATE_TEXT':
                element.nodeValue = patch.value;
                break;
                
            case 'UPDATE_PROPS':
                this.updateProps(element, patch.props);
                break;
                
            case 'MOVE':
                const target = this.getElementByPath(rootElement, patch.toPath);
                if (target) {
                    element.parentNode.insertBefore(element, target);
                }
                break;
        }
    }
    
    /**
     * パスから要素を取得
     */
    getElementByPath(root, path) {
        let element = root;
        for (const index of path) {
            element = element.childNodes[index];
            if (!element) return null;
        }
        return element;
    }
    
    /**
     * 仮想ノードからDOM要素を作成
     */
    createElement(vnode) {
        if (vnode.type === 'text') {
            return document.createTextNode(vnode.props.nodeValue);
        }
        
        const element = document.createElement(vnode.type);
        
        // 属性の設定
        this.updateProps(element, vnode.props);
        
        // 子要素の追加
        if (vnode.children) {
            for (const child of vnode.children) {
                element.appendChild(this.createElement(child));
            }
        }
        
        return element;
    }
    
    /**
     * 要素の属性更新
     */
    updateProps(element, props) {
        for (const [key, value] of Object.entries(props)) {
            if (key === 'key' || key === 'children') continue;
            
            if (key.startsWith('on')) {
                // イベントハンドラー
                const eventName = key.slice(2).toLowerCase();
                element.removeEventListener(eventName, element[key]);
                if (value) {
                    element[key] = value;
                    element.addEventListener(eventName, value);
                }
            } else if (key === 'className') {
                element.className = value || '';
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (value === null || value === undefined) {
                element.removeAttribute(key);
            } else {
                element.setAttribute(key, value);
            }
        }
    }
    
    /**
     * DOMから仮想ノードを作成
     */
    createVNodeFromDOM(element) {
        if (element.nodeType === Node.TEXT_NODE) {
            return {
                type: 'text',
                props: { nodeValue: element.nodeValue }
            };
        }
        
        const props = {};
        for (const attr of element.attributes) {
            props[attr.name] = attr.value;
        }
        
        const children = [];
        for (const child of element.childNodes) {
            children.push(this.createVNodeFromDOM(child));
        }
        
        return {
            type: element.tagName.toLowerCase(),
            props,
            children
        };
    }
    
    /**
     * コンポーネントの更新チェック
     */
    shouldComponentUpdate(component, cached) {
        // デフォルトは常に更新
        // カスタムロジックを実装可能
        return true;
    }
    
    /**
     * イベントリスナー登録
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * イベントリスナー解除
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * イベント発火
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.updateQueue = [];
        this.currentVDOM = null;
        this.rootElement = null;
        this.componentCache.clear();
        this.listeners.clear();
        clearTimeout(this.batchTimeout);
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualDOMManager;
}

if (typeof window !== 'undefined') {
    window.VirtualDOMManager = VirtualDOMManager;
}