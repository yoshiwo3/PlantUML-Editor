# draw.io XML形式 実装ガイド

## 📋 概要

日本語テキストから生成したPlantUML図を、draw.io（diagrams.net）が読み込めるXML形式（.drawio形式）に変換する実装ガイドです。

## 🔧 draw.io XMLフォーマット仕様

### 基本構造

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2025-08-09T12:00:00.000Z" 
        agent="Japanese-to-PlantUML-Converter" 
        etag="unique-tag-here" 
        version="21.0.0" 
        type="device">
  <diagram id="diagram-id" name="ページ1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" 
                  tooltips="1" connect="1" arrows="1" fold="1" page="1" 
                  pageScale="1" pageWidth="827" pageHeight="1169" 
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- ここに図形要素を追加 -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## 📊 日本語テキスト → draw.io XML 変換実装

### 1. シーケンス図の変換

```javascript
class SequenceDiagramToDrawIO {
  constructor() {
    this.cellId = 2; // 0と1は予約済み
    this.participants = new Map();
    this.messages = [];
  }

  convert(japaneseText) {
    const lines = japaneseText.split('\n').filter(line => line.trim());
    const xml = this.createBaseXML();
    
    // パース処理
    lines.forEach((line, index) => {
      this.parseLine(line, index);
    });
    
    // XML生成
    const cells = [
      ...this.createParticipantCells(),
      ...this.createLifelineCells(),
      ...this.createMessageCells()
    ];
    
    return this.insertCellsIntoXML(xml, cells);
  }

  parseLine(line, index) {
    // 例: "顧客がECに見積依頼を送る"
    const match = line.match(/(.+?)が(.+?)に(.+?)を?(.+)/);
    if (match) {
      const [, from, to, action] = match;
      
      // 参加者を登録
      if (!this.participants.has(from)) {
        this.participants.set(from, {
          id: `actor_${this.cellId++}`,
          x: this.participants.size * 150 + 50,
          y: 30
        });
      }
      if (!this.participants.has(to)) {
        this.participants.set(to, {
          id: `actor_${this.cellId++}`,
          x: this.participants.size * 150 + 50,
          y: 30
        });
      }
      
      // メッセージを記録
      this.messages.push({
        from: from,
        to: to,
        label: action,
        y: 100 + index * 60,
        isUncertain: line.includes('？')
      });
    }
  }

  createParticipantCells() {
    const cells = [];
    
    this.participants.forEach((participant, name) => {
      // アクター/システムのボックス
      cells.push(`
        <mxCell id="${participant.id}" value="${name}" 
                style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;" 
                vertex="1" parent="1">
          <mxGeometry x="${participant.x}" y="${participant.y}" width="30" height="60" as="geometry" />
        </mxCell>
      `);
    });
    
    return cells;
  }

  createLifelineCells() {
    const cells = [];
    
    this.participants.forEach((participant) => {
      const lifelineId = `lifeline_${this.cellId++}`;
      cells.push(`
        <mxCell id="${lifelineId}" value="" 
                style="html=1;points=[];perimeter=orthogonalPerimeter;dashed=1;" 
                vertex="1" parent="1">
          <mxGeometry x="${participant.x + 15}" y="${participant.y + 60}" 
                       width="10" height="400" as="geometry" />
        </mxCell>
      `);
    });
    
    return cells;
  }

  createMessageCells() {
    const cells = [];
    
    this.messages.forEach((message) => {
      const fromParticipant = this.participants.get(message.from);
      const toParticipant = this.participants.get(message.to);
      const messageId = `msg_${this.cellId++}`;
      
      // 未確定要素は点線にする
      const style = message.isUncertain 
        ? "html=1;verticalAlign=bottom;endArrow=block;dashed=1;dashPattern=1 3;"
        : "html=1;verticalAlign=bottom;endArrow=block;";
      
      cells.push(`
        <mxCell id="${messageId}" value="${message.label}" 
                style="${style}" 
                edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${fromParticipant.x + 20}" y="${message.y}" as="sourcePoint" />
            <mxPoint x="${toParticipant.x + 20}" y="${message.y}" as="targetPoint" />
          </mxGeometry>
        </mxCell>
      `);
    });
    
    return cells;
  }
}
```

