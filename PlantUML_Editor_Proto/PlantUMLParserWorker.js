/**
 * PlantUMLParserWorker.js
 * 
 * Web Worker for background PlantUML parsing
 * Phase 3: パース処理のバックグラウンド実行
 * 
 * @version 3.0.0
 * @date 2025-08-13
 */

// PlantUMLParserクラスをインポート
importScripts('PlantUMLParser.js');

// Workerインスタンスの初期化
let parser = null;
let debugMode = false;
let performanceMode = 'balanced'; // 'fast', 'balanced', 'quality'

/**
 * ログ出力（Worker内）
 */
function log(message, data = null) {
    if (debugMode) {
        console.log(`[Worker] ${message}`, data || '');
    }
}

/**
 * パフォーマンス測定
 */
function measurePerformance(fn, label) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    
    return {
        result,
        performance: {
            label,
            duration: duration.toFixed(2),
            timestamp: Date.now()
        }
    };
}

/**
 * メッセージハンドラー
 */
self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    
    try {
        switch (type) {
            case 'INIT':
                handleInit(payload, id);
                break;
                
            case 'PARSE':
                handleParse(payload, id);
                break;
                
            case 'VALIDATE':
                handleValidate(payload, id);
                break;
                
            case 'BATCH_PARSE':
                handleBatchParse(payload, id);
                break;
                
            case 'UPDATE_CONFIG':
                handleUpdateConfig(payload, id);
                break;
                
            case 'HEALTH_CHECK':
                handleHealthCheck(id);
                break;
                
            case 'CLEAR_CACHE':
                handleClearCache(id);
                break;
                
            default:
                sendError(`Unknown message type: ${type}`, id);
        }
    } catch (error) {
        sendError(error.message, id, error);
    }
};

/**
 * 初期化処理
 */
function handleInit(payload, id) {
    const { config = {} } = payload;
    
    log('Initializing parser', config);
    
    try {
        // パーサーインスタンスの作成
        parser = new PlantUMLParser({
            debugMode: config.debugMode || false,
            strictMode: config.strictMode || false,
            locale: config.locale || 'ja'
        });
        
        // Worker環境でのbindエラー回避
        // initializeHandlersが存在し、bind()でエラーが出る場合の対処
        if (parser.initializeHandlers && typeof parser.initializeHandlers === 'function') {
            try {
                // 通常のinitializeHandlers呼び出しを試みる
                const handlers = parser.initializeHandlers();
                parser.parseHandlers = handlers;
            } catch (bindError) {
                // bindエラーが発生した場合、手動でハンドラーをバインド
                log('Bind error caught, applying workaround', bindError.message);
                
                const handlers = {};
                const handlerMethods = [
                    'handleActor',
                    'handleMessage', 
                    'handleStructure',
                    'handleNote',
                    'handleActivation'
                ];
                
                for (const methodName of handlerMethods) {
                    if (typeof parser[methodName] === 'function') {
                        const handlerKey = methodName.replace('handle', '').toLowerCase();
                        // Worker環境でも動作するようにbindを慎重に適用
                        handlers[handlerKey] = function(...args) {
                            return parser[methodName].apply(parser, args);
                        };
                    }
                }
                
                parser.parseHandlers = handlers;
            }
        }
        
        debugMode = config.debugMode || false;
        performanceMode = config.performanceMode || 'balanced';
        
        // キャッシュの初期化
        self.parseCache = new Map();
        self.cacheLimit = config.cacheLimit || 50;
        
        sendSuccess({
            initialized: true,
            config: {
                debugMode,
                performanceMode,
                cacheLimit: self.cacheLimit
            }
        }, id);
    } catch (error) {
        sendError(`Initialization failed: ${error.message}`, id, error);
    }
}

/**
 * パース処理
 */
