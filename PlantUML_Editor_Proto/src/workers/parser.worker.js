/**
 * PlantUML Parser WebWorker
 * 重い計算処理をメインスレッドから分離してパフォーマンスを向上
 * 
 * 機能:
 * - PlantUMLコードの構文解析
 * - アクター、条件分岐、ループ、並行処理の抽出
 * - バリデーション処理
 * - シンタックスチェック
 */

// パーサー設定
const PARSER_CONFIG = {
  maxProcessingTime: 5000, // 5秒でタイムアウト
  batchSize: 100, // バッチ処理サイズ
  cacheSize: 50, // キャッシュサイズ
};

// パース結果のキャッシュ
const parseCache = new Map();

// ログ出力用
function log(message, level = 'info') {
  self.postMessage({
    type: 'log',
    level,
    message: `[Parser Worker] ${message}`,
    timestamp: Date.now()
  });
}

// エラーハンドリング
function handleError(error, context = 'Unknown') {
  log(`Error in ${context}: ${error.message}`, 'error');
  return {
    success: false,
    error: error.message,
    context
  };
}

// PlantUMLコードの解析
async function parsePlantUML(content, options = {}) {
  const startTime = performance.now();
  
  try {
    // キャッシュチェック
    const cacheKey = generateCacheKey(content, options);
    if (parseCache.has(cacheKey)) {
      log(`Cache hit for parsing (${(performance.now() - startTime).toFixed(2)}ms)`);
      return parseCache.get(cacheKey);
    }

    // 基本構造の初期化
    const parsed = {
      actors: [],
      actions: [],
      conditions: [],
      loops: [],
      parallels: [],
      metadata: {
        lineCount: 0,
        complexity: 0,
        processingTime: 0
      }
    };

    // 行単位での解析
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    parsed.metadata.lineCount = lines.length;

    // バッチ処理で大量データに対応
    const batches = chunkArray(lines, PARSER_CONFIG.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // タイムアウトチェック
      if (performance.now() - startTime > PARSER_CONFIG.maxProcessingTime) {
        throw new Error('Parsing timeout exceeded');
      }

      // バッチ処理の進捗報告
      self.postMessage({
        type: 'progress',
        current: i + 1,
        total: batches.length,
        percentage: Math.round(((i + 1) / batches.length) * 100)
      });

      await processBatch(batch, parsed);
      
      // 他のタスクにCPU時間を譲る
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 複雑度計算
    parsed.metadata.complexity = calculateComplexity(parsed);
    parsed.metadata.processingTime = performance.now() - startTime;

    // キャッシュに保存
    if (parseCache.size >= PARSER_CONFIG.cacheSize) {
      const firstKey = parseCache.keys().next().value;
      parseCache.delete(firstKey);
    }
    parseCache.set(cacheKey, parsed);

    log(`Parsing completed in ${parsed.metadata.processingTime.toFixed(2)}ms`);
    return { success: true, result: parsed };

  } catch (error) {
    return handleError(error, 'parsePlantUML');
  }
}

// バッチ処理
async function processBatch(lines, parsed) {
  for (const line of lines) {
    try {
      if (line.includes('participant') || line.includes('actor')) {
        const actor = extractActor(line);
        if (actor) parsed.actors.push(actor);
      } else if (line.includes('alt')) {
        const condition = extractCondition(line);
        if (condition) parsed.conditions.push(condition);
      } else if (line.includes('loop')) {
        const loop = extractLoop(line);
        if (loop) parsed.loops.push(loop);
      } else if (line.includes('par')) {
        const parallel = extractParallel(line);
        if (parallel) parsed.parallels.push(parallel);
      } else if (isActionLine(line)) {
        const action = extractAction(line);
        if (action) parsed.actions.push(action);
      }
    } catch (error) {
      log(`Error processing line: ${line} - ${error.message}`, 'warn');
    }
  }
}

// アクター抽出
function extractActor(line) {
  // participant User as U
  // actor System
  const participantMatch = line.match(/participant\s+(\w+)(?:\s+as\s+(\w+))?/);
  if (participantMatch) {
    return {
      type: 'participant',
      name: participantMatch[1],
      alias: participantMatch[2] || null,
      line: line
    };
  }

  const actorMatch = line.match(/actor\s+(\w+)(?:\s+as\s+(\w+))?/);
  if (actorMatch) {
    return {
      type: 'actor',
      name: actorMatch[1],
      alias: actorMatch[2] || null,
      line: line
    };
  }

  return null;
}

// 条件分岐抽出
function extractCondition(line) {
  // alt success
  // else failure
  const altMatch = line.match(/alt\s+(.+)/);
  if (altMatch) {
    return {
      type: 'condition',
      condition: altMatch[1].trim(),
      level: getIndentLevel(line),
      line: line
    };
  }

  const elseMatch = line.match(/else(?:\s+(.+))?/);
  if (elseMatch) {
    return {
      type: 'else',
      condition: elseMatch[1] ? elseMatch[1].trim() : null,
      level: getIndentLevel(line),
      line: line
    };
  }

  return null;
}

// ループ抽出
function extractLoop(line) {
  // loop 1000 times
  // loop while condition
  const loopMatch = line.match(/loop\s+(.+)/);
  if (loopMatch) {
    return {
      type: 'loop',
      condition: loopMatch[1].trim(),
      level: getIndentLevel(line),
      line: line
    };
  }

  return null;
}

// 並行処理抽出
function extractParallel(line) {
  // par
  // and
  if (line.match(/^par\s*$/)) {
    return {
      type: 'par_start',
      level: getIndentLevel(line),
      line: line
    };
  }

  if (line.match(/^and\s*$/)) {
    return {
      type: 'par_and',
      level: getIndentLevel(line),
      line: line
    };
  }

  return null;
}

// アクション行判定
function isActionLine(line) {
  // A -> B: message
  // A ->> B: async message
  // A --> B: return message
  return /\w+\s*[-<>]+\s*\w+\s*:/.test(line);
}

// アクション抽出
function extractAction(line) {
  // A -> B: Send request
  // A ->> B: Send async request
  // A --> B: Return response
  const actionMatch = line.match(/(\w+)\s*([-<>]+)\s*(\w+)\s*:\s*(.+)/);
  if (actionMatch) {
    const arrowType = determineArrowType(actionMatch[2]);
    return {
      type: 'action',
      from: actionMatch[1],
      to: actionMatch[3],
      arrow: actionMatch[2],
      arrowType: arrowType,
      message: actionMatch[4].trim(),
      level: getIndentLevel(line),
      line: line
    };
  }

  return null;
}

// 矢印タイプ判定
function determineArrowType(arrow) {
  const arrowMap = {
    '->': 'sync',
    '->>': 'async',
    '-->': 'return',
    '<<--': 'async_return',
    '<-': 'sync_reverse',
    '<<-': 'async_reverse'
  };
  
  return arrowMap[arrow] || 'unknown';
}

// インデントレベル取得
function getIndentLevel(line) {
  const match = line.match(/^(\s*)/);
  return match ? Math.floor(match[1].length / 2) : 0;
}

// 複雑度計算
function calculateComplexity(parsed) {
  let complexity = 0;
  
  // 基本スコア
  complexity += parsed.actors.length;
  complexity += parsed.actions.length;
  
  // 制御構造のボーナス
  complexity += parsed.conditions.length * 2; // 条件分岐は複雑
  complexity += parsed.loops.length * 3; // ループはより複雑
  complexity += parsed.parallels.length * 4; // 並行処理は最も複雑
  
  return complexity;
}

// 配列分割ユーティリティ
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// キャッシュキー生成
function generateCacheKey(content, options) {
  const hash = simpleHash(content + JSON.stringify(options));
  return `parse_${hash}`;
}

// シンプルハッシュ関数
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(36);
}

