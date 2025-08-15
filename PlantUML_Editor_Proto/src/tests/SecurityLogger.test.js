/**
 * SecurityLogger.test.js
 * 
 * SecurityLogger クラスの単体テスト
 * 
 * @version 1.0.0
 * @date 2025-08-15
 */

// モックの作成（ブラウザ環境のシミュレーション）
const createMockEnvironment = () => {
    global.window = {
        location: { href: 'http://localhost:3000/test' },
        indexedDB: {
            open: jest.fn()
        },
        localStorage: {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        },
        addEventListener: jest.fn(),
        __REDUX_DEVTOOLS_EXTENSION__: undefined
    };
    
    global.navigator = {
        userAgent: 'Mozilla/5.0 (Test Browser)'
    };
    
    global.document = {
        addEventListener: jest.fn()
    };
    
    global.performance = {
        now: jest.fn(() => Date.now())
    };
    
    global.console = {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        group: jest.fn(),
        groupEnd: jest.fn()
    };
};

// SecurityLogger読み込み
createMockEnvironment();
const { SecurityLogger, LOG_LEVELS, SECURITY_EVENT_TYPES } = require('../security/SecurityLogger.js');

describe('SecurityLogger', () => {
    let logger;
    
    beforeEach(() => {
        // モックをクリア
        jest.clearAllMocks();
        
        // 新しいLoggerインスタンスを作成
        logger = new SecurityLogger({
            enableLogging: true,
            maxLogs: 100,
            batchSize: 5,
            flushInterval: 1000
        });
    });
    
    afterEach(async () => {
        // クリーンアップ
        if (logger) {
            await logger.cleanup();
        }
    });
    
    describe('初期化', () => {
        test('正常に初期化される', () => {
            expect(logger).toBeDefined();
            expect(logger.logLevel).toBe(LOG_LEVELS.INFO);
            expect(logger.maxLogs).toBe(100);
            expect(logger.batchSize).toBe(5);
        });
        
        test('カスタムオプションで初期化される', () => {
            const customLogger = new SecurityLogger({
                logLevel: LOG_LEVELS.ERROR,
                maxLogs: 500,
                batchSize: 20
            });
            
            expect(customLogger.logLevel).toBe(LOG_LEVELS.ERROR);
            expect(customLogger.maxLogs).toBe(500);
            expect(customLogger.batchSize).toBe(20);
        });
    });
    
    describe('ログレベル', () => {
        test('各ログレベルのメソッドが存在する', () => {
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.critical).toBe('function');
        });
        
        test('ログレベルフィルタが機能する', () => {
            logger.setLogLevel(LOG_LEVELS.WARN);
            
            // DEBUG, INFOは出力されない
            logger.debug('debug message');
            logger.info('info message');
            expect(logger.logBuffer.length).toBe(0);
            
            // WARN以上は出力される
            logger.warn('warn message');
            logger.error('error message');
            logger.critical('critical message');
            expect(logger.logBuffer.length).toBe(3);
        });
        
        test('ログレベル名を正しく取得する', () => {
            expect(logger.getLogLevelName(LOG_LEVELS.DEBUG)).toBe('DEBUG');
            expect(logger.getLogLevelName(LOG_LEVELS.INFO)).toBe('INFO');
            expect(logger.getLogLevelName(LOG_LEVELS.WARN)).toBe('WARN');
            expect(logger.getLogLevelName(LOG_LEVELS.ERROR)).toBe('ERROR');
            expect(logger.getLogLevelName(LOG_LEVELS.CRITICAL)).toBe('CRITICAL');
        });
    });
    
    describe('セキュリティイベントログ', () => {
        test('XSS攻撃試行をログできる', () => {
            const maliciousInput = '<script>alert("xss")</script>';
            logger.logXSSAttempt(maliciousInput, 'form_input');
            
            expect(logger.logBuffer.length).toBe(1);
            const logEntry = logger.logBuffer[0];
            expect(logEntry.eventType).toBe(SECURITY_EVENT_TYPES.XSS_ATTEMPT);
            expect(logEntry.level).toBe(LOG_LEVELS.CRITICAL);
            expect(logEntry.metadata.source).toBe('form_input');
        });
        
        test('不正入力をログできる', () => {
            logger.logInvalidInput('invalid@data', 'email', 'Invalid email format');
            
            expect(logger.logBuffer.length).toBe(1);
            const logEntry = logger.logBuffer[0];
            expect(logEntry.eventType).toBe(SECURITY_EVENT_TYPES.INVALID_INPUT);
            expect(logEntry.metadata.fieldName).toBe('email');
            expect(logEntry.metadata.validationError).toBe('Invalid email format');
        });
        
        test('CSP違反をログできる', () => {
            const violationReport = {
                'violated-directive': 'script-src',
                'blocked-uri': 'inline',
                'source-file': 'http://example.com'
            };
            
            logger.logCSPViolation(violationReport);
            
            expect(logger.logBuffer.length).toBe(1);
            const logEntry = logger.logBuffer[0];
            expect(logEntry.eventType).toBe(SECURITY_EVENT_TYPES.CSP_VIOLATION);
            expect(logEntry.level).toBe(LOG_LEVELS.CRITICAL);
            expect(logEntry.metadata.violatedDirective).toBe('script-src');
        });
        
        test('エラーをログできる', () => {
            const error = new Error('Test error');
            logger.logError(error, 'test context');
            
            expect(logger.logBuffer.length).toBe(1);
            const logEntry = logger.logBuffer[0];
            expect(logEntry.eventType).toBe(SECURITY_EVENT_TYPES.ERROR_OCCURRED);
            expect(logEntry.metadata.errorName).toBe('Error');
            expect(logEntry.metadata.context).toBe('test context');
        });
        
        test('認証イベントをログできる', () => {
            logger.logAuthEvent('login', 'user123');
            
            expect(logger.logBuffer.length).toBe(1);
            const logEntry = logger.logBuffer[0];
            expect(logEntry.eventType).toBe(SECURITY_EVENT_TYPES.AUTH_EVENT);
            expect(logEntry.metadata.authEventType).toBe('login');
            expect(logEntry.metadata.userId).toBe('user123');
        });
    });
    
    describe('ログ処理', () => {
        test('ログバッファに追加される', () => {
            logger.info('test message');
            
            expect(logger.logBuffer.length).toBe(1);
            expect(logger.logBuffer[0].message).toBe('test message');
            expect(logger.logBuffer[0].levelName).toBe('INFO');
        });
        
        test('統計情報が更新される', () => {
            logger.info('info message');
            logger.warn('warn message');
            logger.error('error message');
            
            const stats = logger.getStats();
            expect(stats.totalLogs).toBe(3);
            expect(stats.logsByLevel.INFO).toBe(1);
            expect(stats.logsByLevel.WARN).toBe(1);
            expect(stats.logsByLevel.ERROR).toBe(1);
        });
        
        test('メタデータが適切に設定される', () => {
            logger.info('test', null, { customData: 'value' });
            
            const logEntry = logger.logBuffer[0];
            expect(logEntry.metadata.customData).toBe('value');
            expect(logEntry.sessionId).toBeDefined();
            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.sequence).toBeDefined();
        });
    });
    
    describe('バッチ処理', () => {
        test('バッチサイズに達したら自動フラッシュする', async () => {
            const flushSpy = jest.spyOn(logger, 'flushLogs').mockImplementation(() => Promise.resolve());
            
            // バッチサイズ(5)分のログを追加
            for (let i = 0; i < 5; i++) {
                logger.info(`message ${i}`);
            }
            
            expect(flushSpy).toHaveBeenCalled();
            flushSpy.mockRestore();
        });
        
        test('定期フラッシュが動作する', (done) => {
            const flushSpy = jest.spyOn(logger, 'flushLogs').mockImplementation(() => Promise.resolve());
            
            logger.info('test message');
            
            // flushIntervalよりも長く待つ
            setTimeout(() => {
                expect(flushSpy).toHaveBeenCalled();
                flushSpy.mockRestore();
                done();
            }, 1100);
        });
    });
    
    describe('ログ検索', () => {
        beforeEach(() => {
            // テストデータをセットアップ
            logger.info('info message 1', SECURITY_EVENT_TYPES.INVALID_INPUT);
            logger.warn('warn message 1', SECURITY_EVENT_TYPES.XSS_ATTEMPT);
            logger.error('error message 1', SECURITY_EVENT_TYPES.ERROR_OCCURRED);
        });
        
        test('レベルでフィルタできる', async () => {
            const mockLogs = logger.logBuffer;
            jest.spyOn(logger, 'searchLocalStorageLogs').mockReturnValue(mockLogs);
            
            const results = await logger.searchLogs({ level: LOG_LEVELS.WARN });
            
            expect(results.length).toBe(1);
            expect(results[0].levelName).toBe('WARN');
        });
        
        test('イベントタイプでフィルタできる', async () => {
            const mockLogs = logger.logBuffer;
            jest.spyOn(logger, 'searchLocalStorageLogs').mockReturnValue(mockLogs);
            
            const results = await logger.searchLogs({ 
                eventType: SECURITY_EVENT_TYPES.XSS_ATTEMPT 
            });
            
            expect(results.length).toBe(1);
            expect(results[0].eventType).toBe(SECURITY_EVENT_TYPES.XSS_ATTEMPT);
        });
        
        test('メッセージでフィルタできる', async () => {
            const mockLogs = logger.logBuffer;
            jest.spyOn(logger, 'searchLocalStorageLogs').mockReturnValue(mockLogs);
            
            const results = await logger.searchLogs({ searchText: 'warn' });
            
            expect(results.length).toBe(1);
            expect(results[0].message).toContain('warn');
        });
    });
    
    describe('エクスポート機能', () => {
        test('JSONでエクスポートできる', async () => {
            logger.info('test message');
            jest.spyOn(logger, 'searchLogs').mockResolvedValue(logger.logBuffer);
            
            const exported = await logger.exportLogs('json');
            const parsed = JSON.parse(exported);
            
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(1);
            expect(parsed[0].message).toBe('test message');
        });
        
        test('CSVでエクスポートできる', async () => {
            logger.info('test message');
            jest.spyOn(logger, 'searchLogs').mockResolvedValue(logger.logBuffer);
            
            const exported = await logger.exportLogs('csv');
            
            expect(typeof exported).toBe('string');
            expect(exported).toContain('timestamp,dateString,levelName,message,eventType');
            expect(exported).toContain('test message');
        });
        
        test('未サポートの形式でエラーになる', async () => {
            await expect(logger.exportLogs('xml')).rejects.toThrow('Unsupported export format: xml');
        });
    });
    
    describe('サニタイゼーション', () => {
        test('ログ出力用にサニタイズされる', () => {
            const dangerousInput = '<script>alert("xss")</script>';
            const sanitized = logger.sanitizeForLog(dangerousInput);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('&lt;script&gt;');
        });
        
        test('長すぎる入力は切り詰められる', () => {
            const longInput = 'a'.repeat(2000);
            const sanitized = logger.sanitizeForLog(longInput);
            
            expect(sanitized.length).toBe(1000);
        });
        
        test('非文字列は変更されない', () => {
            const numberInput = 123;
            const sanitized = logger.sanitizeForLog(numberInput);
            
            expect(sanitized).toBe(123);
        });
    });
    
    describe('セッション管理', () => {
        test('セッションIDが生成される', () => {
            const sessionId = logger.getSessionId();
            
            expect(sessionId).toBeDefined();
            expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
        });
        
        test('同じセッションIDを返す', () => {
            const sessionId1 = logger.getSessionId();
            const sessionId2 = logger.getSessionId();
            
            expect(sessionId1).toBe(sessionId2);
        });
    });
    
    describe('統計情報', () => {
        test('統計情報を取得できる', () => {
            logger.info('test');
            logger.warn('test');
            
            const stats = logger.getStats();
            
            expect(stats.totalLogs).toBe(2);
            expect(stats.bufferSize).toBe(2);
            expect(stats.storageType).toBeDefined();
            expect(typeof stats.isFlushingLogs).toBe('boolean');
        });
    });
    
    describe('エラーハンドリング', () => {
        test('無効なログレベル設定でエラーになる', () => {
            expect(() => {
                logger.setLogLevel(999);
            }).toThrow('Invalid log level');
        });
        
        test('文字列でログレベルを設定できる', () => {
            logger.setLogLevel('ERROR');
            expect(logger.logLevel).toBe(LOG_LEVELS.ERROR);
        });
    });
    
    describe('クリーンアップ', () => {
        test('クリーンアップが正常に実行される', async () => {
            const flushSpy = jest.spyOn(logger, 'flushLogs').mockImplementation(() => Promise.resolve());
            const stopFlushSpy = jest.spyOn(logger, 'stopPeriodicFlush');
            
            await logger.cleanup();
            
            expect(flushSpy).toHaveBeenCalled();
            expect(stopFlushSpy).toHaveBeenCalled();
            
            flushSpy.mockRestore();
        });
    });
});