function handleParse(payload, id) {
    if (!parser) {
        sendError('Parser not initialized', id);
        return;
    }
    
    const { code, options = {} } = payload;
    
    // キャッシュチェック
    const cacheKey = generateCacheKey(code, options);
    if (self.parseCache && self.parseCache.has(cacheKey)) {
        log('Cache hit', { cacheKey });
        const cached = self.parseCache.get(cacheKey);
        sendSuccess({
            ...cached,
            fromCache: true
        }, id);
        return;
    }
    
    log('Parsing code', { length: code.length });
    
    // パース実行
    const parseResult = measurePerformance(() => {
        if (options.safe) {
            return parser.safeParse(code);
        } else {
            return parser.parse(code);
        }
    }, 'parse');
    
    // 結果の後処理
    const result = postProcessResult(parseResult.result, options);
    
    // キャッシュ保存
    if (self.parseCache) {
        self.parseCache.set(cacheKey, result);
        maintainCacheSize();
    }
    
    sendSuccess({
        ...result,
        performance: parseResult.performance,
        cacheKey
    }, id);
}

/**
 * バリデーション処理
 */
function handleValidate(payload, id) {
    if (!parser) {
        sendError('Parser not initialized', id);
        return;
    }
    
    const { code } = payload;
    
    log('Validating code', { length: code.length });
    
    const validationResult = measurePerformance(() => {
        return parser.validate(code);
    }, 'validate');
    
    sendSuccess({
        ...validationResult.result,
        performance: validationResult.performance
    }, id);
}

/**
 * バッチパース処理
 */
function handleBatchParse(payload, id) {
    if (!parser) {
        sendError('Parser not initialized', id);
        return;
    }
    
    const { codes, options = {} } = payload;
    
    log('Batch parsing', { count: codes.length });
    
    const results = [];
    const startTime = performance.now();
    
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const parseResult = options.safe ? 
            parser.safeParse(code) : 
            parser.parse(code);
        
        results.push({
            index: i,
            result: postProcessResult(parseResult, options)
        });
        
        // 進捗報告（10件ごと）
        if ((i + 1) % 10 === 0) {
            sendProgress({
                current: i + 1,
                total: codes.length,
                percentage: ((i + 1) / codes.length) * 100
            }, id);
        }
    }
    
    const endTime = performance.now();
    
    sendSuccess({
        results,
        performance: {
            label: 'batch_parse',
            duration: (endTime - startTime).toFixed(2),
            averagePerItem: ((endTime - startTime) / codes.length).toFixed(2),
            timestamp: Date.now()
        }
    }, id);
}

/**
 * 設定更新処理
 */
function handleUpdateConfig(payload, id) {
    const { config } = payload;
    
    log('Updating config', config);
    
    if (config.debugMode !== undefined) {
        debugMode = config.debugMode;
    }
    
    if (config.performanceMode !== undefined) {
        performanceMode = config.performanceMode;
    }
    
    if (config.cacheLimit !== undefined) {
        self.cacheLimit = config.cacheLimit;
        maintainCacheSize();
    }
    
    if (parser && config.parserOptions) {
        // パーサーの再初期化が必要な場合
        parser = new PlantUMLParser({
            ...config.parserOptions,
            debugMode
        });
    }
    
    sendSuccess({
        updated: true,
        config: {
            debugMode,
            performanceMode,
            cacheLimit: self.cacheLimit
        }
    }, id);
}

/**
 * ヘルスチェック処理
 */
function handleHealthCheck(id) {
    const memoryUsage = performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null;
    
    sendSuccess({
        status: 'healthy',
        parser: parser !== null,
        cache: {
            size: self.parseCache ? self.parseCache.size : 0,
            limit: self.cacheLimit
        },
        memory: memoryUsage,
        timestamp: Date.now()
    }, id);
}

/**
 * キャッシュクリア処理
 */
function handleClearCache(id) {
    if (self.parseCache) {
        const previousSize = self.parseCache.size;
        self.parseCache.clear();
        
        log('Cache cleared', { previousSize });
        
        sendSuccess({
            cleared: true,
            previousSize
        }, id);
    } else {
        sendSuccess({
            cleared: false,
            message: 'No cache to clear'
        }, id);
    }
}

/**
 * パース結果の後処理
 */
