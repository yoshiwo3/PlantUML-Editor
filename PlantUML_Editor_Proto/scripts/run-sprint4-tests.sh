#!/bin/bash
# Sprint4 テストシナリオ実行スクリプト
# 39 SP - 完全実装版

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 設定
TEST_GROUP="${1:-critical}"
WORKERS="${2:-4}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="test-results/sprint4-$TIMESTAMP"

log_info "🚀 Starting Sprint4 Test Scenario Execution (39 SP)"
echo "================================================="
echo "Test Group: $TEST_GROUP"
echo "Workers: $WORKERS"
echo "Results Directory: $RESULTS_DIR"
echo "================================================="

# 結果ディレクトリ準備
mkdir -p "$RESULTS_DIR"

# Phase 1: ブラウザテスト基盤実行 (13 SP)
log_info "📋 Phase 1: Browser Test Foundation (13 SP)"

log_info "TEST-006-1: Browser Matrix Execution"
docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:browser-matrix -- --group=$TEST_GROUP

log_info "TEST-006-2: Parallel Execution Test"
./scripts/deploy-swarm.sh
sleep 30 # Swarm起動待機

log_info "TEST-006-3: Browser-specific Tests"
docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:browser-specific

log_info "TEST-006-4: Allure Report Integration"
docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:allure-integration

log_success "✅ Phase 1 Completed - Browser Test Foundation"

# Phase 2: クリティカルパステスト実行 (13 SP)
log_info "📋 Phase 2: Critical Path Tests (13 SP)"

log_info "TEST-008: Basic Conversion Flow Tests (10 scenarios)"
docker-compose -f docker-compose.swarm.yml run --rm playwright npx playwright test tests/scenarios/critical-path/conversion-flow.spec.js --workers=$WORKERS

log_info "TEST-009: Edit Features Tests (7 elements)"
docker-compose -f docker-compose.swarm.yml run --rm playwright npx playwright test tests/scenarios/critical-path/edit-features.spec.js --workers=$WORKERS

log_info "TEST-010: Export Features Tests (8 formats)"
docker-compose -f docker-compose.swarm.yml run --rm playwright npx playwright test tests/scenarios/critical-path/export-features.spec.js --workers=$WORKERS

log_success "✅ Phase 2 Completed - Critical Path Tests"

# Phase 3: ユーザージャーニーテスト実行 (13 SP)
log_info "📋 Phase 3: User Journey Tests (13 SP)"

if [ "$TEST_GROUP" = "full" ] || [ "$TEST_GROUP" = "user-journey" ]; then
    log_info "TEST-011: First-time User Flow"
    docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:first-user-flow
    
    log_info "TEST-012: Power User Flow (100+ elements)"
    docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:power-user-flow
    
    log_info "TEST-013: Collaboration Flow"
    docker-compose -f docker-compose.swarm.yml run --rm playwright npm run test:collaboration-flow
    
    log_success "✅ Phase 3 Completed - User Journey Tests"
else
    log_warning "⏸️  Phase 3 Skipped (use --group=full to include)"
fi

# 結果収集・集約
log_info "📊 Collecting and Aggregating Results"

# 各ワーカーから結果収集
for worker in {1..4}; do
    worker_results="test-results/worker-$worker"
    if [ -d "$worker_results" ]; then
        cp -r "$worker_results" "$RESULTS_DIR/"
        log_info "Collected results from worker-$worker"
    fi
done

# Allure結果収集
if [ -d "test-results/allure-results" ]; then
    cp -r "test-results/allure-results" "$RESULTS_DIR/"
fi

# レポート集約実行
log_info "🎨 Generating Integrated Reports"
./scripts/aggregate-reports.sh

# 統計レポート生成
log_info "📈 Generating Statistics Report"

cat > "$RESULTS_DIR/sprint4-summary.md" << EOF
# Sprint4 テストシナリオ実行結果

## 実行概要
- **実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
- **テストグループ**: $TEST_GROUP
- **並列ワーカー数**: $WORKERS
- **総実装SP**: 39 SP

## Phase 別実行結果

