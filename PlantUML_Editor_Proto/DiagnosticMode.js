/**
 * DiagnosticMode.js - 診断モード実装
 * PlantUMLエディタのフリーズ問題を診断するためのモジュール
 * localStorageを使用してクラッシュ後もログを保持
 */

class DiagnosticMode {
  constructor() {
    this.logs = [];
    this.performanceMarks = [];
    this.errorStack = [];
    this.initializeStorage();
  }

  initializeStorage() {
    // localStorageを使用してクラッシュ後もログを保持
    this.storageKey = 'plantuml_diagnostic_' + Date.now();
    
    // 既存のログをクリア（1時間以上前のもの）
    Object.keys(localStorage)
      .filter(key => key.startsWith('plantuml_diagnostic_'))
      .forEach(key => {
        if (Date.now() - parseInt(key.split('_')[2]) > 3600000) {
          localStorage.removeItem(key);
        }
      });
  }

  log(category, message, data = {}) {
    const entry = {
      timestamp: Date.now(),
      category,
      message,
      data,
      stack: new Error().stack
    };
    
    this.logs.push(entry);
    
    // 即座にlocalStorageに保存（クラッシュ対策）
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      stored.push(entry);
      
      // 最新1000件のみ保持
      if (stored.length > 1000) {
        stored.shift();
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (e) {
      console.error('Failed to store diagnostic log:', e);
    }
  }

  markPerformance(label) {
    performance.mark(label);
    this.performanceMarks.push({
      label,
      timestamp: performance.now()
    });
    
    this.log('performance', `Mark: ${label}`, {
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null
    });
  }

  measurePerformance(startLabel, endLabel) {
    try {
      performance.measure(`${startLabel} to ${endLabel}`, startLabel, endLabel);
      const entries = performance.getEntriesByName(`${startLabel} to ${endLabel}`);
      
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        this.log('performance', `Measure: ${startLabel} to ${endLabel}`, {
          duration,
          critical: duration > 1000
        });
        
        if (duration > 1000) {
          this.alertSlowOperation(startLabel, duration);
        }
      }
    } catch (e) {
      this.log('error', 'Performance measurement failed', { error: e.message });
    }
  }

  alertSlowOperation(operation, duration) {
    console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`);
    
    // UIに警告を表示
    const alert = document.createElement('div');
    alert.className = 'diagnostic-alert';
    alert.innerHTML = `
      <strong>Performance Warning</strong><br>
      ${operation}: ${duration.toFixed(2)}ms
    `;
    alert.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff9800;
      color: white;
      padding: 10px;
      border-radius: 4px;
      z-index: 10000;
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 3000);
  }

  captureError(error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errorStack.push(errorEntry);
    this.log('error', 'Error captured', errorEntry);
  }

  generateReport() {
    const report = {
      sessionId: this.storageKey,
      startTime: this.logs[0]?.timestamp,
      endTime: Date.now(),
      logs: this.logs,
      errors: this.errorStack,
      performance: {
        marks: this.performanceMarks,
        slowOperations: this.logs.filter(l => l.data?.critical)
      },
      summary: {
        totalLogs: this.logs.length,
        totalErrors: this.errorStack.length,
        categories: this.getCategorySummary()
      }
    };
    
    return report;
  }

  getCategorySummary() {
    const summary = {};
    this.logs.forEach(log => {
      summary[log.category] = (summary[log.category] || 0) + 1;
    });
    return summary;
  }

  exportToFile() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic_report_${Date.now()}.json`;
    a.click();
  }

  // クラッシュ後のログ回復
  static recoverLogs() {
    const logs = [];
    Object.keys(localStorage)
      .filter(key => key.startsWith('plantuml_diagnostic_'))
      .forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          logs.push({ sessionId: key, data });
        } catch (e) {
          console.error('Failed to recover log:', key);
        }
      });
    return logs;
  }

  // 診断ダッシュボードの表示
  showDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'diagnostic-dashboard';
    dashboard.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    const updateDashboard = () => {
      const summary = this.getCategorySummary();
      const memoryInfo = performance.memory ? {
        used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
        total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
        limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
      } : { used: 'N/A', total: 'N/A', limit: 'N/A' };
      
      dashboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <strong>📊 Diagnostic Dashboard</strong>
          <button onclick="window.diagnosticMode.hideDashboard()" style="
            background: transparent;
            color: #ff0000;
            border: none;
            cursor: pointer;
            font-size: 16px;
          ">×</button>
        </div>
        <div>Session: ${this.storageKey.substring(20)}</div>
        <div>Logs: ${this.logs.length}</div>
        <div>Errors: ${this.errorStack.length}</div>
        <div>Memory: ${memoryInfo.used}MB / ${memoryInfo.limit}MB</div>
        <hr style="border-color: #00ff00; margin: 5px 0;">
        <div>Categories:</div>
        ${Object.entries(summary).map(([cat, count]) => 
          `<div style="margin-left: 10px;">- ${cat}: ${count}</div>`
        ).join('')}
        <hr style="border-color: #00ff00; margin: 5px 0;">
        <button onclick="window.diagnosticMode.exportToFile()" style="
          background: #00ff00;
          color: black;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 2px;
          width: 100%;
          margin-top: 5px;
        ">Export Report</button>
      `;
    };
    
    updateDashboard();
    document.body.appendChild(dashboard);
    
    // 定期更新
    this.dashboardInterval = setInterval(updateDashboard, 1000);
  }

  hideDashboard() {
    const dashboard = document.getElementById('diagnostic-dashboard');
    if (dashboard) {
      dashboard.remove();
    }
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }
  }
}

// グローバルインスタンス作成
window.diagnosticMode = new DiagnosticMode();

// 初期化ログ
window.diagnosticMode.log('init', 'DiagnosticMode initialized', {
  timestamp: new Date().toISOString(),
  url: window.location.href
});

// コンソールに診断コマンドを追加
console.log('🔍 Diagnostic Mode Ready. Commands:');
console.log('  - diagnosticMode.showDashboard() : Show diagnostic dashboard');
console.log('  - diagnosticMode.exportToFile() : Export diagnostic report');
console.log('  - DiagnosticMode.recoverLogs() : Recover logs from previous sessions');