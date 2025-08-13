# draw.io XML最適化実装ガイド - 手直し最小化版

## 📋 概要

draw.io（diagrams.net）で取り込んだ際に、**手直しを最小限にする**ためのXML出力実装ガイドです。draw.ioの自動レイアウト、グリッドスナップ、接続ポイント機能を最大限活用します。

## 🎯 draw.ioの重要機能と対応方針

### 1. グリッドとスナップ機能の活用
- **デフォルトグリッド**: 10pt
- **座標は10の倍数**にすることで、自動的にグリッドにスナップ
- **サイズも10の倍数**で統一

### 2. 接続ポイント（Connection Points）の最適化
- **Fixed Connection Points**を明示的に定義
- **Snap to Point**プロパティを有効化
- 各図形に4〜8個の接続ポイントを配置

### 3. 自動レイアウト対応
- **適切な間隔**（垂直60pt、水平120pt）を確保
- **階層構造**を明確にする
- **Swimlane**を活用した自動伸縮

---

## 🔧 最適化されたXML生成実装

### 基本テンプレート（2024年最新版）

```javascript
class OptimizedDrawIOExporter {
  constructor() {
    // draw.ioのデフォルト設定に合わせる
    this.config = {
      gridSize: 10,
      defaultWidth: 120,
      defaultHeight: 60,
      horizontalSpacing: 150,  // グリッドの15倍
      verticalSpacing: 80,     // グリッドの8倍
      pageWidth: 827,
      pageHeight: 1169,
      
      // 接続ポイント設定
      connectionPoints: {
        top: [0.25, 0, 0.5, 0, 0.75, 0],
        right: [1, 0.25, 1, 0.5, 1, 0.75],
        bottom: [0.75, 1, 0.5, 1, 0.25, 1],
        left: [0, 0.75, 0, 0.5, 0, 0.25]
      }
    };
  }

  generateBaseXML() {
    const timestamp = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" 
        modified="${timestamp}" 
        agent="Japanese-to-PlantUML-Converter/2.0" 
        etag="${this.generateETag()}" 
        version="24.7.8" 
        type="device">
  <diagram id="${this.generateDiagramId()}" name="ページ1">
    <mxGraphModel dx="1422" dy="762" 
                  grid="1" gridSize="${this.config.gridSize}" 
                  guides="1" tooltips="1" 
                  connect="1" arrows="1" 
                  fold="1" page="1" 
                  pageScale="1" 
                  pageWidth="${this.config.pageWidth}" 
                  pageHeight="${this.config.pageHeight}" 
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  }

  // グリッドに合わせた座標計算
  snapToGrid(value) {
    return Math.round(value / this.config.gridSize) * this.config.gridSize;
  }
}
```

### シーケンス図の最適化実装