### 2. 活動図（フローチャート）の変換

```javascript
class ActivityDiagramToDrawIO {
  convert(japaneseText) {
    const cells = [];
    let y = 50;
    let cellId = 2;
    
    const lines = japaneseText.split('\n').filter(line => line.trim());
    
    lines.forEach((line) => {
      // 条件分岐: "条件: 承認 -> 次へ / 却下 -> 差戻し"
      if (line.startsWith('条件:')) {
        const condition = this.parseCondition(line);
        cells.push(this.createDiamondCell(cellId++, condition, 400, y));
        y += 100;
      }
      // 通常のアクション
      else {
        cells.push(this.createRectangleCell(cellId++, line, 350, y));
        y += 80;
      }
    });
    
    return this.wrapInXML(cells);
  }

  createRectangleCell(id, text, x, y) {
    return `
      <mxCell id="${id}" value="${text}" 
              style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" 
              vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry" />
      </mxCell>
    `;
  }

  createDiamondCell(id, condition, x, y) {
    return `
      <mxCell id="${id}" value="${condition.text}" 
              style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" 
              vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="100" height="80" as="geometry" />
      </mxCell>
    `;
  }
}
```

### 3. クラス図の変換

```javascript
class ClassDiagramToDrawIO {
  convert(japaneseText) {
    const classes = new Map();
    const relationships = [];
    let cellId = 2;
    
    const lines = japaneseText.split('\n').filter(line => line.trim());
    
    lines.forEach((line) => {
      // 例: "CustomerはOrderを保持"
      const match = line.match(/(.+?)は(.+?)を(.+)/);
      if (match) {
        const [, classA, classB, relationType] = match;
        
        // クラスを登録
        if (!classes.has(classA)) {
          classes.set(classA, {
            id: cellId++,
            x: classes.size * 200 + 50,
            y: 50
          });
        }
        if (!classes.has(classB)) {
          classes.set(classB, {
            id: cellId++,
            x: classes.size * 200 + 50,
            y: 200
          });
        }
        
        // 関係を記録
        relationships.push({
          from: classA,
          to: classB,
          type: this.getRelationType(relationType),
          id: cellId++
        });
      }
    });
    
    return this.generateClassDiagramXML(classes, relationships);
  }

  generateClassDiagramXML(classes, relationships) {
    const cells = [];
    
    // クラスボックス
    classes.forEach((classInfo, className) => {
      cells.push(`
        <mxCell id="${classInfo.id}" value="${className}" 
                style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;" 
                vertex="1" parent="1">
          <mxGeometry x="${classInfo.x}" y="${classInfo.y}" width="160" height="86" as="geometry" />
        </mxCell>
      `);
    });
    
    // 関係線
    relationships.forEach((rel) => {
      const fromClass = classes.get(rel.from);
      const toClass = classes.get(rel.to);
      const style = this.getRelationStyle(rel.type);
      
      cells.push(`
        <mxCell id="${rel.id}" value="" 
                style="${style}" 
                edge="1" parent="1" 
                source="${fromClass.id}" 
                target="${toClass.id}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      `);
    });
    
    return this.wrapInXML(cells);
  }

  getRelationType(japanese) {
    const typeMap = {
      '保持': 'composition',
      '参照': 'association',
      '作成': 'dependency',
      '継承': 'inheritance',
      '実装': 'realization'
    };
    return typeMap[japanese] || 'association';
  }

  getRelationStyle(type) {
    const styleMap = {
      'composition': 'endArrow=diamond;endFill=1;html=1;',
      'association': 'endArrow=open;html=1;',
      'dependency': 'endArrow=open;dashed=1;html=1;',
      'inheritance': 'endArrow=block;endFill=0;html=1;',
      'realization': 'endArrow=block;dashed=1;endFill=0;html=1;'
    };
    return styleMap[type] || 'endArrow=open;html=1;';
  }
}
```

### 4. ガント図の変換

```javascript
class GanttChartToDrawIO {
  convert(japaneseText) {
    const tasks = [];
    const lines = japaneseText.split('\n').filter(line => line.trim());
    
    lines.forEach((line) => {
      // 例: "[営業] 提案準備 2025-01-10〜2025-01-15"
      const match = line.match(/\[(.+?)\]\s*(.+?)\s*(\d{4}-\d{2}-\d{2})[〜~](\d{4}-\d{2}-\d{2})/);
      if (match) {
        const [, department, taskName, startDate, endDate] = match;
        tasks.push({ department, taskName, startDate, endDate });
      }
    });
    
    return this.generateGanttXML(tasks);
  }

