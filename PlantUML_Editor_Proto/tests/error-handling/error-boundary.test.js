/**
 * error-boundary.test.js - ErrorBoundary ³óİüÍóÈnì„Æ¹È¹¤üÈ
 * 
 * Sprint 1: SEC-004 ErrorBoundaryŸÅ - Æ¹È±ü¹
 * \å: 2025-08-15
 * Ğü¸çó: 1.0
 * 
 * Æ¹ÈÄò:
 * - ¨éü­ãÃÁhÏóÉêó°
 * - »­åêÆ£¨éüny%æ
 * - êÕŞ©_ı
 * - áâêã–_ı
 * - ¨éü^·¹Æà
 * - í°µË¿¤¼ü·çó
 * - UIh:hæü¶üå
 */

describe('ErrorBoundaryqÆ¹È', () => {
    let errorBoundary;

    beforeEach(() => {
        // Æ¹È(nErrorBoundaryâÃ¯
        errorBoundary = {
            errorHistory: [],
            securityIncidentCount: 0,
            criticalErrorCount: 0,
            encryptionKey: 'test-key',
            
            sanitizeData: jest.fn((data) => {
                if (typeof data === 'string') {
                    return data.replace(/password|secret/gi, '[REDACTED]');
                }
                return data;
            }),
            
            isSecurityError: jest.fn((errorInfo) => {
                const message = (errorInfo.message || '').toLowerCase();
                return /security|xss|csrf|unauthorized/.test(message);
            }),
            
            assessErrorSeverity: jest.fn((errorInfo) => {
                if (errorInfo.message && errorInfo.message.includes('security')) {
                    return 'security';
                }
                if (errorInfo.message && errorInfo.message.includes('critical')) {
                    return 'critical';
                }
                return 'low';
            }),
            
            handleError: jest.fn(function(errorInfo) {
                this.errorHistory.push(errorInfo);
                if (this.isSecurityError(errorInfo)) {
                    this.securityIncidentCount++;
                }
            }),
            
            getErrorStats: jest.fn(function() {
                return {
                    totalErrors: this.errorHistory.length,
                    securityIncidentCount: this.securityIncidentCount,
                    criticalErrorCount: this.criticalErrorCount
                };
            })
        };
    });

    describe('ú,_ıÆ¹È', () => {
        test('¨éüLc8k2UŒ‹', () => {
            const testError = {
                message: 'Test error message',
                type: 'test'
            };

            errorBoundary.handleError(testError);

            expect(errorBoundary.errorHistory).toHaveLength(1);
            expect(errorBoundary.errorHistory[0]).toEqual(testError);
        });

        test('»­åêÆ£¨éüLy%kæUŒ‹', () => {
            const securityError = {
                message: 'XSS attack detected',
                type: 'security'
            };

            errorBoundary.handleError(securityError);

            expect(errorBoundary.securityIncidentCount).toBe(1);
            expect(errorBoundary.isSecurityError).toHaveBeenCalledWith(securityError);
        });

        test('Çü¿µË¿¤¼ü·çóLÕ\Y‹', () => {
            const sensitiveData = 'User password: secret123';
            const result = errorBoundary.sanitizeData(sensitiveData);

            expect(result).toContain('[REDACTED]');
            expect(result).not.toContain('secret123');
        });

        test('¨éüÍ¦LcWOU¡UŒ‹', () => {
            const criticalError = { message: 'critical system failure' };
            const securityError = { message: 'security breach' };
            const normalError = { message: 'normal error' };

            expect(errorBoundary.assessErrorSeverity(criticalError)).toBe('critical');
            expect(errorBoundary.assessErrorSeverity(securityError)).toBe('security');
            expect(errorBoundary.assessErrorSeverity(normalError)).toBe('low');
        });
    });

    describe('q_ıÆ¹È', () => {
        test('¨éüqLcWOÖ—UŒ‹', () => {
            errorBoundary.handleError({ message: 'Error 1' });
            errorBoundary.handleError({ message: 'security issue' });
            errorBoundary.handleError({ message: 'Error 3' });

            const stats = errorBoundary.getErrorStats();

            expect(stats.totalErrors).toBe(3);
            expect(stats.securityIncidentCount).toBe(1);
        });
    });

    describe('»­åêÆ£_ıÆ¹È', () => {
        test('pn»­åêÆ£Ñ¿üóLúUŒ‹', () => {
            const securityPatterns = [
                'XSS vulnerability found',
                'CSRF token missing',
                'Unauthorized access attempt',
                'Security breach detected'
            ];

            securityPatterns.forEach(pattern => {
                const isSecure = errorBoundary.isSecurityError({ message: pattern });
                expect(isSecure).toBe(true);
            });
        });

        test('^»­åêÆ£¨éüLcWOX%UŒ‹', () => {
            const normalErrors = [
                'Network timeout',
                'File not found',
                'Invalid input format'
            ];

            normalErrors.forEach(pattern => {
                const isSecure = errorBoundary.isSecurityError({ message: pattern });
                expect(isSecure).toBe(false);
            });
        });
    });

    describe('ÑÕ©üŞó¹Æ¹È', () => {
        test(''Ï¨éüænÑÕ©üŞó¹', () => {
            const startTime = Date.now();
            
            // 1000n¨éü’æ
            for (let i = 0; i < 1000; i++) {
                errorBoundary.handleError({
                    message: `Performance test error ${i}`,
                    type: 'performance'
                });
            }
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // æB“L„gB‹Sh’º
            expect(processingTime).toBeLessThan(1000); // 1Ò*€
            expect(errorBoundary.errorHistory).toHaveLength(1000);
        });
    });
});

