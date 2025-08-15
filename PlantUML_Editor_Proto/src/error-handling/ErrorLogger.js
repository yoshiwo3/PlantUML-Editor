/**
 * ErrorLogger.js - ¨ó¿ü×é¤º°ìüÉ¨éüí°·¹Æà
 * 
 * Sprint 1: SEC-004 ErrorBoundaryŸÅ - ErrorLogger ³óÝüÍóÈ
 * \å: 2025-08-15
 * Ðü¸çó: 1.0
 * 
 * ;j_ý:
 * - Ë í°Õ©üÞÃÈ
 * - í°ìÙë¡DEBUG, INFO, WARN, ERROR, FATAL, SECURITY	
 * - í°íüÆü·çó_ý
 * - »­åêÆ£í°nâ
 * - ÑÕ©üÞó¹ýá
 * - èí°µüÓ¹#:–™
 * - ê¢ë¿¤àí°ã–
 * - í°Õ¡¤ë¨¯¹ÝüÈ_ý
 */

export class ErrorLogger {
    constructor(options = {}) {
        this.options = {
            maxLogSize: options.maxLogSize || 1000,
            maxSecurityLogSize: options.maxSecurityLogSize || 500,
            enableConsoleOutput: options.enableConsoleOutput !== false,
            enableRemoteLogging: options.enableRemoteLogging || false,
            remoteEndpoint: options.remoteEndpoint || null,
            enablePerformanceTracking: options.enablePerformanceTracking !== false,
            logRotationInterval: options.logRotationInterval || 24 * 60 * 60 * 1000, // 24B“
            ...options
        };

        // í°ìÙëš©
        this.logLevels = {
            DEBUG: { value: 0, name: 'DEBUG', emoji: '=', color: '#888' },
            INFO: { value: 1, name: 'INFO', emoji: '9', color: '#2196F3' },
            WARN: { value: 2, name: 'WARN', emoji: ' ', color: '#FF9800' },
            ERROR: { value: 3, name: 'ERROR', emoji: 'L', color: '#f44336' },
            FATAL: { value: 4, name: 'FATAL', emoji: '=€', color: '#8B0000' },
            SECURITY: { value: 5, name: 'SECURITY', emoji: '=¨', color: '#FF0000' }
        };

        this.currentLogLevel = this.logLevels.INFO;
        
        // í°¹Èìü¸
        this.logs = [];
        this.securityLogs = [];
        this.performanceLogs = [];
        
        // á¿Çü¿
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.logStats = {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            securityIncidents: 0,
            lastRotation: Date.now()
        };

        // ÑÕ©üÞó¹ýá
        this.performanceTracker = new Map();

        // æ
        this.initializeLogger();
        this.setupLogRotation();

        console.log(`=Ý ErrorLogger v1.0 initialized with session ID: ${this.sessionId}`);
    }

    /**
     * í°·¹Æàn
     */
    initializeLogger() {
        // »Ã·çóID’íü«ë¹Èìü¸kÝX
        sessionStorage.setItem('logger_session_id', this.sessionId);
        
        // âXí°n­¼
        this.loadExistingLogs();
        
        // Öé¦¶n‰X‹Mkí°’ÝX
        window.addEventListener('beforeunload', () => {
            this.saveLogsToStorage();
        });
    }

    /**
     * »Ã·çóID’
     * @returns {string} »Ã·çóID
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `LOG-${timestamp}-${random}`;
    }

    /**
     * âXí°n­¼
     */
    loadExistingLogs() {
        try {
            const savedLogs = localStorage.getItem('error_logs');
            const savedSecurityLogs = localStorage.getItem('security_logs');
            const savedStats = localStorage.getItem('log_stats');

            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
            
            if (savedSecurityLogs) {
                this.securityLogs = JSON.parse(savedSecurityLogs);
            }

            if (savedStats) {
                this.logStats = { ...this.logStats, ...JSON.parse(savedStats) };
            }
        } catch (error) {
            console.error('Failed to load existing logs:', error);
        }
    }

    /**
     * í°ìÙë’-š
     * @param {string} level í°ìÙë
     */
    setLogLevel(level) {
        const levelObj = this.logLevels[level.toUpperCase()];
        if (levelObj) {
            this.currentLogLevel = levelObj;
            this.info(`Log level set to ${level.toUpperCase()}`);
        } else {
            this.error(`Invalid log level: ${level}`);
        }
    }

    /**
     * DEBUGìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Object} metadata á¿Çü¿
     */
    debug(message, metadata = {}) {
        this.log(this.logLevels.DEBUG, message, metadata);
    }

    /**
     * INFOìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Object} metadata á¿Çü¿
     */
    info(message, metadata = {}) {
        this.log(this.logLevels.INFO, message, metadata);
    }

