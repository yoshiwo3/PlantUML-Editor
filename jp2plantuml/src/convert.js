const { parseGantt } = require('./parsers/gantt');
const { parseSequence } = require('./parsers/sequence');
const { parseClass } = require('./parsers/class');
const { parseActivity } = require('./parsers/activity');
const { parseState } = require('./parsers/state');
const { parseUsecase } = require('./parsers/usecase');

function normalizeInput(input) {
  // unify full-width and punctuation variants, normalize line endings
  let s = input.replace(/\r\n?/g, '\n');
  // unify tildes/hyphens used as ranges
  s = s.replace(/[〜~－—–]/g, '〜');
  // unify colons
  s = s.replace(/[：]/g, ':');
  // unify arrows
  s = s.replace(/→/g, '->').replace(/←/g, '<-');
  return s;
}

function detectType(input) {
  const s = input.trim();
  // Heuristic detection by keywords
  if (/\b(開始|終了|タスク|依存|進捗|担当|ガント|日程|開始日|終了日)\b/.test(s)) return 'gantt';
  if (/(->|-->|<-|<--)/.test(s) || /シーケンス|メッセージ|アクター/.test(s)) return 'sequence';
  if (/クラス|属性|メソッド|継承|関連/.test(s)) return 'class';
  if (/アクティビティ|フロー|分岐|開始ノード|終了ノード/.test(s)) return 'activity';
  if (/状態|遷移|イベント/.test(s)) return 'state';
  if (/ユースケース|アクター|関係/.test(s)) return 'usecase';
  // default to sequence as a safe generic
  return 'sequence';
}

function convertJapaneseToPlantUML(input, { mode = 'auto', diagramType = 'auto', compat = 'latest' } = {}) {
  const normalized = normalizeInput(input || '');
  const type = diagramType === 'auto' ? detectType(normalized) : diagramType;
  let result;
  switch (type) {
    case 'gantt':
      result = parseGantt(normalized, mode, { compat });
      break;
    case 'sequence':
      result = parseSequence(normalized, mode);
      break;
    case 'class':
      result = parseClass(normalized, mode);
      break;
    case 'activity':
      result = parseActivity(normalized, mode);
      break;
    case 'state':
      result = parseState(normalized, mode);
      break;
    case 'usecase':
      result = parseUsecase(normalized, mode);
      break;
    default:
      result = parseSequence(normalized, mode);
  }
  // Normalize output to object with debug info
  if (typeof result === 'string') {
    return { diagramType: type, plantuml: result, warnings: [], meta: {} };
  }
  return { diagramType: type, plantuml: result.plantuml, warnings: result.warnings || [], meta: result.meta || {} };
}

module.exports = { convertJapaneseToPlantUML };
