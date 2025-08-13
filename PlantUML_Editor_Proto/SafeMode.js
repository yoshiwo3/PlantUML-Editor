/**
 * SafeMode.js - セーフモード実装
 * 最小限の機能で安全な動作を確保するモード
 * リアルタイム同期や複雑な処理を無効化
 */

class SafeMode {
  constructor() {
    this.enabled = false;
    this.disabledFeatures = new Set();
    this.originalFunctions = new Map();
  }

  enable() {
    console.warn('🛡️ Safe Mode Enabled - Some features are disabled');
    this.enabled = true;
    
    // リアルタイム同期を無効化
    this.disableFeature('realtimeSync');
    
    // 複雑なパース処理を無効化
    this.disableFeature('complexParsing');
    
    // 自動バリデーションを無効化
    this.disableFeature('autoValidation');
    
    // localStorageに状態を保存
    localStorage.setItem('plantuml_safemode', 'true');
    
    // UIに表示
    this.showSafeModeIndicator();
    
    // 診断モードにログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('safemode', 'Safe mode enabled', {
        disabledFeatures: Array.from(this.disabledFeatures)
      });
    }
  }

  disable() {
    console.log('✅ Safe Mode Disabled - All features restored');
    this.enabled = false;
    
    // すべての機能を復元
    this.disabledFeatures.forEach(feature => {
      this.enableFeature(feature);
    });
    
    // localStorageから削除
    localStorage.removeItem('plantuml_safemode');
    
    this.hideSafeModeIndicator();
    
    // 診断モードにログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('safemode', 'Safe mode disabled');
    }
  }

  disableFeature(featureName) {
    this.disabledFeatures.add(featureName);
    
    switch (featureName) {
      case 'realtimeSync':
        this.disableRealtimeSync();
        break;
      case 'complexParsing':
        this.disableComplexParsing();
        break;
      case 'autoValidation':
        this.disableAutoValidation();
        break;
    }
  }

  disableRealtimeSync() {
    if (window.realtimeSyncManager) {
      // 元の関数を保存
      this.originalFunctions.set('realtimeSync.parse', window.realtimeSyncManager.parse);
      this.originalFunctions.set('realtimeSync.handleCodeChange', window.realtimeSyncManager.handleCodeChange);
      
      // ダミー関数に置き換え
      window.realtimeSyncManager.parse = function(code) {
        console.log('[SafeMode] RealtimeSync disabled - parse skipped');
        return Promise.resolve({
          actors: [],
          messages: [],
          safeMode: true
        });
      };
      
      window.realtimeSyncManager.handleCodeChange = function(code) {
        console.log('[SafeMode] RealtimeSync disabled - handleCodeChange skipped');
        return Promise.resolve();
      };
    }
  }

  disableComplexParsing() {
    // 複雑な正規表現を単純なものに置き換え
    if (window.PlantUMLASTParser) {
      this.originalFunctions.set('parser.parse', window.PlantUMLASTParser.parse);
      
      window.PlantUMLASTParser.parse = function(code) {
        console.log('[SafeMode] Complex parsing disabled - using simplified parser');
        
        // 超シンプルなパース（基本的な構造のみ）
        const lines = code.split('\n');
        const actors = [];
        const messages = [];
        
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          
          // アクター検出（シンプル）
          if (trimmed.startsWith('actor ') || trimmed.startsWith('participant ')) {
            const parts = trimmed.split(' ');
            if (parts.length >= 2) {
              actors.push({
                type: parts[0],
                name: parts.slice(1).join(' ').replace(/"/g, '')
              });
            }
          }
          
          // メッセージ検出（シンプル）
          if (trimmed.includes('->') && trimmed.includes(':')) {
            const arrowIndex = trimmed.indexOf('->');
            const colonIndex = trimmed.indexOf(':');
            
            if (arrowIndex > 0 && colonIndex > arrowIndex) {
              messages.push({
                from: trimmed.substring(0, arrowIndex).trim(),
                to: trimmed.substring(arrowIndex + 2, colonIndex).trim(),
                text: trimmed.substring(colonIndex + 1).trim()
              });
            }
          }
        });
        
        return {
          actors,
          messages,
          safeMode: true
        };
      };
    }
  }

  disableAutoValidation() {
    // 自動バリデーションを無効化
    // 【重要】フリーズ問題のため一時的に無効化 - 2025-08-13
    console.warn('[SafeMode] disableAutoValidation は一時的に無効化されています（フリーズ問題対応）');
    return;
    
    /* フリーズ問題が解決するまでコメントアウト
    const editor = document.getElementById('plantuml-code');
    if (editor) {
      // 既存のイベントリスナーを取得（可能な場合）
      const inputHandlers = editor._inputHandlers || [];
      this.originalFunctions.set('editor.inputHandlers', inputHandlers);
      
      // すべてのinputイベントリスナーを削除
      const newEditor = editor.cloneNode(true);
      editor.parentNode.replaceChild(newEditor, editor);
      
      // 超シンプルなハンドラーのみ追加（大幅なデバウンス付き）
      const debounced = this.debounce(() => {
        console.log('[SafeMode] Validation throttled - manual sync required');
        
        // 手動同期ボタンを表示
        this.showManualSyncButton();
      }, 3000); // 3秒のデバウンス
      
      newEditor.addEventListener('input', debounced);
    }
    */
  }

  enableFeature(featureName) {
    // 元の機能を復元
    switch (featureName) {
      case 'realtimeSync':
        if (window.realtimeSyncManager) {
          const originalParse = this.originalFunctions.get('realtimeSync.parse');
          const originalHandleCodeChange = this.originalFunctions.get('realtimeSync.handleCodeChange');
          
          if (originalParse) {
            window.realtimeSyncManager.parse = originalParse;
          }
          if (originalHandleCodeChange) {
            window.realtimeSyncManager.handleCodeChange = originalHandleCodeChange;
          }
        }
        break;
        
      case 'complexParsing':
        if (window.PlantUMLASTParser) {
          const originalParse = this.originalFunctions.get('parser.parse');
          if (originalParse) {
            window.PlantUMLASTParser.parse = originalParse;
          }
        }
        break;
        
      case 'autoValidation':
        // エディタのイベントハンドラーを復元
        const editor = document.getElementById('plantuml-code');
        const originalHandlers = this.originalFunctions.get('editor.inputHandlers');
        
        if (editor && originalHandlers) {
          originalHandlers.forEach(handler => {
            editor.addEventListener('input', handler);
          });
        }
        break;
    }
    
    this.disabledFeatures.delete(featureName);
  }

  showSafeModeIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'safe-mode-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #ff9800, #ff5722);
        color: white;
        padding: 10px;
        text-align: center;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
      ">
        <span>🛡️ セーフモード有効 - 一部機能が制限されています</span>
        <button onclick="window.safeMode.disable()" style="
          padding: 5px 15px;
          background: white;
          color: #ff5722;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        ">
          通常モードに戻す
        </button>
        <button onclick="window.safeMode.showInfo()" style="
          padding: 5px 15px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid white;
          border-radius: 4px;
          cursor: pointer;
        ">
          詳細
        </button>
      </div>
    `;
    document.body.insertBefore(indicator, document.body.firstChild);
  }

  hideSafeModeIndicator() {
    const indicator = document.getElementById('safe-mode-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    const syncButton = document.getElementById('manual-sync-button');
    if (syncButton) {
      syncButton.remove();
    }
  }

  showManualSyncButton() {
    if (document.getElementById('manual-sync-button')) {
      return; // 既に表示されている
    }
    
    const button = document.createElement('button');
    button.id = 'manual-sync-button';
    button.innerHTML = '🔄 手動同期';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 9999;
    `;
    
    button.onclick = () => {
      console.log('[SafeMode] Manual sync triggered');
      
      // 診断モードでログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('safemode', 'Manual sync triggered');
      }
      
      // 簡単な同期処理
      const editor = document.getElementById('plantuml-code');
      if (editor && window.PlantUMLASTParser) {
        const code = editor.value;
        const result = window.PlantUMLASTParser.parse(code);
        
        // UI更新（もし関数があれば）
        if (window.updateUIFromParse) {
          window.updateUIFromParse(result);
        }
      }
      
      // ボタンを一時的に無効化
      button.disabled = true;
      button.innerHTML = '✅ 同期完了';
      
      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = '🔄 手動同期';
      }, 2000);
    };
    
    document.body.appendChild(button);
  }

  showInfo() {
    const info = document.createElement('div');
    info.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10001;
      max-width: 500px;
    `;
    
    info.innerHTML = `
      <h2 style="margin-top: 0; color: #ff5722;">🛡️ セーフモードについて</h2>
      <p>セーフモードでは、以下の機能が無効化されています：</p>
      <ul>
        <li><strong>リアルタイム同期</strong> - 自動的なコード解析を停止</li>
        <li><strong>複雑なパース処理</strong> - 簡略化されたパーサーを使用</li>
        <li><strong>自動バリデーション</strong> - 手動同期のみ有効</li>
      </ul>
      <p>これらの制限により、エディタのフリーズを防ぎます。</p>
      <p><strong>無効化された機能:</strong></p>
      <ul style="font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${Array.from(this.disabledFeatures).map(f => `<li>${f}</li>`).join('')}
      </ul>
      <button onclick="this.parentElement.remove()" style="
        width: 100%;
        padding: 10px;
        background: #ff5722;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      ">
        閉じる
      </button>
    `;
    
    document.body.appendChild(info);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 状態チェック
  isEnabled() {
    return this.enabled;
  }

  getDisabledFeatures() {
    return Array.from(this.disabledFeatures);
  }
}

// グローバルインスタンス作成
window.safeMode = new SafeMode();

// ページロード時にセーフモードを確認
document.addEventListener('DOMContentLoaded', () => {
  // URLパラメータをチェック
  const urlParams = new URLSearchParams(window.location.search);
  const safeModeParam = urlParams.get('safemode');
  
  // localStorageをチェック
  const safeModeStored = localStorage.getItem('plantuml_safemode');
  
  if (safeModeParam === 'true' || safeModeStored === 'true') {
    window.safeMode.enable();
  }
  
  // 診断モードにログ
  if (window.diagnosticMode) {
    window.diagnosticMode.log('safemode', 'SafeMode module loaded', {
      urlParam: safeModeParam,
      stored: safeModeStored,
      enabled: window.safeMode.isEnabled()
    });
  }
});

// コンソールにセーフモードコマンドを追加
console.log('🛡️ Safe Mode Ready. Commands:');
console.log('  - safeMode.enable() : Enable safe mode');
console.log('  - safeMode.disable() : Disable safe mode');
console.log('  - safeMode.showInfo() : Show safe mode information');
console.log('  - safeMode.getDisabledFeatures() : List disabled features');