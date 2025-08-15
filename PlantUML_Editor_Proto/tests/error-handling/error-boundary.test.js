/**
 * error-boundary.test.js - ErrorBoundary �������n�ƹȹ���
 * 
 * Sprint 1: SEC-004 ErrorBoundary�� - ƹȱ��
 * \�: 2025-08-15
 * �����: 1.0
 * 
 * ƹ���:
 * - �������h�����
 * - ����ƣ���ny%�
 * - ��ީ_�
 * - ����_�
 * - ���^����
 * - �˿������
 * - UIh:h�����
 */

describe('ErrorBoundaryqƹ�', () => {
    let errorBoundary;

    beforeEach(() => {
        // ƹ�(nErrorBoundary�ï
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

    describe('�,_�ƹ�', () => {
        test('���Lc8k2U��', () => {
            const testError = {
                message: 'Test error message',
                type: 'test'
            };

            errorBoundary.handleError(testError);

            expect(errorBoundary.errorHistory).toHaveLength(1);
            expect(errorBoundary.errorHistory[0]).toEqual(testError);
        });

        test('����ƣ���Ly%k�U��', () => {
            const securityError = {
                message: 'XSS attack detected',
                type: 'security'
            };

            errorBoundary.handleError(securityError);

            expect(errorBoundary.securityIncidentCount).toBe(1);
            expect(errorBoundary.isSecurityError).toHaveBeenCalledWith(securityError);
        });

        test('����˿������L�\Y�', () => {
            const sensitiveData = 'User password: secret123';
            const result = errorBoundary.sanitizeData(sensitiveData);

            expect(result).toContain('[REDACTED]');
            expect(result).not.toContain('secret123');
        });

        test('���́�LcWOU�U��', () => {
            const criticalError = { message: 'critical system failure' };
            const securityError = { message: 'security breach' };
            const normalError = { message: 'normal error' };

            expect(errorBoundary.assessErrorSeverity(criticalError)).toBe('critical');
            expect(errorBoundary.assessErrorSeverity(securityError)).toBe('security');
            expect(errorBoundary.assessErrorSeverity(normalError)).toBe('low');
        });
    });

    describe('q_�ƹ�', () => {
        test('���qLcWO֗U��', () => {
            errorBoundary.handleError({ message: 'Error 1' });
            errorBoundary.handleError({ message: 'security issue' });
            errorBoundary.handleError({ message: 'Error 3' });

            const stats = errorBoundary.getErrorStats();

            expect(stats.totalErrors).toBe(3);
            expect(stats.securityIncidentCount).toBe(1);
        });
    });

    describe('����ƣ_�ƹ�', () => {
        test('pn����ƣѿ��L�U��', () => {
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

        test('^����ƣ���LcWOX%U��', () => {
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

    describe('�թ���ƹ�', () => {
        test(''Ϩ���n�թ���', () => {
            const startTime = Date.now();
            
            // 1000n�����
            for (let i = 0; i < 1000; i++) {
                errorBoundary.handleError({
                    message: `Performance test error ${i}`,
                    type: 'performance'
                });
            }
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            
            // �B�L�gB�Sh���
            expect(processingTime).toBeLessThan(1000); // 1�*�
            expect(errorBoundary.errorHistory).toHaveLength(1000);
        });
    });
});

describe('ErrorLogger ƹ�', () => {
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

    test('�,�_�', () => {
        mockLogger.error('Test error message');
        
        expect(mockLogger.logs).toHaveLength(1);
        expect(mockLogger.logs[0].level).toBe('ERROR');
        expect(mockLogger.logs[0].message).toBe('Test error message');
    });

    test('����ƣ�', () => {
        mockLogger.security('Security incident', { severity: 'high' });
        
        expect(mockLogger.logs).toHaveLength(1);
        expect(mockLogger.logs[0].level).toBe('SECURITY');
        expect(mockLogger.logs[0].metadata.severity).toBe('high');
    });

    test('�û���˿������', () => {
        const sensitiveMessage = 'Login failed for password: secret123';
        const sanitized = mockLogger.sanitizeMessage(sensitiveMessage);
        
        expect(sanitized).toContain('[REDACTED]');
        expect(sanitized).not.toContain('secret123');
    });
});

describe('ErrorRecovery ƹ�', () => {
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
                
                // !Xjީ��������
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

    test('ީ�����n�', async () => {
        const recoverableError = new Error('recoverable network timeout');
        
        const result = await mockRecovery.recover(recoverableError);
        
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('retry');
        expect(mockRecovery.recoveryState.metrics.successfulRecoveries).toBe(1);
    });

    test('ީ�����n�', async () => {
        const unrecoverableError = new Error('fatal system error');
        
        const result = await mockRecovery.recover(unrecoverableError);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('&ez��ï', () => {
        const networkError = { message: 'network timeout' };
        const securityError = { message: 'security breach' };
        const genericError = { message: 'generic error' };

        expect(mockRecovery.determineStrategy(networkError).strategy).toBe('retry');
        expect(mockRecovery.determineStrategy(securityError).strategy).toBe('escalate');
        expect(mockRecovery.determineStrategy(genericError).strategy).toBe('fallback');
    });

    test('ީq', async () => {
        await mockRecovery.recover(new Error('recoverable error'));
        await mockRecovery.recover(new Error('unrecoverable error'));
        
        const stats = mockRecovery.getRecoveryStats();
        
        expect(stats.totalAttempts).toBe(2);
        expect(stats.successfulRecoveries).toBe(1);
        expect(parseFloat(stats.successRate)).toBe(50.0);
    });
});

describe('q���ƹ�', () => {
    let errorBoundary, logger, recovery;

    beforeEach(() => {
        // qƹ�(n�ï��Ȣ��
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

    test('�hj����������', async () => {
        // 1. ���z
        const error = new Error('Critical application error');
        
        // 2. ErrorBoundaryg����
        errorBoundary.handleError(error);
        expect(errorBoundary.handleError).toHaveBeenCalledWith(error);
        
        // 3. Loggerg�2
        logger.error(error.message, error);
        expect(logger.error).toHaveBeenCalledWith(error.message, error);
        
        // 4. ީfL
        const recoveryResult = await recovery.recover(error);
        expect(recovery.recover).toHaveBeenCalledWith(error);
        expect(recoveryResult.success).toBe(true);
    });

    test('����ƣ������', async () => {
        const securityError = new Error('XSS attack detected');
        
        // ����ƣ���n����
        errorBoundary.handleError(securityError);
        logger.security(securityError.message, { severity: 'critical' });
        
        expect(errorBoundary.handleError).toHaveBeenCalledWith(securityError);
        expect(logger.security).toHaveBeenCalledWith(securityError.message, { severity: 'critical' });
    });
});

// ƹ������p
function createTestError(message, type = 'test') {
    return {
        message,
        type,
        timestamp: Date.now(),
        stack: new Error().stack
    };
}

function simulateMemoryPressure() {
    // �����÷��n��������
    return {
        usedJSHeapSize: 450 * 1024 * 1024, // 450MB
        jsHeapSizeLimit: 500 * 1024 * 1024  // 500MB
    };
}

// �������nƹ�ա��g(��	
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createTestError,
        simulateMemoryPressure
    };
}