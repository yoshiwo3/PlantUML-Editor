function parseSemi(lines) {
  // Examples:
  // クラス: User { id:int; name:string }
  // 関連: User -> Order : places
  const classes = [];
  const relations = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('クラス:')) {
      const body = line.substring('クラス:'.length).trim();
      const m = body.match(/([^\{]+)\{([^}]*)\}/);
      if (m) {
        const name = m[1].trim();
        const props = m[2].split(/;|\n/).map(s => s.trim()).filter(Boolean);
        classes.push({ name, props });
      } else {
        classes.push({ name: body, props: [] });
      }
    } else if (line.startsWith('関連:')) {
      const body = line.substring('関連:'.length).trim();
      const m = body.match(/([^\-]+)(--\||--|<-\||<--|->|-->)([^:]+):?\s*(.*)/);
      if (m) {
        relations.push({ from: m[1].trim(), arrow: m[2], to: m[3].trim(), label: m[4] || '' });
      }
    }
  }
  const out = ['@startuml'];
  classes.forEach(c => {
    out.push(`class ${c.name} {`);
    c.props.forEach(p => out.push(`  ${p}`));
    out.push('}');
  });
  relations.forEach(r => out.push(`${r.from} ${r.arrow} ${r.to} : ${r.label}`));
  out.push('@enduml');
  return out.join('\n');
}

function parseFree(lines) {
  // naive: lines like "UserはOrderを作成" => User --> Order : 作成
  const out = ['@startuml'];
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/([\p{L}\p{N}_]+)は([\p{L}\p{N}_]+)を(.+?)(する|作成|参照|保持|継承)/u);
    if (m) {
      const a = m[1];
      const b = m[2];
      const label = m[3];
      out.push(`class ${a}`);
      out.push(`class ${b}`);
      out.push(`${a} --> ${b} : ${label}`);
    }
    const inh = line.match(/([\p{L}\p{N}_]+)は([\p{L}\p{N}_]+)を継承/u);
    if (inh) {
      out.push(`class ${inh[1]}`);
      out.push(`class ${inh[2]}`);
      out.push(`${inh[1]} --|> ${inh[2]}`);
    }
  }
  out.push('@enduml');
  return out.join('\n');
}

function parseClass(input, mode = 'auto') {
  const lines = input.split(/\r?\n/);
  if (mode === 'semi' || lines.some(l => l.includes('クラス:') || l.includes('関連:'))) {
    return parseSemi(lines);
  }
  return parseFree(lines);
}

module.exports = { parseClass };
