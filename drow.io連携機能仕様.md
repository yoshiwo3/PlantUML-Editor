# Flow.io (draw.io/diagrams.net) 連携機能仕様

## 📋 概要

日本語→PlantUML変換アプリから、Flow.io（draw.io/diagrams.net）形式でも出力できるようにする機能拡張です。

## 🎯 なぜFlow.io対応が必要か？

### ビジネス要件
1. **編集可能性**: PlantUMLは再編集が難しいが、Flow.ioなら後から調整可能
2. **共有性**: 多くの企業でdraw.ioが標準ツールとして採用されている
3. **統合性**: Confluence、GitHub、Google Driveなどと直接統合
4. **オフライン**: デスクトップ版でオフライン編集可能

### ユーザーニーズ
```
田中（EC運用）: 「上司がdraw.ioしか使えないので、変換したい」
佐藤（IT営業）: 「顧客がConfluenceを使っているので、draw.io形式が必要」
山田（PM）: 「チームメンバーが後から編集できる形式が欲しい」
```

---

## 🔄 変換アプローチ

### 方式1: PlantUML → mxGraph XML（推奨）

```javascript
class PlantUMLToDrawIO {
  constructor() {
    this.mxGraphNS = 'http://www.w3.org/1999/xhtml';
  }

  async convert(plantumlText, diagram) {
    // 1. PlantUMLをパース
    const ast = this.parsePlantUML(plantumlText);
    
    // 2. 中間表現に変換
    const intermediate = this.toIntermediate(ast);
    
    // 3. mxGraph XMLを生成
    const mxGraph = this.generateMxGraph(intermediate);
    
    // 4. draw.io形式にエンコード
    return this.encodeDiagram(mxGraph);
  }

  generateMxGraph(data) {
    const xml = `
      <mxfile host="app.diagrams.net" version="21.0.0">
        <diagram name="Page-1">
          <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10">
            <root>
              <mxCell id="0"/>
              <mxCell id="1" parent="0"/>
              ${this.generateCells(data)}
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `;
    return xml;
  }
}
```

### 方式2: SVG → draw.io（簡易版）

```javascript
async function svgToDrawIO(svgContent) {
  // draw.ioはSVGをそのまま画像として取り込める
  const encodedSVG = btoa(unescape(encodeURIComponent(svgContent)));
  const drawioUrl = `https://app.diagrams.net/#Uhttps%3A%2F%2Fdata%3Aimage%2Fsvg%2Bxml%3Bbase64%2C${encodedSVG}`;
  return drawioUrl;
}
```

---

## 📊 図種別変換マッピング

### シーケンス図
| PlantUML要素 | draw.io要素 | 属性マッピング |
|-------------|------------|--------------|
| participant | Rectangle | style="rounded=1" |
| -> | Arrow | style="endArrow=classic" |
| note | Note | style="shape=note" |
| alt/opt | Container | style="dashed=1" |

### 活動図（フローチャート）
| PlantUML要素 | draw.io要素 | 属性マッピング |
|-------------|------------|--------------|
| start | Ellipse | style="ellipse;fillColor=#000" |
| :action; | Rectangle | style="rounded=1" |
| if/then | Diamond | style="rhombus" |
| end | Ellipse | style="ellipse;fillColor=#000" |

### クラス図
| PlantUML要素 | draw.io要素 | 属性マッピング |
|-------------|------------|--------------|
| class | UML Class | style="swimlane" |
| --> | Arrow | style="endArrow=block" |
| ..> | Dashed Arrow | style="dashed=1;endArrow=open" |
| o-- | Composition | style="endArrow=diamond" |

### ガント図
```javascript
// ガント図は特殊なので、HTMLテーブルとして生成
function ganttToDrawIO(tasks) {
  const table = {
    type: 'table',
    rows: tasks.map(task => ({
      cells: [
        task.name,
        task.start,
        task.end,
        createProgressBar(task.progress)
      ]
    }))
  };
  return generateTableXML(table);
}
```

---

## 🛠️ 実装詳細

### フロントエンド実装

```typescript
interface ExportOptions {
  format: 'plantuml' | 'drawio' | 'svg' | 'png';
  includeSource?: boolean;
  editableText?: boolean;
  preserveLayout?: boolean;
}

class DiagramExporter {
  async export(
    inputText: string,
    diagramType: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    
    if (options.format === 'drawio') {
      // PlantUML生成をスキップして直接draw.io形式に
      return await this.exportToDrawIO(inputText, diagramType, options);
    }
    
    // 既存のPlantUML処理
    return await this.exportToPlantUML(inputText, diagramType);
  }

