/**
 * AsyncParser.js - 非同期パース処理
 * Web Workerを使用してメインスレッドをブロックしない
 * キャッシュ機能とフォールバック処理を実装
 */

class AsyncParser {
  constructor() {
    this.worker = null;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.initWorker();
  }

  /**
   * Web Workerを初期化
   */
  initWorker() {
    // Web Worker のコード
    const workerCode = `
      // Worker内でのパース処理
      self.onmessage = function(e) {
        const { id, code } = e.data;
        
        try {
          // パース処理（Worker内で実行）
          const result = parseCode(code);
          self.postMessage({ id, result, error: null });
        } catch (error) {
          self.postMessage({ id, result: null, error: error.message });
        }
      };
      
      function parseCode(code) {
        const lines = code.split('\\n');
        const actors = [];
        const messages = [];
        const notes = [];
        const groups = [];
        
        // 基本的なパース（複雑な正規表現を避ける）
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // 空行とコメントをスキップ
          if (!line || line.startsWith("'")) {
            continue;
          }
          
          // アクター検出
          if (line.startsWith('actor ') || 
              line.startsWith('participant ') || 
              line.startsWith('entity ') ||
              line.startsWith('database ') ||
              line.startsWith('collections ')) {
            const type = line.split(' ')[0];
            const name = line.substring(type.length + 1).replace(/"/g, '').trim();
            actors.push({ 
              type, 
              name, 
              line: i,
              id: 'actor_' + actors.length
            });
          }
          
          // メッセージ検出（シンプルなパターンのみ）
          if ((line.includes('->') || line.includes('-->')) && line.includes(':')) {
            const arrow = line.includes('-->') ? '-->' : '->';
            const parts = line.split(arrow);
            
            if (parts.length === 2) {
              const [fromPart, toPart] = parts;
              const colonIndex = toPart.indexOf(':');
              
              if (colonIndex !== -1) {
                messages.push({
                  from: fromPart.trim().replace(/"/g, ''),
                  to: toPart.substring(0, colonIndex).trim().replace(/"/g, ''),
                  text: toPart.substring(colonIndex + 1).trim(),
                  arrow,
                  line: i,
                  id: 'msg_' + messages.length
                });
              }
            }
          }
          
          // ノート検出
          if (line.startsWith('note ')) {
            const noteMatch = line.match(/note\\s+(left|right|over)\\s*:?\\s*(.+)/i);
            if (noteMatch) {
              notes.push({
                position: noteMatch[1],
                text: noteMatch[2],
                line: i,
                id: 'note_' + notes.length
              });
            }
          }
          
          // グループ検出
          if (line.startsWith('group ') || line.startsWith('alt ') || line.startsWith('loop ')) {
            const groupMatch = line.match(/(group|alt|loop)\\s+(.+)/i);
            if (groupMatch) {
              groups.push({
                type: groupMatch[1],
                label: groupMatch[2],
                line: i,
                id: 'group_' + groups.length
              });
            }
          }
        }
        
        return { 
          actors, 
          messages, 
          notes,
          groups,
          lineCount: lines.length,
          parseTime: Date.now()
        };
      }
    `;
    
    // Blob URLを作成
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    try {
      this.worker = new Worker(workerUrl);
      
      this.worker.onerror = (error) => {
        console.error('[AsyncParser] Worker error:', error);
        this.handleWorkerError(error);
      };
      
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('parser', 'Web Worker initialized');
      }
      
    } catch (error) {
      console.warn('[AsyncParser] Web Worker not available, falling back to async parsing');
      this.worker = null;
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('parser', 'Web Worker not available', {
          error: error.message
        });
      }
    }
  }

  /**
   * Workerからのメッセージを処理
   */
  handleWorkerMessage(data) {
    const { id, result, error } = data;
    const pending = this.pendingRequests.get(id);
    
    if (!pending) {
      console.warn('[AsyncParser] No pending request for id:', id);
      return;
    }
    
    const { resolve, reject } = pending;
    this.pendingRequests.delete(id);
    
    if (error) {
      reject(new Error(error));
    } else {
      // キャッシュに保存
      const cacheKey = pending.cacheKey;
      if (cacheKey) {
        this.cache.set(cacheKey, result);
      }
      resolve(result);
    }
  }

  /**
   * コードをパース（メインAPI）
   */
  async parse(code) {
    // セーフモードチェック
    if (window.safeMode?.enabled) {
      console.log('[AsyncParser] Using simplified parser in safe mode');
      return this.parseSimple(code);
    }
    
    // キャッシュチェック
    const cacheKey = this.getCacheKey(code);
    if (this.cache.has(cacheKey)) {
      console.log('[AsyncParser] Cache hit');
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.log('parser', 'Cache hit', {
          cacheSize: this.cache.size
        });
      }
      
      return this.cache.get(cacheKey);
    }
    
    // 診断モード
    if (window.diagnosticMode) {
      window.diagnosticMode.markPerformance('parse_start');
    }
    
    let result;
    
    try {
      if (this.worker) {
        // Web Worker でパース
        result = await this.parseWithWorker(code, cacheKey);
      } else {
        // メインスレッドで非同期パース
        result = await this.parseAsync(code);
        // キャッシュに保存
        this.cache.set(cacheKey, result);
      }
      
      // キャッシュサイズ制限
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
    } catch (error) {
      console.error('[AsyncParser] Parse error:', error);
      
      // フォールバック
      result = this.getFallbackResult(code);
      
      // 診断ログ
      if (window.diagnosticMode) {
        window.diagnosticMode.captureError(error, {
          context: 'parser',
          codeLength: code.length
        });
      }
    }
    
    // 診断モード
    if (window.diagnosticMode) {
      window.diagnosticMode.markPerformance('parse_end');
      window.diagnosticMode.measurePerformance('parse_start', 'parse_end');
    }
    
    return result;
  }

  /**
   * Web Workerでパース
   */
  parseWithWorker(code, cacheKey) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      
      // タイムアウト設定
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Parse timeout in worker'));
      }, 3000);
      
      // リクエストを保存
      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        cacheKey
      });
      
      // Workerにメッセージを送信
      this.worker.postMessage({ id, code });
    });
  }

  /**
   * メインスレッドで非同期パース
   */
  async parseAsync(code) {
    // requestIdleCallback を使用して非同期にパース
    return new Promise((resolve) => {
      const lines = code.split('\n');
      const actors = [];
      const messages = [];
      const notes = [];
      const groups = [];
      let currentIndex = 0;
      
      const processChunk = (deadline) => {
        // deadlineが利用可能な場合のみ使用
        const shouldContinue = deadline ? 
          () => currentIndex < lines.length && deadline.timeRemaining() > 0 :
          () => currentIndex < lines.length && currentIndex % 10 !== 0; // 10行ごとに中断
        
        while (shouldContinue()) {
          const line = lines[currentIndex].trim();
          
          // 空行とコメントをスキップ
          if (line && !line.startsWith("'")) {
            // アクター検出
            if (line.startsWith('actor ') || 
                line.startsWith('participant ') ||
                line.startsWith('entity ') ||
                line.startsWith('database ')) {
              const type = line.split(' ')[0];
              const name = line.substring(type.length + 1).replace(/"/g, '').trim();
              actors.push({ 
                type, 
                name, 
                line: currentIndex,
                id: 'actor_' + actors.length
              });
            }
            
            // メッセージ検出
            if ((line.includes('->') || line.includes('-->')) && line.includes(':')) {
              const arrow = line.includes('-->') ? '-->' : '->';
              const parts = line.split(arrow);
              
              if (parts.length === 2) {
                const [fromPart, toPart] = parts;
                const colonIndex = toPart.indexOf(':');
                
                if (colonIndex !== -1) {
                  messages.push({
                    from: fromPart.trim().replace(/"/g, ''),
                    to: toPart.substring(0, colonIndex).trim().replace(/"/g, ''),
                    text: toPart.substring(colonIndex + 1).trim(),
                    arrow,
                    line: currentIndex,
                    id: 'msg_' + messages.length
                  });
                }
              }
            }
            
            // ノート検出
            if (line.startsWith('note ')) {
              const noteMatch = line.match(/note\s+(left|right|over)\s*:?\s*(.+)/i);
              if (noteMatch) {
                notes.push({
                  position: noteMatch[1],
                  text: noteMatch[2],
                  line: currentIndex,
                  id: 'note_' + notes.length
                });
              }
            }
          }
          
          currentIndex++;
        }
        
        if (currentIndex < lines.length) {
          // まだ処理する行がある
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(processChunk);
          } else {
            setTimeout(() => processChunk(null), 0);
          }
        } else {
          // 完了
          resolve({ 
            actors, 
            messages, 
            notes,
            groups,
            lineCount: lines.length,
            parseTime: Date.now()
          });
        }
      };
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(processChunk);
      } else {
        // フォールバック
        setTimeout(() => processChunk(null), 0);
      }
    });
  }

  /**
   * シンプルなパース（セーフモード用）
   */
  parseSimple(code) {
    const lines = code.split('\n');
    const actors = [];
    const messages = [];
    
    for (let i = 0; i < Math.min(lines.length, 100); i++) { // 最大100行
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // アクター（超シンプル）
      if (line.startsWith('actor ') || line.startsWith('participant ')) {
        const parts = line.split(' ');
        if (parts.length >= 2) {
          actors.push({
            type: parts[0],
            name: parts.slice(1).join(' ').replace(/"/g, ''),
            line: i
          });
        }
      }
      
      // メッセージ（超シンプル）
      if (line.includes('->') && line.includes(':')) {
        const arrowIndex = line.indexOf('->');
        const colonIndex = line.indexOf(':');
        
        if (arrowIndex > 0 && colonIndex > arrowIndex) {
          messages.push({
            from: line.substring(0, arrowIndex).trim(),
            to: line.substring(arrowIndex + 2, colonIndex).trim(),
            text: line.substring(colonIndex + 1).trim(),
            line: i
          });
        }
      }
    }
    
    return {
      actors,
      messages,
      notes: [],
      groups: [],
      lineCount: lines.length,
      parseTime: Date.now(),
      safeMode: true
    };
  }

  /**
   * キャッシュキーを生成
   */
  getCacheKey(code) {
    // 簡単なハッシュ関数
    let hash = 0;
    for (let i = 0; i < Math.min(code.length, 1000); i++) { // 最初の1000文字のみ
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * フォールバック結果を生成
   */
  getFallbackResult(code) {
    const lines = code.split('\n').slice(0, 50); // 最初の50行のみ
    const actors = [];
    
    // 最小限の解析
    lines.forEach((line, index) => {
      if (line.includes('actor') || line.includes('participant')) {
        actors.push({
          type: 'unknown',
          name: `Actor ${actors.length + 1}`,
          line: index
        });
      }
    });
    
    return {
      actors,
      messages: [],
      notes: [],
      groups: [],
      error: true,
      errorMessage: 'Fallback mode: Limited functionality',
      lineCount: lines.length,
      parseTime: Date.now()
    };
  }

  /**
   * Workerエラーを処理
   */
  handleWorkerError(error) {
    console.error('[AsyncParser] Worker failed, reinitializing');
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.captureError(error, {
        context: 'worker_error'
      });
    }
    
    // Workerを再初期化
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    
    // ペンディングリクエストをすべて拒否
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Worker failed'));
    });
    this.pendingRequests.clear();
    
    // 再初期化を試みる
    setTimeout(() => {
      this.initWorker();
    }, 1000);
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('parser', 'Cache cleared');
    }
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      workerAvailable: this.worker !== null,
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * リソースを解放
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.clearCache();
    this.pendingRequests.clear();
    
    // 診断ログ
    if (window.diagnosticMode) {
      window.diagnosticMode.log('parser', 'AsyncParser destroyed');
    }
  }
}

// グローバルインスタンス作成
window.asyncParser = new AsyncParser();

// 診断ログ
if (window.diagnosticMode) {
  window.diagnosticMode.log('init', 'AsyncParser initialized', {
    stats: window.asyncParser.getStats()
  });
}

// コンソールにコマンドを追加
console.log('🔄 Async Parser Ready. Commands:');
console.log('  - asyncParser.parse(code) : Parse PlantUML code');
console.log('  - asyncParser.clearCache() : Clear parse cache');
console.log('  - asyncParser.getStats() : Get parser statistics');
console.log('  - asyncParser.destroy() : Clean up resources');