// PlantUMLコード生成
async function generatePlantUML(data, options = {}) {
  const startTime = performance.now();
  
  try {
    let output = '@startuml\n';
    
    // タイトル追加
    if (data.title) {
      output += `title ${data.title}\n\n`;
    }
    
    // アクター定義
    if (data.actors && data.actors.length > 0) {
      for (const actor of data.actors) {
        if (actor.type === 'participant') {
          output += `participant ${actor.name}`;
          if (actor.alias) {
            output += ` as ${actor.alias}`;
          }
        } else if (actor.type === 'actor') {
          output += `actor ${actor.name}`;
          if (actor.alias) {
            output += ` as ${actor.alias}`;
          }
        }
        output += '\n';
      }
      output += '\n';
    }
    
    // アクション生成
    if (data.actions && data.actions.length > 0) {
      for (const action of data.actions) {
        const indent = '  '.repeat(action.level || 0);
        output += `${indent}${action.from} ${action.arrow} ${action.to}: ${action.message}\n`;
      }
    }
    
    // 条件分岐生成
    if (data.conditions && data.conditions.length > 0) {
      for (const condition of data.conditions) {
        const indent = '  '.repeat(condition.level || 0);
        if (condition.type === 'condition') {
          output += `${indent}alt ${condition.condition}\n`;
        } else if (condition.type === 'else') {
          output += `${indent}else${condition.condition ? ' ' + condition.condition : ''}\n`;
        }
      }
    }
    
    // ループ生成
    if (data.loops && data.loops.length > 0) {
      for (const loop of data.loops) {
        const indent = '  '.repeat(loop.level || 0);
        output += `${indent}loop ${loop.condition}\n`;
      }
    }
    
    // 並行処理生成
    if (data.parallels && data.parallels.length > 0) {
      for (const parallel of data.parallels) {
        const indent = '  '.repeat(parallel.level || 0);
        if (parallel.type === 'par_start') {
          output += `${indent}par\n`;
        } else if (parallel.type === 'par_and') {
          output += `${indent}and\n`;
        }
      }
    }
    
    output += '@enduml';
    
    const processingTime = performance.now() - startTime;
    log(`Generation completed in ${processingTime.toFixed(2)}ms`);
    
    return {
      success: true,
      result: output,
      metadata: {
        processingTime,
        lineCount: output.split('\n').length,
        size: output.length
      }
    };
    
  } catch (error) {
    return handleError(error, 'generatePlantUML');
  }
}

