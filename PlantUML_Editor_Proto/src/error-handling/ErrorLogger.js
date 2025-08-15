/**
 * ErrorLogger.js - ����餺���ɨ������
 * 
 * Sprint 1: SEC-004 ErrorBoundary�� - ErrorLogger �������
 * \�: 2025-08-15
 * �����: 1.0
 * 
 * ;j_�:
 * - � �թ����
 * - ����DEBUG, INFO, WARN, ERROR, FATAL, SECURITY	
 * - ��������_�
 * - ����ƣ�n�
 * - �թ�����
 * - ���ӹ#:��
 * - �뿤���
 * - �ա�먯����_�
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
            logRotationInterval: options.logRotationInterval || 24 * 60 * 60 * 1000, // 24B�
            ...options
        };

        // ���뚩
        this.logLevels = {
            DEBUG: { value: 0, name: 'DEBUG', emoji: '=', color: '#888' },
            INFO: { value: 1, name: 'INFO', emoji: '9', color: '#2196F3' },
            WARN: { value: 2, name: 'WARN', emoji: '�', color: '#FF9800' },
            ERROR: { value: 3, name: 'ERROR', emoji: 'L', color: '#f44336' },
            FATAL: { value: 4, name: 'FATAL', emoji: '=�', color: '#8B0000' },
            SECURITY: { value: 5, name: 'SECURITY', emoji: '=�', color: '#FF0000' }
        };

        this.currentLogLevel = this.logLevels.INFO;
        
        // �����
        this.logs = [];
        this.securityLogs = [];
        this.performanceLogs = [];
        
        // ����
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.logStats = {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            securityIncidents: 0,
            lastRotation: Date.now()
        };

        // �թ�����
        this.performanceTracker = new Map();

        // �
        this.initializeLogger();
        this.setupLogRotation();

        console.log(`=� ErrorLogger v1.0 initialized with session ID: ${this.sessionId}`);
    }

    /**
     * ����n
     */
    initializeLogger() {
        // �÷��ID���������k�X
        sessionStorage.setItem('logger_session_id', this.sessionId);
        
        // �X�n��
        this.loadExistingLogs();
        
        // �馶n�X�Mk��X
        window.addEventListener('beforeunload', () => {
            this.saveLogsToStorage();
        });
    }

    /**
     * �÷��ID�
     * @returns {string} �÷��ID
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `LOG-${timestamp}-${random}`;
    }

    /**
     * �X�n��
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
     * ����-�
     * @param {string} level ����
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
     * DEBUG����
     * @param {string} message �û��
     * @param {Object} metadata ����
     */
    debug(message, metadata = {}) {
        this.log(this.logLevels.DEBUG, message, metadata);
    }

    /**
     * INFO����
     * @param {string} message �û��
     * @param {Object} metadata ����
     */
    info(message, metadata = {}) {
        this.log(this.logLevels.INFO, message, metadata);
    }

    /**
     * WARN����
     * @param {string} message �û��
     * @param {Object} metadata ����
     */
    warn(message, metadata = {}) {
        this.log(this.logLevels.WARN, message, metadata);
        this.logStats.warningCount++;
    }

    /**
     * ERROR����
     * @param {string} message �û��
     * @param {Error|Object} error ����ָ���
     * @param {Object} metadata ����
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
     * FATAL����
     * @param {string} message �û��
     * @param {Error|Object} error ����ָ���
     * @param {Object} metadata ����
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
     * SECURITY����
     * @param {string} message �û��
     * @param {Object} securityContext ����ƣ��ƭ��
     * @param {Object} metadata ����
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

        // ����ƣ�os�k��������k�X
        this.saveSecurityLogs();

        // ����ƣ�o8k������
        console.error(
            `=� SECURITY INCIDENT [${securityLog.incidentId}]:`, 
            message, 
            securityContext
        );

        // 軭��ƣ��ӹxn�
        this.notifySecurityService(securityLog);
    }

    /**
     * �,����
     * @param {Object} level ����
     * @param {string} message �û��
     * @param {Object} metadata ����
     */
    log(level, message, metadata = {}) {
        // ������ï
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

        // ���(ϒ��
        if (performance.memory) {
            logEntry.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize
            };
        }

        this.logs.push(logEntry);
        this.logStats.totalLogs++;

        // ����
        if (this.logs.length > this.options.maxLogSize) {
            this.logs.splice(0, this.logs.length - this.options.maxLogSize);
        }

        // ������
        if (this.options.enableConsoleOutput) {
            this.outputToConsole(level, logEntry);
        }

        // ������
        if (this.options.enableRemoteLogging) {
            this.sendToRemoteLogger(logEntry);
        }

        // �թ�����
        if (this.options.enablePerformanceTracking && level.value >= this.logLevels.ERROR.value) {
            this.trackPerformance(logEntry);
        }
    }

    /**
     * ����ָ��Ȓ��餺
     * @param {Error|Object} error ����ָ���
     * @returns {Object} ��餺U�_���
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
     * �û����˿��
     * @param {string} message �û��
     * @returns {string} �˿��U�_�û��
     */
    sanitizeMessage(message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }

        // _��1n޹��
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
     * ������˿��
     * @param {Object} metadata ����
     * @returns {Object} �˿��U�_����
     */
    sanitizeMetadata(metadata) {
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            // _��1�+���'nB������ï
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
     * ����ƣ��ƭ�Ȓ�˿��
     * @param {Object} context ����ƣ��ƭ��
     * @returns {Object} �˿��U�_��ƭ��
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
     * �����ID�
     * @returns {string} �����ID
     */
    generateIncidentId() {
        return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    /**
     * �ID�
     * @returns {string} �ID
     */
    generateLogId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * |s�WC�1�֗
     * @returns {Object} |s�WC�1
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
     * ����k��
     * @param {Object} level ����
     * @param {Object} logEntry ����
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
     * �թ�����
     * @param {Object} logEntry ����
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

        // �թ������6P
        if (this.performanceLogs.length > 100) {
            this.performanceLogs.shift();
        }
    }

    /**
     * ������k�
     * @param {Object} logEntry ����
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
            // ������n1Wo!�!P��ג2P	
            console.warn('Failed to send log to remote endpoint:', error);
        }
    }

    /**
     * ����ƣ��ӹk�
     * @param {Object} securityLog ����ƣ�
     */
    async notifySecurityService(securityLog) {
        // �ŋ: 軭��ƣ��ӹxn�
        console.warn(`=� Security incident ${securityLog.incidentId} logged and ready for notification`);
        
        // ��n��goSIEM���������ƣ���xn�LF
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
     * ��������-�
     */
    setupLogRotation() {
        setInterval(() => {
            this.rotateLog();
        }, this.options.logRotationInterval);
    }

    /**
     * ��������L
     */
    rotateLog() {
        this.info('Log rotation started');
        
        const now = Date.now();
        const rotationDate = new Date(now).toISOString().split('T')[0];
        
        // ���������\
        const archiveData = {
            date: rotationDate,
            sessionId: this.sessionId,
            logs: [...this.logs],
            securityLogs: [...this.securityLogs],
            performanceLogs: [...this.performanceLogs],
            stats: { ...this.logStats }
        };

        // ����֒��������k�X
        const archives = JSON.parse(localStorage.getItem('log_archives') || '[]');
        archives.push(archiveData);

        // �����p�6P '10�	
        if (archives.length > 10) {
            archives.shift();
        }

        localStorage.setItem('log_archives', JSON.stringify(archives));

        // �(n���
        this.logs = [];
        this.performanceLogs = [];

        // q����
        this.logStats = {
            totalLogs: 0,
            errorCount: 0,
            warningCount: 0,
            securityIncidents: this.logStats.securityIncidents, // ����ƣ�����po�
            lastRotation: now
        };

        this.info('Log rotation completed');
    }

    /**
     * ���������k�X
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
     * ����ƣ��X
     */
    saveSecurityLogs() {
        try {
            localStorage.setItem('security_logs', JSON.stringify(this.securityLogs));
        } catch (error) {
            console.error('Failed to save security logs:', error);
        }
    }

    /**
     * �q�֗
     * @returns {Object} �q
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
     * �"
     * @param {Object} criteria "a�
     * @returns {Array} "P�
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
     * �������
     * @param {string} format թ����json, csv, txt	
     * @returns {string} ���������
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
     * CSVթ����k	�
     * @param {Array} logs �M
     * @returns {string} CSV�W
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
     * ƭ��թ����k	�
     * @param {Array} logs �M
     * @returns {string} ƭ�ȇW
     */
    convertToText(logs) {
        return logs.map(log => 
            `[${log.timestamp}] ${log.level}: ${log.message} (${log.source?.function || 'unknown'})`
        ).join('\n');
    }

    /**
     * 4��
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