### Phase 1: ブラウザテスト基盤 (13 SP)
- ✅ TEST-006-1: ブラウザマトリックス定義 (2 SP)
- ✅ TEST-006-2: 並列実行環境構築 (5 SP)
- ✅ TEST-006-3: ブラウザ固有テスト実装 (3 SP)
- ✅ TEST-006-4: レポート統合 (3 SP)

### Phase 2: クリティカルパステスト (13 SP)
- ✅ TEST-008: 基本変換フローテスト (4 SP) - 10件のクリティカルパス
- ✅ TEST-009: 編集機能テスト (5 SP) - インライン編集7要素
- ✅ TEST-010: エクスポート機能テスト (4 SP) - PNG/SVG/PDF対応

### Phase 3: ユーザージャーニーテスト (13 SP)
$(if [ "$TEST_GROUP" = "full" ]; then echo "- ✅ TEST-011: 初回利用者フロー (4 SP)"; echo "- ✅ TEST-012: パワーユーザーフロー (5 SP)"; echo "- ✅ TEST-013: コラボレーションフロー (4 SP)"; else echo "- ⏸️  Phase 3: スキップ (--group=full で実行)"; fi)

## 技術仕様
- **ブラウザ対応**: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **デバイス対応**: Desktop, Tablet, Mobile (レスポンシブ)
- **並列実行**: Docker Swarm + 4 Workers
- **レポート形式**: Allure, HTML, JSON, JUnit XML
- **日本語対応**: 完全UTF-8サポート

## 品質メトリクス
- **Target Coverage**: 80%以上
- **Target Success Rate**: 95%以上
- **Performance Threshold**: <100ms同期レスポンス
- **Browser Compatibility**: 4ブラウザ100%対応

## 生成ファイル
- \`test-results/integrated-report/index.html\` - 統合レポート
- \`test-results/allure-report/index.html\` - Allure詳細レポート
- \`test-results/html-report/index.html\` - Playwright標準レポート
- \`test-results/coverage/index.html\` - カバレッジレポート

## 次のステップ
1. 失敗テストの詳細分析
2. パフォーマンスボトルネックの特定
3. ブラウザ固有問題の対策
4. CI/CDパイプラインへの統合

---
*Generated by webapp-test-automation specialist - Sprint4 Test Implementation*
EOF

# 実行統計表示
log_info "📊 Execution Statistics"
echo ""
echo "📁 Results Location: $RESULTS_DIR"
echo "📊 Summary Report: $RESULTS_DIR/sprint4-summary.md"
echo "🎯 Integrated Report: test-results/integrated-report/index.html"
echo ""

# Swarm環境のクリーンアップ
if [ "$3" = "--cleanup" ]; then
    log_info "🧹 Cleaning up Docker Swarm environment"
    ./scripts/cleanup-swarm.sh
fi

# 成功メトリクス表示
if [ -f "$RESULTS_DIR/merged-results.json" ]; then
    log_info "📈 Test Metrics"
    echo "=================="
    
    if command -v jq &> /dev/null; then
        cat "$RESULTS_DIR/merged-results.json" | jq -r '
            "Total Tests: " + (.summary.total | tostring) + 
            "\nPassed: " + (.summary.passed | tostring) + 
            "\nFailed: " + (.summary.failed | tostring) + 
            "\nSuccess Rate: " + (.summary.successRate | tostring) + "%" +
            "\nExecution Time: " + ((.summary.duration / 1000 / 60) | floor | tostring) + "m"
        '
    else
        echo "Detailed metrics available in: $RESULTS_DIR/merged-results.json"
    fi
fi

log_success "🎉 Sprint4 Test Scenario Execution Completed!"
echo ""
echo "🚀 Total Story Points Implemented: 39 SP"
echo "📋 Total Test Scenarios: 28+ scenarios"
echo "🌐 Browser Coverage: 4 browsers × multiple devices"
echo "⚡ Parallel Execution: 4 workers"
echo "📊 Reports Generated: Integrated, Allure, Coverage, Performance"
echo ""
echo "Next: Review test results and address any failures"
echo "Dashboard: open test-results/integrated-report/index.html"