// バリデーション処理
async function validatePlantUML(content, options = {}) {
  const startTime = performance.now();
  
  try {
    const errors = [];
    const warnings = [];
    const lines = content.split('\n');
    
    // 基本構造チェック
    if (!content.includes('@startuml')) {
      errors.push({
        type: 'missing_start',
        message: '@startuml tag is missing',
        line: 0
      });
    }
    
    if (!content.includes('@enduml')) {
      errors.push({
        type: 'missing_end',
        message: '@enduml tag is missing',
        line: lines.length
      });
    }
    
    // ブロックバランスチェック
    const blockPairs = [
      { start: 'alt', end: 'end' },
      { start: 'loop', end: 'end' },
      { start: 'par', end: 'end' }
    ];
    
    for (const pair of blockPairs) {
      const startCount = (content.match(new RegExp(`\\b${pair.start}\\b`, 'g')) || []).length;
      const endCount = (content.match(new RegExp(`\\b${pair.end}\\b`, 'g')) || []).length;
      
      if (startCount !== endCount) {
        errors.push({
          type: 'unbalanced_blocks',
          message: `Unbalanced ${pair.start}/${pair.end} blocks (${startCount} start, ${endCount} end)`,
          details: { start: startCount, end: endCount }
        });
      }
    }
    
    // 行ごとのチェック
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // アクション行のチェック
      if (isActionLine(line)) {
        const action = extractAction(line);
        if (!action) {
          warnings.push({
            type: 'malformed_action',
            message: 'Potentially malformed action syntax',
            line: i + 1,
            content: line
          });
        }
      }
      
      // 未定義アクターチェック
      if (isActionLine(line)) {
        const match = line.match(/(\w+)\s*[-<>]+\s*(\w+)/);
        if (match) {
          const [, from, to] = match;
          // この実装では簡略化し、警告のみ
          if (from.length < 2 || to.length < 2) {
            warnings.push({
              type: 'short_actor_name',
              message: 'Actor name is very short',
              line: i + 1,
              actors: [from, to]
            });
          }
        }
      }
    }
    
    const processingTime = performance.now() - startTime;
    
    return {
      success: true,
      result: {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          processingTime,
          lineCount: lines.length,
          errorCount: errors.length,
          warningCount: warnings.length
        }
      }
    };
    
  } catch (error) {
    return handleError(error, 'validatePlantUML');
  }
}

// メッセージハンドラー
self.addEventListener('message', async (event) => {
  const { type, data, id, options } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'parse':
        result = await parsePlantUML(data, options);
        break;
        
      case 'generate':
        result = await generatePlantUML(data, options);
        break;
        
      case 'validate':
        result = await validatePlantUML(data, options);
        break;
        
      case 'clear_cache':
        parseCache.clear();
        result = { success: true, message: 'Cache cleared' };
        break;
        
      case 'get_stats':
        result = {
          success: true,
          stats: {
            cacheSize: parseCache.size,
            maxCacheSize: PARSER_CONFIG.cacheSize,
            uptime: performance.now()
          }
        };
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    // 結果を送信
    self.postMessage({
      id,
      type: 'result',
      success: result.success,
      result: result.success ? result.result : null,
      error: result.success ? null : result.error,
      metadata: result.metadata
    });
    
  } catch (error) {
    // エラーレスポンス
    self.postMessage({
      id,
      type: 'result',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Worker初期化ログ
log('PlantUML Parser Worker initialized');

// グローバルエラーハンドラー
self.addEventListener('error', (event) => {
  log(`Uncaught error: ${event.message}`, 'error');
});

self.addEventListener('unhandledrejection', (event) => {
  log(`Unhandled promise rejection: ${event.reason}`, 'error');
});