    /**
     * WARNìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Object} metadata á¿Çü¿
     */
    warn(message, metadata = {}) {
        this.log(this.logLevels.WARN, message, metadata);
        this.logStats.warningCount++;
    }

    /**
     * ERRORìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Error|Object} error ¨éüªÖ¸§¯È
     * @param {Object} metadata á¿Çü¿
     */
    error(message, error = null, metadata = {}) {
        const enhancedMetadata = {
            ...metadata,
            error: error ? this.serializeError(error) : null,
            stackTrace: error?.stack || new Error().stack
        };

        this.log(this.logLevels.ERROR, message, enhancedMetadata);
        this.logStats.errorCount++;
    }

    /**
     * FATALìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Error|Object} error ¨éüªÖ¸§¯È
     * @param {Object} metadata á¿Çü¿
     */
    fatal(message, error = null, metadata = {}) {
        const enhancedMetadata = {
            ...metadata,
            error: error ? this.serializeError(error) : null,
            stackTrace: error?.stack || new Error().stack,
            isFatal: true
        };

        this.log(this.logLevels.FATAL, message, enhancedMetadata);
        this.logStats.errorCount++;
    }

    /**
     * SECURITYìÙëí°
     * @param {string} message áÃ»ü¸
     * @param {Object} securityContext »­åêÆ£³óÆ­¹È
     * @param {Object} metadata á¿Çü¿
     */
    security(message, securityContext = {}, metadata = {}) {
        const securityLog = {
            timestamp: new Date().toISOString(),
            level: 'SECURITY',
            message: this.sanitizeMessage(message),
            sessionId: this.sessionId,
            securityContext: this.sanitizeSecurityContext(securityContext),
            metadata: this.sanitizeMetadata(metadata),
            incidentId: this.generateIncidentId(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            referrer: document.referrer
        };

        this.securityLogs.push(securityLog);
        this.logStats.securityIncidents++;

        // »­åêÆ£í°os§kíü«ë¹Èìü¸kÝX
        this.saveSecurityLogs();

        // »­åêÆ£í°o8k³ó½üëú›
        console.error(
            `=¨ SECURITY INCIDENT [${securityLog.incidentId}]:`, 
            message, 
            securityContext
        );

        // è»­åêÆ£µüÓ¹xnå
        this.notifySecurityService(securityLog);
    }

    /**
     * ú,í°á½ÃÉ
     * @param {Object} level í°ìÙë
     * @param {string} message áÃ»ü¸
     * @param {Object} metadata á¿Çü¿
     */
    log(level, message, metadata = {}) {
        // í°ìÙëÁ§Ã¯
        if (level.value < this.currentLogLevel.value) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.name,
            message: this.sanitizeMessage(message),
            sessionId: this.sessionId,
            metadata: this.sanitizeMetadata(metadata),
            id: this.generateLogId(),
            url: window.location.href,
            source: this.getCallerInfo()
        };

        // áâê(Ï’ý 
        if (performance.memory) {
            logEntry.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            };
        }

        this.logs.push(logEntry);
        this.logStats.totalLogs++;

        // í°µ¤º¡
        if (this.logs.length > this.options.maxLogSize) {
            this.logs.splice(0, this.logs.length - this.options.maxLogSize);
        }

        // ³ó½üëú›
        if (this.options.enableConsoleOutput) {
            this.outputToConsole(level, logEntry);
        }

        // êâüÈí°á
        if (this.options.enableRemoteLogging) {
            this.sendToRemoteLogger(logEntry);
        }

