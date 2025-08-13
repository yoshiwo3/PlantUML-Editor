function parseSemi(lines) {
  // Semi-structured examples:
  // 参加者: User, System
  // メッセージ: User -> System: ログイン要求
  // メッセージ: System -> User: 認証結果
  const participants = new Set();
  const messages = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('参加者:') || line.startsWith('アクター:')) {
      const list = line.split(':')[1] || '';
      list.split(',').map(s => s.trim()).filter(Boolean).forEach(p => participants.add(p));
    } else if (line.startsWith('メッセージ:')) {
      const body = line.split(':')[1] || '';
      const m = body.match(/([^\-]+)(--?>|<--)([^:]+):?\s*(.*)/);
      if (m) {
        const from = m[2].startsWith('<') ? m[3].trim() : m[1].trim();
        const to = m[2].startsWith('<') ? m[1].trim() : m[3].trim();
        const label = m[4] || '';
        participants.add(from);
        participants.add(to);
        messages.push({ from, to, label });
      }
    } else {
      // also allow shorthand: A -> B: msg
      const m = line.match(/([^\-]+)(--?>|<--)([^:]+):?\s*(.*)/);
      if (m) {
        const from = m[2].startsWith('<') ? m[3].trim() : m[1].trim();
        const to = m[2].startsWith('<') ? m[1].trim() : m[3].trim();
        const label = m[4] || '';
        participants.add(from);
        participants.add(to);
        messages.push({ from, to, label });
      }
    }
  }
  const out = ['@startuml'];
  participants.forEach(p => out.push(`participant ${p}`));
  messages.forEach(m => out.push(`${m.from} -> ${m.to}: ${m.label}`));
  out.push('@enduml');
  return out.join('\n');
}