  generateGanttXML(tasks) {
    // ガント図はテーブル形式で表現
    const tableXML = `
      <mxCell id="gantt_table" value="" 
              style="shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;" 
              vertex="1" parent="1">
        <mxGeometry x="50" y="50" width="700" height="${30 + tasks.length * 30}" as="geometry" />
      </mxCell>
    `;
    
    const headerRow = `
      <mxCell id="gantt_header" value="部門|タスク|開始日|終了日|進捗" 
              style="shape=partialRectangle;collapsible=0;dropTarget=0;pointerEvents=0;fillColor=#0066CC;top=0;left=0;bottom=0;right=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" 
              vertex="1" parent="gantt_table">
        <mxGeometry y="0" width="700" height="30" as="geometry" />
      </mxCell>
    `;
    
    const taskRows = tasks.map((task, index) => `
      <mxCell id="task_${index}" value="${task.department}|${task.taskName}|${task.startDate}|${task.endDate}|━━━━━" 
              style="shape=partialRectangle;collapsible=0;dropTarget=0;pointerEvents=0;fillColor=none;top=0;left=0;bottom=0;right=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" 
              vertex="1" parent="gantt_table">
        <mxGeometry y="${30 + index * 30}" width="700" height="30" as="geometry" />
      </mxCell>
    `).join('');
    
    return this.wrapInXML([tableXML, headerRow, ...taskRows]);
  }
}
```

## 🔄 統合クラス

```javascript
class JapaneseToDrawIOConverter {
  constructor() {
    this.converters = {
      sequence: new SequenceDiagramToDrawIO(),
      activity: new ActivityDiagramToDrawIO(),
      class: new ClassDiagramToDrawIO(),
      gantt: new GanttChartToDrawIO()
    };
  }

  convert(japaneseText, diagramType = 'auto') {
    // 自動判定
    if (diagramType === 'auto') {
      diagramType = this.detectDiagramType(japaneseText);
    }
    
    const converter = this.converters[diagramType];
    if (!converter) {
      throw new Error(`Unsupported diagram type: ${diagramType}`);
    }
    
    return converter.convert(japaneseText);
  }

  detectDiagramType(text) {
    if (text.includes('が') && text.includes('に')) return 'sequence';
    if (text.includes('条件:')) return 'activity';
    if (text.includes('を保持') || text.includes('を参照')) return 'class';
    if (text.match(/\d{4}-\d{2}-\d{2}/)) return 'gantt';
    return 'sequence'; // デフォルト
  }

  // XMLをBase64エンコードしてURLを生成
  generateDrawIOUrl(xml) {
    const compressed = pako.deflate(xml, { to: 'string' });
    const base64 = btoa(compressed);
    return `https://app.diagrams.net/?lightbox=1&highlight=0000ff&edit=1&layers=1&nav=1&title=diagram.drawio#R${base64}`;
  }