        // ÑÕ©üÞó¹ýá
        if (this.options.enablePerformanceTracking && level.value >= this.logLevels.ERROR.value) {
            this.trackPerformance(logEntry);
        }
    }

    /**
     * ¨éüªÖ¸§¯È’·ê¢é¤º
     * @param {Error|Object} error ¨éüªÖ¸§¯È
     * @returns {Object} ·ê¢é¤ºUŒ_¨éü
     */
    serializeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                fileName: error.fileName,
                lineNumber: error.lineNumber,
                columnNumber: error.columnNumber
            };
        }
        return error;
    }

    /**
     * áÃ»ü¸’µË¿¤º
     * @param {string} message áÃ»ü¸
     * @returns {string} µË¿¤ºUŒ_áÃ»ü¸
     */
    sanitizeMessage(message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }

        // _ÆÅ1nÞ¹­ó°
        const sensitivePatterns = [
            { pattern: /password[=:]\s*[^\s&]+/gi, replacement: 'password=[REDACTED]' },
            { pattern: /token[=:]\s*[^\s&]+/gi, replacement: 'token=[REDACTED]' },
            { pattern: /api[_-]?key[=:]\s*[^\s&]+/gi, replacement: 'apikey=[REDACTED]' },
            { pattern: /secret[=:]\s*[^\s&]+/gi, replacement: 'secret=[REDACTED]' }
        ];

        sensitivePatterns.forEach(({ pattern, replacement }) => {
            message = message.replace(pattern, replacement);
        });

        return message.length > 1000 ? message.substring(0, 997) + '...' : message;
    }

    /**
     * á¿Çü¿’µË¿¤º
     * @param {Object} metadata á¿Çü¿
     * @returns {Object} µË¿¤ºUŒ_á¿Çü¿
     */
    sanitizeMetadata(metadata) {
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            // _ÆÅ1’+€ïý'nB‹­ü’Á§Ã¯
            const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeMetadata(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * »­åêÆ£³óÆ­¹È’µË¿¤º
     * @param {Object} context »­åêÆ£³óÆ­¹È
     * @returns {Object} µË¿¤ºUŒ_³óÆ­¹È
     */
    sanitizeSecurityContext(context) {
        return {
            ...this.sanitizeMetadata(context),
            timestamp: Date.now(),
            severity: context.severity || 'high',
            category: context.category || 'general',
            source: context.source || 'unknown'
        };
    }

    /**
     * ¤ó·ÇóÈID’
     * @returns {string} ¤ó·ÇóÈID
     */
    generateIncidentId() {
        return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    /**
     * í°ID’
     * @returns {string} í°ID
     */
    generateLogId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * |súWCÅ1’Ö—
     * @returns {Object} |súWCÅ1
     */
    getCallerInfo() {
        const stack = new Error().stack;
        if (stack) {
            const lines = stack.split('\n');
            const callerLine = lines[4] || lines[3] || '';
            const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);
            if (match) {
                return {
                    function: match[1],
                    file: match[2],
                    line: parseInt(match[3]),
                    column: parseInt(match[4])
                };
            }
        }
        return { function: 'unknown', file: 'unknown', line: 0, column: 0 };
    }

    /**
     * ³ó½üëkú›
     * @param {Object} level í°ìÙë
     * @param {Object} logEntry í°¨óÈê
     */
    outputToConsole(level, logEntry) {
        const style = `color: ${level.color}; font-weight: bold;`;
        const message = `${level.emoji} [${level.name}] ${logEntry.message}`;
        
        switch (level.name) {
            case 'DEBUG':
                console.debug(`%c${message}`, style, logEntry);
                break;
            case 'INFO':
                console.info(`%c${message}`, style, logEntry);
                break;
            case 'WARN':
                console.warn(`%c${message}`, style, logEntry);
                break;
            case 'ERROR':
            case 'FATAL':
            case 'SECURITY':
                console.error(`%c${message}`, style, logEntry);
                break;
            default:
                console.log(`%c${message}`, style, logEntry);
        }
    }

    /**
     * ÑÕ©üÞó¹ýá
     * @param {Object} logEntry í°¨óÈê
     */
    trackPerformance(logEntry) {
        const performanceEntry = {
            id: logEntry.id,
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            duration: performance.now() - this.startTime,
            memory: logEntry.memory
        };

        this.performanceLogs.push(performanceEntry);

        // ÑÕ©üÞó¹í°µ¤º6P
        if (this.performanceLogs.length > 100) {
            this.performanceLogs.shift();
        }
    }

    /**
     * êâüÈí¬üká
     * @param {Object} logEntry í°¨óÈê
     */
    async sendToRemoteLogger(logEntry) {
        if (!this.options.remoteEndpoint) return;

        try {
            await fetch(this.options.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Logger-Session': this.sessionId
                },
                body: JSON.stringify({
                    ...logEntry,
                    application: 'PlantUML_Editor',
                    environment: process.env.NODE_ENV || 'development'
                })
            });
        } catch (error) {
            // êâüÈí°án1Wo!–!Pëü×’2P	
            console.warn('Failed to send log to remote endpoint:', error);
        }
    }

    /**
     * »­åêÆ£µüÓ¹kå
     * @param {Object} securityLog »­åêÆ£í°
     */
    async notifySecurityService(securityLog) {
        // ŸÅ‹: è»­åêÆ£µüÓ¹xnå
        console.warn(`=¨ Security incident ${securityLog.incidentId} logged and ready for notification`);
        
        // Ÿ›nŸÅgoSIEM·¹Æà„»­åêÆ£Áüàxnå’LF
        if (this.options.securityEndpoint) {
            try {
                await fetch(this.options.securityEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Security-Alert': 'true'
                    },
                    body: JSON.stringify(securityLog)
                });
            } catch (error) {
                console.error('Failed to notify security service:', error);
            }
        }
    }

    /**
     * í°íüÆü·çó-š
     */
    setupLogRotation() {
        setInterval(() => {
            this.rotateLog();
        }, this.options.logRotationInterval);
    }

    /**
     * í°íüÆü·çóŸL
     */
    rotateLog() {
        this.info('Log rotation started');
        
        const now = Date.now();
        const rotationDate = new Date(now).toISOString().split('T')[0];
        
        // ¢ü«¤ÖÇü¿’\
        const archiveData = {
            date: rotationDate,
            sessionId: this.sessionId,
            logs: [...this.logs],
            securityLogs: [...this.securityLogs],
            performanceLogs: [...this.performanceLogs],
            stats: { ...this.logStats }
        };

        // ¢ü«¤Ö’íü«ë¹Èìü¸kÝX
        const archives = JSON.parse(localStorage.getItem('log_archives') || '[]');
        archives.push(archiveData);

        // ¢ü«¤Öp’6P '10å	
        if (archives.length > 10) {
            archives.shift();
        }

        localStorage.setItem('log_archives', JSON.stringify(archives));

        // þ(ní°’¯ê¢
        this.logs = [];
        this.performanceLogs = [];

        // q’ê»ÃÈ
        this.logStats = {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            securityIncidents: this.logStats.securityIncidents, // »­åêÆ£¤ó·ÇóÈpoÝ
            lastRotation: now
        };

        this.info('Log rotation completed');
    }

    /**
     * í°’íü«ë¹Èìü¸kÝX
     */
    saveLogsToStorage() {
        try {
            localStorage.setItem('error_logs', JSON.stringify(this.logs.slice(-100)));
            localStorage.setItem('log_stats', JSON.stringify(this.logStats));
        } catch (error) {
            console.error('Failed to save logs to storage:', error);
        }
    }

    /**
     * »­åêÆ£í°’ÝX
     */
    saveSecurityLogs() {
        try {
            localStorage.setItem('security_logs', JSON.stringify(this.securityLogs));
        } catch (error) {
            console.error('Failed to save security logs:', error);
        }
    }

    /**
     * í°q’Ö—
     * @returns {Object} í°q
     */
    getLogStats() {
        return {
            ...this.logStats,
            currentLogs: this.logs.length,
            securityLogs: this.securityLogs.length,
            performanceLogs: this.performanceLogs.length,
            sessionDuration: Date.now() - this.startTime,
            sessionId: this.sessionId
        };
    }

    /**
     * í°’"
     * @param {Object} criteria "aö
     * @returns {Array} "Pœ
     */
    searchLogs(criteria = {}) {
        let results = [...this.logs];

        if (criteria.level) {
            results = results.filter(log => log.level === criteria.level.toUpperCase());
        }

        if (criteria.message) {
            results = results.filter(log => 
                log.message.toLowerCase().includes(criteria.message.toLowerCase())
            );
        }

        if (criteria.startTime) {
            results = results.filter(log => 
                new Date(log.timestamp) >= new Date(criteria.startTime)
            );
        }

        if (criteria.endTime) {
            results = results.filter(log => 
                new Date(log.timestamp) <= new Date(criteria.endTime)
            );
        }

        return results.slice(0, criteria.limit || 100);
    }

    /**
     * í°’¨¯¹ÝüÈ
     * @param {string} format Õ©üÞÃÈjson, csv, txt	
     * @returns {string} ¨¯¹ÝüÈÇü¿
     */
    exportLogs(format = 'json') {
        const exportData = {
            metadata: {
                sessionId: this.sessionId,
                exportTime: new Date().toISOString(),
                totalLogs: this.logs.length,
                statistics: this.getLogStats()
            },
            logs: this.logs,
            securityLogs: this.securityLogs,
            performanceLogs: this.performanceLogs
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            
            case 'csv':
                return this.convertToCSV(this.logs);
            
            case 'txt':
                return this.convertToText(this.logs);
            
            default:
                return JSON.stringify(exportData, null, 2);
        }
    }

    /**
     * CSVÕ©üÞÃÈk	Û
     * @param {Array} logs í°M
     * @returns {string} CSV‡W
     */
    convertToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Message', 'Source', 'SessionId'];
        const rows = logs.map(log => [
            log.timestamp,
            log.level,
            log.message.replace(/"/g, '""'),
            log.source?.function || 'unknown',
            log.sessionId
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');
    }

    /**
     * Æ­¹ÈÕ©üÞÃÈk	Û
     * @param {Array} logs í°M
     * @returns {string} Æ­¹È‡W
     */
    convertToText(logs) {
        return logs.map(log => 
            `[${log.timestamp}] ${log.level}: ${log.message} (${log.source?.function || 'unknown'})`
        ).join('\n');
    }

    /**
     * 4Äæ
     */
    destroy() {
        this.saveLogsToStorage();
        this.saveSecurityLogs();
        this.logs = [];
        this.securityLogs = [];
        this.performanceLogs = [];
        console.log('ErrorLogger: destroyed');
    }
}