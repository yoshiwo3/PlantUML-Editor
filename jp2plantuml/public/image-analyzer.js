/**
 * 画像解析機能
 * アップロードされた画像からOCRとパターン認識を使用してPlantUMLコードを生成
 */

class ImageAnalyzer {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Tesseract.jsの初期化
   */
  async initOCR() {
    if (this.isInitialized) return;
    
    try {
      this.worker = await Tesseract.createWorker('jpn+eng');
      this.isInitialized = true;
    } catch (error) {
      console.error('OCR初期化エラー:', error);
      throw new Error('OCRエンジンの初期化に失敗しました');
    }
  }

  /**
   * 画像からテキストを抽出
   */
  async extractText(imageData, progressCallback) {
    if (!this.isInitialized) {
      await this.initOCR();
    }

    try {
      if (progressCallback) {
        progressCallback('テキスト抽出中...');
      }

      const result = await this.worker.recognize(imageData);
      return result.data;
    } catch (error) {
      console.error('テキスト抽出エラー:', error);
      throw new Error('テキストの抽出に失敗しました');
    }
  }

  /**
   * 画像から図の構造を解析
   */
  async analyzeStructure(imageData, progressCallback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        if (progressCallback) {
          progressCallback('画像構造を解析中...');
        }
        
        // 画像のピクセルデータを取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const structure = this.detectDiagramType(imageData);
        
        resolve(structure);
      };
      