```javascript
class OptimizedSequenceDiagram {
  generateParticipant(name, index, isActor = false) {
    const x = this.snapToGrid(100 + index * this.config.horizontalSpacing);
    const y = this.snapToGrid(30);
    const id = `participant_${index}`;
    
    // アクターか四角形かを判定
    const style = isActor 
      ? 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;'
      : 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;';
    
    // 接続ポイントを明示的に定義
    const points = this.getConnectionPoints(isActor);
    
    return `
      <mxCell id="${id}" value="${name}" 
              style="${style}snapToPoint=1;points=${points};" 
              vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" 
                     width="${isActor ? 30 : this.config.defaultWidth}" 
                     height="${isActor ? 60 : this.config.defaultHeight}" 
                     as="geometry" />
      </mxCell>
    `;
  }

  generateLifeline(participantId, x, y) {
    const lifelineId = `${participantId}_lifeline`;
    const lifelineX = this.snapToGrid(x + 15);
    const lifelineY = this.snapToGrid(y + 60);
    
    return `
      <mxCell id="${lifelineId}" value="" 
              style="html=1;points=[];perimeter=orthogonalPerimeter;dashed=1;dashPattern=8 8;" 
              vertex="1" parent="1">
        <mxGeometry x="${lifelineX}" y="${lifelineY}" 
                     width="10" height="400" 
                     as="geometry" />
      </mxCell>
    `;
  }

  generateMessage(from, to, label, index, options = {}) {
    const messageId = `message_${index}`;
    const y = this.snapToGrid(120 + index * this.config.verticalSpacing);
    
    // メッセージタイプに応じたスタイル
    let style = 'html=1;verticalAlign=bottom;endArrow=block;rounded=0;';
    
    if (options.isUncertain) {
      style += 'dashed=1;dashPattern=1 4;';
    }
    if (options.isReturn) {
      style += 'endArrow=open;endFill=0;dashed=1;';
    }
    if (options.isAsync) {
      style += 'endArrow=open;endFill=0;';
    }
    
    // エッジラベルの配置最適化
    style += 'edgeStyle=orthogonalEdgeStyle;';
    
    return `
      <mxCell id="${messageId}" value="${label}" 
              style="${style}" 
              edge="1" parent="1" 
              source="${from.id}" 
              target="${to.id}">
        <mxGeometry relative="1" as="geometry">
          <mxPoint x="${this.snapToGrid(from.x + 20)}" y="${y}" as="sourcePoint" />
          <mxPoint x="${this.snapToGrid(to.x + 20)}" y="${y}" as="targetPoint" />
          <Array as="points">
            <mxPoint x="${this.snapToGrid(from.x + 60)}" y="${y}" />
            <mxPoint x="${this.snapToGrid(to.x - 20)}" y="${y}" />
          </Array>
        </mxGeometry>
      </mxCell>
    `;
  }

  getConnectionPoints(isActor) {
    // 接続ポイントを8点定義（上下左右と角）
    if (isActor) {
      return '[[0.5,0],[1,0.25],[1,0.5],[1,0.75],[0.5,1],[0,0.75],[0,0.5],[0,0.25]]';
    } else {
      return '[[0.25,0],[0.5,0],[0.75,0],[1,0.25],[1,0.5],[1,0.75],[0.75,1],[0.5,1],[0.25,1],[0,0.75],[0,0.5],[0,0.25]]';
    }
  }
}
```

### 活動図の最適化実装（自動レイアウト対応）

```javascript
class OptimizedActivityDiagram {
  generateFlowchart(activities) {
    const cells = [];
    let currentY = 50;
    const centerX = 400;  // 中央配置
    
    activities.forEach((activity, index) => {
      if (activity.type === 'start') {
        cells.push(this.generateStartNode(centerX, currentY));
      } else if (activity.type === 'action') {
        cells.push(this.generateActionNode(activity.text, centerX, currentY));
      } else if (activity.type === 'decision') {
        cells.push(this.generateDecisionNode(activity, centerX, currentY));
      } else if (activity.type === 'end') {
        cells.push(this.generateEndNode(centerX, currentY));
      }
      
      // 次の要素との接続線
      if (index < activities.length - 1) {
        cells.push(this.generateFlowEdge(
          `node_${index}`, 
          `node_${index + 1}`,
          activity.label || ''
        ));
      }
      
      currentY += this.config.verticalSpacing;
    });
    
    return cells;
  }

  generateActionNode(text, x, y) {
    const width = this.calculateTextWidth(text);
    const height = 60;
    const roundedX = this.snapToGrid(x - width / 2);
    const roundedY = this.snapToGrid(y);
    
    return `
      <mxCell id="action_${this.generateId()}" value="${text}" 
              style="rounded=1;whiteSpace=wrap;html=1;
                     fillColor=#dae8fc;strokeColor=#6c8ebf;
                     fontSize=12;fontFamily=Helvetica;
                     snapToPoint=1;" 
              vertex="1" parent="1">
        <mxGeometry x="${roundedX}" y="${roundedY}" 
                     width="${width}" height="${height}" 
                     as="geometry" />
      </mxCell>
    `;
  }

  generateDecisionNode(decision, x, y) {
    const diamondSize = 100;
    const roundedX = this.snapToGrid(x - diamondSize / 2);
    const roundedY = this.snapToGrid(y);
    
    const decisionCell = `
      <mxCell id="decision_${this.generateId()}" value="${decision.text}" 
              style="rhombus;whiteSpace=wrap;html=1;
                     fillColor=#fff2cc;strokeColor=#d6b656;
                     fontSize=12;fontFamily=Helvetica;
                     snapToPoint=1;" 
              vertex="1" parent="1">
        <mxGeometry x="${roundedX}" y="${roundedY}" 
                     width="${diamondSize}" height="${diamondSize}" 
                     as="geometry" />
      </mxCell>
    `;
    
    // 分岐パスの生成
    const branches = [];
    if (decision.yes) {
      branches.push(this.generateBranchPath(
        `decision_${this.generateId()}`,
        decision.yes,
        'Yes',
        roundedX + diamondSize,
        roundedY + diamondSize / 2
      ));
    }
    if (decision.no) {
      branches.push(this.generateBranchPath(
        `decision_${this.generateId()}`,
        decision.no,
        'No',
        roundedX,
        roundedY + diamondSize / 2
      ));
    }
    
    return [decisionCell, ...branches];
  }

  calculateTextWidth(text) {
    // 日本語文字は約14px、英数字は約8px
    const japaneseChars = (text.match(/[^\x00-\x7F]/g) || []).length;
    const asciiChars = text.length - japaneseChars;
    const estimatedWidth = japaneseChars * 14 + asciiChars * 8 + 20;  // パディング20px
    
    // グリッドサイズの倍数に調整
    return this.snapToGrid(Math.max(estimatedWidth, this.config.defaultWidth));
  }
}
```