function normalizeLine(s) {
  return s
    .replace(/[（）]/g, ch => (ch === '（' ? '(' : ')'))
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFree(lines) {
  // Enhanced extraction for patterns like:
  //  "Xをメールを送信（A）" + "Xをメールを受信（B）" => A -> B : Xをメールで送信
  //  "Yを実行（B）" => B -> B : Yを実行
  const participants = new Set();
  const sends = []; // {idx, actor, content, raw}
  const receives = []; // {idx, actor, content, raw}
  const executes = []; // {idx, actor, content, raw}
  const warnings = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw || !raw.trim()) continue;
    const line = normalizeLine(raw);
    // send: <content>を.*送信（Actor） or 送付/送出
    let m = line.match(/^(.+?)を.*?(?:メール)?(?:で)?送(?:信|付|出|付信)?\s*\(([^)]+)\)$/);
    if (m) {
      sends.push({ idx, actor: m[2].trim(), content: m[1].trim(), raw: line });
      participants.add(m[2].trim());
      continue;
    }
    // receive: <content>を.*受信/受領/取得（Actor）
    m = line.match(/^(.+?)を.*?(受信|受領|取得)\s*\(([^)]+)\)$/);
    if (m) {
      receives.push({ idx, actor: m[3].trim(), content: m[1].trim(), raw: line });
      participants.add(m[3].trim());
      continue;
    }
    // execute/self: <content>を.*実行（Actor）
    m = line.match(/^(.+?)を.*?実行\s*\(([^)]+)\)$/);
    if (m) {
      executes.push({ idx, actor: m[2].trim(), content: m[1].trim(), raw: line });
      participants.add(m[2].trim());
      continue;
    }
    // fallback generic: AがBにXを送る
    m = line.match(/([\p{L}\p{N}_]+)が([\p{L}\p{N}_]+)に(.+?)を?(送る|通知|依頼|要求|返す)/u);
    if (m) {
      const from = m[1].trim();
      const to = m[2].trim();
      const what = m[3].trim();
      sends.push({ idx, actor: from, content: what, raw: line, to });
      participants.add(from); participants.add(to);
    }
  }

  // Pairing send and receive by content (exact match after normalization)
  const messages = []; // will be assembled respecting original order
  const usedReceive = new Set();
  const norm = (t) => t
    .replace(/\s+/g, ' ')
    .replace(/メール\s*(を|で)?/g, 'メール')
    .replace(/結果\s*を?/g, '結果')
    .replace(/タスク\s*を?/g, 'タスク')
    .trim();
  const pairs = []; // {firstIdx, secondIdx, from, to, label}
  for (const s of sends) {
    let paired = false;
    for (let i = 0; i < receives.length; i++) {
      if (usedReceive.has(i)) continue;
      if (norm(receives[i].content) === norm(s.content)) {
        const firstIdx = Math.min(s.idx, receives[i].idx);
        const secondIdx = Math.max(s.idx, receives[i].idx);
        pairs.push({ firstIdx, secondIdx, from: s.actor, to: receives[i].actor, label: `${s.content}をメールで送信` });
        usedReceive.add(i);
        participants.add(s.actor); participants.add(receives[i].actor);
        paired = true;
        break;
      }
    }
    // Fallback: if send has explicit 'to' from fallback regex
    if (!paired && s.to) {
      pairs.push({ firstIdx: s.idx, secondIdx: s.idx, from: s.actor, to: s.to, label: s.content });
    }
    if (!paired && !s.to) {
      // Heuristic: if exactly two participants exist, infer the other as target
      const ps = Array.from(participants);
      const others = ps.filter(p => p !== s.actor);
      if (ps.length === 2 && others.length === 1) {
        pairs.push({ firstIdx: s.idx, secondIdx: s.idx, from: s.actor, to: others[0], label: `${s.content}をメールで送信` });
      } else {
        warnings.push(`受信の相手が見つかりません: ${s.raw}`);
      }
    }
  }
  // Unpaired receives
  receives.forEach((r, idx) => { if (!usedReceive.has(idx)) warnings.push(`送信の相手が見つかりません: ${r.raw}`); });

  // Build output in original line order
  const pairFirstIndexMap = new Map(); // idx -> array of pair messages
  const pairSecondIndexSet = new Set(); // indices to skip
  pairs.forEach(p => {
    if (!pairFirstIndexMap.has(p.firstIdx)) pairFirstIndexMap.set(p.firstIdx, []);
    pairFirstIndexMap.get(p.firstIdx).push(p);
    if (p.secondIdx !== p.firstIdx) pairSecondIndexSet.add(p.secondIdx);
  });
  const execIndexMap = new Map(); // idx -> array of executes
  executes.forEach(e => {
    if (!execIndexMap.has(e.idx)) execIndexMap.set(e.idx, []);
    execIndexMap.get(e.idx).push({ from: e.actor, to: e.actor, label: `${e.content}を実行` });
    participants.add(e.actor);
  });
  for (let i = 0; i < lines.length; i++) {
    if (pairSecondIndexSet.has(i)) continue; // skip the second line of a paired message
    if (pairFirstIndexMap.has(i)) {
      for (const m of pairFirstIndexMap.get(i)) messages.push(m);
    }
    if (execIndexMap.has(i)) {
      for (const m of execIndexMap.get(i)) messages.push(m);
    }
  }

  const out = ['@startuml'];
  Array.from(participants).forEach(p => out.push(`participant ${p}`));
  messages.forEach(m => out.push(`${m.from} -> ${m.to}: ${m.label}`));
  if (participants.size === 0 && messages.length === 0) {
    out.push('participant A'); out.push('participant B'); out.push('A -> B: メッセージ');
  }
  out.push('@enduml');
  return { plantuml: out.join('\n'), warnings, meta: { participants: Array.from(participants), messages } };
}

function parseSequence(input, mode = 'auto') {
  const lines = input.split(/\r?\n/);
  if (mode === 'semi' || lines.some(l => l.includes('参加者:') || l.includes('メッセージ:') || l.includes('->'))) {
    const plantuml = parseSemi(lines);
    return { plantuml, warnings: [], meta: {} };
  }
  return parseFree(lines);
}

module.exports = { parseSequence };
