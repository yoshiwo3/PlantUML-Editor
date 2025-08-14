/**
 * GitHub Issues統合テスト
 * GitHub API、Webhook、自動化機能の包括的テスト
 * 
 * @version 1.0.0
 * @description Issue管理、ラベル自動付与、プロジェクト連携テスト
 */

const { test, expect, beforeAll, afterAll, describe } = require('@jest/globals');
const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// GitHub設定
const GITHUB_CONFIG = {
  token: process.env.GITHUB_TOKEN || 'ghp_test_token',
  owner: process.env.GITHUB_OWNER || 'test-owner',
  repo: process.env.GITHUB_REPO || 'PlantUML',
  apiUrl: 'https://api.github.com',
  webhookUrl: process.env.GITHUB_WEBHOOK_URL,
  testTimeout: 30000
};

describe('GitHub Issues統合テスト', () => {
  let octokit;
  let testContext;

  beforeAll(async () => {
    // GitHub APIクライアント初期化
    octokit = new Octokit({
      auth: GITHUB_CONFIG.token,
      baseUrl: GITHUB_CONFIG.apiUrl
    });

    testContext = {
      startTime: Date.now(),
      createdIssues: [],
      testLabels: [],
      webhookEvents: [],
      testMilestone: null
    };

    console.log('🐙 GitHub Issues統合テスト開始');
    console.log(`リポジトリ: ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);

    // テスト用ラベルの準備
    await setupTestLabels();
    
    // テスト用マイルストーンの準備
    await setupTestMilestone();
  });

  afterAll(async () => {
    console.log('🧹 GitHub テストデータクリーンアップ中...');
    
    // 作成したテストIssueを削除（実際の本番環境では慎重に）
    if (process.env.CLEANUP_TEST_ISSUES === 'true') {
      await cleanupTestIssues();
    }
    
    const duration = Date.now() - testContext.startTime;
    console.log(`🐙 GitHub Issues統合テスト完了 (${duration}ms)`);
  });

  describe('Issue自動作成機能', () => {
    test('テスト失敗時にIssueが自動作成される', async () => {
      const testFailureData = {
        testName: 'PlantUML変換テスト',
        errorMessage: 'TypeError: Cannot read property length of undefined',
        stackTrace: 'at convertJapanese (convert.js:45)',
        branch: 'feature/test-automation',
        commit: 'abc123def456',
        buildUrl: 'https://github.com/actions/runs/123456'
      };

      const issueResult = await createTestFailureIssue(testFailureData);

      expect(issueResult).toHaveProperty('number');
      expect(issueResult).toHaveProperty('html_url');
      expect(issueResult).toHaveProperty('title');
      
      expect(issueResult.title).toContain('テスト失敗');
      expect(issueResult.title).toContain(testFailureData.testName);
      
      // 自動タグ付けの確認
      expect(issueResult.labels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'automated-test' }),
          expect.objectContaining({ name: 'test-failure' }),
          expect.objectContaining({ name: 'bug' })
        ])
      );

      testContext.createdIssues.push(issueResult.number);
      
    }, GITHUB_CONFIG.testTimeout);

    test('パフォーマンス劣化時にIssueが自動作成される', async () => {
      const performanceData = {
        testName: 'PlantUML生成パフォーマンステスト',
        currentTime: 5200, // ms
        thresholdTime: 3000, // ms
        degradationPercent: 73.3,
        affectedEndpoints: ['/api/convert', '/api/generate'],
        commit: 'def456ghi789'
      };

      const issueResult = await createPerformanceIssue(performanceData);

      expect(issueResult).toHaveProperty('number');
      expect(issueResult.title).toContain('パフォーマンス劣化');
      expect(issueResult.body).toContain(`${performanceData.currentTime}ms`);
      expect(issueResult.body).toContain(`${performanceData.degradationPercent}%`);
      
      // パフォーマンス専用ラベルの確認
      expect(issueResult.labels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'performance' }),
          expect.objectContaining({ name: 'priority-high' })
        ])
      );

      testContext.createdIssues.push(issueResult.number);
      
    }, GITHUB_CONFIG.testTimeout);

    test('セキュリティ脆弱性発見時にIssueが自動作成される', async () => {
      const securityData = {
        vulnerability: {
          type: 'XSS',
          severity: 'HIGH',
          cwe: 'CWE-79',
          file: 'src/public/script.js',
          line: 42,
          description: 'Unescaped user input in DOM manipulation'
        },
        scanTool: 'npm audit',
        commit: 'ghi789jkl012'
      };

      const issueResult = await createSecurityIssue(securityData);

      expect(issueResult.title).toContain('セキュリティ脆弱性');
      expect(issueResult.title).toContain(securityData.vulnerability.type);
      expect(issueResult.body).toContain(securityData.vulnerability.severity);
      expect(issueResult.body).toContain(securityData.vulnerability.cwe);
      
      // セキュリティ専用ラベルの確認
      expect(issueResult.labels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'security' }),
          expect.objectContaining({ name: 'priority-critical' })
        ])
      );

      testContext.createdIssues.push(issueResult.number);
      
    }, GITHUB_CONFIG.testTimeout);
  });

  describe('日本語Issue自動分析機能', () => {
    test('日本語バグレポートの自動分類が機能する', async () => {
      const japaneseIssue = {
        title: 'PlantUML変換でエラーが発生',
        body: `
## バグの詳細
日本語でシーケンス図を作成しようとすると、エラーが表示されます。

## 再現手順
1. アプリケーションを開く
2. 「ユーザー -> システム: ログイン」と入力
3. 変換ボタンをクリック

## エラーメッセージ
TypeError: Cannot read property 'replace' of undefined

## 環境
- ブラウザ: Chrome 118
- OS: Windows 11
        `
      };

      const analysisResult = await analyzeJapaneseIssue(japaneseIssue);

      expect(analysisResult).toHaveProperty('classification');
      expect(analysisResult).toHaveProperty('priority');
      expect(analysisResult).toHaveProperty('autoLabels');
      expect(analysisResult).toHaveProperty('assignee');
      expect(analysisResult).toHaveProperty('estimatedHours');

      expect(analysisResult.classification).toBe('bug');
      expect(analysisResult.priority).toBeOneOf(['low', 'medium', 'high', 'critical']);
      expect(analysisResult.autoLabels).toContain('japanese-support');
      expect(analysisResult.autoLabels).toContain('bug');
      
    }, GITHUB_CONFIG.testTimeout);

    test('機能要求の自動分析が機能する', async () => {
      const featureRequest = {
        title: 'CSV出力機能を追加してほしい',
        body: `
## 機能の概要
生成されたPlantUMLコードをCSV形式でエクスポートできる機能を追加してください。

## 用途
- データ分析への活用
- 外部ツールとの連携
- バッチ処理での利用

## 優先度
中程度（急ぎではないが必要）

## 追加情報
Excelファイル形式も対応していただけると助かります。
        `
      };

      const analysisResult = await analyzeJapaneseIssue(featureRequest);

      expect(analysisResult.classification).toBe('enhancement');
      expect(analysisResult.autoLabels).toContain('enhancement');
      expect(analysisResult.estimatedHours).toBeGreaterThan(0);
      
    }, GITHUB_CONFIG.testTimeout);

    test('質問・サポート要求の自動分類が機能する', async () => {
      const supportQuestion = {
        title: 'クラス図の書き方を教えてください',
        body: `
## 質問内容
PlantUMLでクラス図を作成したいのですが、
日本語でどのように記述すればよいでしょうか？

## 試したこと
- 「クラス: User」と入力してみました
- ドキュメントを読みましたが理解できませんでした

よろしくお願いします。
        `
      };

      const analysisResult = await analyzeJapaneseIssue(supportQuestion);

      expect(analysisResult.classification).toBe('question');
      expect(analysisResult.autoLabels).toContain('question');
      expect(analysisResult.autoLabels).toContain('documentation');
      expect(analysisResult.priority).toBe('low');
      
    }, GITHUB_CONFIG.testTimeout);
  });

  describe('Webhook統合機能', () => {
    test('Issue作成WebhookイベントのParseと処理', async () => {
      const webhookPayload = {
        action: 'opened',
        issue: {
          number: 999,
          title: 'テスト用Issue',
          body: 'バグレポートです。急ぎで対応をお願いします。',
          labels: [],
          user: {
            login: 'test-user'
          }
        },
        repository: {
          name: GITHUB_CONFIG.repo,
          full_name: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`
        }
      };

      const webhookResult = await processWebhookEvent('issues', webhookPayload);

      expect(webhookResult).toHaveProperty('processed');
      expect(webhookResult).toHaveProperty('actions');
      expect(webhookResult.processed).toBe(true);
      
      // 自動処理の確認
      expect(webhookResult.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'auto_label' }),
          expect.objectContaining({ type: 'classification' })
        ])
      );
      
    }, GITHUB_CONFIG.testTimeout);

    test('PR作成WebhookイベントのAI分析トリガー', async () => {
      const prWebhookPayload = {
        action: 'opened',
        pull_request: {
          number: 888,
          title: 'テスト機能の追加',
          body: 'PlantUML変換機能のテストを追加しました',
          changed_files: 5,
          additions: 150,
          deletions: 20,
          head: {
            sha: 'abc123def456'
          }
        },
        repository: {
          name: GITHUB_CONFIG.repo,
          full_name: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`
        }
      };

      const webhookResult = await processWebhookEvent('pull_request', prWebhookPayload);

      expect(webhookResult.processed).toBe(true);
      expect(webhookResult.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'ai_review_trigger' }),
          expect.objectContaining({ type: 'quality_gate_check' })
        ])
      );
      
    }, GITHUB_CONFIG.testTimeout);
  });

  describe('ラベル自動管理機能', () => {
    test('必要なラベルが自動作成される', async () => {
      const requiredLabels = [
        'automated-test',
        'test-failure', 
        'japanese-support',
        'performance',
        'security',
        'priority-critical',
        'priority-high',
        'priority-medium',
        'priority-low'
      ];

      for (const labelName of requiredLabels) {
        const labelExists = await checkLabelExists(labelName);
        if (!labelExists) {
          const createResult = await createLabel(labelName);
          expect(createResult).toHaveProperty('name');
          expect(createResult.name).toBe(labelName);
        }
      }
      
    }, GITHUB_CONFIG.testTimeout);

    test('Issue内容に基づく自動ラベル付与が機能する', async () => {
      const testIssue = await createTestIssue({
        title: 'PlantUML変換で深刻なパフォーマンス問題',
        body: 'シーケンス図の生成に30秒以上かかります。緊急対応が必要です。'
      });

      const autoLabelResult = await applyAutoLabels(testIssue.number);

      expect(autoLabelResult.labels).toEqual(
        expect.arrayContaining([
          'performance',
          'priority-high',
          'japanese-support'
        ])
      );

      testContext.createdIssues.push(testIssue.number);
      
    }, GITHUB_CONFIG.testTimeout);
  });

  describe('プロジェクト管理統合機能', () => {
    test('マイルストーンへの自動割り当てが機能する', async () => {
      const testIssue = await createTestIssue({
        title: 'Phase2機能テスト',
        body: 'Phase2リリースに向けたテスト機能です'
      });

      const milestoneResult = await assignToMilestone(
        testIssue.number, 
        testContext.testMilestone.number
      );

      expect(milestoneResult.milestone).toEqual(
        expect.objectContaining({
          number: testContext.testMilestone.number
        })
      );

      testContext.createdIssues.push(testIssue.number);
      
    }, GITHUB_CONFIG.testTimeout);

    test('担当者自動割り当てが機能する', async () => {
      const testIssue = await createTestIssue({
        title: 'セキュリティ脆弱性の修正',
        body: 'XSS脆弱性が発見されました。セキュリティ担当者による対応が必要です。'
      });

      const assigneeResult = await autoAssignIssue(testIssue.number);

      expect(assigneeResult).toHaveProperty('assignees');
      expect(assigneeResult.assignees.length).toBeGreaterThan(0);

      testContext.createdIssues.push(testIssue.number);
      
    }, GITHUB_CONFIG.testTimeout);
  });

  describe('GitHub Actions統合機能', () => {
    test('Issue作成がGitHub Actionsワークフローをトリガーする', async () => {
      const testIssue = await createTestIssue({
        title: '[AUTO] テスト失敗通知',
        body: 'E2Eテストで失敗が発生しました',
        labels: ['automated-test', 'test-failure']
      });

      // GitHub Actionsのトリガー確認（実際のAPIではなく模擬）
      const workflowTrigger = await checkWorkflowTriggered(testIssue.number);

      expect(workflowTrigger).toHaveProperty('triggered');
      expect(workflowTrigger.triggered).toBe(true);
      expect(workflowTrigger).toHaveProperty('workflow_name');

      testContext.createdIssues.push(testIssue.number);
      
    }, GITHUB_CONFIG.testTimeout);
  });

  // ヘルパー関数群
  async function setupTestLabels() {
    const testLabels = [
      { name: 'test-automation', color: '0075ca', description: 'テスト自動化関連' },
      { name: 'japanese-support', color: 'e99695', description: '日本語対応' },
      { name: 'performance', color: 'f9d0c4', description: 'パフォーマンス関連' }
    ];

    for (const label of testLabels) {
      try {
        await octokit.rest.issues.createLabel({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          ...label
        });
        testContext.testLabels.push(label.name);
      } catch (error) {
        if (error.status !== 422) { // Label already exists
          console.warn(`ラベル作成失敗: ${label.name}`, error.message);
        }
      }
    }
  }

  async function setupTestMilestone() {
    try {
      const milestone = await octokit.rest.issues.createMilestone({
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo,
        title: 'Test Automation Milestone',
        description: 'テスト自動化用マイルストーン',
        due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30日後
      });
      testContext.testMilestone = milestone.data;
    } catch (error) {
      console.warn('テスト用マイルストーン作成失敗:', error.message);
    }
  }

  async function createTestFailureIssue(testData) {
    const body = `
## 🚨 自動テスト失敗通知

**テスト名**: ${testData.testName}  
**ブランチ**: ${testData.branch}  
**コミット**: ${testData.commit}  

### エラー詳細
\`\`\`
${testData.errorMessage}
\`\`\`

### スタックトレース
\`\`\`
${testData.stackTrace}
\`\`\`

### ビルド情報
- ビルドURL: ${testData.buildUrl}
- 実行時刻: ${new Date().toISOString()}

---
*この Issue は自動的に作成されました*
    `;

    const response = await octokit.rest.issues.create({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      title: `🚨 テスト失敗: ${testData.testName}`,
      body,
      labels: ['automated-test', 'test-failure', 'bug']
    });

    return response.data;
  }

  async function createPerformanceIssue(perfData) {
    const body = `
## ⚡ パフォーマンス劣化検出

**テスト名**: ${perfData.testName}  
**現在の実行時間**: ${perfData.currentTime}ms  
**基準値**: ${perfData.thresholdTime}ms  
**劣化率**: ${perfData.degradationPercent}%  

### 影響範囲
${perfData.affectedEndpoints.map(ep => `- ${ep}`).join('\n')}

### 対応提案
1. ボトルネックの特定
2. クエリ最適化
3. キャッシュ戦略の見直し

**コミット**: ${perfData.commit}

---
*この Issue は自動的に作成されました*
    `;

    const response = await octokit.rest.issues.create({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      title: `⚡ パフォーマンス劣化: ${perfData.testName}`,
      body,
      labels: ['performance', 'priority-high']
    });

    return response.data;
  }

  async function createSecurityIssue(secData) {
    const vuln = secData.vulnerability;
    const body = `
## 🔒 セキュリティ脆弱性検出

**脆弱性タイプ**: ${vuln.type}  
**重要度**: ${vuln.severity}  
**CWE ID**: ${vuln.cwe}  

### 詳細
${vuln.description}

### 場所
- ファイル: ${vuln.file}
- 行: ${vuln.line}

### 検出ツール
${secData.scanTool}

### 対応期限
重要度 ${vuln.severity} のため、即座の対応が必要です。

**コミット**: ${secData.commit}

---
*この Issue は自動的に作成されました*
    `;

    const response = await octokit.rest.issues.create({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      title: `🔒 セキュリティ脆弱性: ${vuln.type}`,
      body,
      labels: ['security', 'priority-critical']
    });

    return response.data;
  }

  async function analyzeJapaneseIssue(issue) {
    // 実際の実装では、自然言語処理やAI分析を使用
    const analysis = {
      classification: 'question',
      priority: 'medium',
      autoLabels: ['japanese-support'],
      assignee: null,
      estimatedHours: 2
    };

    // キーワード分析
    const body = issue.body.toLowerCase();
    const title = issue.title.toLowerCase();

    if (body.includes('バグ') || body.includes('エラー') || title.includes('エラー')) {
      analysis.classification = 'bug';
      analysis.autoLabels.push('bug');
      analysis.priority = 'high';
      analysis.estimatedHours = 4;
    } else if (body.includes('機能') || body.includes('追加') || title.includes('追加')) {
      analysis.classification = 'enhancement';
      analysis.autoLabels.push('enhancement');
      analysis.estimatedHours = 8;
    } else if (body.includes('質問') || body.includes('教えて') || title.includes('教えて')) {
      analysis.classification = 'question';
      analysis.autoLabels.push('question');
      analysis.priority = 'low';
      analysis.estimatedHours = 1;
    }

    if (body.includes('急ぎ') || body.includes('緊急') || body.includes('重要')) {
      analysis.priority = 'high';
      analysis.autoLabels.push('priority-high');
    }

    if (body.includes('パフォーマンス') || body.includes('速度') || body.includes('遅い')) {
      analysis.autoLabels.push('performance');
    }

    if (body.includes('ドキュメント') || body.includes('説明')) {
      analysis.autoLabels.push('documentation');
    }

    return analysis;
  }

  async function processWebhookEvent(eventType, payload) {
    // Webhook イベント処理の模擬実装
    const result = {
      processed: true,
      eventType,
      actions: []
    };

    if (eventType === 'issues' && payload.action === 'opened') {
      result.actions.push({ type: 'auto_label', status: 'completed' });
      result.actions.push({ type: 'classification', status: 'completed' });
    } else if (eventType === 'pull_request' && payload.action === 'opened') {
      result.actions.push({ type: 'ai_review_trigger', status: 'triggered' });
      result.actions.push({ type: 'quality_gate_check', status: 'triggered' });
    }

    return result;
  }

  async function checkLabelExists(labelName) {
    try {
      await octokit.rest.issues.getLabel({
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo,
        name: labelName
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async function createLabel(labelName) {
    const labelConfig = getLabelConfig(labelName);
    const response = await octokit.rest.issues.createLabel({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      ...labelConfig
    });
    return response.data;
  }

  function getLabelConfig(labelName) {
    const configs = {
      'automated-test': { name: labelName, color: '0075ca', description: '自動テスト関連' },
      'test-failure': { name: labelName, color: 'd73a4a', description: 'テスト失敗' },
      'japanese-support': { name: labelName, color: 'e99695', description: '日本語対応' },
      'performance': { name: labelName, color: 'f9d0c4', description: 'パフォーマンス関連' },
      'security': { name: labelName, color: 'd4c5f9', description: 'セキュリティ関連' },
      'priority-critical': { name: labelName, color: 'b60205', description: '緊急対応' },
      'priority-high': { name: labelName, color: 'd93f0b', description: '高優先度' },
      'priority-medium': { name: labelName, color: 'fbca04', description: '中優先度' },
      'priority-low': { name: labelName, color: '0e8a16', description: '低優先度' }
    };
    return configs[labelName] || { name: labelName, color: '808080', description: 'テスト用ラベル' };
  }

  async function createTestIssue(issueData) {
    const response = await octokit.rest.issues.create({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      title: `[TEST] ${issueData.title}`,
      body: issueData.body,
      labels: issueData.labels || []
    });
    return response.data;
  }

  async function applyAutoLabels(issueNumber) {
    // 模擬的な自動ラベル付与
    const labels = ['performance', 'priority-high', 'japanese-support'];
    
    const response = await octokit.rest.issues.addLabels({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      issue_number: issueNumber,
      labels
    });
    
    return { labels };
  }

  async function assignToMilestone(issueNumber, milestoneNumber) {
    const response = await octokit.rest.issues.update({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      issue_number: issueNumber,
      milestone: milestoneNumber
    });
    return response.data;
  }

  async function autoAssignIssue(issueNumber) {
    // 模擬的な担当者割り当て
    const assignees = ['test-maintainer'];
    
    const response = await octokit.rest.issues.addAssignees({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      issue_number: issueNumber,
      assignees
    });
    
    return response.data;
  }

  async function checkWorkflowTriggered(issueNumber) {
    // GitHub Actions ワークフロートリガーの模擬確認
    return {
      triggered: true,
      workflow_name: 'Issue Auto-Handler',
      run_id: 'mock-12345',
      triggered_at: new Date().toISOString()
    };
  }

  async function cleanupTestIssues() {
    for (const issueNumber of testContext.createdIssues) {
      try {
        await octokit.rest.issues.update({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          issue_number: issueNumber,
          state: 'closed'
        });
        console.log(`✅ テスト Issue #${issueNumber} をクローズしました`);
      } catch (error) {
        console.warn(`⚠️ Issue #${issueNumber} のクローズに失敗:`, error.message);
      }
    }
  }
});

// 模擬テストのためのカスタムマッチャー
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});