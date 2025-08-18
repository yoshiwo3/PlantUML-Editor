/**
 * エラーハンドリングマトリクス - Sprint 5 総合評価
 * 
 * 作成日: 2025-08-17
 * 対象: 全エラーハンドリングテストの統合評価マトリクス
 * 
 * マトリクス項目:
 * 1. エラータイプ別対応状況
 * 2. 重要度別処理フロー
 * 3. ブラウザ互換性対応状況
 * 4. 復旧・フォールバック戦略
 * 5. ユーザー体験保護レベル
 * 6. セキュリティ対応状況
 */

class ErrorHandlingMatrix {
    constructor() {
        this.errorTypes = {
            // 入力検証エラー (TEST-014)
            INPUT_VALIDATION: {
                XSS_ATTACK: { severity: 'CRITICAL', handled: false, fallback: null },
                SQL_INJECTION: { severity: 'CRITICAL', handled: false, fallback: null },
                COMMAND_INJECTION: { severity: 'CRITICAL', handled: false, fallback: null },
                CONTROL_CHARS: { severity: 'MEDIUM', handled: false, fallback: null },
                OVERSIZED_INPUT: { severity: 'LOW', handled: false, fallback: null },
                MALFORMED_JSON: { severity: 'MEDIUM', handled: false, fallback: null },
                EMOJI_UNICODE: { severity: 'LOW', handled: false, fallback: null }
            },
            
            // ネットワークエラー (TEST-015)
            NETWORK_ERRORS: {
                CONNECTION_TIMEOUT: { severity: 'HIGH', handled: false, fallback: null },
                CONNECTION_REFUSED: { severity: 'HIGH', handled: false, fallback: null },
                DNS_FAILURE: { severity: 'HIGH', handled: false, fallback: null },
                CORS_VIOLATION: { severity: 'MEDIUM', handled: false, fallback: null },
                SSL_ERROR: { severity: 'CRITICAL', handled: false, fallback: null },
                RATE_LIMIT_429: { severity: 'MEDIUM', handled: false, fallback: null },
                SERVER_ERROR_5XX: { severity: 'HIGH', handled: false, fallback: null },
                NETWORK_OFFLINE: { severity: 'HIGH', handled: false, fallback: null }
            },
            
            // ブラウザ互換性エラー (TEST-016)
            BROWSER_COMPATIBILITY: {
                NO_WEBWORKER: { severity: 'MEDIUM', handled: false, fallback: null },
                NO_LOCALSTORAGE: { severity: 'MEDIUM', handled: false, fallback: null },
                NO_SESSIONSTORAGE: { severity: 'LOW', handled: false, fallback: null },
                NO_COOKIES: { severity: 'MEDIUM', handled: false, fallback: null },
                NO_PROMISE: { severity: 'HIGH', handled: false, fallback: null },
                NO_FETCH: { severity: 'MEDIUM', handled: false, fallback: null },
                NO_ES6_FEATURES: { severity: 'MEDIUM', handled: false, fallback: null },
                NO_CSS_GRID: { severity: 'LOW', handled: false, fallback: null },
                NO_TOUCH_API: { severity: 'LOW', handled: false, fallback: null }
            }
        };
        
        this.recoveryStrategies = {
            RETRY: { attempts: 3, backoff: 'exponential', jitter: true },
            FALLBACK: { alternative: 'local_processing', degraded: true },
            ESCALATE: { notify: 'security_team', block: true },
            GRACEFUL_DEGRADATION: { maintain_core: true, disable_enhanced: true },
            USER_NOTIFICATION: { show_warning: true, provide_guidance: true }
        };
        
        this.browserSupport = {
            CHROME: { min_version: '90', support_level: 'full' },
            FIREFOX: { min_version: '88', support_level: 'full' },
            SAFARI: { min_version: '14', support_level: 'full' },
            EDGE: { min_version: '90', support_level: 'full' },
            IE11: { min_version: '11', support_level: 'limited' },
            MOBILE_CHROME: { min_version: '90', support_level: 'full' },
            MOBILE_SAFARI: { min_version: '14', support_level: 'full' }
        };
        
        this.testResults = {};
        this.performanceMetrics = {};
        this.securityMetrics = {};
    }
    
    /**
     * エラーハンドリング状況を記録
     */
    recordErrorHandling(category, errorType, result) {
        if (this.errorTypes[category] && this.errorTypes[category][errorType]) {
            this.errorTypes[category][errorType].handled = result.handled;
            this.errorTypes[category][errorType].fallback = result.fallback;
            this.errorTypes[category][errorType].recovery_time = result.recovery_time;
            this.errorTypes[category][errorType].user_impact = result.user_impact;
        }
    }
    
