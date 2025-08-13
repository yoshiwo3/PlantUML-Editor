#!/usr/bin/env node

/**
 * PlantUML Editor Proto - PWA設定生成
 * 
 * PWA（Progressive Web App）対応のためのService WorkerとManifestを生成します。
 * オフライン動作、インストール可能なWebアプリ機能を提供します。
 * 
 * @version 2.0.0
 * @author PlantUML Editor Development Team
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service Worker生成
 */
export function generateServiceWorker() {
    return `
// PlantUML Editor PWA Service Worker
// Version: 2.0.0
// Generated: ${new Date().toISOString()}

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
const PLANTUML_API_PATTERN = /https:\\/\\/kroki\\.io\\/plantuml\\//;

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
    const html = \`<!DOCTYPE html>
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
</html>\`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// エラー図生成
function generateErrorDiagram(errorMessage) {
    const svg = \`<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fff"/>
        <rect x="10" y="10" width="380" height="180" fill="#ffebee" stroke="#f44336" stroke-width="2" rx="5"/>
        <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="#d32f2f">⚠️ 図の生成に失敗しました</text>
        <text x="200" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">エラー: ネットワーク接続を確認してください</text>
        <text x="200" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">\${errorMessage}</text>
        <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="10" fill="#1976d2">🔄 接続復旧後に自動的に再試行されます</text>
    </svg>\`;

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
`;
}

/**
 * PWA Manifest生成
 */
export function generateManifest() {
    return {
        name: "PlantUML Editor Pro",
        short_name: "PlantUML Editor",
        description: "プロフェッショナル向けPlantUMLエディター - シーケンス図作成に特化したWebアプリケーション",
        start_url: "/plantuml-editor-standalone.html",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2196F3",
        orientation: "portrait-primary",
        scope: "/",
        lang: "ja",
        dir: "ltr",
        categories: ["productivity", "developer", "business"],
        
        icons: [
            {
                src: generateIcon(72),
                sizes: "72x72",
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(96),
                sizes: "96x96", 
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(128),
                sizes: "128x128",
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(144),
                sizes: "144x144",
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(152),
                sizes: "152x152",
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(192),
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
            },
            {
                src: generateIcon(384),
                sizes: "384x384",
                type: "image/png",
                purpose: "any"
            },
            {
                src: generateIcon(512),
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ],
        
        shortcuts: [
            {
                name: "新しいシーケンス図",
                short_name: "新規作成",
                description: "新しいシーケンス図を作成",
                url: "/plantuml-editor-standalone.html?mode=sequence",
                icons: [
                    {
                        src: generateIcon(96, "#4CAF50"),
                        sizes: "96x96"
                    }
                ]
            },
            {
                name: "パターンから選択",
                short_name: "パターン",
                description: "定型パターンから図を作成",
                url: "/plantuml-editor-standalone.html?mode=pattern",
                icons: [
                    {
                        src: generateIcon(96, "#FF9800"),
                        sizes: "96x96"
                    }
                ]
            }
        ],
        
        related_applications: [
            {
                platform: "web",
                url: "https://plantuml.com"
            }
        ],
        
        prefer_related_applications: false,
        
        // PWA機能強化
        edge_side_panel: {
            preferred_width: 400
        },
        
        // カスタムプロパティ
        version: "2.0.0",
        author: "PlantUML Editor Development Team",
        license: "MIT",
        
        // プラットフォーム固有設定
        ms: {
            TileColor: "#2196F3"
        }
    };
}

/**
 * アプリアイコン生成（SVG→DataURL）
 */
function generateIcon(size, color = "#2196F3") {
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <!-- 背景 -->
        <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.2}"/>
        
        <!-- PlantUMLロゴ風のデザイン -->
        <g transform="translate(${size * 0.15}, ${size * 0.15})">
            <!-- メインシェイプ -->
            <rect x="0" y="0" width="${size * 0.7}" height="${size * 0.1}" fill="white" rx="${size * 0.02}"/>
            <rect x="0" y="${size * 0.15}" width="${size * 0.5}" height="${size * 0.1}" fill="white" rx="${size * 0.02}"/>
            <rect x="0" y="${size * 0.3}" width="${size * 0.7}" height="${size * 0.1}" fill="white" rx="${size * 0.02}"/>
            <rect x="0" y="${size * 0.45}" width="${size * 0.4}" height="${size * 0.1}" fill="white" rx="${size * 0.02}"/>
            <rect x="0" y="${size * 0.6}" width="${size * 0.6}" height="${size * 0.1}" fill="white" rx="${size * 0.02}"/>
            
            <!-- 矢印 -->
            <polygon points="${size * 0.55},${size * 0.12} ${size * 0.65},${size * 0.22} ${size * 0.55},${size * 0.32}" fill="white"/>
            <polygon points="${size * 0.45},${size * 0.42} ${size * 0.55},${size * 0.52} ${size * 0.45},${size * 0.62}" fill="white"/>
        </g>
        
        <!-- エディタ風のアクセント -->
        <circle cx="${size * 0.85}" cy="${size * 0.15}" r="${size * 0.05}" fill="white" opacity="0.8"/>
        <circle cx="${size * 0.85}" cy="${size * 0.85}" r="${size * 0.05}" fill="white" opacity="0.8"/>
    </svg>`;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * PWAセットアップ用HTML注入コード生成
 */
export function generatePWASetupScript() {
    return `
<!-- PWA Setup -->
<script>
// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registered:', registration.scope);
            
            // 更新チェック
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    });
}

