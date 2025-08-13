/**
 * PlantUML図面注釈機能
 * SVG画像の上にCanvasレイヤーを重ねて、注釈（赤ペン、矢印、テキスト）を追加できる
 */

class AnnotationTool {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.currentTool = 'pen'; // pen, arrow, text, eraser
    this.annotations = [];
    this.currentAnnotation = null;
    this.strokeColor = '#ff0000';
    this.strokeWidth = 3;
    this.fontSize = 16;
    this.fontFamily = 'sans-serif';
    
    this.init();
  }

  init() {
    // 既存のキャンバスがあれば削除
    const existingCanvas = this.container.querySelector('.annotation-canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Canvasを作成
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'annotation-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.zIndex = '10';
    this.canvas.style.cursor = 'crosshair';
    
    // SVGのサイズに合わせてCanvasのサイズを設定
    this.resizeCanvas();
    
    this.container.style.position = 'relative';
    this.container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    
    // イベントリスナーを追加
    this.attachEventListeners();
  }

  resizeCanvas() {
    const svg = this.container.querySelector('svg');
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      
      // SVGの位置に合わせてCanvasの位置を調整
      const offsetX = rect.left - containerRect.left;
      const offsetY = rect.top - containerRect.top;
      this.canvas.style.left = offsetX + 'px';
      this.canvas.style.top = offsetY + 'px';
      
      // リサイズ後に注釈を再描画
      this.redrawAnnotations();
    }
  }

  attachEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // タッチイベント対応
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // ウィンドウリサイズ時の対応
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.startDrawing(x, y);
  }

  handleMouseMove(e) {
    if (!this.isDrawing) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.draw(x, y);
  }

  handleMouseUp(e) {
    if (!this.isDrawing) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.endDrawing(x, y);
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.startDrawing(x, y);
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.draw(x, y);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    
    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.endDrawing(x, y);
  }

  startDrawing(x, y) {
    this.isDrawing = true;
    
    switch (this.currentTool) {
      case 'pen':
        this.currentAnnotation = {
          type: 'pen',
          points: [{x, y}],
          color: this.strokeColor,
          width: this.strokeWidth
        };
        break;
      
      case 'arrow':
        this.currentAnnotation = {
          type: 'arrow',
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          color: this.strokeColor,
          width: this.strokeWidth
        };
        break;
      
      case 'text':
        this.isDrawing = false;
        this.showTextInput(x, y);
        break;
      
      case 'eraser':
        this.eraseAt(x, y);
        break;
    }
  }

  draw(x, y) {
    if (!this.currentAnnotation) return;
    
    switch (this.currentTool) {
      case 'pen':
        this.currentAnnotation.points.push({x, y});
        this.redrawAnnotations();
        this.drawPenAnnotation(this.currentAnnotation);
        break;
      
      case 'arrow':
        this.currentAnnotation.endX = x;
        this.currentAnnotation.endY = y;
        this.redrawAnnotations();
        this.drawArrowAnnotation(this.currentAnnotation);
        break;
      
      case 'eraser':
        this.eraseAt(x, y);
        break;
    }
  }

  endDrawing(x, y) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    if (this.currentAnnotation && this.currentTool !== 'eraser') {
      if (this.currentTool === 'arrow') {
        this.currentAnnotation.endX = x;
        this.currentAnnotation.endY = y;
      }
      
      this.annotations.push(this.currentAnnotation);
      this.currentAnnotation = null;
      this.redrawAnnotations();
    }
  }

  showTextInput(x, y) {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.position = 'absolute';
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    input.style.zIndex = '20';
    input.style.fontSize = this.fontSize + 'px';
    input.style.fontFamily = this.fontFamily;
    input.style.color = this.strokeColor;
    input.style.border = '1px solid ' + this.strokeColor;
    input.style.padding = '2px';
    input.style.background = 'rgba(255, 255, 255, 0.9)';
    
    this.container.appendChild(input);
    input.focus();
    
    const addText = () => {
      const text = input.value.trim();
      if (text) {
        const annotation = {
          type: 'text',
          text: text,
          x: x,
          y: y,
          color: this.strokeColor,
          fontSize: this.fontSize,
          fontFamily: this.fontFamily
        };
        this.annotations.push(annotation);
        this.redrawAnnotations();
      }
      input.remove();
    };
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addText();
      }
    });
    
    input.addEventListener('blur', addText);
  }

  eraseAt(x, y) {
    const eraserRadius = 10;
    
    this.annotations = this.annotations.filter(annotation => {
      switch (annotation.type) {
        case 'pen':
          // ペン描画の場合、近くの点があるか確認
          return !annotation.points.some(point => {
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            return distance < eraserRadius;
          });
        
        case 'arrow':
          // 矢印の線上にあるか確認
          return !this.isPointNearLine(x, y, annotation.startX, annotation.startY, annotation.endX, annotation.endY, eraserRadius);
        
        case 'text':
          // テキストの領域内にあるか確認
          const textWidth = this.ctx.measureText(annotation.text).width;
          const textHeight = annotation.fontSize;
          return !(x >= annotation.x && x <= annotation.x + textWidth && 
                  y >= annotation.y - textHeight && y <= annotation.y);
        
        default:
          return true;
      }
    });
    
    this.redrawAnnotations();
  }

  isPointNearLine(px, py, x1, y1, x2, y2, threshold) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < threshold;
  }

  redrawAnnotations() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.annotations.forEach(annotation => {
      switch (annotation.type) {
        case 'pen':
          this.drawPenAnnotation(annotation);
          break;
        case 'arrow':
          this.drawArrowAnnotation(annotation);
          break;
        case 'text':
          this.drawTextAnnotation(annotation);
          break;
      }
    });
  }

  drawPenAnnotation(annotation) {
    if (annotation.points.length < 2) return;
    
    this.ctx.strokeStyle = annotation.color;
    this.ctx.lineWidth = annotation.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
    
    for (let i = 1; i < annotation.points.length; i++) {
      this.ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
    }
    
    this.ctx.stroke();
  }

  drawArrowAnnotation(annotation) {
    const headlen = 15; // 矢印の頭の長さ
    const angle = Math.atan2(annotation.endY - annotation.startY, annotation.endX - annotation.startX);
    
    this.ctx.strokeStyle = annotation.color;
    this.ctx.lineWidth = annotation.width;
    this.ctx.lineCap = 'round';
    
    // 線を描画
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.startX, annotation.startY);
    this.ctx.lineTo(annotation.endX, annotation.endY);
    this.ctx.stroke();
    
    // 矢印の頭を描画
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.endX, annotation.endY);
    this.ctx.lineTo(annotation.endX - headlen * Math.cos(angle - Math.PI / 6), 
                     annotation.endY - headlen * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(annotation.endX, annotation.endY);
    this.ctx.lineTo(annotation.endX - headlen * Math.cos(angle + Math.PI / 6), 
                     annotation.endY - headlen * Math.sin(angle + Math.PI / 6));
    this.ctx.stroke();
  }

  drawTextAnnotation(annotation) {
    this.ctx.fillStyle = annotation.color;
    this.ctx.font = `${annotation.fontSize}px ${annotation.fontFamily}`;
    this.ctx.fillText(annotation.text, annotation.x, annotation.y);
  }

  // ツール切り替え
  setTool(tool) {
    this.currentTool = tool;
    
    switch (tool) {
      case 'pen':
        this.canvas.style.cursor = 'crosshair';
        break;
      case 'arrow':
        this.canvas.style.cursor = 'crosshair';
        break;
      case 'text':
        this.canvas.style.cursor = 'text';
        break;
      case 'eraser':
        this.canvas.style.cursor = 'grab';
        break;
      default:
        this.canvas.style.cursor = 'default';
    }
  }

  // 色変更
  setColor(color) {
    this.strokeColor = color;
  }

  // 線の太さ変更
  setStrokeWidth(width) {
    this.strokeWidth = width;
  }

  // フォントサイズ変更
  setFontSize(size) {
    this.fontSize = size;
  }

  // 全消去
  clear() {
    this.annotations = [];
    this.redrawAnnotations();
  }

  // 元に戻す
  undo() {
    if (this.annotations.length > 0) {
      this.annotations.pop();
      this.redrawAnnotations();
    }
  }

  // 注釈データを取得
  getAnnotations() {
    return JSON.stringify(this.annotations);
  }

  // 注釈データを復元
  loadAnnotations(data) {
    try {
      this.annotations = JSON.parse(data);
      this.redrawAnnotations();
    } catch (e) {
      console.error('注釈データの読み込みに失敗しました:', e);
    }
  }

  // 注釈付き画像をエクスポート
  exportImage() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    // SVGを画像として描画
    const svg = this.container.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        exportCtx.drawImage(img, 0, 0);
        exportCtx.drawImage(this.canvas, 0, 0);
        
        // ダウンロード
        exportCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'annotated-diagram.png';
          a.click();
          URL.revokeObjectURL(url);
        });
        
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    }
  }

  // 注釈機能の有効/無効切り替え
  toggle(enabled) {
    this.canvas.style.display = enabled ? 'block' : 'none';
    this.canvas.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  // クリーンアップ
  destroy() {
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

// グローバルに公開
window.AnnotationTool = AnnotationTool;