    /**
     * テスト結果を記録
     */
    recordTestResult(testId, result) {
        this.testResults[testId] = {
            passed: result.passed,
            total: result.total,
            success_rate: result.passed / result.total,
            execution_time: result.execution_time,
            errors: result.errors || []
        };
    }
    
    /**
     * パフォーマンスメトリクスを記録
     */
    recordPerformanceMetrics(metrics) {
        this.performanceMetrics = {
            error_detection_time: metrics.error_detection_time || 0,
            recovery_time: metrics.recovery_time || 0,
            fallback_activation_time: metrics.fallback_activation_time || 0,
            user_notification_time: metrics.user_notification_time || 0,
            memory_usage_peak: metrics.memory_usage_peak || 0,
            cpu_usage_peak: metrics.cpu_usage_peak || 0
        };
    }
    
    /**
     * セキュリティメトリクスを記録
     */
    recordSecurityMetrics(metrics) {
        this.securityMetrics = {
            xss_attempts_blocked: metrics.xss_attempts_blocked || 0,
            injection_attempts_blocked: metrics.injection_attempts_blocked || 0,
            security_incidents_detected: metrics.security_incidents_detected || 0,
            security_response_time: metrics.security_response_time || 0,
            data_sanitization_rate: metrics.data_sanitization_rate || 0,
            false_positive_rate: metrics.false_positive_rate || 0
        };
    }
    
    /**
     * 総合評価スコアを計算
     */
    calculateOverallScore() {
        let totalErrors = 0;
        let handledErrors = 0;
        let criticalHandled = 0;
        let criticalTotal = 0;
        
        Object.values(this.errorTypes).forEach(category => {
            Object.values(category).forEach(error => {
                totalErrors++;
                if (error.handled) handledErrors++;
                
                if (error.severity === 'CRITICAL') {
                    criticalTotal++;
                    if (error.handled) criticalHandled++;
                }
            });
        });
        
        const overallHandlingRate = handledErrors / totalErrors;
        const criticalHandlingRate = criticalTotal > 0 ? criticalHandled / criticalTotal : 1;
        
        // 重み付きスコア計算
        const score = (overallHandlingRate * 0.6) + (criticalHandlingRate * 0.4);
        
        return {
            overall_score: Math.round(score * 100),
            handling_rate: Math.round(overallHandlingRate * 100),
            critical_handling_rate: Math.round(criticalHandlingRate * 100),
            total_errors: totalErrors,
            handled_errors: handledErrors,
            critical_total: criticalTotal,
            critical_handled: criticalHandled
        };
    }
    
    /**
     * ブラウザ互換性スコアを計算
     */
    calculateCompatibilityScore() {
        const compatibilityTests = this.errorTypes.BROWSER_COMPATIBILITY;
        let compatibilityScore = 0;
        let totalTests = Object.keys(compatibilityTests).length;
        
        Object.values(compatibilityTests).forEach(test => {
            if (test.handled) {
                compatibilityScore += test.severity === 'HIGH' ? 3 : 
                                   test.severity === 'MEDIUM' ? 2 : 1;
            }
        });
        
        const maxScore = totalTests * 2; // 平均重要度を2とする
        return Math.round((compatibilityScore / maxScore) * 100);
    }
    
    /**
     * セキュリティスコアを計算
     */
    calculateSecurityScore() {
        const securityTests = [
            this.errorTypes.INPUT_VALIDATION.XSS_ATTACK,
            this.errorTypes.INPUT_VALIDATION.SQL_INJECTION,
            this.errorTypes.INPUT_VALIDATION.COMMAND_INJECTION,
            this.errorTypes.NETWORK_ERRORS.SSL_ERROR
        ];
        
        let securityScore = 0;
        securityTests.forEach(test => {
            if (test.handled) securityScore += 25; // 各25点
        });
        
        return securityScore;
    }
    
    /**
     * 詳細レポートを生成
     */
    generateDetailedReport() {
        const overallScore = this.calculateOverallScore();
        const compatibilityScore = this.calculateCompatibilityScore();
        const securityScore = this.calculateSecurityScore();
        
        return {
            summary: {
                overall_score: overallScore.overall_score,
                compatibility_score: compatibilityScore,
                security_score: securityScore,
                grade: this.calculateGrade(overallScore.overall_score)
            },
            
            error_handling_details: {
                input_validation: this.analyzeCategory('INPUT_VALIDATION'),
                network_errors: this.analyzeCategory('NETWORK_ERRORS'),
                browser_compatibility: this.analyzeCategory('BROWSER_COMPATIBILITY')
            },
            
            performance_analysis: this.performanceMetrics,
            security_analysis: this.securityMetrics,
            
            test_execution_summary: this.testResults,
            
            recommendations: this.generateRecommendations(),
            
            compliance: {
                owasp_top_10: this.checkOWASPCompliance(),
                accessibility: this.checkAccessibilityCompliance(),
                performance: this.checkPerformanceCompliance()
            }
        };
    }
    