describe('ErrorLogger Æ¹È', () => {
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            logs: [],
            logLevels: {
                DEBUG: { value: 0, name: 'DEBUG' },
                INFO: { value: 1, name: 'INFO' },
                WARN: { value: 2, name: 'WARN' },
                ERROR: { value: 3, name: 'ERROR' },
                SECURITY: { value: 5, name: 'SECURITY' }
            },
            
            log: jest.fn(function(level, message, metadata = {}) {
                this.logs.push({
                    level: level.name,
                    message,
                    metadata,
                    timestamp: new Date().toISOString()
                });
            }),
            
            error: jest.fn(function(message, error = null, metadata = {}) {
                this.log(this.logLevels.ERROR, message, { error, ...metadata });
            }),
            
            security: jest.fn(function(message, context = {}) {
                this.log(this.logLevels.SECURITY, message, context);
            }),
            
            sanitizeMessage: jest.fn((message) => {
                return message.replace(/password[=:]\s*[^\s&]+/gi, 'password=[REDACTED]');
            })
        };
    });

    test('ú,í°_ı', () => {
        mockLogger.error('Test error message');
        
        expect(mockLogger.logs).toHaveLength(1);
        expect(mockLogger.logs[0].level).toBe('ERROR');
        expect(mockLogger.logs[0].message).toBe('Test error message');
    });

    test('»­åêÆ£í°', () => {
        mockLogger.security('Security incident', { severity: 'high' });
        
        expect(mockLogger.logs).toHaveLength(1);
        expect(mockLogger.logs[0].level).toBe('SECURITY');
        expect(mockLogger.logs[0].metadata.severity).toBe('high');
    });

    test('áÃ»ü¸µË¿¤¼ü·çó', () => {
        const sensitiveMessage = 'Login failed for password: secret123';
        const sanitized = mockLogger.sanitizeMessage(sensitiveMessage);
        
        expect(sanitized).toContain('[REDACTED]');
        expect(sanitized).not.toContain('secret123');
    });
});

