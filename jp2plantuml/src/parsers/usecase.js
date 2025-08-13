function parseSemi(lines) {
  // Examples:
  // アクター: ユーザー, 管理者
  // ユースケース: ログイン
  // 関係: ユーザー -> ログイン
  const actors = new Set();
  const usecases = new Set();
  const relations = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('アクター:')) {
      const list = line.split(':')[1] || '';
      list.split(',').map(s => s.trim()).filter(Boolean).forEach(a => actors.add(a));
    } else if (line.startsWith('ユースケース:')) {
      const name = line.split(':')[1].trim();
      usecases.add(name);
    } else if (line.startsWith('関係:')) {
      const body = line.split(':')[1] || '';
      const m = body.match(/(.+)->(.+)/);
      if (m) {
        const left = m[1].trim();
        const right = m[2].trim();
        relations.push({ left, right });
        // infer types later in output
        if (!left.includes('(')) actors.add(left);
        if (!right.includes('(')) usecases.add(right);
      }
    }
  }
  const out = ['@startuml'];
  actors.forEach(a => out.push(`actor ${a}`));
  usecases.forEach(u => out.push(`usecase ${u}`));
  relations.forEach(r => out.push(`${r.left} --> ${r.right}`));
  out.push('@enduml');
  return out.join('\n');
}

function parseFree(lines) {
  // naive: "ユーザーはログインを行う" => actor ユーザー, usecase ログイン, ユーザー --> ログイン
  const out = ['@startuml'];
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/([\p{L}\p{N}_]+)は([\p{L}\p{N}_]+)を?(行う|使う|実行)/u);
    if (m) {
      const actor = m[1];
      const uc = m[2];
      out.push(`actor ${actor}`);
      out.push(`usecase ${uc}`);
      out.push(`${actor} --> ${uc}`);
    }
  }
  if (out.length === 1) {
    out.push('actor User');
    out.push('usecase Login');
    out.push('User --> Login');
  }
  out.push('@enduml');
  return out.join('\n');
}

function parseUsecase(input, mode = 'auto') {
  const lines = input.split(/\r?\n/);
  if (mode === 'semi' || lines.some(l => l.includes('アクター:') || l.includes('ユースケース:') || l.includes('関係:'))) {
    return parseSemi(lines);
  }
  return parseFree(lines);
}

module.exports = { parseUsecase };