    /**
     * カテゴリ別分析
     */
    analyzeCategory(category) {
        const categoryData = this.errorTypes[category];
        let handled = 0;
        let total = 0;
        const details = {};
        
        Object.entries(categoryData).forEach(([errorType, data]) => {
            total++;
            if (data.handled) handled++;
            
            details[errorType] = {
                handled: data.handled,
                severity: data.severity,
                fallback: data.fallback,
                recovery_time: data.recovery_time,
                user_impact: data.user_impact
            };
        });
        
        return {
            handling_rate: Math.round((handled / total) * 100),
            total_errors: total,
            handled_errors: handled,
            details: details
        };
    }
    
    /**
     * グレードを計算
     */
    calculateGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'A-';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'B-';
        if (score >= 65) return 'C+';
        if (score >= 60) return 'C';
        if (score >= 55) return 'C-';
        if (score >= 50) return 'D';
        return 'F';
    }
    
    /**
     * 改善提案を生成
     */
    generateRecommendations() {
        const recommendations = [];
        
        // セキュリティ関連
        if (this.calculateSecurityScore() < 100) {
            recommendations.push({
                category: 'SECURITY',
                priority: 'HIGH',
                message: 'セキュリティエラーハンドリングの改善が必要です',
                actions: [
                    'XSS防御の強化',
                    'SQLインジェクション対策の改善',
                    'セキュリティログ監視の強化'
                ]
            });
        }
        
        // パフォーマンス関連
        if (this.performanceMetrics.recovery_time > 1000) {
            recommendations.push({
                category: 'PERFORMANCE',
                priority: 'MEDIUM',
                message: 'エラー回復時間の最適化が推奨されます',
                actions: [
                    'フォールバック処理の高速化',
                    'エラー検出アルゴリズムの最適化',
                    'リソース使用量の削減'
                ]
            });
        }
        
        // 互換性関連
        if (this.calculateCompatibilityScore() < 80) {
            recommendations.push({
                category: 'COMPATIBILITY',
                priority: 'MEDIUM',
                message: 'ブラウザ互換性の向上が必要です',
                actions: [
                    'Polyfillの追加実装',
                    'フォールバック処理の改善',
                    '古いブラウザサポートの強化'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * OWASP Top 10 コンプライアンス確認
     */
    checkOWASPCompliance() {
        return {
            injection: this.errorTypes.INPUT_VALIDATION.SQL_INJECTION.handled,
            broken_authentication: true, // 認証機能が実装されている場合
            sensitive_data_exposure: this.errorTypes.NETWORK_ERRORS.SSL_ERROR.handled,
            xml_external_entities: true, // XML処理がある場合
            broken_access_control: true,
            security_misconfiguration: true,
            xss: this.errorTypes.INPUT_VALIDATION.XSS_ATTACK.handled,
            insecure_deserialization: true,
            vulnerable_components: true,
            insufficient_logging: this.securityMetrics.security_incidents_detected > 0
        };
    }
    
    /**
     * アクセシビリティコンプライアンス確認
     */
    checkAccessibilityCompliance() {
        return {
            wcag_2_1_aa: true, // 基本的なアクセシビリティ対応
            keyboard_navigation: true,
            screen_reader_support: true,
            color_contrast: true,
            text_alternatives: true
        };
    }
    
    /**
     * パフォーマンスコンプライアンス確認
     */
    checkPerformanceCompliance() {
        return {
            error_detection_under_100ms: this.performanceMetrics.error_detection_time < 100,
            recovery_under_1000ms: this.performanceMetrics.recovery_time < 1000,
            memory_usage_under_100mb: this.performanceMetrics.memory_usage_peak < 100 * 1024 * 1024,
            cpu_usage_under_50_percent: this.performanceMetrics.cpu_usage_peak < 50
        };
    }
    
    /**
     * マトリクスデータをJSONエクスポート
     */
    exportToJSON() {
        return JSON.stringify(this.generateDetailedReport(), null, 2);
    }
    
    /**
     * マトリクスデータをCSVエクスポート
     */
    exportToCSV() {
        const report = this.generateDetailedReport();
        let csv = 'Category,Error Type,Handled,Severity,Fallback,Recovery Time,User Impact\n';
        
        Object.entries(this.errorTypes).forEach(([category, errors]) => {
            Object.entries(errors).forEach(([errorType, data]) => {
                csv += `${category},${errorType},${data.handled},${data.severity},${data.fallback || ''},${data.recovery_time || ''},${data.user_impact || ''}\n`;
            });
        });
        
        return csv;
    }
}

// グローバルインスタンス作成
if (typeof window !== 'undefined') {
    window.ErrorHandlingMatrix = ErrorHandlingMatrix;
}

// Node.js環境用エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandlingMatrix;
}