/**
 * japanese-processing.perf.test.js - 日本語処理パフォーマンステスト
 * TEST-004: パフォーマンステスト - 日本語処理最適化
 * 
 * 測定項目:
 * - 日本語テキスト解析速度
 * - マルチバイト文字の処理効率
 * - 漢字・ひらがな・カタカナ混在処理
 * - 大量日本語テキストの処理性能
 * 
 * @author webapp-test-automation
 * @version 1.0.0
 * @created 2025-08-16
 */

import { jest } from '@jest/globals';

// 日本語処理エンジンのモック実装
class JapaneseProcessingEngine {
  constructor() {
    this.morphologyAnalyzer = {
      patterns: {
        hiragana: /[\u3040-\u309F]/g,
        katakana: /[\u30A0-\u30FF]/g,
        kanji: /[\u4E00-\u9FAF]/g,
        particles: /[がのをにへとでからまで]/g,
        verbs: /[する|いる|ある|なる|くる|もつ|みる|きく]/g
      },
      systemEntities: /[システム|サーバー|データベース|ユーザー|クライアント|API|サービス]/g,
      actionWords: /[送信|受信|処理|実行|作成|削除|更新|検索|認証|承認]/g
    };
    
    this.processedCache = new Map();
    this.performanceMetrics = {
      totalProcessingTime: 0,
      textLength: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  analyzeText(text) {
    const startTime = performance.now();
    
    // キャッシュチェック
    const cacheKey = this.generateCacheKey(text);
    if (this.processedCache.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.processedCache.get(cacheKey);
    }
    
    this.performanceMetrics.cacheMisses++;
    
    const analysis = {
      originalText: text,
      length: text.length,
      characters: this.analyzeCharacters(text),
      morphology: this.analyzeMorphology(text),
      entities: this.extractEntities(text),
      actions: this.extractActions(text),
      relationships: this.extractRelationships(text),
      plantUMLElements: this.convertToPlantUMLElements(text)
    };
    
    // キャッシュに保存
    this.processedCache.set(cacheKey, analysis);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.performanceMetrics.textLength += text.length;
    
    return {
      ...analysis,
      processingTime,
      cacheUsed: false
    };
  }

  analyzeCharacters(text) {
    const characters = {
      hiragana: (text.match(this.morphologyAnalyzer.patterns.hiragana) || []).length,
      katakana: (text.match(this.morphologyAnalyzer.patterns.katakana) || []).length,
      kanji: (text.match(this.morphologyAnalyzer.patterns.kanji) || []).length,
      ascii: (text.match(/[a-zA-Z0-9]/g) || []).length,
      symbols: (text.match(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9\s]/g) || []).length
    };
    
    characters.total = Object.values(characters).reduce((sum, count) => sum + count, 0);
    characters.complexity = this.calculateTextComplexity(characters);
    
    return characters;
  }

  analyzeMorphology(text) {
    return {
      particles: (text.match(this.morphologyAnalyzer.patterns.particles) || []).length,
      verbs: (text.match(this.morphologyAnalyzer.patterns.verbs) || []).length,
      sentences: text.split(/[。！？]/).filter(s => s.trim().length > 0).length,
      clauses: text.split(/[、，]/).filter(c => c.trim().length > 0).length
    };
  }

  extractEntities(text) {
    const entities = [];
    let match;
    
    // システムエンティティの抽出
    const systemRegex = new RegExp(this.morphologyAnalyzer.systemEntities.source, 'g');
    while ((match = systemRegex.exec(text)) !== null) {
      entities.push({
        type: 'system',
        text: match[0],
        position: match.index
      });
    }
    
    // カスタムエンティティの抽出（○○システム、○○サーバーなど）
    const customEntityPattern = /([ぁ-んァ-ヶ亜-熙a-zA-Z0-9]+)(システム|サーバー|データベース|サービス)/g;
    while ((match = customEntityPattern.exec(text)) !== null) {
      entities.push({
        type: 'custom_system',
        text: match[0],
        name: match[1],
        component: match[2],
        position: match.index
      });
    }
    
    return entities;
  }

  extractActions(text) {
    const actions = [];
    let match;
    
    const actionRegex = new RegExp(this.morphologyAnalyzer.actionWords.source, 'g');
    while ((match = actionRegex.exec(text)) !== null) {
      actions.push({
        type: 'action',
        text: match[0],
        position: match.index
      });
    }
    
    // 複合動詞の抽出
    const compoundActionPattern = /([ぁ-んァ-ヶ亜-熙]+)(を|に|へ)(送信|受信|処理|実行|作成|削除|更新)/g;
    while ((match = compoundActionPattern.exec(text)) !== null) {
      actions.push({
        type: 'compound_action',
        object: match[1],
        particle: match[2],
        action: match[3],
        position: match.index
      });
    }
    
    return actions;
  }

  extractRelationships(text) {
    const relationships = [];
    
    // A → B パターン
    const arrowPattern = /([ぁ-んァ-ヶ亜-熙a-zA-Z0-9]+)(が|は)([ぁ-んァ-ヶ亜-熙a-zA-Z0-9]+)(に|へ|を)([ぁ-んァ-ヶ亜-熙]+)/g;
    let match;
    
    while ((match = arrowPattern.exec(text)) !== null) {
      relationships.push({
        source: match[1],
        sourceParticle: match[2],
        target: match[3],
        targetParticle: match[4],
        action: match[5],
        type: 'directed_action'
      });
    }
    
    return relationships;
  }

  convertToPlantUMLElements(text) {
    const entities = this.extractEntities(text);
    const actions = this.extractActions(text);
    const relationships = this.extractRelationships(text);
    
    const participants = entities.map(entity => ({
      type: 'participant',
      name: entity.text,
      alias: this.generateAlias(entity.text)
    }));
    
    const interactions = relationships.map(rel => ({
      type: 'interaction',
      from: this.generateAlias(rel.source),
      to: this.generateAlias(rel.target),
      message: rel.action,
      direction: '->'
    }));
    
    return {
      participants,
      interactions,
      plantUMLCode: this.generatePlantUMLCode(participants, interactions)
    };
  }

  generateAlias(text) {
    return text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  generatePlantUMLCode(participants, interactions) {
    let code = '@startuml\n';
    
    participants.forEach(p => {
      code += `participant "${p.name}" as ${p.alias}\n`;
    });
    
    code += '\n';
    
    interactions.forEach(i => {
      code += `${i.from} ${i.direction} ${i.to} : ${i.message}\n`;
    });
    
    code += '@enduml';
    
    return code;
  }

  calculateTextComplexity(characters) {
    const kanjiWeight = 3;
    const katakanaWeight = 2;
    const hiraganaWeight = 1;
    const asciiWeight = 0.5;
    
    const weightedComplexity = 
      characters.kanji * kanjiWeight +
      characters.katakana * katakanaWeight +
      characters.hiragana * hiraganaWeight +
      characters.ascii * asciiWeight;
    
    return Math.round(weightedComplexity / characters.total * 100) / 100;
  }

  generateCacheKey(text) {
    // シンプルなハッシュ関数
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString();
  }

  getPerformanceMetrics() {
    const avgProcessingSpeed = this.performanceMetrics.textLength > 0
      ? this.performanceMetrics.totalProcessingTime / this.performanceMetrics.textLength
      : 0;
    
    const cacheEfficiency = (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) > 0
      ? this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)
      : 0;
    
    return {
      ...this.performanceMetrics,
      avgProcessingSpeed,
      cacheEfficiency,
      cacheSize: this.processedCache.size
    };
  }

  clearCache() {
    this.processedCache.clear();
  }

  destroy() {
    this.clearCache();
    this.performanceMetrics = {
      totalProcessingTime: 0,
      textLength: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

describe('日本語処理パフォーマンステスト', () => {
  let processingEngine;
  let performanceMonitor;

  beforeEach(() => {
    processingEngine = new JapaneseProcessingEngine();
    
    performanceMonitor = {
      measurements: new Map(),
      
      startMeasurement(name) {
        this.measurements.set(name, {
          startTime: performance.now(),
          startMemory: performance.memory?.usedJSHeapSize || 0
        });
      },
      
      endMeasurement(name) {
        const measurement = this.measurements.get(name);
        if (measurement) {
          measurement.endTime = performance.now();
          measurement.endMemory = performance.memory?.usedJSHeapSize || 0;
          measurement.duration = measurement.endTime - measurement.startTime;
          measurement.memoryUsed = measurement.endMemory - measurement.startMemory;
        }
        return measurement;
      },
      
      reset() {
        this.measurements.clear();
      }
    };
  });

  afterEach(() => {
    processingEngine.destroy();
    performanceMonitor.reset();
  });

  describe('基本的な日本語処理性能テスト', () => {
    test('ひらがなテキストの処理速度', () => {
      const hiraganaText = 'ゆーざーがしすてむにあくせすしてでーたをしゅとくする';
      
      performanceMonitor.startMeasurement('hiraganaProcessing');
      
      const result = processingEngine.analyzeText(hiraganaText);
      
      const measurement = performanceMonitor.endMeasurement('hiraganaProcessing');
      
      // ひらがなテキストの処理が10ms以内
      expect(result.processingTime).toBeLessThan(10);
      
      // 文字種別が正しく認識されている
      expect(result.characters.hiragana).toBeGreaterThan(0);
      expect(result.characters.katakana).toBe(0);
      expect(result.characters.kanji).toBe(0);
      
      // メモリ使用量が1MB以下
      expect(measurement.memoryUsed).toBeLessThan(1024 * 1024);
    });

    test('カタカナテキストの処理速度', () => {
      const katakanaText = 'ユーザーガシステムニアクセスシテデータヲシュトクスル';
      
      performanceMonitor.startMeasurement('katakanaProcessing');
      
      const result = processingEngine.analyzeText(katakanaText);
      
      const measurement = performanceMonitor.endMeasurement('katakanaProcessing');
      
      // カタカナテキストの処理が10ms以内
      expect(result.processingTime).toBeLessThan(10);
      
      // 文字種別が正しく認識されている
      expect(result.characters.katakana).toBeGreaterThan(0);
      expect(result.characters.hiragana).toBe(0);
      expect(result.characters.kanji).toBe(0);
    });

    test('漢字テキストの処理速度', () => {
      const kanjiText = '利用者認証管理系統接続資料取得処理実行';
      
      performanceMonitor.startMeasurement('kanjiProcessing');
      
      const result = processingEngine.analyzeText(kanjiText);
      
      const measurement = performanceMonitor.endMeasurement('kanjiProcessing');
      
      // 漢字テキストの処理が15ms以内（複雑さを考慮）
      expect(result.processingTime).toBeLessThan(15);
      
      // 文字種別が正しく認識されている
      expect(result.characters.kanji).toBeGreaterThan(0);
      expect(result.characters.complexity).toBeGreaterThan(2); // 漢字は複雑度が高い
    });

    test('混在テキストの処理速度', () => {
      const mixedText = 'ユーザーがAPIシステムにアクセスして、データベースから情報を取得し、レスポンスを受信する処理';
      
      performanceMonitor.startMeasurement('mixedProcessing');
      
      const result = processingEngine.analyzeText(mixedText);
      
      const measurement = performanceMonitor.endMeasurement('mixedProcessing');
      
      // 混在テキストの処理が20ms以内
      expect(result.processingTime).toBeLessThan(20);
      
      // 複数の文字種別が認識されている
      expect(result.characters.hiragana).toBeGreaterThan(0);
      expect(result.characters.katakana).toBeGreaterThan(0);
      expect(result.characters.kanji).toBeGreaterThan(0);
      expect(result.characters.ascii).toBeGreaterThan(0);
      
      // エンティティとアクションが抽出されている
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.actions.length).toBeGreaterThan(0);
    });
  });

  describe('大量テキスト処理性能テスト', () => {
    test('中程度サイズテキストの処理', () => {
      // 500文字程度のテキスト
      const mediumText = Array.from({ length: 10 }, (_, i) => 
        `システム${i}がユーザー${i}からのリクエストを受信し、データベース${i}にアクセスして情報を取得する。`
      ).join('');
      
      performanceMonitor.startMeasurement('mediumTextProcessing');
      
      const result = processingEngine.analyzeText(mediumText);
      
      const measurement = performanceMonitor.endMeasurement('mediumTextProcessing');
      
      // 中程度テキストの処理が50ms以内
      expect(result.processingTime).toBeLessThan(50);
      
      // 適切にエンティティが抽出されている
      expect(result.entities.length).toBeGreaterThan(10);
      
      // PlantUMLコードが生成されている
      expect(result.plantUMLElements.plantUMLCode).toContain('@startuml');
      expect(result.plantUMLElements.plantUMLCode).toContain('@enduml');
    });

    test('大サイズテキストの処理', () => {
      // 2000文字程度のテキスト
      const largeText = Array.from({ length: 40 }, (_, i) => 
        `複雑なシステム${i}において、管理者${i}が認証システム${i}を経由してユーザーデータベース${i}にアクセスし、新規ユーザー${i}の情報を作成・更新・削除する一連の処理を実行する。`
      ).join('この処理は、');
      
      performanceMonitor.startMeasurement('largeTextProcessing');
      
      const result = processingEngine.analyzeText(largeText);
      
      const measurement = performanceMonitor.endMeasurement('largeTextProcessing');
      
      // 大サイズテキストの処理が200ms以内
      expect(result.processingTime).toBeLessThan(200);
      
      // 複雑度が適切に計算されている
      expect(result.characters.complexity).toBeGreaterThan(1.5);
      
      // 大量のエンティティと関係性が抽出されている
      expect(result.entities.length).toBeGreaterThan(40);
      expect(result.relationships.length).toBeGreaterThan(0);
      
      // メモリ使用量が10MB以下
      expect(measurement.memoryUsed).toBeLessThan(10 * 1024 * 1024);
    });

    test('極大サイズテキストの処理', () => {
      // 5000文字程度のテキスト
      const extraLargeText = Array.from({ length: 100 }, (_, i) => 
        `エンタープライズレベルのマイクロサービスアーキテクチャ${i}では、APIゲートウェイ${i}がロードバランサー${i}を通じて複数のサービスインスタンス${i}に負荷分散を行う。`
      ).join('');
      
      performanceMonitor.startMeasurement('extraLargeTextProcessing');
      
      const result = processingEngine.analyzeText(extraLargeText);
      
      const measurement = performanceMonitor.endMeasurement('extraLargeTextProcessing');
      
      // 極大サイズテキストの処理が500ms以内
      expect(result.processingTime).toBeLessThan(500);
      
      // 処理速度が1文字あたり0.1ms以下
      const processingSpeedPerChar = result.processingTime / result.length;
      expect(processingSpeedPerChar).toBeLessThan(0.1);
      
      // PlantUMLコードが適切なサイズで生成されている
      const plantUMLLines = result.plantUMLElements.plantUMLCode.split('\n');
      expect(plantUMLLines.length).toBeGreaterThan(10);
    });
  });

  describe('キャッシュ効率性テスト', () => {
    test('同一テキストの再処理でキャッシュ効果', () => {
      const testText = 'ユーザーがシステムにログインし、データを更新する処理';
      
      // 初回処理（キャッシュなし）
      performanceMonitor.startMeasurement('firstProcessing');
      const firstResult = processingEngine.analyzeText(testText);
      const firstMeasurement = performanceMonitor.endMeasurement('firstProcessing');
      
      // 2回目処理（キャッシュあり）
      performanceMonitor.startMeasurement('cachedProcessing');
      const cachedResult = processingEngine.analyzeText(testText);
      const cachedMeasurement = performanceMonitor.endMeasurement('cachedProcessing');
      
      // キャッシュ使用により処理時間が大幅短縮
      expect(cachedResult.cacheUsed).toBe(true);
      expect(cachedMeasurement.duration).toBeLessThan(firstMeasurement.duration * 0.1);
      
      const metrics = processingEngine.getPerformanceMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    test('類似テキストのキャッシュ効率', () => {
      const baseTexts = [
        'システムAがシステムBにデータを送信する',
        'システムCがシステムDにデータを送信する',
        'システムEがシステムFにデータを送信する'
      ];
      
      // 複数の類似テキストを処理
      const processingTimes = [];
      baseTexts.forEach(text => {
        const startTime = performance.now();
        processingEngine.analyzeText(text);
        const endTime = performance.now();
        processingTimes.push(endTime - startTime);
      });
      
      // 同じテキストを再度処理（キャッシュ効果確認）
      const cachedProcessingTimes = [];
      baseTexts.forEach(text => {
        const startTime = performance.now();
        processingEngine.analyzeText(text);
        const endTime = performance.now();
        cachedProcessingTimes.push(endTime - startTime);
      });
      
      const avgOriginalTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const avgCachedTime = cachedProcessingTimes.reduce((a, b) => a + b, 0) / cachedProcessingTimes.length;
      
      // キャッシュにより平均処理時間が90%以上削減
      expect(avgCachedTime).toBeLessThan(avgOriginalTime * 0.1);
      
      const metrics = processingEngine.getPerformanceMetrics();
      expect(metrics.cacheEfficiency).toBeGreaterThan(0.5); // 50%以上のキャッシュヒット率
    });

    test('大量キャッシュ使用時のメモリ効率', () => {
      const uniqueTexts = Array.from({ length: 100 }, (_, i) => 
        `独特なシステム${i}が特別なデータベース${i}とやり取りする処理${i}`
      );
      
      performanceMonitor.startMeasurement('massiveCaching');
      
      // 100個の異なるテキストを処理してキャッシュに保存
      uniqueTexts.forEach(text => {
        processingEngine.analyzeText(text);
      });
      
      const measurement = performanceMonitor.endMeasurement('massiveCaching');
      
      const metrics = processingEngine.getPerformanceMetrics();
      
      // キャッシュサイズが適切
      expect(metrics.cacheSize).toBe(100);
      
      // メモリ使用量が20MB以下
      expect(measurement.memoryUsed).toBeLessThan(20 * 1024 * 1024);
      
      // 全体の処理効率が維持されている
      expect(metrics.avgProcessingSpeed).toBeLessThan(0.5); // 0.5ms/文字以下
    });
  });

  describe('特殊な日本語処理テスト', () => {
    test('敬語表現の処理', () => {
      const politeText = 'お客様がシステムにお申し込みいただき、弊社担当者が確認させていただく処理でございます';
      
      const result = processingEngine.analyzeText(politeText);
      
      // 敬語でも適切に処理される
      expect(result.processingTime).toBeLessThan(25);
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.plantUMLElements.plantUMLCode).toContain('@startuml');
    });

    test('技術用語混在テキストの処理', () => {
      const technicalText = 'REST APIエンドポイントがHTTPSプロトコルでJSON形式のレスポンスをクライアントアプリケーションに返却';
      
      const result = processingEngine.analyzeText(technicalText);
      
      // 技術用語混在でも適切に処理される
      expect(result.processingTime).toBeLessThan(30);
      expect(result.characters.ascii).toBeGreaterThan(0); // ASCII文字が含まれる
      expect(result.entities.length).toBeGreaterThan(0);
    });

    test('長い複合語の処理', () => {
      const compoundText = '顧客関係管理システム統合基盤運用監視業務自動化処理実行結果確認作業';
      
      const result = processingEngine.analyzeText(compoundText);
      
      // 長い複合語でも適切に処理される
      expect(result.processingTime).toBeLessThan(20);
      expect(result.characters.complexity).toBeGreaterThan(2.5); // 高い複雑度
      expect(result.morphology.sentences).toBeGreaterThan(0);
    });

    test('記号・句読点混在テキストの処理', () => {
      const punctuatedText = 'ユーザー（管理者権限）が、システム※重要※に「ログイン」し、データを［更新・削除］する処理；要注意！';
      
      const result = processingEngine.analyzeText(punctuatedText);
      
      // 記号混在でも適切に処理される
      expect(result.processingTime).toBeLessThan(25);
      expect(result.characters.symbols).toBeGreaterThan(0);
      expect(result.entities.length).toBeGreaterThan(0);
    });
  });

  describe('PlantUML生成効率テスト', () => {
    test('シンプルなシーケンス図生成', () => {
      const sequenceText = 'クライアントがサーバーにリクエストを送信し、サーバーがレスポンスを返却する';
      
      performanceMonitor.startMeasurement('simpleSequenceGeneration');
      
      const result = processingEngine.analyzeText(sequenceText);
      
      const measurement = performanceMonitor.endMeasurement('simpleSequenceGeneration');
      
      // PlantUMLコード生成が迅速
      expect(result.processingTime).toBeLessThan(15);
      
      // 適切なシーケンス図要素が生成されている
      expect(result.plantUMLElements.participants.length).toBeGreaterThan(1);
      expect(result.plantUMLElements.interactions.length).toBeGreaterThan(0);
      
      const plantUMLCode = result.plantUMLElements.plantUMLCode;
      expect(plantUMLCode).toContain('participant');
      expect(plantUMLCode).toContain('->');
    });

    test('複雑なシーケンス図生成', () => {
      const complexText = `
        ユーザーがWebブラウザからログイン要求を送信する。
        WebサーバーがAPIゲートウェイに認証要求を転送する。
        APIゲートウェイが認証サービスにユーザー情報を照会する。
        認証サービスがデータベースでユーザー認証を実行する。
        データベースが認証結果を認証サービスに返却する。
        認証サービスがAPIゲートウェイに認証結果を返却する。
        APIゲートウェイがWebサーバーに認証結果を転送する。
        Webサーバーがユーザーにログイン結果を表示する。
      `;
      
      performanceMonitor.startMeasurement('complexSequenceGeneration');
      
      const result = processingEngine.analyzeText(complexText);
      
      const measurement = performanceMonitor.endMeasurement('complexSequenceGeneration');
      
      // 複雑なシーケンス図でも効率的に生成
      expect(result.processingTime).toBeLessThan(100);
      
      // 多数の参加者と相互作用が抽出されている
      expect(result.plantUMLElements.participants.length).toBeGreaterThan(3);
      expect(result.plantUMLElements.interactions.length).toBeGreaterThan(5);
      
      // 生成されたコードが適切な長さ
      const plantUMLLines = result.plantUMLElements.plantUMLCode.split('\n');
      expect(plantUMLLines.length).toBeGreaterThan(10);
    });

    test('マルチシナリオ処理の効率', () => {
      const scenarios = [
        'ユーザー登録シナリオ：新規ユーザーがアカウントを作成する',
        'ログインシナリオ：既存ユーザーがシステムにアクセスする',
        'データ更新シナリオ：ユーザーが情報を変更し保存する',
        'ログアウトシナリオ：ユーザーがセッションを終了する'
      ];
      
      performanceMonitor.startMeasurement('multiScenarioProcessing');
      
      const results = scenarios.map(scenario => 
        processingEngine.analyzeText(scenario)
      );
      
      const measurement = performanceMonitor.endMeasurement('multiScenarioProcessing');
      
      // 複数シナリオの処理が効率的
      const totalProcessingTime = results.reduce((sum, result) => sum + result.processingTime, 0);
      expect(totalProcessingTime).toBeLessThan(100);
      
      // 各シナリオでPlantUMLコードが生成されている
      results.forEach(result => {
        expect(result.plantUMLElements.plantUMLCode).toContain('@startuml');
        expect(result.plantUMLElements.plantUMLCode).toContain('@enduml');
      });
      
      // メモリ効率が維持されている
      expect(measurement.memoryUsed).toBeLessThan(5 * 1024 * 1024);
    });
  });
});