### クラス図の最適化実装（UML準拠）

```javascript
class OptimizedClassDiagram {
  generateClass(className, attributes, methods, x, y) {
    const classId = `class_${this.generateId()}`;
    const width = 160;
    const attributeHeight = attributes.length * 26;
    const methodHeight = methods.length * 26;
    const totalHeight = 30 + attributeHeight + methodHeight;  // ヘッダー30px
    
    const roundedX = this.snapToGrid(x);
    const roundedY = this.snapToGrid(y);
    
    // UMLクラス形式（swimlane）
    const classCell = `
      <mxCell id="${classId}" value="${className}" 
              style="swimlane;fontStyle=1;align=center;
                     verticalAlign=top;childLayout=stackLayout;
                     horizontal=1;startSize=30;horizontalStack=0;
                     resizeParent=1;resizeParentMax=0;resizeLast=0;
                     collapsible=1;marginBottom=0;
                     fillColor=#f8cecc;strokeColor=#b85450;
                     swimlaneFillColor=#ffffff;
                     snapToPoint=1;" 
              vertex="1" parent="1">
        <mxGeometry x="${roundedX}" y="${roundedY}" 
                     width="${width}" height="${totalHeight}" 
                     as="geometry">
          <mxRectangle x="${roundedX}" y="${roundedY}" 
                        width="${width}" height="30" 
                        as="alternateBounds" />
        </mxGeometry>
      </mxCell>
    `;
    
    // 属性セクション
    const attributeCells = attributes.map((attr, index) => `
      <mxCell id="${classId}_attr_${index}" 
              value="${attr}" 
              style="text;strokeColor=none;fillColor=none;
                     align=left;verticalAlign=top;spacingLeft=4;
                     spacingRight=4;overflow=hidden;rotatable=0;
                     points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" 
              vertex="1" parent="${classId}">
        <mxGeometry y="${30 + index * 26}" 
                     width="${width}" height="26" 
                     as="geometry" />
      </mxCell>
    `).join('');
    
    // 区切り線
    const divider = `
      <mxCell id="${classId}_divider" value="" 
              style="line;strokeWidth=1;fillColor=none;
                     align=left;verticalAlign=middle;
                     spacingTop=-1;spacingLeft=3;spacingRight=3;
                     rotatable=0;labelPosition=right;
                     points=[];portConstraint=eastwest;" 
              vertex="1" parent="${classId}">
        <mxGeometry y="${30 + attributeHeight}" 
                     width="${width}" height="8" 
                     as="geometry" />
      </mxCell>
    `;
    
    // メソッドセクション
    const methodCells = methods.map((method, index) => `
      <mxCell id="${classId}_method_${index}" 
              value="${method}" 
              style="text;strokeColor=none;fillColor=none;
                     align=left;verticalAlign=top;spacingLeft=4;
                     spacingRight=4;overflow=hidden;rotatable=0;
                     points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" 
              vertex="1" parent="${classId}">
        <mxGeometry y="${38 + attributeHeight + index * 26}" 
                     width="${width}" height="26" 
                     as="geometry" />
      </mxCell>
    `).join('');
    
    return classCell + attributeCells + divider + methodCells;
  }

  generateRelationship(fromClass, toClass, type, label = '') {
    const edgeId = `edge_${this.generateId()}`;
    
    // 関係タイプに応じたスタイル設定
    const styles = {
      'inheritance': 'endArrow=block;endFill=0;html=1;',  // 継承
      'realization': 'endArrow=block;dashed=1;endFill=0;html=1;',  // 実装
      'composition': 'endArrow=diamond;endFill=1;html=1;',  // コンポジション
      'aggregation': 'endArrow=diamond;endFill=0;html=1;',  // 集約
      'association': 'endArrow=open;html=1;',  // 関連
      'dependency': 'endArrow=open;dashed=1;html=1;'  // 依存
    };
    
    const style = styles[type] || styles.association;
    
    // エッジスタイルを正確に設定
    const edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;';
    
    return `
      <mxCell id="${edgeId}" value="${label}" 
              style="${edgeStyle}${style}" 
              edge="1" parent="1" 
              source="${fromClass}" 
              target="${toClass}">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
    `;
  }
}
```