  private async exportToDrawIO(
    inputText: string,
    diagramType: string,
    options: ExportOptions
  ): Promise<DrawIOResult> {
    
    // 1. 日本語テキストをパース
    const parsed = this.parseJapanese(inputText);
    
    // 2. 図種に応じた変換
    let drawioXML: string;
    switch (diagramType) {
      case 'sequence':
        drawioXML = this.createSequenceDiagram(parsed);
        break;
      case 'activity':
        drawioXML = this.createFlowchart(parsed);
        break;
      case 'class':
        drawioXML = this.createClassDiagram(parsed);
        break;
      case 'gantt':
        drawioXML = this.createGanttChart(parsed);
        break;
      default:
        // フォールバック: PlantUML経由
        const plantuml = await this.toPlantUML(parsed);
        drawioXML = await this.plantumlToDrawIO(plantuml);
    }
    
    return {
      xml: drawioXML,
      url: this.generateDrawIOUrl(drawioXML),
      editLink: this.generateEditLink(drawioXML)
    };
  }
}
```

### UI追加要素

```html
<!-- 出力オプションに追加 -->
<div class="export-options">
  <button id="btnExportDrawIO" class="btn-primary">
    <svg><!-- draw.io icon --></svg>
    draw.ioで開く
  </button>
  
  <div class="dropdown">
    <button>エクスポート ▼</button>
    <ul>
      <li data-format="plantuml">PlantUMLコード</li>
      <li data-format="drawio">draw.io XML</li>
      <li data-format="drawio-link">draw.ioで編集</li>
      <li data-format="svg">SVG画像</li>
      <li data-format="png">PNG画像</li>
    </ul>
  </div>
</div>
```

---

## 🔗 統合パターン

### 1. ダイレクトオープン
```javascript
function openInDrawIO() {
  const xml = generateDrawIOXML();
  const encoded = encodeURIComponent(xml);
  const url = `https://app.diagrams.net/?mode=device#R${encoded}`;
  window.open(url, '_blank');
}
```

### 2. ファイルダウンロード
```javascript
function downloadDrawIOFile() {
  const xml = generateDrawIOXML();
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram.drawio';
  a.click();
}
```

### 3. 埋め込みリンク
```javascript
function generateEmbedLink() {
  const xml = generateDrawIOXML();
  const compressed = pako.deflate(xml, { to: 'string' });
  const base64 = btoa(compressed);
  return `https://viewer.diagrams.net/?highlight=0000ff&edit=_blank&layers=1&nav=1#${base64}`;
}
```

---

## 📋 変換品質保証

### テストケース

```javascript
describe('PlantUML to draw.io Converter', () => {
  it('シーケンス図の基本要素を正しく変換', () => {
    const input = `
      顧客がECに見積依頼を送る
      ECが顧客に見積結果を通知
    `;
    const drawio = converter.convert(input, 'sequence');
    
    expect(drawio).toContain('shape=umlActor'); // 顧客
    expect(drawio).toContain('shape=rectangle'); // EC
    expect(drawio).toContain('endArrow=classic'); // メッセージ
  });
  
  it('未確定要素を点線で表現', () => {
    const input = 'ECが与信チェック？';
    const drawio = converter.convert(input, 'sequence');
    
    expect(drawio).toContain('dashed=1');
  });
  
  it('A/B案を並列レーンで表現', () => {
    const input = `
      案A: 自動承認
      案B: 手動確認
    `;
    const drawio = converter.convert(input, 'activity');
    
    expect(drawio).toContain('swimlane');
    expect(drawio).toContain('fillColor=#E1F5FE'); // 案A
    expect(drawio).toContain('fillColor=#F3E5F5'); // 案B
  });
});
```

---

## 🎨 スタイル設定

```javascript
const DRAWIO_STYLES = {
  // 田中さん（EC運用）向け: シンプル
  simple: {
    fontFamily: 'メイリオ',
    fontSize: 12,
    fillColor: '#ffffff',
    strokeColor: '#000000'
  },
  
  // 佐藤さん（IT営業）向け: プロフェッショナル
  professional: {
    fontFamily: 'Arial',
    fontSize: 11,
    fillColor: '#f5f5f5',
    strokeColor: '#666666',
    shadow: true
  },
  
  // 山田さん（PM）向け: 詳細
  detailed: {
    fontFamily: 'Courier New',
    fontSize: 10,
    showGrid: true,
    snapToGrid: true
  }
};
```

---

## 📊 パフォーマンス目標

| 処理 | 目標時間 | 備考 |
|------|---------|------|
| 変換処理 | < 500ms | 100要素まで |
| draw.io起動 | < 2秒 | 新規タブで開く |
| ファイル生成 | < 1秒 | XML形式 |

---

## 🚀 段階的実装計画

### Phase 1: 基本変換（1週間）
- [ ] シーケンス図のみ対応
- [ ] 基本的な要素（Actor、Message）のみ
- [ ] draw.ioで開くボタン実装

### Phase 2: 全図種対応（2週間）
- [ ] 活動図、クラス図、ガント図対応
- [ ] 未確定要素の表現
- [ ] A/B案の並列表示

### Phase 3: 高度な機能（1週間）
- [ ] スタイルカスタマイズ
- [ ] レイアウト最適化
- [ ] 双方向変換（draw.io → PlantUML）

---

## 🔍 競合優位性

| 機能 | 本アプリ | PlantUML Web | draw.io |
|------|---------|-------------|---------|
| 日本語入力 | ◎ | △ | × |
| 自動レイアウト | ◎ | ◎ | △ |
| 後編集 | ◎ | × | ◎ |
| 未確定表現 | ◎ | × | △ |
| 変換速度 | ◎ | ○ | - |

---

## 📝 まとめ

Flow.io（draw.io）対応により、以下が実現できます：

1. **編集可能な図の生成** - 後から手直しが可能
2. **チーム共有の改善** - 標準ツールでの共有
3. **既存ワークフローとの統合** - Confluence等との連携

これにより、「日本語で書いて、draw.ioで仕上げる」という新しいワークフローが可能になります。

---

*最終更新: 2025年8月9日*  
*バージョン: 1.0*