function parseSemi(lines) {
  // Examples:
  // 状態: 初期
  // 遷移: 初期 -> 認証中 : ログイン
  // 遷移: 認証中 -> 完了 : 成功
  // 状態: 完了
  const states = new Set();
  const transitions = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('状態:')) {
      const name = line.split(':')[1].trim();
      states.add(name);
    } else if (line.startsWith('遷移:')) {
      const body = line.split(':')[1] || '';
      const m = body.match(/(.+)->(.+):?\s*(.*)/);
      if (m) {
        const from = m[1].trim();
        const to = m[2].trim();
        const label = (m[3] || '').trim();
        states.add(from);
        states.add(to);
        transitions.push({ from, to, label });
      }
    }
  }
  const out = ['@startuml'];
  states.forEach(s => out.push(`state ${s}`));
  transitions.forEach(t => out.push(`${t.from} --> ${t.to} : ${t.label}`));
  out.push('@enduml');
  return out.join('\n');
}

function parseFree(lines) {
  // naive: "XからYへ遷移(理由)" => X --> Y : 理由
  const out = ['@startuml'];
  const states = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/([\p{L}\p{N}_]+)から([\p{L}\p{N}_]+)へ(?:遷移)?(?:\((.+)\))?/u);
    if (m) {
      const from = m[1];
      const to = m[2];
      const label = (m[3] || '').trim();
      states.add(from);
      states.add(to);
      out.push(`state ${from}`);
      out.push(`state ${to}`);
      out.push(`${from} --> ${to} : ${label}`);
    }
  }
  out.push('@enduml');
  return out.join('\n');
}

function parseState(input, mode = 'auto') {
  const lines = input.split(/\r?\n/);
  if (mode === 'semi' || lines.some(l => l.includes('状態:') || l.includes('遷移:'))) {
    return parseSemi(lines);
  }
  return parseFree(lines);
}

module.exports = { parseState };
