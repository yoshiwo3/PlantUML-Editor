function parseSemi(lines) {
  // Examples:
  // 開始
  // アクティビティ: ログイン
  // 分岐: 認証OK -> マイページ / 認証NG -> エラー
  // 終了
  const out = ['@startuml', 'start'];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '開始') continue;
    if (line === '終了') {
      out.push('stop');
      continue;
    }
    if (line.startsWith('アクティビティ:')) {
      const name = line.split(':')[1].trim();
      out.push(`: ${name};`);
    } else if (line.startsWith('分岐:')) {
      // 分岐: 条件A -> アクションA / 条件B -> アクションB
      const body = line.split(':')[1] || '';
      const parts = body.split('/').map(s => s.trim());
      if (parts.length >= 1) {
        out.push('if (条件) then (yes)');
        for (const p of parts) {
          const m = p.match(/(.+)->(.+)/);
          if (m) {
            const cond = m[1].trim();
            const act = m[2].trim();
            out.push(`  : ${cond};`);
            out.push(`  : ${act};`);
          }
        }
        out.push('endif');
      }
    }
  }
  if (out[out.length - 1] !== 'stop') out.push('stop');
  out.push('@enduml');
  return out.join('\n');
}

function parseFree(lines) {
  // naive: 行ごとにアクティビティと解釈、開始/終了を拾う
  const out = ['@startuml', 'start'];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes('開始')) continue;
    if (line.includes('終了')) {
      out.push('stop');
      break;
    }
    out.push(`: ${line};`);
  }
  if (out[out.length - 1] !== 'stop') out.push('stop');
  out.push('@enduml');
  return out.join('\n');
}

function parseActivity(input, mode = 'auto') {
  const lines = input.split(/\r?\n/);
  if (mode === 'semi' || lines.some(l => l.includes('アクティビティ:') || l.startsWith('開始') || l.startsWith('終了'))) {
    return parseSemi(lines);
  }
  return parseFree(lines);
}

module.exports = { parseActivity };
