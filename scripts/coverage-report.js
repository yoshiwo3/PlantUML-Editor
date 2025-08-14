#!/usr/bin/env node
/**
 * カバレッジレポート生成スクリプト - PlantUMLプロジェクト
 * 
 * このスクリプトは以下の機能を提供します:
 * - 複数のテストタイプからのカバレッジ統合
 * - 80%以上のカバレッジ閾値検証
 * - 日本語対応のカバレッジレポート生成
 * - CI/CD環境での詳細分析
 * - カバレッジトレンド分析
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

/**
 * カバレッジレポート生成クラス
 */
class CoverageReporter {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.coverageDir = path.join(this.projectRoot, 'coverage');
    this.combinedDir = path.join(this.coverageDir, 'combined');
    this.threshold = parseFloat(process.env.COVERAGE_THRESHOLD || '80');
    this.config = this.loadConfig();
  }

  /**
   * 設定を読み込み
   */
  loadConfig() {
    return {
      threshold: this.threshold,
      ci: process.env.CI === 'true',
      debug: process.env.DEBUG === 'true',
      includeE2E: process.env.INCLUDE_E2E_COVERAGE === 'true',
      outputFormats: ['html', 'lcov', 'text', 'json'],
      trendsEnabled: process.env.COVERAGE_TRENDS === 'true'
    };
  }

  /**
   * メインの実行関数
   */
  async generate() {
    try {
      console.log('📊 カバレッジレポートの生成を開始します...');
      console.log(`🎯 カバレッジ閾値: ${this.threshold}%`);
      
      // 1. 環境準備
      await this.prepareEnvironment();
      
      // 2. カバレッジデータの収集
      const coverageData = await this.collectCoverageData();
      
      // 3. データの統合
      const combinedCoverage = await this.combineCoverageData(coverageData);
      
      // 4. レポートの生成
      await this.generateReports(combinedCoverage);
      
      // 5. 閾値の検証
      const validationResult = await this.validateThreshold(combinedCoverage);
      
      // 6. トレンド分析（有効な場合）
      if (this.config.trendsEnabled) {
        await this.generateTrendAnalysis(combinedCoverage);
      }
      
      // 7. 結果の表示
      this.displayResults(combinedCoverage, validationResult);
      
      // 8. CI/CD環境での処理
      if (this.config.ci) {
        await this.handleCIEnvironment(combinedCoverage, validationResult);
      }
      
      const success = validationResult.passed;
      console.log(`\n${success ? '✅' : '❌'} カバレッジレポート生成が${success ? '成功' : '失敗'}しました`);
      
      return { success, coverage: combinedCoverage, validation: validationResult };
      
    } catch (error) {
      console.error('🚨 カバレッジレポート生成中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 環境準備
   */
  async prepareEnvironment() {
    console.log('🔧 カバレッジ環境を準備中...');
    
    // 結合カバレッジディレクトリを作成
    await fs.mkdir(this.combinedDir, { recursive: true });
    
    // 必要なツールの確認
    try {
      execSync('npx nyc --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('📦 nycをインストール中...');
      execSync('npm install --save-dev nyc', { cwd: this.projectRoot });
    }
    
    console.log('✅ 環境準備完了');
  }

  /**
   * カバレッジデータを収集
   */
  async collectCoverageData() {
    console.log('📂 カバレッジデータを収集中...');
    
    const sources = [
      {
        name: 'jp2plantuml-unit',
        path: path.join(this.projectRoot, 'jp2plantuml', 'coverage')
      },
      {
        name: 'integration',
        path: path.join(this.coverageDir, 'integration')
      }
    ];
    
    const collectedData = {};
    
    for (const source of sources) {
      try {
        const coverageFiles = await this.findCoverageFiles(source.path);
        if (coverageFiles.length > 0) {
          collectedData[source.name] = {
            path: source.path,
            files: coverageFiles,
            data: await this.loadCoverageData(coverageFiles)
          };
          console.log(`✅ ${source.name}: ${coverageFiles.length}個のファイルを収集`);
        } else {
          console.warn(`⚠️ ${source.name}: カバレッジファイルが見つかりません`);
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name}の収集に失敗:`, error.message);
      }
    }
    
    return collectedData;
  }

  /**
   * カバレッジファイルを検索
   */
  async findCoverageFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findCoverageFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name === 'coverage-final.json' || entry.name === 'lcov.info') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return files;
  }

  /**
   * カバレッジデータを読み込み
   */
  async loadCoverageData(files) {
    const data = {
      json: [],
      lcov: []
    };
    
    for (const file of files) {
      try {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(file, 'utf8');
          data.json.push(JSON.parse(content));
        } else if (file.endsWith('.info')) {
          const content = await fs.readFile(file, 'utf8');
          data.lcov.push(content);
        }
      } catch (error) {
        console.warn(`⚠️ ファイル読み込みに失敗 (${file}):`, error.message);
      }
    }
    
    return data;
  }

  /**
   * カバレッジデータを統合
   */
  async combineCoverageData(collectedData) {
    console.log('🔄 カバレッジデータを統合中...');
    
    const combined = {
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      lines: { total: 0, covered: 0, pct: 0 },
      files: {},
      summary: {}
    };
    
    // 各ソースのデータを統合
    for (const [sourceName, sourceData] of Object.entries(collectedData)) {
      if (sourceData.data.json.length > 0) {
        await this.mergeJsonCoverage(combined, sourceData.data.json, sourceName);
      }
    }
    
    // パーセンテージを計算
    this.calculatePercentages(combined);
    
    // 統合されたデータを保存
    await this.saveCombinedCoverage(combined);
    
    console.log('✅ カバレッジデータの統合完了');
    return combined;
  }

  /**
   * JSONカバレッジデータをマージ
   */
  async mergeJsonCoverage(combined, jsonDataArray, sourceName) {
    for (const jsonData of jsonDataArray) {
      for (const [filePath, fileData] of Object.entries(jsonData)) {
        const normalizedPath = this.normalizePath(filePath);
        
        if (!combined.files[normalizedPath]) {
          combined.files[normalizedPath] = {
            statements: { total: 0, covered: 0, pct: 0 },
            branches: { total: 0, covered: 0, pct: 0 },
            functions: { total: 0, covered: 0, pct: 0 },
            lines: { total: 0, covered: 0, pct: 0 },
            sources: []
          };
        }
        
        // ファイルデータをマージ
        const fileStats = combined.files[normalizedPath];
        fileStats.sources.push(sourceName);
        
        // 各メトリクスを統合
        ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
          if (fileData[metric]) {
            fileStats[metric].total = Math.max(fileStats[metric].total, fileData[metric].total || 0);
            fileStats[metric].covered = Math.max(fileStats[metric].covered, fileData[metric].covered || 0);
          }
        });
      }
    }
  }

  /**
   * パスを正規化
   */
  normalizePath(filePath) {
    return path.resolve(filePath).replace(this.projectRoot, '');
  }

  /**
   * パーセンテージを計算
   */
  calculatePercentages(combined) {
    // ファイルレベルのパーセンテージ計算
    for (const fileData of Object.values(combined.files)) {
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        const { total, covered } = fileData[metric];
        fileData[metric].pct = total > 0 ? (covered / total) * 100 : 0;
      });
    }
    
    // 全体のパーセンテージ計算
    ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
      combined[metric].total = Object.values(combined.files)
        .reduce((sum, file) => sum + file[metric].total, 0);
      combined[metric].covered = Object.values(combined.files)
        .reduce((sum, file) => sum + file[metric].covered, 0);
      combined[metric].pct = combined[metric].total > 0 
        ? (combined[metric].covered / combined[metric].total) * 100 
        : 0;
    });
  }

  /**
   * 統合カバレッジを保存
   */
  async saveCombinedCoverage(combined) {
    // JSON形式で保存
    await fs.writeFile(
      path.join(this.combinedDir, 'coverage-final.json'),
      JSON.stringify(combined, null, 2)
    );
    
    // サマリー情報を保存
    const summary = {
      timestamp: new Date().toISOString(),
      statements: combined.statements.pct,
      branches: combined.branches.pct,
      functions: combined.functions.pct,
      lines: combined.lines.pct,
      threshold: this.threshold,
      fileCount: Object.keys(combined.files).length
    };
    
    await fs.writeFile(
      path.join(this.combinedDir, 'coverage-summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }

  /**
   * レポートを生成
   */
  async generateReports(combinedCoverage) {
    console.log('📋 カバレッジレポートを生成中...');
    
    // HTML レポートの生成
    await this.generateHTMLReport(combinedCoverage);
    
    // テキストレポートの生成
    await this.generateTextReport(combinedCoverage);
    
    // 日本語マークダウンレポートの生成
    await this.generateMarkdownReport(combinedCoverage);
    
    console.log('✅ レポート生成完了');
  }

  /**
   * HTMLレポートを生成
   */
  async generateHTMLReport(combined) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML カバレッジレポート</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .pass { color: #28a745; }
        .warn { color: #ffc107; }
        .fail { color: #dc3545; }
        .files-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .files-table th, .files-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e9ecef; }
        .files-table th { background: #f8f9fa; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PlantUML カバレッジレポート</h1>
        <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
        <p>閾値: ${this.threshold}%</p>
    </div>
    
    <div class="metrics">
        ${this.generateMetricHTML('ステートメント', combined.statements)}
        ${this.generateMetricHTML('ブランチ', combined.branches)}
        ${this.generateMetricHTML('関数', combined.functions)}
        ${this.generateMetricHTML('行', combined.lines)}
    </div>
    
    <h2>ファイル別カバレッジ</h2>
    <table class="files-table">
        <thead>
            <tr>
                <th>ファイル</th>
                <th>ステートメント</th>
                <th>ブランチ</th>
                <th>関数</th>
                <th>行</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(combined.files).map(([file, data]) => `
                <tr>
                    <td>${file}</td>
                    <td>${this.formatCoverageCell(data.statements)}</td>
                    <td>${this.formatCoverageCell(data.branches)}</td>
                    <td>${this.formatCoverageCell(data.functions)}</td>
                    <td>${this.formatCoverageCell(data.lines)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
    
    await fs.writeFile(path.join(this.combinedDir, 'index.html'), htmlContent);
  }

  /**
   * メトリクスHTMLを生成
   */
  generateMetricHTML(label, metric) {
    const statusClass = metric.pct >= this.threshold ? 'pass' : 
                       metric.pct >= this.threshold * 0.8 ? 'warn' : 'fail';
    
    return `
        <div class="metric">
            <div class="metric-value ${statusClass}">${metric.pct.toFixed(2)}%</div>
            <div class="metric-label">${label}</div>
            <div class="progress-bar">
                <div class="progress-fill ${statusClass}" style="width: ${metric.pct}%; background-color: ${
                  statusClass === 'pass' ? '#28a745' : statusClass === 'warn' ? '#ffc107' : '#dc3545'
                };"></div>
            </div>
            <small>${metric.covered}/${metric.total}</small>
        </div>
    `;
  }

  /**
   * カバレッジセルをフォーマット
   */
  formatCoverageCell(metric) {
    const pct = metric.pct.toFixed(2);
    const statusClass = metric.pct >= this.threshold ? 'pass' : 
                       metric.pct >= this.threshold * 0.8 ? 'warn' : 'fail';
    
    return `<span class="${statusClass}">${pct}% (${metric.covered}/${metric.total})</span>`;
  }

  /**
   * テキストレポートを生成
   */
  async generateTextReport(combined) {
    const content = `PlantUML カバレッジレポート
================================

生成日時: ${new Date().toLocaleString('ja-JP')}
閾値: ${this.threshold}%

全体のカバレッジ:
ステートメント: ${combined.statements.pct.toFixed(2)}% (${combined.statements.covered}/${combined.statements.total})
ブランチ: ${combined.branches.pct.toFixed(2)}% (${combined.branches.covered}/${combined.branches.total})
関数: ${combined.functions.pct.toFixed(2)}% (${combined.functions.covered}/${combined.functions.total})
行: ${combined.lines.pct.toFixed(2)}% (${combined.lines.covered}/${combined.lines.total})

ファイル数: ${Object.keys(combined.files).length}

${Object.entries(combined.files).map(([file, data]) => `
${file}:
  ステートメント: ${data.statements.pct.toFixed(2)}%
  ブランチ: ${data.branches.pct.toFixed(2)}%
  関数: ${data.functions.pct.toFixed(2)}%
  行: ${data.lines.pct.toFixed(2)}%
`).join('')}
`;
    
    await fs.writeFile(path.join(this.combinedDir, 'coverage-report.txt'), content);
  }

  /**
   * マークダウンレポートを生成
   */
  async generateMarkdownReport(combined) {
    const content = `# PlantUML カバレッジレポート

## 概要

- **生成日時**: ${new Date().toLocaleString('ja-JP')}
- **カバレッジ閾値**: ${this.threshold}%
- **対象ファイル数**: ${Object.keys(combined.files).length}

## 全体カバレッジ

| メトリクス | カバレッジ | カバー済み/総数 | 状態 |
|------------|------------|----------------|------|
| ステートメント | ${combined.statements.pct.toFixed(2)}% | ${combined.statements.covered}/${combined.statements.total} | ${this.getStatusIcon(combined.statements.pct)} |
| ブランチ | ${combined.branches.pct.toFixed(2)}% | ${combined.branches.covered}/${combined.branches.total} | ${this.getStatusIcon(combined.branches.pct)} |
| 関数 | ${combined.functions.pct.toFixed(2)}% | ${combined.functions.covered}/${combined.functions.total} | ${this.getStatusIcon(combined.functions.pct)} |
| 行 | ${combined.lines.pct.toFixed(2)}% | ${combined.lines.covered}/${combined.lines.total} | ${this.getStatusIcon(combined.lines.pct)} |

## ファイル別詳細

| ファイル | ステートメント | ブランチ | 関数 | 行 |
|----------|----------------|----------|------|-----|
${Object.entries(combined.files).map(([file, data]) => 
  `| ${file} | ${data.statements.pct.toFixed(1)}% | ${data.branches.pct.toFixed(1)}% | ${data.functions.pct.toFixed(1)}% | ${data.lines.pct.toFixed(1)}% |`
).join('\n')}

## 結論

${this.getCoverageConclusion(combined)}

---
*このレポートは自動生成されました*
`;
    
    await fs.writeFile(path.join(this.combinedDir, 'coverage-report.md'), content);
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(pct) {
    if (pct >= this.threshold) return '✅';
    if (pct >= this.threshold * 0.8) return '⚠️';
    return '❌';
  }

  /**
   * カバレッジの結論を取得
   */
  getCoverageConclusion(combined) {
    const metrics = [combined.statements, combined.branches, combined.functions, combined.lines];
    const allPass = metrics.every(m => m.pct >= this.threshold);
    const anyFail = metrics.some(m => m.pct < this.threshold * 0.8);
    
    if (allPass) {
      return '✅ すべてのメトリクスが閾値を満たしています。優秀なテストカバレッジです！';
    } else if (anyFail) {
      return '❌ いくつかのメトリクスが閾値を大きく下回っています。テストの追加を検討してください。';
    } else {
      return '⚠️ 一部のメトリクスが閾値を下回っています。テストの改善を推奨します。';
    }
  }

  /**
   * 閾値を検証
   */
  async validateThreshold(combined) {
    console.log('🎯 カバレッジ閾値を検証中...');
    
    const validationResult = {
      passed: true,
      failures: [],
      warnings: [],
      summary: {}
    };
    
    const metrics = {
      'ステートメント': combined.statements,
      'ブランチ': combined.branches,
      '関数': combined.functions,
      '行': combined.lines
    };
    
    for (const [name, metric] of Object.entries(metrics)) {
      const result = {
        name,
        value: metric.pct,
        threshold: this.threshold,
        status: 'pass'
      };
      
      if (metric.pct < this.threshold) {
        if (metric.pct < this.threshold * 0.8) {
          result.status = 'fail';
          validationResult.failures.push(result);
          validationResult.passed = false;
        } else {
          result.status = 'warn';
          validationResult.warnings.push(result);
        }
      }
      
      validationResult.summary[name] = result;
    }
    
    return validationResult;
  }

  /**
   * トレンド分析を生成
   */
  async generateTrendAnalysis(combined) {
    console.log('📈 カバレッジトレンド分析を生成中...');
    
    try {
      // 過去のカバレッジデータを読み込み
      const historyFile = path.join(this.combinedDir, 'coverage-history.json');
      let history = [];
      
      try {
        const historyContent = await fs.readFile(historyFile, 'utf8');
        history = JSON.parse(historyContent);
      } catch (error) {
        // 履歴ファイルが存在しない場合は新規作成
      }
      
      // 現在のデータを履歴に追加
      const currentEntry = {
        timestamp: new Date().toISOString(),
        statements: combined.statements.pct,
        branches: combined.branches.pct,
        functions: combined.functions.pct,
        lines: combined.lines.pct,
        fileCount: Object.keys(combined.files).length
      };
      
      history.push(currentEntry);
      
      // 履歴を最新30エントリに限定
      if (history.length > 30) {
        history = history.slice(-30);
      }
      
      // 履歴を保存
      await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
      
      // トレンドレポートを生成
      await this.generateTrendReport(history);
      
    } catch (error) {
      console.warn('⚠️ トレンド分析の生成に失敗:', error.message);
    }
  }

  /**
   * トレンドレポートを生成
   */
  async generateTrendReport(history) {
    if (history.length < 2) {
      console.log('📈 トレンド分析: データが不足しています（最低2回の実行が必要）');
      return;
    }
    
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const trends = {
      statements: latest.statements - previous.statements,
      branches: latest.branches - previous.branches,
      functions: latest.functions - previous.functions,
      lines: latest.lines - previous.lines
    };
    
    const trendReport = `# カバレッジトレンド分析

## 最新の変化

${Object.entries(trends).map(([metric, change]) => {
  const icon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  const sign = change > 0 ? '+' : '';
  return `- **${metric}**: ${icon} ${sign}${change.toFixed(2)}%`;
}).join('\n')}

## 履歴グラフ（直近${history.length}回）

\`\`\`
${this.generateAsciiChart(history)}
\`\`\`

## トレンド分析

${this.analyzeTrends(history)}
`;
    
    await fs.writeFile(path.join(this.combinedDir, 'coverage-trends.md'), trendReport);
  }

  /**
   * ASCIIチャートを生成
   */
  generateAsciiChart(history) {
    // 簡単なASCIIチャートを生成（実装は簡略化）
    return history.slice(-10).map((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleDateString('ja-JP');
      const avg = (entry.statements + entry.branches + entry.functions + entry.lines) / 4;
      const bar = '█'.repeat(Math.floor(avg / 5));
      return `${date}: ${bar} ${avg.toFixed(1)}%`;
    }).join('\n');
  }

  /**
   * トレンドを分析
   */
  analyzeTrends(history) {
    if (history.length < 3) return 'データが不足しているため、トレンド分析はできません。';
    
    const recent = history.slice(-5);
    const avgRecent = recent.reduce((sum, entry) => 
      sum + (entry.statements + entry.branches + entry.functions + entry.lines) / 4, 0) / recent.length;
    
    const older = history.slice(0, -5);
    const avgOlder = older.length > 0 ? 
      older.reduce((sum, entry) => 
        sum + (entry.statements + entry.branches + entry.functions + entry.lines) / 4, 0) / older.length : avgRecent;
    
    const trend = avgRecent - avgOlder;
    
    if (trend > 2) {
      return '📈 **改善傾向**: カバレッジが継続的に向上しています。優秀な開発プロセスです！';
    } else if (trend < -2) {
      return '📉 **低下傾向**: カバレッジが減少しています。テストの追加や見直しを検討してください。';
    } else {
      return '➡️ **安定傾向**: カバレッジは安定しています。現在の品質を維持してください。';
    }
  }

  /**
   * CI環境での処理
   */
  async handleCIEnvironment(combined, validationResult) {
    console.log('🤖 CI/CD環境用の処理を実行中...');
    
    // カバレッジバッジ用のデータを生成
    const badgeData = {
      schemaVersion: 1,
      label: 'coverage',
      message: `${combined.statements.pct.toFixed(1)}%`,
      color: validationResult.passed ? 'brightgreen' : 'red'
    };
    
    await fs.writeFile(
      path.join(this.combinedDir, 'coverage-badge.json'),
      JSON.stringify(badgeData, null, 2)
    );
    
    // CI用のサマリーファイルを生成
    const ciSummary = {
      success: validationResult.passed,
      coverage: {
        statements: combined.statements.pct,
        branches: combined.branches.pct,
        functions: combined.functions.pct,
        lines: combined.lines.pct
      },
      threshold: this.threshold,
      failures: validationResult.failures,
      warnings: validationResult.warnings
    };
    
    await fs.writeFile(
      path.join(this.combinedDir, 'ci-summary.json'),
      JSON.stringify(ciSummary, null, 2)
    );
  }

  /**
   * 結果を表示
   */
  displayResults(combined, validationResult) {
    console.log('\n📊 カバレッジレポート結果:');
    console.log('================================');
    
    console.log('全体カバレッジ:');
    console.log(`  ステートメント: ${combined.statements.pct.toFixed(2)}% ${this.getStatusIcon(combined.statements.pct)}`);
    console.log(`  ブランチ: ${combined.branches.pct.toFixed(2)}% ${this.getStatusIcon(combined.branches.pct)}`);
    console.log(`  関数: ${combined.functions.pct.toFixed(2)}% ${this.getStatusIcon(combined.functions.pct)}`);
    console.log(`  行: ${combined.lines.pct.toFixed(2)}% ${this.getStatusIcon(combined.lines.pct)}`);
    
    console.log(`\n閾値検証: ${validationResult.passed ? '✅ 合格' : '❌ 不合格'}`);
    
    if (validationResult.failures.length > 0) {
      console.log('\n❌ 閾値を下回った項目:');
      validationResult.failures.forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.value.toFixed(2)}% (閾値: ${failure.threshold}%)`);
      });
    }
    
    if (validationResult.warnings.length > 0) {
      console.log('\n⚠️ 注意が必要な項目:');
      validationResult.warnings.forEach(warning => {
        console.log(`  - ${warning.name}: ${warning.value.toFixed(2)}% (閾値: ${warning.threshold}%)`);
      });
    }
    
    console.log(`\n📁 レポート保存先: ${this.combinedDir}`);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
PlantUML カバレッジレポート生成ツール

使用方法:
  node scripts/coverage-report.js [オプション]

環境変数:
  COVERAGE_THRESHOLD      カバレッジ閾値 (デフォルト: 80)
  INCLUDE_E2E_COVERAGE    E2Eカバレッジを含める (true/false)
  COVERAGE_TRENDS         トレンド分析を有効にする (true/false)
  CI                      CI環境フラグ
  DEBUG                   デバッグモード

出力ファイル:
  - coverage/combined/index.html          HTMLレポート
  - coverage/combined/coverage-report.md  マークダウンレポート
  - coverage/combined/coverage-report.txt テキストレポート
  - coverage/combined/coverage-final.json JSONデータ
  - coverage/combined/ci-summary.json     CI用サマリー
    `);
    process.exit(0);
  }
  
  const reporter = new CoverageReporter();
  reporter.generate()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('カバレッジレポート生成に失敗:', error);
      process.exit(1);
    });
}

module.exports = CoverageReporter;