describe('LOG_LEVELS', () => {
    test('正しいログレベル値を持つ', () => {
        expect(LOG_LEVELS.DEBUG).toBe(0);
        expect(LOG_LEVELS.INFO).toBe(1);
        expect(LOG_LEVELS.WARN).toBe(2);
        expect(LOG_LEVELS.ERROR).toBe(3);
        expect(LOG_LEVELS.CRITICAL).toBe(4);
    });
});

describe('SECURITY_EVENT_TYPES', () => {
    test('セキュリティイベントタイプが定義されている', () => {
        expect(SECURITY_EVENT_TYPES.XSS_ATTEMPT).toBe('xss_attempt');
        expect(SECURITY_EVENT_TYPES.INVALID_INPUT).toBe('invalid_input');
        expect(SECURITY_EVENT_TYPES.CSP_VIOLATION).toBe('csp_violation');
        expect(SECURITY_EVENT_TYPES.ERROR_OCCURRED).toBe('error_occurred');
        expect(SECURITY_EVENT_TYPES.AUTH_EVENT).toBe('auth_event');
        expect(SECURITY_EVENT_TYPES.PERMISSION_DENIED).toBe('permission_denied');
        expect(SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY).toBe('suspicious_activity');
    });
});

// インテグレーションテスト
describe('SecurityLogger インテグレーション', () => {
    test('実際のログフローが動作する', async () => {
        const logger = new SecurityLogger({
            enableLogging: true,
            batchSize: 2,
            flushInterval: 100
        });
        
        // LocalStorage保存をモック
        const saveToLocalStorageSpy = jest.spyOn(logger, 'saveToLocalStorage').mockImplementation(() => Promise.resolve());
        
        // 複数のログを追加
        logger.info('First message');
        logger.warn('Second message');
        
        // バッチサイズに達したので自動フラッシュされる
        expect(saveToLocalStorageSpy).toHaveBeenCalled();
        
        await logger.cleanup();
        saveToLocalStorageSpy.mockRestore();
    });
});