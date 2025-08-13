// PlantUML Editor PWA Service Worker
// Version: 2.0.0
// Generated: 2025-08-13T04:21:48.000Z

const CACHE_NAME = 'plantuml-editor-v2.0.0';
const STATIC_CACHE = 'plantuml-static-v2.0.0';
const DYNAMIC_CACHE = 'plantuml-dynamic-v2.0.0';

// キャッシュ対象リソース
const STATIC_ASSETS = [
    '/',
    '/plantuml-editor-standalone.html',
    '/manifest.json',
    // 基本的なリソース
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNEY0NkU1Ii8+Cjwvc3ZnPgo='
];

// PlantUMLダイアグラムAPI（Kroki）
const PLANTUML_API_PATTERN = /https:\/\/kroki\.io\/plantuml\//;

// インストール処理
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        Promise.all([
            // 静的キャッシュ
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // メインキャッシュ
            caches.open(CACHE_NAME).then(cache => {
                console.log('[SW] Cache created:', CACHE_NAME);
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('[SW] Service Worker installed successfully');
            // 新しいService Workerを即座にアクティブ化
            self.skipWaiting();
        }).catch(error => {
            console.error('[SW] Installation failed:', error);
        })
    );
});

// アクティベート処理
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        Promise.all([
            // 古いキャッシュを削除
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // 全てのクライアントを制御下に
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Service Worker activated successfully');
        })
    );
});

// ネットワークリクエスト処理
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // HTMLリクエストの処理
    if (request.destination === 'document') {
        event.respondWith(
            handleDocumentRequest(request)
        );
        return;
    }
    
    // PlantUML API（Kroki）の処理
    if (PLANTUML_API_PATTERN.test(request.url)) {
        event.respondWith(
            handlePlantUMLRequest(request)
        );
        return;
    }
    
    // 静的リソースの処理
    if (request.destination === 'script' || 
        request.destination === 'style' || 
        request.destination === 'image') {
        event.respondWith(
            handleStaticRequest(request)
        );
        return;
    }
    
    // その他のリクエスト
    event.respondWith(
        handleGenericRequest(request)
    );
});

// HTMLドキュメントリクエスト処理
async function handleDocumentRequest(request) {
    try {
        // キャッシュファーストの戦略
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving document from cache:', request.url);
            return cachedResponse;
        }
        
        // ネットワークから取得
        console.log('[SW] Fetching document from network:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // キャッシュに保存
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] Document request failed:', error);
        
        // オフライン時のフォールバック
        return generateOfflinePage();
    }
}

// PlantUML APIリクエスト処理
async function handlePlantUMLRequest(request) {
    try {
        // ダイアグラムキャッシュの確認
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('[SW] Serving PlantUML from cache:', request.url);
            
            // バックグラウンドで更新を試行
            updatePlantUMLCache(request, cache);
            
            return cachedResponse;
        }
        
        // ネットワークから取得
        console.log('[SW] Fetching PlantUML from network:', request.url);
        const networkResponse = await fetch(request, {
            // タイムアウト設定
            signal: AbortSignal.timeout(10000)
        });
        
        if (networkResponse.ok) {
            // キャッシュに保存（最大サイズ制限）
            const responseSize = networkResponse.headers.get('content-length');
            if (!responseSize || parseInt(responseSize) < 5 * 1024 * 1024) { // 5MB制限
                cache.put(request, networkResponse.clone());
            }
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] PlantUML request failed:', error);
        
        // エラー時のフォールバック（シンプルなエラー図）
        return generateErrorDiagram(error.message);
    }
}

// 静的リソースリクエスト処理
async function handleStaticRequest(request) {
    try {
        // キャッシュファースト
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // ネットワークから取得
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] Static request failed:', error);
        throw error;
    }
}

// 汎用リクエスト処理
async function handleGenericRequest(request) {
    try {
        // ネットワークファースト
        const networkResponse = await fetch(request);
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] Generic request failed:', error);
        
        // キャッシュからの取得を試行
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// PlantUMLキャッシュのバックグラウンド更新
async function updatePlantUMLCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log('[SW] PlantUML cache updated:', request.url);
        }
    } catch (error) {
        console.log('[SW] PlantUML cache update failed:', error.message);
    }
}