### A/B案の並列表現（Swimlane活用）

```javascript
class OptimizedABVariants {
  generateABComparison(variantA, variantB) {
    const poolId = 'pool_ab';
    const laneAId = 'lane_a';
    const laneBId = 'lane_b';
    
    // メインプール
    const pool = `
      <mxCell id="${poolId}" value="A/B案比較" 
              style="swimlane;horizontal=0;childLayout=stackLayout;
                     resizeParent=1;resizeParentMax=0;
                     horizontal=1;startSize=30;horizontalStack=0;
                     rounded=1;fontSize=14;fontStyle=1;
                     strokeWidth=2;swimlaneFillColor=#ffffff;" 
              vertex="1" parent="1">
        <mxGeometry x="50" y="50" width="700" height="400" 
                     as="geometry" />
      </mxCell>
    `;
    
    // 案Aレーン（青系）
    const laneA = `
      <mxCell id="${laneAId}" value="案A: ${variantA.title}" 
              style="swimlane;horizontal=0;
                     fillColor=#dae8fc;strokeColor=#6c8ebf;
                     startSize=40;fontSize=12;fontStyle=1;
                     swimlaneFillColor=#E1F5FE;" 
              vertex="1" parent="${poolId}">
        <mxGeometry x="30" y="0" width="670" height="195" 
                     as="geometry" />
      </mxCell>
    `;
    
    // 案Bレーン（紫系）
    const laneB = `
      <mxCell id="${laneBId}" value="案B: ${variantB.title}" 
              style="swimlane;horizontal=0;
                     fillColor=#e1d5e7;strokeColor=#9673a6;
                     startSize=40;fontSize=12;fontStyle=1;
                     swimlaneFillColor=#F3E5F5;" 
              vertex="1" parent="${poolId}">
        <mxGeometry x="30" y="195" width="670" height="195" 
                     as="geometry" />
      </mxCell>
    `;
    
    // 各案の内容を配置
    const variantACells = this.generateVariantContent(variantA, laneAId, 50);
    const variantBCells = this.generateVariantContent(variantB, laneBId, 50);
    
    return [pool, laneA, ...variantACells, laneB, ...variantBCells];
  }

  generateVariantContent(variant, parentId, startX) {
    const cells = [];
    let currentX = startX;
    
    variant.steps.forEach((step, index) => {
      const stepId = `${parentId}_step_${index}`;
      const width = 120;
      const height = 60;
      const x = this.snapToGrid(currentX);
      const y = this.snapToGrid(70);  // レーン内の中央配置
      
      cells.push(`
        <mxCell id="${stepId}" value="${step}" 
                style="rounded=1;whiteSpace=wrap;html=1;
                       fontSize=11;fontFamily=Helvetica;
                       fillColor=#ffffff;strokeColor=#666666;" 
                vertex="1" parent="${parentId}">
          <mxGeometry x="${x}" y="${y}" 
                       width="${width}" height="${height}" 
                       as="geometry" />
        </mxCell>
      `);
      
      // 矢印接続
      if (index > 0) {
        const edgeId = `${parentId}_edge_${index}`;
        cells.push(`
          <mxCell id="${edgeId}" value="" 
                  style="endArrow=classic;html=1;rounded=0;" 
                  edge="1" parent="${parentId}" 
                  source="${parentId}_step_${index - 1}" 
                  target="${stepId}">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
        `);
      }
      
      currentX += width + 30;
    });
    
    return cells;
  }
}
```

### ガント図の最適化実装（テーブル形式）

