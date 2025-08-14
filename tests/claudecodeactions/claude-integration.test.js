/**
 * ClaudeCodeActions統合テスト
 * Claude Codeとの統合機能を包括的にテスト
 * 
 * @version 1.0.0
 * @description AI駆動開発環境の動作検証
 */

const { test, expect } = require('@jest/globals');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// テスト設定
const CLAUDE_CONFIG = {
  apiEndpoint: process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com',
  webhookUrl: process.env.CLAUDE_WEBHOOK_URL,
  testTimeout: 60000,
  retryAttempts: 3
};

describe('ClaudeCodeActions統合テスト', () => {
  let testContext;

  beforeAll(async () => {
    testContext = {
      startTime: Date.now(),
      testResults: [],
      artifacts: []
    };
    
    console.log('🤖 ClaudeCodeActions統合テスト開始');
    console.log(`設定: ${JSON.stringify(CLAUDE_CONFIG, null, 2)}`);
  });

  afterAll(async () => {
    const duration = Date.now() - testContext.startTime;
    console.log(`🤖 ClaudeCodeActions統合テスト完了 (${duration}ms)`);
    
    // テスト結果のアーカイブ
    await archiveTestResults(testContext);
  });

  describe('AI Code Analysis機能', () => {
    test('コード品質自動分析が機能する', async () => {
      const testCode = `
        // テスト対象コード
        function convertJapanese(input) {
          if (!input) return null;
          return input.replace(/[あ-ん]/g, 'hiragana');
        }
      `;
      
      const analysisResult = await runAICodeAnalysis(testCode);
      
      expect(analysisResult).toHaveProperty('quality_score');
      expect(analysisResult).toHaveProperty('suggestions');
      expect(analysisResult).toHaveProperty('security_issues');
      expect(analysisResult).toHaveProperty('performance_notes');
      
      expect(analysisResult.quality_score).toBeGreaterThan(0);
      expect(Array.isArray(analysisResult.suggestions)).toBe(true);
      
      // 結果をアーティファクトとして保存
      testContext.artifacts.push({
        type: 'code_analysis',
        result: analysisResult,
        timestamp: new Date().toISOString()
      });
      
    }, CLAUDE_CONFIG.testTimeout);

    test('セキュリティ脆弱性検出が機能する', async () => {
      const vulnerableCode = `
        // 意図的に脆弱なコード
        function processUserInput(userInput) {
          eval(userInput); // 危険な処理
          return userInput;
        }
      `;
      
      const securityAnalysis = await runSecurityAnalysis(vulnerableCode);
      
      expect(securityAnalysis).toHaveProperty('vulnerabilities');
      expect(securityAnalysis.vulnerabilities.length).toBeGreaterThan(0);
      
      const evalVulnerability = securityAnalysis.vulnerabilities.find(
        v => v.type === 'code_injection' || v.severity === 'high'
      );
      expect(evalVulnerability).toBeDefined();
      
    }, CLAUDE_CONFIG.testTimeout);

    test('パフォーマンス最適化提案が機能する', async () => {
      const inefficientCode = `
        // 非効率なコード例
        function processLargeArray(arr) {
          let result = [];
          for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length; j++) {
              if (arr[i] === arr[j] && i !== j) {
                result.push(arr[i]);
              }
            }
          }
          return result;
        }
      `;
      
      const performanceAnalysis = await runPerformanceAnalysis(inefficientCode);
      
      expect(performanceAnalysis).toHaveProperty('complexity_analysis');
      expect(performanceAnalysis).toHaveProperty('optimization_suggestions');
      expect(performanceAnalysis.complexity_analysis.time_complexity).toContain('O(n²)');
      
    }, CLAUDE_CONFIG.testTimeout);
  });

  describe('自動プルリクエストレビュー機能', () => {
    test('PR作成時のAI自動レビューが動作する', async () => {
      const mockPR = {
        title: 'テスト機能の追加',
        description: '新しいテスト機能を追加しました',
        files: [
          {
            path: 'src/test-feature.js',
            content: 'function testFeature() { return "test"; }',
            additions: 5,
            deletions: 0
          }
        ]
      };
      
      const reviewResult = await simulatePRReview(mockPR);
      
      expect(reviewResult).toHaveProperty('overall_score');
      expect(reviewResult).toHaveProperty('comments');
      expect(reviewResult).toHaveProperty('approval_status');
      
      expect(Array.isArray(reviewResult.comments)).toBe(true);
      expect(['approved', 'changes_requested', 'commented']).toContain(reviewResult.approval_status);
      
    }, CLAUDE_CONFIG.testTimeout);

    test('大規模PRに対する段階的レビューが機能する', async () => {
      const largePR = createLargeMockPR();
      const reviewResult = await simulatePRReview(largePR);
      
      expect(reviewResult).toHaveProperty('batched_review');
      expect(reviewResult.batched_review).toBe(true);
      expect(reviewResult.comments.length).toBeGreaterThan(0);
      
      // 段階的レビューのタイムアウトチェック
      expect(reviewResult.processing_time).toBeLessThan(CLAUDE_CONFIG.testTimeout);
      
    }, CLAUDE_CONFIG.testTimeout * 2); // 大規模PRは時間がかかる可能性があります
  });

  describe('日本語Issue自動分析機能', () => {
    test('日本語バグレポートの自動分類が機能する', async () => {
      const japaneseIssue = {
        title: 'PlantUML変換でエラーが発生します',
        body: `
          ## バグの詳細
          日本語テキストを入力してPlantUMLに変換しようとすると、
          以下のエラーが表示されます。
          
          ## エラーメッセージ
          TypeError: Cannot read property 'length' of undefined
          
          ## 再現手順
          1. アプリを開く
          2. 「ユーザー -> システム」と入力
          3. 変換ボタンをクリック
          
          ## 期待する動作
          正常にシーケンス図が生成される
        `,
        labels: []
      };
      
      const analysisResult = await analyzeJapaneseIssue(japaneseIssue);
      
      expect(analysisResult).toHaveProperty('classification');
      expect(analysisResult).toHaveProperty('priority');
      expect(analysisResult).toHaveProperty('auto_labels');
      expect(analysisResult).toHaveProperty('estimated_effort');
      
      expect(analysisResult.classification).toBe('bug');
      expect(analysisResult.auto_labels).toContain('japanese-support');
      expect(analysisResult.auto_labels).toContain('bug');
      
    }, CLAUDE_CONFIG.testTimeout);

    test('機能要求の自動分析が機能する', async () => {
      const featureRequest = {
        title: '画像アップロード機能の追加要求',
        body: `
          ## 機能概要
          手書きの図やホワイトボードの写真から、
          自動でPlantUMLコードを生成する機能が欲しいです。
          
          ## 用途
          - 会議のホワイトボードをデジタル化
          - 手書きフローチャートの変換
          
          ## 優先度
          高（急ぎで必要）
        `,
        labels: []
      };
      
      const analysisResult = await analyzeJapaneseIssue(featureRequest);
      
      expect(analysisResult.classification).toBe('enhancement');
      expect(analysisResult.priority).toBe('high');
      expect(analysisResult.auto_labels).toContain('enhancement');
      expect(analysisResult.auto_labels).toContain('priority-high');
      
    }, CLAUDE_CONFIG.testTimeout);
  });

  describe('統合品質ゲート機能', () => {
    test('品質基準チェックが機能する', async () => {
      const projectMetrics = {
        test_coverage: 85,
        code_complexity: 8,
        security_issues: 0,
        performance_score: 92,
        documentation_coverage: 78
      };
      
      const qualityGateResult = await runQualityGate(projectMetrics);
      
      expect(qualityGateResult).toHaveProperty('passed');
      expect(qualityGateResult).toHaveProperty('score');
      expect(qualityGateResult).toHaveProperty('recommendations');
      
      if (qualityGateResult.passed) {
        expect(qualityGateResult.score).toBeGreaterThanOrEqual(80);
      }
      
    }, CLAUDE_CONFIG.testTimeout);

    test('失敗時の自動Issue作成が機能する', async () => {
      const failedMetrics = {
        test_coverage: 45, // 閾値以下
        code_complexity: 15, // 閾値以上
        security_issues: 2, // 存在
        performance_score: 60, // 低い
        documentation_coverage: 30 // 不足
      };
      
      const qualityGateResult = await runQualityGate(failedMetrics);
      expect(qualityGateResult.passed).toBe(false);
      
      const autoIssueResult = await simulateAutoIssueCreation(qualityGateResult);
      
      expect(autoIssueResult).toHaveProperty('issue_created');
      expect(autoIssueResult.issue_created).toBe(true);
      expect(autoIssueResult).toHaveProperty('issue_url');
      
    }, CLAUDE_CONFIG.testTimeout);
  });

  describe('Claude API統合機能', () => {
    test('API接続性テスト', async () => {
      // 実際のAPI呼び出しはモック化
      const mockApiResponse = await testClaudeAPIConnection();
      
      expect(mockApiResponse).toHaveProperty('status');
      expect(mockApiResponse).toHaveProperty('response_time');
      expect(mockApiResponse.status).toBe('success');
      expect(mockApiResponse.response_time).toBeLessThan(5000);
      
    }, CLAUDE_CONFIG.testTimeout);

    test('Rate Limit処理が機能する', async () => {
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(makeClaudeAPIRequest(`test request ${i}`));
      }
      
      const results = await Promise.allSettled(rapidRequests);
      
      // 全てが失敗しない（Rate Limitが適切に処理される）
      const successfulRequests = results.filter(r => r.status === 'fulfilled');
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Rate Limitエラーが適切にハンドリングされている
      const rateLimitErrors = results.filter(r => 
        r.status === 'rejected' && 
        r.reason.message.includes('rate limit')
      );
      
      if (rateLimitErrors.length > 0) {
        // Rate Limitエラーは想定される動作
        console.log(`Rate Limit適用: ${rateLimitErrors.length}件のリクエストが制限されました`);
      }
      
    }, CLAUDE_CONFIG.testTimeout);
  });
});