// オフラインページ生成
function generateOfflinePage() {
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor - オフライン</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .offline-container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0 0 20px 0;
            font-size: 2rem;
        }
        p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .retry-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            font-size: 1rem;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .retry-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .features {
            margin-top: 40px;
            text-align: left;
        }
        .feature {
            margin: 10px 0;
            display: flex;
            align-items: center;
        }
        .feature-icon {
            margin-right: 10px;
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>オフラインモード</h1>
        <p>インターネット接続がありませんが、PlantUML Editorは引き続き利用できます。</p>
        
        <button class="retry-btn" onclick="window.location.reload()">
            🔄 再接続を試す
        </button>
        
        <div class="features">
            <h3>📋 利用可能な機能:</h3>
            <div class="feature">
                <span class="feature-icon">✅</span>
                <span>PlantUMLコードの編集</span>
            </div>
            <div class="feature">
                <span class="feature-icon">✅</span>
                <span>キャッシュされた図の表示</span>
            </div>
            <div class="feature">
                <span class="feature-icon">✅</span>
                <span>ローカルストレージでのデータ保存</span>
            </div>
            <div class="feature">
                <span class="feature-icon">⚠️</span>
                <span>新しい図の生成（接続復旧後に利用可能）</span>
            </div>
        </div>
    </div>
    
    <script>
        // 接続復旧の監視
        window.addEventListener('online', function() {
            document.body.innerHTML += '<div style="position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:15px;border-radius:5px;box-shadow:0 4px 8px rgba(0,0,0,0.2);">🌐 インターネット接続が復旧しました！</div>';
            setTimeout(() => window.location.reload(), 2000);
        });
        
        // バックグラウンドでの接続確認
        setInterval(async () => {
            try {
                await fetch('/plantuml-editor-standalone.html', { method: 'HEAD' });
                window.location.reload();
            } catch (e) {
                // 接続なし - 何もしない
            }
        }, 30000);
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// エラー図生成
function generateErrorDiagram(errorMessage) {
    const svg = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fff"/>
        <rect x="10" y="10" width="380" height="180" fill="#ffebee" stroke="#f44336" stroke-width="2" rx="5"/>
        <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="#d32f2f">⚠️ 図の生成に失敗しました</text>
        <text x="200" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">エラー: ネットワーク接続を確認してください</text>
        <text x="200" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">${errorMessage}</text>
        <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="10" fill="#1976d2">🔄 接続復旧後に自動的に再試行されます</text>
    </svg>`;

    return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml' }
    });
}

// メッセージ処理（アプリからの指示）
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_PLANTUML':
            // 特定のPlantUML図をプリキャッシュ
            cachePlantUMLDiagram(data.url).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            });
            break;
    }
});

// キャッシュクリア
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] All caches cleared');
}

// PlantUML図のプリキャッシュ
async function cachePlantUMLDiagram(url) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response);
            console.log('[SW] PlantUML diagram cached:', url);
        }
    } catch (error) {
        console.error('[SW] Failed to cache PlantUML diagram:', error);
    }
}

// キャッシュサイズ取得
async function getCacheSize() {
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const key of keys) {
            const response = await cache.match(key);
            if (response) {
                const size = response.headers.get('content-length');
                if (size) {
                    totalSize += parseInt(size);
                }
            }
        }
    }
    
    return totalSize;
}

// パフォーマンス監視
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(performBackgroundSync());
    }
});

async function performBackgroundSync() {
    // バックグラウンドでの同期処理
    console.log('[SW] Performing background sync...');
    
    try {
        // キャッシュの最適化
        await optimizeCache();
        
        // 古いキャッシュエントリの削除
        await cleanupOldCacheEntries();
        
        console.log('[SW] Background sync completed');
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// キャッシュ最適化
async function optimizeCache() {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();
    
    // キャッシュサイズ制限（100MB）
    const MAX_CACHE_SIZE = 100 * 1024 * 1024;
    let currentSize = 0;
    const entries = [];
    
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const size = response.headers.get('content-length');
            const lastModified = response.headers.get('last-modified');
            entries.push({
                key,
                size: size ? parseInt(size) : 0,
                lastModified: lastModified ? new Date(lastModified) : new Date(0)
            });
            currentSize += entries[entries.length - 1].size;
        }
    }
    
    // サイズ制限超過時は古いエントリから削除
    if (currentSize > MAX_CACHE_SIZE) {
        entries.sort((a, b) => a.lastModified - b.lastModified);
        
        for (const entry of entries) {
            if (currentSize <= MAX_CACHE_SIZE) break;
            
            await cache.delete(entry.key);
            currentSize -= entry.size;
            console.log('[SW] Removed old cache entry:', entry.key.url);
        }
    }
}

// 古いキャッシュエントリのクリーンアップ
async function cleanupOldCacheEntries() {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7日間
    
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const date = response.headers.get('date');
            if (date) {
                const cacheDate = new Date(date).getTime();
                if (now - cacheDate > maxAge) {
                    await cache.delete(key);
                    console.log('[SW] Removed expired cache entry:', key.url);
                }
            }
        }
    }
}

console.log('[SW] Service Worker script loaded');