function postProcessResult(result, options) {
    if (!result) return result;
    
    const processed = { ...result };
    
    // パフォーマンスモードに応じた処理
    switch (performanceMode) {
        case 'fast':
            // 最小限の情報のみ返す
            return {
                actors: processed.actors || [],
                actions: processed.actions || [],
                hasValidStructure: processed.hasValidStructure
            };
            
        case 'quality':
            // 追加の分析情報を付与
            processed.statistics = generateStatistics(processed);
            processed.complexity = calculateComplexity(processed);
            break;
            
        case 'balanced':
        default:
            // 標準的な情報を返す
            break;
    }
    
    // オプションに基づく処理
    if (options.includeMetadata) {
        processed.metadata = {
            parseTime: new Date().toISOString(),
            parserVersion: '3.0.0',
            performanceMode
        };
    }
    
    if (options.excludeNotes) {
        delete processed.notes;
    }
    
    if (options.excludeActivations) {
        delete processed.activations;
    }
    
    return processed;
}

/**
 * 統計情報の生成
 */
function generateStatistics(result) {
    return {
        actorCount: result.actors ? result.actors.length : 0,
        actionCount: result.actions ? result.actions.length : 0,
        noteCount: result.notes ? result.notes.length : 0,
        messageTypes: analyzeMessageTypes(result.actions),
        structureTypes: analyzeStructureTypes(result.actions)
    };
}

/**
 * メッセージタイプの分析
 */
function analyzeMessageTypes(actions) {
    if (!actions) return {};
    
    const types = {
        sync: 0,
        async: 0,
        return: 0,
        uncertain: 0
    };
    
    actions.forEach(action => {
        if (action.async) types.async++;
        else if (action.return) types.return++;
        else if (action.uncertain) types.uncertain++;
        else types.sync++;
    });
    
    return types;
}

/**
 * 構造タイプの分析
 */
function analyzeStructureTypes(actions) {
    if (!actions) return {};
    
    const types = {
        loop: 0,
        condition: 0,
        parallel: 0,
        group: 0
    };
    
    actions.forEach(action => {
        if (action.type) {
            types[action.type] = (types[action.type] || 0) + 1;
        }
    });
    
    return types;
}

/**
 * 複雑度の計算
 */
function calculateComplexity(result) {
    let complexity = 0;
    
    // アクター数による複雑度
    if (result.actors) {
        complexity += result.actors.length * 0.5;
    }
    
    // アクション数による複雑度
    if (result.actions) {
        complexity += result.actions.length;
        
        // 構造の複雑度
        result.actions.forEach(action => {
            if (action.type === 'loop') complexity += 2;
            if (action.type === 'condition') complexity += 3;
            if (action.type === 'parallel') complexity += 4;
            if (action.type === 'group') complexity += 1;
        });
    }
    
    return {
        score: Math.round(complexity),
        level: complexity < 10 ? 'simple' : 
               complexity < 30 ? 'moderate' : 
               complexity < 50 ? 'complex' : 'very_complex'
    };
}

/**
 * キャッシュキーの生成
 */
function generateCacheKey(code, options) {
    const optionsStr = JSON.stringify(options);
    return `${code.length}_${hashCode(code)}_${hashCode(optionsStr)}`;
}

/**
 * 簡易ハッシュ関数
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 * キャッシュサイズの維持
 */
function maintainCacheSize() {
    if (!self.parseCache || self.parseCache.size <= self.cacheLimit) {
        return;
    }
    
    // 古いエントリから削除（FIFO）
    const keysToDelete = [];
    let count = 0;
    
    for (const key of self.parseCache.keys()) {
        if (count >= self.parseCache.size - self.cacheLimit) {
            break;
        }
        keysToDelete.push(key);
        count++;
    }
    
    keysToDelete.forEach(key => self.parseCache.delete(key));
    
    log('Cache maintained', { 
        deleted: keysToDelete.length, 
        currentSize: self.parseCache.size 
    });
}

/**
 * 成功レスポンスの送信
 */
function sendSuccess(data, id) {
    self.postMessage({
        type: 'SUCCESS',
        payload: data,
        id,
        timestamp: Date.now()
    });
}

/**
 * エラーレスポンスの送信
 */
function sendError(message, id, error = null) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null
        },
        id,
        timestamp: Date.now()
    });
}

/**
 * 進捗レスポンスの送信
 */
function sendProgress(data, id) {
    self.postMessage({
        type: 'PROGRESS',
        payload: data,
        id,
        timestamp: Date.now()
    });
}

// Worker起動時のログ
log('PlantUMLParserWorker initialized');