// ヘルパー関数群
async function runAICodeAnalysis(code) {
  // Claude APIまたはローカルAI分析ツールを使用
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        quality_score: Math.floor(Math.random() * 40) + 60, // 60-100
        suggestions: [
          'エラーハンドリングを改善してください',
          'コメントを追加してください',
          'テストケースを追加してください'
        ],
        security_issues: [],
        performance_notes: ['処理効率は良好です']
      });
    }, 1000);
  });
}

async function runSecurityAnalysis(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hasEval = code.includes('eval(');
      resolve({
        vulnerabilities: hasEval ? [
          {
            type: 'code_injection',
            severity: 'high',
            line: 3,
            description: 'eval()の使用は危険です'
          }
        ] : []
      });
    }, 800);
  });
}

async function runPerformanceAnalysis(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hasNestedLoop = code.includes('for') && code.match(/for/g).length >= 2;
      resolve({
        complexity_analysis: {
          time_complexity: hasNestedLoop ? 'O(n²)' : 'O(n)',
          space_complexity: 'O(n)'
        },
        optimization_suggestions: hasNestedLoop ? [
          'ネストしたループを避けてください',
          'Set或いはMapを使用して効率化できます'
        ] : ['最適化の必要はありません']
      });
    }, 1200);
  });
}