// PWAインストールプロンプト
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

// インストールボタン表示
function showInstallButton() {
    const installBtn = document.createElement('button');
    installBtn.innerHTML = '📱 アプリをインストール';
    installBtn.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: #2196F3;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
        transition: all 0.3s ease;
    \`;
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ PWA installed');
                installBtn.style.display = 'none';
            }
            
            deferredPrompt = null;
        }
    });
    
    installBtn.addEventListener('mouseenter', () => {
        installBtn.style.transform = 'translateY(-2px)';
        installBtn.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)';
    });
    
    installBtn.addEventListener('mouseleave', () => {
        installBtn.style.transform = 'translateY(0)';
        installBtn.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
    });
    
    document.body.appendChild(installBtn);
    
    // 10秒後に自動フェードアウト
    setTimeout(() => {
        installBtn.style.opacity = '0.7';
    }, 10000);
}

// アップデート通知
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = \`
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>🔄 新しいバージョンが利用可能です</span>
            <button onclick="updateApp()" style="background: white; color: #2196F3; border: none; padding: 8px 16px; border-radius: 15px; cursor: pointer; margin-left: 10px;">更新</button>
        </div>
    \`;
    notification.style.cssText = \`
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    \`;
    
    document.body.appendChild(notification);
}

// アプリ更新
window.updateApp = function() {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
};

// オフライン・オンライン状態の監視
window.addEventListener('online', () => {
    showConnectionStatus('🌐 インターネット接続が復旧しました', '#4CAF50');
});

window.addEventListener('offline', () => {
    showConnectionStatus('📱 オフラインモードで動作中', '#FF9800');
});

function showConnectionStatus(message, color) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.style.cssText = \`
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: \${color};
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 16px;
        text-align: center;
        animation: fadeInOut 3s ease;
    \`;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.remove();
    }, 3000);
}

// PWA関連のCSS
const pwaStyles = document.createElement('style');
pwaStyles.textContent = \`
@keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
}

@media (display-mode: standalone) {
    /* PWAモード時のスタイル調整 */
    body {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
    }
    
    .app-header {
        background: linear-gradient(135deg, #2196F3, #1976D2);
        box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
    }
}
\`;
document.head.appendChild(pwaStyles);

// PWA機能のテスト
console.log('📱 PWA機能チェック:', {
    serviceWorker: 'serviceWorker' in navigator,
    installPrompt: 'BeforeInstallPromptEvent' in window,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    onlineStatus: navigator.onLine
});
</script>

<!-- PWA Manifest Link -->
<link rel="manifest" href="/manifest.json">

<!-- iOS PWA対応 -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="PlantUML Editor">
<link rel="apple-touch-icon" href="data:image/svg+xml;base64,${Buffer.from(generateIcon(180).split(',')[1]).toString('base64')}">

<!-- Windows PWA対応 -->
<meta name="msapplication-TileColor" content="#2196F3">
<meta name="msapplication-TileImage" content="data:image/svg+xml;base64,${Buffer.from(generateIcon(144).split(',')[1]).toString('base64')}">

<!-- その他のメタタグ -->
<meta name="theme-color" content="#2196F3">
<meta name="color-scheme" content="light">
`;
}

// CLI実行時の処理
if (import.meta.url === `file://${process.argv[1]}`) {
    const projectRoot = path.resolve(__dirname, '..');
    
    console.log('🔧 PWA設定ファイル生成中...');
    
    // Service Worker生成
    const serviceWorker = generateServiceWorker();
    fs.writeFileSync(path.join(projectRoot, 'service-worker.js'), serviceWorker);
    console.log('✅ Service Worker生成完了: service-worker.js');
    
    // Manifest生成
    const manifest = generateManifest();
    fs.writeFileSync(path.join(projectRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest生成完了: manifest.json');
    
    console.log('🎉 PWA設定ファイル生成完了!');
}