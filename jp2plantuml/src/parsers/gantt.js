function toHalfWidth(str) {
  return str.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
            .replace(/[／－―—–]/g, '-')
            .replace(/：/g, ':');
}

function parseDateStr(s) {
  // Accept YYYY-MM-DD, YYYY/MM/DD, allow full-width digits and separators
  const t = toHalfWidth(s.trim());
  const m = t.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!m) return null;
  const y = m[1];
  const mm = String(m[2]).padStart(2, '0');
  const dd = String(m[3]).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function parseSemiStructured(lines) {
  // Expected example:
  // プロジェクト名: プロジェクトα
  // 開始日: 2025-08-10
  // タスク: 仕様策定; 2025-08-10 〜 2025-08-20; 担当: 田中; 進捗: 50%; 依存: -
  const project = { name: 'プロジェクト', start: null, tasks: [] };
  const warnings = [];
  let currentDepartment = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('部門:')) {
      currentDepartment = line.split(':')[1].trim() || null;
      continue;
    }
    if (line.startsWith('プロジェクト名:')) {
      project.name = line.split(':')[1].trim();
      continue;
    }
    if (line.startsWith('開始日:')) {
      const d = parseDateStr(line.split(':')[1]);
      if (d) project.start = d;
      else warnings.push('開始日の日付形式を解釈できませんでした');
      continue;
    }
    if (line.startsWith('タスク:')) {
      const rest = line.substring('タスク:'.length).trim();
      // name; start 〜 end; 担当: X; 進捗: nn%; 依存: name
      const parts = rest.split(';').map(s => s.trim());
      const name = parts[0] || 'タスク';
      let start = null, end = null, owner = null, progress = null, dep = null, dept = currentDepartment;
      for (const p of parts.slice(1)) {
        if (p.includes('〜') || p.includes('~') || p.includes('-')) {
          const seg = p.replace('~', '〜');
          const [s, e] = seg.split('〜').map(s => s.trim());
          start = parseDateStr(s) || start;
          end = parseDateStr(e) || end;
        } else if (p.startsWith('担当:')) {
          owner = p.split(':')[1].trim();
        } else if (p.startsWith('進捗:')) {
          const m = p.match(/(\d+)%/);
          progress = m ? parseInt(m[1], 10) : null;
        } else if (p.startsWith('依存:')) {
          dep = p.split(':')[1].trim();
          if (dep === '-' || dep === 'なし') dep = null;
        } else if (p.startsWith('部門:')) {
          dept = p.split(':')[1].trim() || dept;
        }
      }
      project.tasks.push({ name, start, end, owner, progress, dep, dept });
    }
  }
  return { project, warnings };
}

function generateGantt(project, { compat = 'latest' } = {}) {
  const lines = ['@startgantt'];
  if (project.start) {
    lines.push(`Project starts ${project.start}`);
  }
  const isLegacy = compat && compat !== 'latest';
  const tasks = project.tasks.slice();
  let currentDept = null;
  const idMap = new Map();
  tasks.forEach((t, idx) => {
    const nextDept = t.dept || null;
    if (!isLegacy && nextDept && nextDept !== currentDept) {
      lines.push(`-- ${nextDept} --`);
      currentDept = nextDept;
    }
    const id = `T${idx + 1}`;
    idMap.set(t.name, id);
    const taskLabel = `[${t.name}]`;
    if (t.start && t.end) {
      const d = daysBetween(t.start, t.end);
      lines.push(isLegacy
        ? `${taskLabel} starts ${t.start} and lasts ${d} days`
        : `${taskLabel} as ${id} starts ${t.start} and lasts ${d} days`);
    } else if (t.start) {
      lines.push(isLegacy
        ? `${taskLabel} starts ${t.start} and lasts 1 days`
        : `${taskLabel} as ${id} starts ${t.start} and lasts 1 days`);
    } else if (t.end) {
      lines.push(isLegacy
        ? `${taskLabel} ends ${t.end}`
        : `${taskLabel} as ${id} ends ${t.end}`);
    } else {
      lines.push(isLegacy
        ? `${taskLabel} lasts 1 days`
        : `${taskLabel} as ${id} lasts 1 days`);
    }
    if (!isLegacy && t.progress != null) {
      lines.push(`${id} is ${t.progress}% completed`);
    }
    if (!isLegacy && t.owner) {
      lines.push(`note right of ${id}: 担当 ${t.owner}`);
    }
  });
  if (!isLegacy) {
    project.tasks.forEach(t => {
      if (t.dep && idMap.has(t.dep) && idMap.has(t.name)) {
        lines.push(`${idMap.get(t.dep)} -> ${idMap.get(t.name)}`);
      }
    });
  }
  lines.push('@endgantt');
  return lines.join('\n');
}

function parseGantt(input, mode = 'auto', { compat = 'latest' } = {}) {
  const rawLines = input.split(/\n/);
  let projectObj;
  const warnings = [];
  if (mode === 'semi' || rawLines.some(l => l.trim().startsWith('タスク:'))) {
    const res = parseSemiStructured(rawLines);
    projectObj = res.project;
    warnings.push(...res.warnings);
  } else {
    // naive free-form: extract dates and task-like nouns per line
    const tasks = [];
    for (const line0 of rawLines) {
      const line = line0.trim();
      if (!line) continue;
      const nameMatch = line.match(/^[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}A-Za-z0-9_（）()・\-\s]{2,}/u);
      if (!nameMatch) continue;
      const name = nameMatch[0].trim();
      const m = line.replace('~', '〜').match(/(\d{4}[\/-]?\d{1,2}[\/-]?\d{1,2}).*?[〜\-].*?(\d{4}[\/-]?\d{1,2}[\/-]?\d{1,2})/);
      let start = null, end = null;
      if (m) {
        start = parseDateStr(m[1]);
        end = parseDateStr(m[2]);
      }
      tasks.push({ name, start, end });
    }
    projectObj = { name: 'プロジェクト', start: null, tasks };
    if (tasks.length === 0) warnings.push('タスク行を検出できませんでした');
  }
  if (compat && compat !== 'latest') {
    const hasDeps = projectObj.tasks.some(t => t.dep);
    const hasProgress = projectObj.tasks.some(t => t.progress != null);
    const hasOwner = projectObj.tasks.some(t => t.owner);
    const hasDept = projectObj.tasks.some(t => t.dept);
    if (hasDeps) warnings.push('互換モードでは依存矢印を出力しません');
    if (hasProgress) warnings.push('互換モードでは進捗表示を出力しません');
    if (hasOwner) warnings.push('互換モードでは担当者ノートを出力しません');
    if (hasDept) warnings.push('互換モードでは部門セクションの見出しを出力しません');
  }
  const plantuml = generateGantt(projectObj, { compat });
  return { plantuml, warnings, meta: { project: projectObj, compat } };
}

module.exports = { parseGantt };
