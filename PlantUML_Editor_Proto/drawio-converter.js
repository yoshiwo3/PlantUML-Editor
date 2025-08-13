// draw.io XML変換クラス
class SequenceDiagramToDrawIO {
    constructor() {
        this.cellId = 2; // 0と1は予約済み
        this.participants = new Map();
        this.messages = [];
        this.gridSize = 10;
        this.horizontalSpacing = 150;
        this.verticalSpacing = 60;
        this.startY = 30;
    }

    initialize(actors, actions) {
        this.participants.clear();
        this.messages = [];
        this.cellId = 2;

        // アクターをセット
        actors.forEach((actor, index) => {
            this.participants.set(actor, {
                id: `actor_${this.cellId++}`,
                x: this.snapToGrid(100 + index * this.horizontalSpacing),
                y: this.startY,
                name: actor
            });
        });

        // アクションをメッセージに変換
        actions.forEach((action, index) => {
            this.messages.push({
                from: action.from,
                to: action.to,
                label: action.text + (action.uncertain ? '？' : ''),
                y: 100 + index * this.verticalSpacing,
                isUncertain: action.uncertain,
                isAsync: action.async,
                id: `msg_${this.cellId++}`
            });
        });
    }

    snapToGrid(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    generateXML() {
        const timestamp = new Date().toISOString();
        const cells = [
            ...this.createParticipantCells(),
            ...this.createLifelineCells(),
            ...this.createMessageCells()
        ];

        const cellsContent = cells.join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" 
        modified="${timestamp}" 
        agent="PlantUML-Editor-Proto" 
        etag="${this.generateETag()}" 
        version="24.7.8" 
        type="device">
  <diagram id="${this.generateDiagramId()}" name="Sequence Diagram">
    <mxGraphModel dx="1422" dy="762" 
                  grid="1" gridSize="${this.gridSize}" 
                  guides="1" tooltips="1" 
                  connect="1" arrows="1" 
                  fold="1" page="1" 
                  pageScale="1" 
                  pageWidth="827" 
                  pageHeight="1169" 
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cellsContent}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
    }

    createParticipantCells() {
        const cells = [];
        
        this.participants.forEach((participant) => {
            // アクターの種類を判定
            const isSystem = participant.name.includes('システム') || 
                           participant.name.includes('サイト') || 
                           participant.name.includes('EC') ||
                           participant.name.includes('管理') ||
                           participant.name.includes('サーバー') ||
                           participant.name.includes('API') ||
                           participant.name.includes('サービス');
            const isDatabase = participant.name.includes('DB') || 
                             participant.name.includes('データベース') || 
                             participant.name.includes('ストレージ');
            
            let style = '';
            let width = 30;
            let height = 60;
            
            if (isSystem) {
                // システムは四角形
                style = 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;';
                width = 120;
                height = 60;
            } else if (isDatabase) {
                // データベースはシリンダー
                style = 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f8cecc;strokeColor=#b85450;';
                width = 80;
                height = 80;
            } else {
                // 人物はアクター
                style = 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#dae8fc;strokeColor=#6c8ebf;';
                width = 30;
                height = 60;
            }
            
            cells.push(`        <mxCell id="${participant.id}" value="${participant.name}" 
                style="${style}" 
                vertex="1" parent="1">
          <mxGeometry x="${participant.x}" y="${participant.y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`);
        });
        
        return cells;
    }

    createLifelineCells() {
        const cells = [];
        
        this.participants.forEach((participant) => {
            const lifelineId = `lifeline_${this.cellId++}`;
            const x = participant.x + 15; // アクターの中心
            const y = participant.y + 60;
            
            cells.push(`        <mxCell id="${lifelineId}" value="" 
                style="html=1;points=[];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={&quot;edgeStyle&quot;:&quot;elbowEdgeStyle&quot;,&quot;elbow&quot;:&quot;vertical&quot;,&quot;curved&quot;:0,&quot;rounded&quot;:0};dashed=1;dashPattern=8 8;" 
                vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="10" height="400" as="geometry" />
        </mxCell>`);
        });
        
        return cells;
    }

    createMessageCells() {
        const cells = [];
        
        this.messages.forEach((message) => {
            const fromParticipant = this.participants.get(message.from);
            const toParticipant = this.participants.get(message.to);
            
            if (!fromParticipant || !toParticipant) {
                console.error(`参加者が見つかりません: ${message.from} -> ${message.to}`);
                return;
            }
            
            // メッセージのスタイル設定
            let style = 'html=1;verticalAlign=bottom;labelBackgroundColor=default;';
            
            if (message.isAsync) {
                // 非同期メッセージ（点線矢印）
                style += 'endArrow=open;endFill=0;dashed=1;dashPattern=8 8;';
            } else if (message.isUncertain) {
                // 未確定メッセージ（点線）
                style += 'endArrow=block;dashed=1;dashPattern=1 4;';
            } else {
                // 通常のメッセージ
                style += 'endArrow=block;rounded=0;';
            }
            
            // エッジスタイルを追加
            style += 'edgeStyle=orthogonalEdgeStyle;curved=0;';
            
            const sourceX = fromParticipant.x + 20;
            const targetX = toParticipant.x + 20;
            
            cells.push(`        <mxCell id="${message.id}" value="${message.label}" 
                style="${style}" 
                edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${sourceX}" y="${message.y}" as="sourcePoint" />
            <mxPoint x="${targetX}" y="${message.y}" as="targetPoint" />
            <Array as="points">
              <mxPoint x="${sourceX}" y="${message.y}" />
              <mxPoint x="${targetX}" y="${message.y}" />
            </Array>
          </mxGeometry>
        </mxCell>`);
        });
        
        return cells;
    }

    generateETag() {
        return Math.random().toString(36).substring(2, 15);
    }

    generateDiagramId() {
        return 'diagram_' + Date.now();
    }

    // Base64エンコード（圧縮なし）
    toBase64() {
        const xml = this.generateXML();
        return btoa(unescape(encodeURIComponent(xml)));
    }

    // draw.ioで開くためのURL生成
    generateDrawIOUrl() {
        const encoded = this.toBase64();
        return `https://app.diagrams.net/#R${encoded}`;
    }

    // Pako圧縮版URL（より短いURL）
    generateCompressedUrl() {
        const xml = this.generateXML();
        const utf8 = new TextEncoder().encode(xml);
        const compressed = pako.deflate(utf8, { level: 9 });
        const base64 = btoa(String.fromCharCode.apply(null, compressed));
        return `https://app.diagrams.net/#R${base64}`;
    }

    // ファイルとしてダウンロード
    downloadAsDrawIO(filename = 'sequence_diagram.drawio') {
        const xml = this.generateXML();
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 空のダイアグラム生成
function createEmptyDrawIOXML() {
    const timestamp = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" 
        modified="${timestamp}" 
        agent="PlantUML-Editor-Proto" 
        etag="${Math.random().toString(36).substring(2, 15)}" 
        version="24.7.8" 
        type="device">
  <diagram id="empty_${Date.now()}" name="Empty Diagram">
    <mxGraphModel dx="1422" dy="762" 
                  grid="1" gridSize="10" 
                  guides="1" tooltips="1" 
                  connect="1" arrows="1" 
                  fold="1" page="1" 
                  pageScale="1" 
                  pageWidth="827" 
                  pageHeight="1169" 
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}