```javascript
class OptimizedGanttChart {
  generateGantt(tasks) {
    const tableId = 'gantt_table';
    const rowHeight = 30;
    const columnWidths = [100, 200, 100, 100, 150, 100];  // 部門、タスク、開始、終了、進捗バー、状態
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    const totalHeight = (tasks.length + 1) * rowHeight;  // +1 for header
    
    // テーブル本体
    const table = `
      <mxCell id="${tableId}" value="" 
              style="shape=table;startSize=0;container=1;
                     collapsible=0;childLayout=tableLayout;
                     fixedRows=1;rowLines=1;fontStyle=0;
                     strokeColor=#666666;fontSize=12;" 
              vertex="1" parent="1">
        <mxGeometry x="50" y="50" 
                     width="${totalWidth}" 
                     height="${totalHeight}" 
                     as="geometry" />
      </mxCell>
    `;
    
    // ヘッダー行
    const headerCells = this.generateHeaderRow(tableId, columnWidths);
    
    // データ行
    const dataCells = tasks.map((task, index) => 
      this.generateDataRow(task, index + 1, tableId, columnWidths, rowHeight)
    ).flat();
    
    return [table, ...headerCells, ...dataCells];
  }

  generateHeaderRow(parentId, widths) {
    const headers = ['部門', 'タスク名', '開始日', '終了日', '進捗', '状態'];
    const cells = [];
    let currentX = 0;
    
    headers.forEach((header, index) => {
      cells.push(`
        <mxCell id="${parentId}_h${index}" value="${header}" 
                style="shape=partialRectangle;html=1;
                       whiteSpace=wrap;connectable=0;
                       fillColor=#0066CC;strokeColor=#006EAF;
                       fontColor=#ffffff;fontStyle=1;
                       align=center;verticalAlign=middle;
                       spacingLeft=4;spacingRight=4;
                       overflow=hidden;rotatable=0;
                       points=[[0,0.5],[1,0.5]];
                       portConstraint=eastwest;top=0;left=0;right=0;bottom=0;" 
                vertex="1" parent="${parentId}">
          <mxGeometry x="${currentX}" y="0" 
                       width="${widths[index]}" height="30" 
                       as="geometry" />
        </mxCell>
      `);
      currentX += widths[index];
    });
    
    return cells;
  }

  generateDataRow(task, rowIndex, parentId, widths, rowHeight) {
    const cells = [];
    let currentX = 0;
    const y = rowIndex * rowHeight;
    
    // 部門
    cells.push(this.generateTableCell(
      `${parentId}_r${rowIndex}c0`,
      task.department,
      parentId,
      currentX,
      y,
      widths[0],
      rowHeight,
      '#f0f0f0'
    ));
    currentX += widths[0];
    
    // タスク名
    cells.push(this.generateTableCell(
      `${parentId}_r${rowIndex}c1`,
      task.name,
      parentId,
      currentX,
      y,
      widths[1],
      rowHeight
    ));
    currentX += widths[1];
    
    // 開始日
    cells.push(this.generateTableCell(
      `${parentId}_r${rowIndex}c2`,
      task.startDate,
      parentId,
      currentX,
      y,
      widths[2],
      rowHeight
    ));
    currentX += widths[2];
    
    // 終了日
    cells.push(this.generateTableCell(
      `${parentId}_r${rowIndex}c3`,
      task.endDate,
      parentId,
      currentX,
      y,
      widths[3],
      rowHeight
    ));
    currentX += widths[3];
    
    // 進捗バー
    cells.push(this.generateProgressBar(
      `${parentId}_r${rowIndex}c4`,
      task.progress || 0,
      parentId,
      currentX,
      y,
      widths[4],
      rowHeight
    ));
    currentX += widths[4];
    
    // 状態
    const statusColor = this.getStatusColor(task.status);
    cells.push(this.generateTableCell(
      `${parentId}_r${rowIndex}c5`,
      task.status || '進行中',
      parentId,
      currentX,
      y,
      widths[5],
      rowHeight,
      statusColor
    ));
    
    return cells;
  }

  generateProgressBar(id, progress, parentId, x, y, width, height) {
    const barWidth = Math.floor((width - 10) * progress / 100);
    
    return `
      <mxCell id="${id}" value="${progress}%" 
              style="shape=partialRectangle;html=1;
                     whiteSpace=wrap;connectable=0;
                     fillColor=#ffffff;strokeColor=#cccccc;
                     align=left;verticalAlign=middle;
                     spacingLeft=4;spacingRight=4;
                     overflow=hidden;rotatable=0;
                     points=[[0,0.5],[1,0.5]];
                     portConstraint=eastwest;" 
              vertex="1" parent="${parentId}">
        <mxGeometry x="${x}" y="${y}" 
                     width="${width}" height="${height}" 
                     as="geometry">
          <mxRectangle x="${x + 5}" y="${y + 10}" 
                        width="${barWidth}" height="10" 
                        as="alternateBounds" />
        </mxGeometry>
      </mxCell>
      <mxCell id="${id}_bar" value="" 
              style="rounded=1;whiteSpace=wrap;html=1;
                     fillColor=#4CAF50;strokeColor=#4CAF50;" 
              vertex="1" parent="${parentId}">
        <mxGeometry x="${x + 5}" y="${y + 10}" 
                     width="${barWidth}" height="10" 
                     as="geometry" />
      </mxCell>
    `;
  }

  getStatusColor(status) {
    const colors = {
      '完了': '#c8e6c9',
      '進行中': '#fff9c4',
      '遅延': '#ffccbc',
      '未着手': '#f5f5f5'
    };
    return colors[status] || '#ffffff';
  }
}
```