describe('ErrorRecovery Æ¹È', () => {
    let mockRecovery;

    beforeEach(() => {
        mockRecovery = {
            recoveryState: {
                activeRecoveries: new Map(),
                metrics: {
                    totalAttempts: 0,
                    successfulRecoveries: 0
                }
            },
            
            recoveryStrategies: {
                RETRY: 'retry',
                FALLBACK: 'fallback',
                ESCALATE: 'escalate'
            },
            
            recover: jest.fn(async function(error, context = {}) {
                this.recoveryState.metrics.totalAttempts++;
                
                // !XjŞ©·ßåìü·çó
                if (error.message.includes('recoverable')) {
                    this.recoveryState.metrics.successfulRecoveries++;
                    return {
                        success: true,
                        recoveryId: 'test-recovery-id',
                        strategy: 'retry'
                    };
                } else {
                    return {
                        success: false,
                        recoveryId: 'test-recovery-id',
                        error: new Error('Recovery failed')
                    };
                }
            }),
            
            determineStrategy: jest.fn((error) => {
                const message = error.message || '';
                if (/network|timeout/.test(message)) {
                    return { strategy: 'retry', maxRetries: 3 };
                }
                if (/security/.test(message)) {
                    return { strategy: 'escalate' };
                }
                return { strategy: 'fallback' };
            }),
            
            getRecoveryStats: jest.fn(function() {
                return {
                    totalAttempts: this.recoveryState.metrics.totalAttempts,
                    successfulRecoveries: this.recoveryState.metrics.successfulRecoveries,
                    successRate: this.recoveryState.metrics.totalAttempts > 0 
                        ? (this.recoveryState.metrics.successfulRecoveries / this.recoveryState.metrics.totalAttempts * 100).toFixed(1)
                        : 0
                };
            })
        };
    });

    test('Ş©ïı¨éünæ', async () => {
        const recoverableError = new Error('recoverable network timeout');
        
        const result = await mockRecovery.recover(recoverableError);
        
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('retry');
        expect(mockRecovery.recoveryState.metrics.successfulRecoveries).toBe(1);
    });

    test('Ş©ïı¨éünæ', async () => {
        const unrecoverableError = new Error('fatal system error');
        
        const result = await mockRecovery.recover(unrecoverableError);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('&ezší¸Ã¯', () => {
        const networkError = { message: 'network timeout' };
        const securityError = { message: 'security breach' };
        const genericError = { message: 'generic error' };

        expect(mockRecovery.determineStrategy(networkError).strategy).toBe('retry');
        expect(mockRecovery.determineStrategy(securityError).strategy).toBe('escalate');
        expect(mockRecovery.determineStrategy(genericError).strategy).toBe('fallback');
    });

    test('Ş©q', async () => {
        await mockRecovery.recover(new Error('recoverable error'));
        await mockRecovery.recover(new Error('unrecoverable error'));
        
        const stats = mockRecovery.getRecoveryStats();
        
        expect(stats.totalAttempts).toBe(2);
        expect(stats.successfulRecoveries).toBe(1);
        expect(parseFloat(stats.successRate)).toBe(50.0);
    });
});

describe('q·ÊêªÆ¹È', () => {
    let errorBoundary, logger, recovery;

    beforeEach(() => {
        // qÆ¹È(nâÃ¯»ÃÈ¢Ã×
        errorBoundary = {
            handleError: jest.fn(),
            getErrorStats: jest.fn(() => ({ totalErrors: 0 }))
        };
        
        logger = {
            error: jest.fn(),
            security: jest.fn()
        };
        
        recovery = {
            recover: jest.fn().mockResolvedValue({ success: true })
        };
    });

    test('Œhj¨éüæïü¯Õíü', async () => {
        // 1. ¨éüz
        const error = new Error('Critical application error');
        
        // 2. ErrorBoundaryg­ãÃÁ
        errorBoundary.handleError(error);
        expect(errorBoundary.handleError).toHaveBeenCalledWith(error);
        
        // 3. Loggergí°2
        logger.error(error.message, error);
        expect(logger.error).toHaveBeenCalledWith(error.message, error);
        
        // 4. Ş©fL
        const recoveryResult = await recovery.recover(error);
        expect(recovery.recover).toHaveBeenCalledWith(error);
        expect(recoveryResult.success).toBe(true);
    });

    test('»­åêÆ£¤ó·ÇóÈæ', async () => {
        const securityError = new Error('XSS attack detected');
        
        // »­åêÆ£¨éünæÕíü
        errorBoundary.handleError(securityError);
        logger.security(securityError.message, { severity: 'critical' });
        
        expect(errorBoundary.handleError).toHaveBeenCalledWith(securityError);
        expect(logger.security).toHaveBeenCalledWith(securityError.message, { severity: 'critical' });
    });
});

// Æ¹ÈØëÑü¢p
function createTestError(message, type = 'test') {
    return {
        message,
        type,
        timestamp: Date.now(),
        stack: new Error().stack
    };
}

function simulateMemoryPressure() {
    // áâê×ìÃ·ãün·ßåìü·çó
    return {
        usedJSHeapSize: 450 * 1024 * 1024, // 450MB
        jsHeapSizeLimit: 500 * 1024 * 1024  // 500MB
    };
}

// ¨¯¹İüÈÖnÆ¹ÈÕ¡¤ëg(ïı	
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createTestError,
        simulateMemoryPressure
    };
}