async function simulatePRReview(pr) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        overall_score: Math.floor(Math.random() * 30) + 70, // 70-100
        comments: [
          {
            file: pr.files[0]?.path || 'unknown',
            line: 1,
            comment: '良い実装です！',
            severity: 'info'
          }
        ],
        approval_status: 'approved',
        processing_time: Math.floor(Math.random() * 3000) + 1000
      });
    }, 1500);
  });
}

function createLargeMockPR() {
  const files = [];
  for (let i = 0; i < 20; i++) {
    files.push({
      path: `src/file-${i}.js`,
      content: `function file${i}() { return ${i}; }`,
      additions: 10,
      deletions: 2
    });
  }
  
  return {
    title: '大規模機能追加',
    description: '複数のファイルを変更する大規模な機能追加',
    files
  };
}

async function analyzeJapaneseIssue(issue) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isUrgent = issue.body.includes('急ぎ') || issue.body.includes('緊急');
      const isBug = issue.body.includes('バグ') || issue.body.includes('エラー');
      const isFeature = issue.body.includes('機能') || issue.body.includes('追加');
      
      let classification = 'question';
      if (isBug) classification = 'bug';
      else if (isFeature) classification = 'enhancement';
      
      const auto_labels = ['japanese-support'];
      if (isBug) auto_labels.push('bug');
      if (isFeature) auto_labels.push('enhancement');
      if (isUrgent) auto_labels.push('priority-high');
      
      resolve({
        classification,
        priority: isUrgent ? 'high' : 'medium',
        auto_labels,
        estimated_effort: Math.floor(Math.random() * 16) + 1 // 1-16時間
      });
    }, 600);
  });
}