## 🎯 統合実装とエクスポート

```javascript
class DrawIOOptimizedExporter {
  constructor() {
    this.sequence = new OptimizedSequenceDiagram();
    this.activity = new OptimizedActivityDiagram();
    this.classD = new OptimizedClassDiagram();
    this.gantt = new OptimizedGanttChart();
    this.abVariant = new OptimizedABVariants();
  }

  export(japaneseText, diagramType = 'auto') {
    // 自動判定ロジック
    if (diagramType === 'auto') {
      diagramType = this.detectType(japaneseText);
    }
    
    // 基本XML生成
    let baseXML = this.generateBaseXML();
    
    // 図種別の処理
    let cells = [];
    switch (diagramType) {
      case 'sequence':
        cells = this.processSequence(japaneseText);
        break;
      case 'activity':
        cells = this.processActivity(japaneseText);
        break;
      case 'class':
        cells = this.processClass(japaneseText);
        break;
      case 'gantt':
        cells = this.processGantt(japaneseText);
        break;
    }
    
    // A/B案の検出と処理
    if (this.hasABVariants(japaneseText)) {
      cells = this.processABVariants(japaneseText);
    }
    
    // XMLに組み込み
    return this.insertCellsIntoXML(baseXML, cells);
  }

  // Base64エンコードしてURLを生成（圧縮なし版）
  generateDrawIOUrl(xml) {
    // draw.ioは非圧縮XMLも受け付ける
    const encoded = btoa(unescape(encodeURIComponent(xml)));
    return `https://app.diagrams.net/#R${encoded}`;
  }

  // 圧縮版URL（より短いURL）
  generateCompressedUrl(xml) {
    const compressed = pako.deflate(xml, { to: 'string' });
    const base64 = btoa(compressed);
    return `https://app.diagrams.net/#R${base64}`;
  }

  // ファイル保存
  downloadDrawIOFile(xml, filename = 'diagram.drawio') {
    const blob = new Blob([xml], { 
      type: 'application/vnd.jgraph.mxfile' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## ✅ 手直し最小化のチェックリスト

### 座標とサイズ
- [ ] すべての座標が10の倍数
- [ ] すべてのサイズが10の倍数
- [ ] 適切な間隔（水平150pt、垂直80pt）

### 接続ポイント
- [ ] snapToPoint=1 を設定
- [ ] points配列で接続ポイントを明示
- [ ] 各図形に最低4つの接続ポイント

### スタイル
- [ ] フォントファミリーをHelveticaに統一
- [ ] フォントサイズを12ptに統一
- [ ] 色は標準パレットから選択

### レイアウト
- [ ] Swimlaneを活用した自動伸縮
- [ ] orthogonalEdgeStyleで直角配線
- [ ] 階層構造の明確化

### メタデータ
- [ ] agent属性でソースを明記
- [ ] modified属性で更新日時
- [ ] version属性でdraw.ioバージョン指定

## 📝 まとめ

この最適化実装により：

1. **グリッドへの自動スナップ**で位置調整不要
2. **接続ポイントの明示**でコネクタが正確に接続
3. **Swimlane活用**で自動レイアウト対応
4. **標準スタイル準拠**で見た目の調整不要
5. **A/B案の並列表示**で比較が容易

draw.ioで開いた際の**手直しがほぼゼロ**になります。

---

*最終更新: 2025年8月9日*  
*バージョン: 2.0*