  // ファイルとして保存
  saveAsDrawIOFile(xml, filename = 'diagram.drawio') {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## 🎯 使用例

```javascript
// 使用例
const converter = new JapaneseToDrawIOConverter();

// 日本語テキスト
const japaneseText = `
顧客がECに見積依頼を送る
ECが顧客に見積結果を通知
顧客がECに注文確定を送る
ECが契約に作成を依頼？
契約がECに完了を通知
`;

// XML生成
const xml = converter.convert(japaneseText, 'sequence');

// draw.ioで開く
const url = converter.generateDrawIOUrl(xml);
window.open(url, '_blank');

// またはファイルとして保存
converter.saveAsDrawIOFile(xml, '見積フロー.drawio');
```

## 📊 A/B案の並列表現

```javascript
class ABVariantHandler {
  handleVariants(japaneseText) {
    const variants = { A: [], B: [] };
    let currentVariant = null;
    
    japaneseText.split('\n').forEach(line => {
      if (line.startsWith('案A:')) {
        currentVariant = 'A';
        variants.A.push(line.substring(4));
      } else if (line.startsWith('案B:')) {
        currentVariant = 'B';
        variants.B.push(line.substring(4));
      } else if (currentVariant) {
        variants[currentVariant].push(line);
      }
    });
    
    return this.createSwimlanesXML(variants);
  }

  createSwimlanesXML(variants) {
    // スイムレーンとして表現
    return `
      <mxCell id="pool" value="A/B案比較" style="swimlane;horizontal=0;childLayout=stackLayout;resizeParent=1;resizeParentMax=0;horizontal=1;startSize=20;horizontalStack=0;" vertex="1" parent="1">
        <mxGeometry x="50" y="50" width="600" height="400" as="geometry" />
      </mxCell>
      <mxCell id="lane_a" value="案A" style="swimlane;horizontal=0;fillColor=#E1F5FE;" vertex="1" parent="pool">
        <mxGeometry x="0" y="20" width="600" height="190" as="geometry" />
      </mxCell>
      <mxCell id="lane_b" value="案B" style="swimlane;horizontal=0;fillColor=#F3E5F5;" vertex="1" parent="pool">
        <mxGeometry x="0" y="210" width="600" height="190" as="geometry" />
      </mxCell>
    `;
  }
}
```

## 🔧 エクスポート機能のUI実装

```html
<!-- HTMLボタン -->
<div class="export-section">
  <button id="exportDrawIO" class="btn btn-primary">
    <svg width="16" height="16"><!-- draw.io icon --></svg>
    draw.ioで開く
  </button>
  
  <button id="downloadDrawIO" class="btn btn-secondary">
    <svg width="16" height="16"><!-- download icon --></svg>
    .drawioファイルをダウンロード
  </button>
</div>

<script>
document.getElementById('exportDrawIO').addEventListener('click', () => {
  const japaneseText = document.getElementById('input').value;
  const diagramType = document.getElementById('diagramType').value;
  
  const converter = new JapaneseToDrawIOConverter();
  const xml = converter.convert(japaneseText, diagramType);
  const url = converter.generateDrawIOUrl(xml);
  
  window.open(url, '_blank');
});

document.getElementById('downloadDrawIO').addEventListener('click', () => {
  const japaneseText = document.getElementById('input').value;
  const diagramType = document.getElementById('diagramType').value;
  
  const converter = new JapaneseToDrawIOConverter();
  const xml = converter.convert(japaneseText, diagramType);
  
  converter.saveAsDrawIOFile(xml, `diagram_${Date.now()}.drawio`);
});
</script>
```

## ✅ テスト項目

```javascript
describe('Draw.io XML変換テスト', () => {
  const converter = new JapaneseToDrawIOConverter();
  
  test('シーケンス図のXML生成', () => {
    const input = '顧客がECに見積を送る';
    const xml = converter.convert(input, 'sequence');
    
    expect(xml).toContain('<mxfile');
    expect(xml).toContain('shape=umlActor');
    expect(xml).toContain('endArrow=block');
  });
  
  test('未確定要素が点線になる', () => {
    const input = 'ECが承認？';
    const xml = converter.convert(input, 'sequence');
    
    expect(xml).toContain('dashed=1');
  });
  
  test('A/B案が並列レーンになる', () => {
    const input = '案A: 自動承認\n案B: 手動承認';
    const handler = new ABVariantHandler();
    const xml = handler.handleVariants(input);
    
    expect(xml).toContain('swimlane');
    expect(xml).toContain('案A');
    expect(xml).toContain('案B');
  });
});
```

## 📝 まとめ

このXML形式実装により：

1. **日本語テキスト → draw.io XML** の直接変換が可能
2. **編集可能な図形**として出力（単なる画像ではない）
3. **未確定要素**や**A/B案**も適切に表現
4. **ワンクリック**でdraw.ioで開ける

これで、「日本語で下書き → draw.ioで仕上げ」のワークフローが実現します。

---

*最終更新: 2025年8月9日*  
*バージョン: 1.0*