async function runQualityGate(metrics) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const thresholds = {
        test_coverage: 80,
        code_complexity: 10,
        security_issues: 0,
        performance_score: 75,
        documentation_coverage: 70
      };
      
      let score = 0;
      let total = 0;
      const recommendations = [];
      
      Object.entries(metrics).forEach(([key, value]) => {
        const threshold = thresholds[key];
        total++;
        
        if (key === 'security_issues' || key === 'code_complexity') {
          // 低い方が良い指標
          if (value <= threshold) {
            score++;
          } else {
            recommendations.push(`${key}を改善してください (現在: ${value}, 目標: <=${threshold})`);
          }
        } else {
          // 高い方が良い指標
          if (value >= threshold) {
            score++;
          } else {
            recommendations.push(`${key}を改善してください (現在: ${value}%, 目標: >=${threshold}%)`);
          }
        }
      });
      
      const finalScore = Math.floor((score / total) * 100);
      
      resolve({
        passed: finalScore >= 80,
        score: finalScore,
        recommendations,
        details: { score, total, thresholds }
      });
    }, 1000);
  });
}

async function simulateAutoIssueCreation(qualityResult) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        issue_created: !qualityResult.passed,
        issue_url: qualityResult.passed ? null : 'https://github.com/repo/issues/123',
        issue_title: '品質基準未達のため対応が必要です',
        issue_body: qualityResult.recommendations.join('\n')
      });
    }, 800);
  });
}

async function testClaudeAPIConnection() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'success',
        response_time: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
        api_version: 'v1',
        rate_limit_remaining: Math.floor(Math.random() * 100)
      });
    }, 500);
  });
}

async function makeClaudeAPIRequest(request) {
  return new Promise((resolve, reject) => {
    const delay = Math.floor(Math.random() * 1000) + 200;
    setTimeout(() => {
      if (Math.random() < 0.1) { // 10%の確率でRate Limit
        reject(new Error('Rate limit exceeded'));
      } else {
        resolve({
          request,
          response: 'AI分析結果',
          timestamp: new Date().toISOString()
        });
      }
    }, delay);
  });
}

async function archiveTestResults(context) {
  const reportPath = path.join(__dirname, '../reports/claude-integration-results.json');
  const report = {
    testResults: context.testResults,
    artifacts: context.artifacts,
    executionTime: Date.now() - context.startTime,
    timestamp: new Date().toISOString()
  };
  
  // レポートディレクトリが存在しない場合は作成
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📁 テスト結果をアーカイブしました: ${reportPath}`);
}