      img.src = imageData;
    });
  }

  /**
   * 図の種類を検出
   */
  detectDiagramType(imageData) {
    // 簡易的なパターン認識
    // 実際にはより高度な画像処理が必要
    const patterns = {
      hasBoxes: false,
      hasArrows: false,
      hasTimeline: false,
      hasLifelines: false,
      hasStates: false,
      hasActors: false
    };

    // エッジ検出や形状認識のシミュレーション
    // 実際の実装では、OpenCV.jsなどを使用することを推奨
    patterns.hasBoxes = true; // 仮の値
    patterns.hasArrows = true; // 仮の値

    // パターンから図の種類を推定
    let diagramType = 'unknown';
    
    if (patterns.hasLifelines) {
      diagramType = 'sequence';
    } else if (patterns.hasTimeline) {
      diagramType = 'gantt';
    } else if (patterns.hasStates) {
      diagramType = 'state';
    } else if (patterns.hasActors) {
      diagramType = 'usecase';
    } else if (patterns.hasBoxes && patterns.hasArrows) {
      diagramType = 'activity';
    }

    return {
      type: diagramType,
      patterns: patterns
    };
  }

  /**
   * OCRと構造解析の結果を組み合わせてPlantUMLコードを生成
   */
  generatePlantUML(ocrData, structure) {
    const lines = ocrData.lines || [];
    const words = ocrData.words || [];
    const diagramType = structure.type;

    // テキストから要素を抽出
    const elements = this.extractElements(lines, words);
    
    // 図の種類に応じてPlantUMLコードを生成
    let plantUml = '';
    
    switch (diagramType) {
      case 'sequence':
        plantUml = this.generateSequenceDiagram(elements);
        break;
      case 'activity':
        plantUml = this.generateActivityDiagram(elements);
        break;
      case 'gantt':
        plantUml = this.generateGanttChart(elements);
        break;
      case 'class':
        plantUml = this.generateClassDiagram(elements);
        break;
      case 'state':
        plantUml = this.generateStateDiagram(elements);
        break;
      case 'usecase':
        plantUml = this.generateUseCaseDiagram(elements);
        break;
      default:
        plantUml = this.generateGenericDiagram(elements);
    }

    return plantUml;
  }

  /**
   * テキストから要素を抽出
   */
  extractElements(lines, words) {
    const elements = {
      titles: [],
      nodes: [],
      connections: [],
      labels: [],
      dates: [],
      actors: []
    };

    // 行ごとに処理
    lines.forEach(line => {
      const text = line.text.trim();
      if (!text) return;

      // 日付パターンの検出
      const datePattern = /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/;
      if (datePattern.test(text)) {
        elements.dates.push(text);
      }

      // 矢印や接続の検出
      if (text.includes('→') || text.includes('->') || text.includes('←') || text.includes('<-')) {
        elements.connections.push(text);
      } else if (text.length > 0) {
        // その他のテキストはノードまたはラベルとして扱う
        if (text.length < 20) {
          elements.nodes.push(text);
        } else {
          elements.labels.push(text);
        }
      }
    });

    // 単語から追加情報を抽出
    words.forEach(word => {
      const text = word.text.trim();
      // アクター名の可能性があるもの（〜者、〜システムなど）
      if (text.endsWith('者') || text.endsWith('システム') || text.endsWith('ユーザー')) {
        elements.actors.push(text);
      }
    });

    return elements;
  }

  /**
   * シーケンス図の生成
   */
  generateSequenceDiagram(elements) {
    let puml = '@startuml\n';
    
    // アクターの追加
    elements.actors.forEach(actor => {
      puml += `participant "${actor}"\n`;
    });
    
    // 接続の追加
    elements.connections.forEach(conn => {
      // 矢印パターンを解析
      const arrowPattern = /(.*?)\s*[→\-><]+\s*(.*)/;
      const match = conn.match(arrowPattern);
      if (match) {
        const from = match[1].trim();
        const to = match[2].trim();
        puml += `"${from}" -> "${to}"\n`;
      }
    });
    
    puml += '@enduml';
    return puml;
  }

  /**
   * アクティビティ図の生成
   */
  generateActivityDiagram(elements) {
    let puml = '@startuml\n';
    puml += 'start\n';
    
    elements.nodes.forEach((node, index) => {
      puml += `:${node};\n`;
      
      // 条件分岐の可能性をチェック
      if (node.includes('判定') || node.includes('確認')) {
        puml += 'if () then (yes)\n';
        puml += '  :次の処理;\n';
        puml += 'else (no)\n';
        puml += '  :別の処理;\n';
        puml += 'endif\n';
      }
    });
    
    puml += 'stop\n';
    puml += '@enduml';
    return puml;
  }

  /**
   * ガントチャートの生成
   */
  generateGanttChart(elements) {
    let puml = '@startgantt\n';
    
    // プロジェクト開始日を設定
    if (elements.dates.length > 0) {
      puml += `Project starts ${elements.dates[0]}\n`;
    }
    
    // タスクの追加
    elements.nodes.forEach((task, index) => {
      const duration = Math.floor(Math.random() * 10 + 1); // 仮の期間
      puml += `[${task}] lasts ${duration} days\n`;
      
      // 依存関係を仮定
      if (index > 0) {
        puml += `[${task}] starts at [${elements.nodes[index - 1]}]'s end\n`;
      }
    });
    
    puml += '@endgantt';
    return puml;
  }

  /**
   * クラス図の生成
   */
  generateClassDiagram(elements) {
    let puml = '@startuml\n';
    
    elements.nodes.forEach(node => {
      // クラスとして扱う
      puml += `class ${node} {\n`;
      puml += '}\n';
    });
    
    // 関連の追加
    if (elements.nodes.length > 1) {
      for (let i = 0; i < elements.nodes.length - 1; i++) {
        puml += `${elements.nodes[i]} -- ${elements.nodes[i + 1]}\n`;
      }
    }
    
    puml += '@enduml';
    return puml;
  }

  /**
   * 状態遷移図の生成
   */
  generateStateDiagram(elements) {
    let puml = '@startuml\n';
    
    // 開始状態
    puml += '[*] --> ';
    
    if (elements.nodes.length > 0) {
      puml += elements.nodes[0] + '\n';
      
      // 状態遷移の追加
      for (let i = 0; i < elements.nodes.length - 1; i++) {
        puml += `${elements.nodes[i]} --> ${elements.nodes[i + 1]}\n`;
      }
      
      // 終了状態
      if (elements.nodes.length > 0) {
        puml += `${elements.nodes[elements.nodes.length - 1]} --> [*]\n`;
      }
    }
    
    puml += '@enduml';
    return puml;
  }

  /**
   * ユースケース図の生成
   */
  generateUseCaseDiagram(elements) {
    let puml = '@startuml\n';
    
    // アクターの追加
    elements.actors.forEach(actor => {
      puml += `actor "${actor}"\n`;
    });
    
    // ユースケースの追加
    elements.nodes.forEach(usecase => {
      puml += `usecase "${usecase}"\n`;
      
      // アクターとの関連付け
      if (elements.actors.length > 0) {
        puml += `"${elements.actors[0]}" --> "${usecase}"\n`;
      }
    });
    
    puml += '@enduml';
    return puml;
  }

  /**
   * 汎用的な図の生成
   */
  generateGenericDiagram(elements) {
    let puml = '@startuml\n';
    
    // ノードベースの図として生成
    elements.nodes.forEach(node => {
      puml += `rectangle "${node}"\n`;
    });
    
    // 接続がある場合は追加
    elements.connections.forEach(conn => {
      puml += `note: ${conn}\n`;
    });
    
    puml += '@enduml';
    return puml;
  }

  /**
   * 画像を解析してPlantUMLコードを生成
   */
  async analyzeImage(imageData, progressCallback) {
    try {
      // OCRでテキスト抽出
      if (progressCallback) {
        progressCallback('OCRでテキストを抽出中...');
      }
      const ocrData = await this.extractText(imageData, progressCallback);
      
      // 画像構造の解析
      if (progressCallback) {
        progressCallback('図の構造を解析中...');
      }
      const structure = await this.analyzeStructure(imageData, progressCallback);
      
      // PlantUMLコード生成
      if (progressCallback) {
        progressCallback('PlantUMLコードを生成中...');
      }
      const plantUml = this.generatePlantUML(ocrData, structure);
      
      // 認識したテキストも返す（デバッグ用）
      const recognizedText = ocrData.text || '';
      
      return {
        plantUml: plantUml,
        diagramType: structure.type,
        recognizedText: recognizedText,
        confidence: ocrData.confidence || 0
      };
    } catch (error) {
      console.error('画像解析エラー:', error);
      throw error;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// グローバルに公開
window.ImageAnalyzer = ImageAnalyzer;