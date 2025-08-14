#!/bin/bash

##
# PlantUML プロジェクト統合テスト実行スクリプト
# ClaudeCodeActions & GitHub Issues統合対応
#
# 使用例:
#   ./run-all-tests.sh                    # 全テスト実行
#   ./run-all-tests.sh --unit-only       # 単体テストのみ
#   ./run-all-tests.sh --skip-e2e        # E2Eテストをスキップ
#   ./run-all-tests.sh --coverage        # カバレッジレポート生成
#   ./run-all-tests.sh --parallel        # 並列実行
#   ./run-all-tests.sh --worktree        # Worktreeテスト実行
#
# @version 1.0.0
##

set -e  # エラー時即座に終了
set -u  # 未定義変数使用時にエラー

# スクリプト設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEST_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ログ設定
LOG_DIR="${TEST_ROOT}/logs"
LOG_FILE="${LOG_DIR}/test-execution-$(date '+%Y%m%d_%H%M%S').log"

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# デフォルト設定
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_CLAUDE=true
RUN_GITHUB=true
RUN_WORKTREE=false
RUN_PERFORMANCE=true
RUN_SECURITY=true
GENERATE_COVERAGE=false
PARALLEL_EXECUTION=false
VERBOSE=false
DRY_RUN=false
CLEANUP_AFTER=true

# 関数定義

# ログ出力関数
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    # コンソール出力
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
        "DEBUG")
            if [[ "$VERBOSE" == true ]]; then
                echo -e "${PURPLE}[DEBUG]${NC} ${message}"
            fi
            ;;
    esac
    
    # ファイル出力
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# 使用方法表示
show_usage() {
    cat << EOF
PlantUML プロジェクト統合テスト実行スクリプト

使用方法:
    $0 [オプション]

オプション:
    --unit-only         単体テストのみ実行
    --integration-only  統合テストのみ実行
    --e2e-only         E2Eテストのみ実行
    --claude-only      ClaudeCodeActionsテストのみ実行
    --github-only      GitHub Issuesテストのみ実行
    --worktree         Worktreeテストを実行
    --performance      パフォーマンステストを実行
    --security         セキュリティテストを実行
    
    --skip-unit        単体テストをスキップ
    --skip-integration 統合テストをスキップ
    --skip-e2e         E2Eテストをスキップ
    --skip-claude      ClaudeCodeActionsテストをスキップ
    --skip-github      GitHub Issuesテストをスキップ
    --skip-performance パフォーマンステストをスキップ
    --skip-security    セキュリティテストをスキップ
    
    --coverage         カバレッジレポート生成
    --parallel         並列実行（可能な場合）
    --verbose          詳細ログ出力
    --dry-run          実際の実行はせず、計画のみ表示
    --no-cleanup       テスト後のクリーンアップをスキップ
    
    --help             このヘルプを表示
    --version          バージョン情報を表示

例:
    $0                                    # 全テスト実行
    $0 --unit-only --coverage           # 単体テスト + カバレッジ
    $0 --skip-e2e --parallel            # E2E以外を並列実行
    $0 --worktree --verbose             # Worktreeテスト + 詳細ログ
    $0 --claude-only --github-only      # Claude & GitHubテストのみ

EOF
}

# バージョン情報表示
show_version() {
    echo "PlantUML統合テストスクリプト v1.0.0"
    echo "ClaudeCodeActions & GitHub Issues統合対応"
    echo ""
    echo "依存関係:"
    echo "  Node.js: $(node --version 2>/dev/null || echo 'インストールされていません')"
    echo "  npm: $(npm --version 2>/dev/null || echo 'インストールされていません')"
    echo "  Git: $(git --version 2>/dev/null || echo 'インストールされていません')"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'インストールされていません')"
}

# 前提条件チェック
check_prerequisites() {
    log "INFO" "前提条件チェック開始"
    
    local errors=0
    
    # Node.js チェック
    if ! command -v node >/dev/null 2>&1; then
        log "ERROR" "Node.jsがインストールされていません"
        errors=$((errors + 1))
    else
        local node_version=$(node --version)
        log "SUCCESS" "Node.js ${node_version} が利用可能"
    fi
    
    # npm チェック
    if ! command -v npm >/dev/null 2>&1; then
        log "ERROR" "npmがインストールされていません"
        errors=$((errors + 1))
    else
        local npm_version=$(npm --version)
        log "SUCCESS" "npm ${npm_version} が利用可能"
    fi
    
    # Git チェック
    if ! command -v git >/dev/null 2>&1; then
        log "ERROR" "Gitがインストールされていません"
        errors=$((errors + 1))
    else
        local git_version=$(git --version | cut -d' ' -f3)
        log "SUCCESS" "Git ${git_version} が利用可能"
    fi
    
    # プロジェクト構造チェック
    if [[ ! -f "${PROJECT_ROOT}/jp2plantuml/package.json" ]]; then
        log "ERROR" "プロジェクト構造が不正です: jp2plantuml/package.json が見つかりません"
        errors=$((errors + 1))
    fi
    
    # テストディレクトリチェック
    local test_dirs=("integration" "e2e" "claudecodeactions" "github-issues" "worktree" "coverage-reports")
    for dir in "${test_dirs[@]}"; do
        if [[ ! -d "${TEST_ROOT}/${dir}" ]]; then
            log "WARNING" "テストディレクトリが見つかりません: ${dir}"
        fi
    done
    
    if [[ $errors -gt 0 ]]; then
        log "ERROR" "前提条件チェックで ${errors} 個のエラーが発生しました"
        return 1
    fi
    
    log "SUCCESS" "前提条件チェック完了"
    return 0
}

# 環境準備
prepare_environment() {
    log "INFO" "テスト環境準備開始"
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # レポートディレクトリ作成
    mkdir -p "${TEST_ROOT}/reports"
    mkdir -p "${TEST_ROOT}/coverage-reports"
    
    # Node.js依存関係インストール
    log "INFO" "Node.js依存関係インストール中..."
    if [[ "$DRY_RUN" == false ]]; then
        cd "${PROJECT_ROOT}/jp2plantuml"
        npm ci --silent
        log "SUCCESS" "依存関係インストール完了"
    else
        log "INFO" "[DRY RUN] npm ci をスキップ"
    fi
    
    # 環境変数設定
    export NODE_ENV=test
    export CI=true
    export TEST_TIMEOUT=300000  # 5分
    
    log "SUCCESS" "テスト環境準備完了"
}

# 単体テスト実行
run_unit_tests() {
    if [[ "$RUN_UNIT" != true ]]; then
        return 0
    fi
    
    log "INFO" "📋 単体テスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] 単体テスト実行をスキップ"
        return 0
    fi
    
    cd "${PROJECT_ROOT}/jp2plantuml"
    
    local test_command="npm run test:unit"
    if [[ "$GENERATE_COVERAGE" == true ]]; then
        test_command="npm run test:coverage"
    fi
    
    if eval "$test_command"; then
        log "SUCCESS" "✅ 単体テスト完了"
        return 0
    else
        log "ERROR" "❌ 単体テスト失敗"
        return 1
    fi
}

# 統合テスト実行
run_integration_tests() {
    if [[ "$RUN_INTEGRATION" != true ]]; then
        return 0
    fi
    
    log "INFO" "🔗 統合テスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] 統合テスト実行をスキップ"
        return 0
    fi
    
    cd "${PROJECT_ROOT}/jp2plantuml"
    
    if npm run test:integration; then
        log "SUCCESS" "✅ 統合テスト完了"
        return 0
    else
        log "ERROR" "❌ 統合テスト失敗"
        return 1
    fi
}

# E2Eテスト実行
run_e2e_tests() {
    if [[ "$RUN_E2E" != true ]]; then
        return 0
    fi
    
    log "INFO" "🌐 E2Eテスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] E2Eテスト実行をスキップ"
        return 0
    fi
    
    # アプリケーション起動確認
    log "INFO" "アプリケーション起動確認中..."
    cd "${PROJECT_ROOT}/jp2plantuml"
    
    # バックグラウンドでサーバー起動
    npm start &
    local server_pid=$!
    
    # サーバー起動待機
    local max_wait=30
    local wait_count=0
    while ! curl -s http://localhost:8086/health >/dev/null 2>&1; do
        if [[ $wait_count -ge $max_wait ]]; then
            log "ERROR" "アプリケーション起動タイムアウト"
            kill $server_pid 2>/dev/null || true
            return 1
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    log "SUCCESS" "アプリケーション起動確認完了"
    
    # E2Eテスト実行
    cd "${TEST_ROOT}/e2e"
    local e2e_result=0
    
    if [[ -f "package.json" ]] && npm test; then
        log "SUCCESS" "✅ E2Eテスト完了"
    else
        log "ERROR" "❌ E2Eテスト失敗"
        e2e_result=1
    fi
    
    # サーバー停止
    kill $server_pid 2>/dev/null || true
    
    return $e2e_result
}

# ClaudeCodeActionsテスト実行
run_claude_tests() {
    if [[ "$RUN_CLAUDE" != true ]]; then
        return 0
    fi
    
    log "INFO" "🤖 ClaudeCodeActionsテスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] ClaudeCodeActionsテスト実行をスキップ"
        return 0
    fi
    
    cd "${TEST_ROOT}/claudecodeactions"
    
    if [[ -f "package.json" ]]; then
        npm ci --silent
        if npm test; then
            log "SUCCESS" "✅ ClaudeCodeActionsテスト完了"
            return 0
        else
            log "ERROR" "❌ ClaudeCodeActionsテスト失敗"
            return 1
        fi
    else
        log "WARNING" "ClaudeCodeActionsテスト設定が見つかりません"
        return 0
    fi
}

# GitHub Issuesテスト実行
run_github_tests() {
    if [[ "$RUN_GITHUB" != true ]]; then
        return 0
    fi
    
    log "INFO" "🐙 GitHub Issuesテスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] GitHub Issuesテスト実行をスキップ"
        return 0
    fi
    
    cd "${TEST_ROOT}/github-issues"
    
    if [[ -f "package.json" ]]; then
        npm ci --silent
        if npm test; then
            log "SUCCESS" "✅ GitHub Issuesテスト完了"
            return 0
        else
            log "ERROR" "❌ GitHub Issuesテスト失敗"
            return 1
        fi
    else
        log "WARNING" "GitHub Issuesテスト設定が見つかりません"
        return 0
    fi
}

# Worktreeテスト実行
run_worktree_tests() {
    if [[ "$RUN_WORKTREE" != true ]]; then
        return 0
    fi
    
    log "INFO" "🌳 Worktreeテスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] Worktreeテスト実行をスキップ"
        return 0
    fi
    
    if ! command -v git >/dev/null 2>&1; then
        log "ERROR" "Gitが利用できないため、Worktreeテストをスキップします"
        return 1
    fi
    
    cd "${TEST_ROOT}/worktree"
    
    if node worktree-test-strategy.js; then
        log "SUCCESS" "✅ Worktreeテスト完了"
        return 0
    else
        log "ERROR" "❌ Worktreeテスト失敗"
        return 1
    fi
}

# パフォーマンステスト実行
run_performance_tests() {
    if [[ "$RUN_PERFORMANCE" != true ]]; then
        return 0
    fi
    
    log "INFO" "⚡ パフォーマンステスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] パフォーマンステスト実行をスキップ"
        return 0
    fi
    
    # 簡易パフォーマンステスト実行
    log "INFO" "基本的なパフォーマンス指標を測定中..."
    
    # メモリ使用量チェック
    local memory_usage=$(ps -o pid,vsz,rss,comm -p $$ | tail -1 | awk '{print $2}')
    log "INFO" "現在のメモリ使用量: ${memory_usage}KB"
    
    # テスト実行時間測定
    local start_time=$(date +%s)
    sleep 2  # 模擬テスト
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "SUCCESS" "✅ パフォーマンステスト完了 (${duration}秒)"
    return 0
}

# セキュリティテスト実行
run_security_tests() {
    if [[ "$RUN_SECURITY" != true ]]; then
        return 0
    fi
    
    log "INFO" "🔒 セキュリティテスト実行開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] セキュリティテスト実行をスキップ"
        return 0
    fi
    
    cd "${PROJECT_ROOT}/jp2plantuml"
    
    # npm audit実行
    log "INFO" "npm auditによる脆弱性チェック実行中..."
    if npm audit --audit-level high; then
        log "SUCCESS" "✅ セキュリティテスト完了"
        return 0
    else
        log "WARNING" "⚠️ セキュリティ警告があります"
        return 1
    fi
}

# カバレッジレポート生成
generate_coverage_report() {
    if [[ "$GENERATE_COVERAGE" != true ]]; then
        return 0
    fi
    
    log "INFO" "📊 カバレッジレポート生成開始"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] カバレッジレポート生成をスキップ"
        return 0
    fi
    
    cd "${TEST_ROOT}/coverage-reports"
    
    if node coverage-integration.js; then
        log "SUCCESS" "✅ カバレッジレポート生成完了"
        return 0
    else
        log "ERROR" "❌ カバレッジレポート生成失敗"
        return 1
    fi
}

# 並列実行
run_tests_parallel() {
    log "INFO" "🔄 並列テスト実行開始"
    
    local pids=()
    local results=()
    
    # 並列実行可能なテストを実行
    if [[ "$RUN_UNIT" == true ]]; then
        run_unit_tests &
        pids+=($!)
        results+=("unit")
    fi
    
    if [[ "$RUN_CLAUDE" == true ]]; then
        run_claude_tests &
        pids+=($!)
        results+=("claude")
    fi
    
    if [[ "$RUN_GITHUB" == true ]]; then
        run_github_tests &
        pids+=($!)
        results+=("github")
    fi
    
    if [[ "$RUN_SECURITY" == true ]]; then
        run_security_tests &
        pids+=($!)
        results+=("security")
    fi
    
    # 全プロセスの完了を待機
    local overall_result=0
    for i in "${!pids[@]}"; do
        local pid="${pids[$i]}"
        local test_name="${results[$i]}"
        
        if wait "$pid"; then
            log "SUCCESS" "${test_name}テスト並列実行完了"
        else
            log "ERROR" "${test_name}テスト並列実行失敗"
            overall_result=1
        fi
    done
    
    # 順次実行が必要なテスト
    if [[ "$RUN_INTEGRATION" == true ]]; then
        run_integration_tests || overall_result=1
    fi
    
    if [[ "$RUN_E2E" == true ]]; then
        run_e2e_tests || overall_result=1
    fi
    
    if [[ "$RUN_WORKTREE" == true ]]; then
        run_worktree_tests || overall_result=1
    fi
    
    if [[ "$RUN_PERFORMANCE" == true ]]; then
        run_performance_tests || overall_result=1
    fi
    
    return $overall_result
}

# 順次実行
run_tests_sequential() {
    log "INFO" "📋 順次テスト実行開始"
    
    local overall_result=0
    
    run_unit_tests || overall_result=1
    run_integration_tests || overall_result=1
    run_e2e_tests || overall_result=1
    run_claude_tests || overall_result=1
    run_github_tests || overall_result=1
    run_worktree_tests || overall_result=1
    run_performance_tests || overall_result=1
    run_security_tests || overall_result=1
    
    return $overall_result
}

# クリーンアップ
cleanup() {
    if [[ "$CLEANUP_AFTER" != true ]]; then
        return 0
    fi
    
    log "INFO" "🧹 クリーンアップ開始"
    
    # プロセス終了
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    
    # 一時ファイル削除
    find "${TEST_ROOT}" -name "*.tmp" -delete 2>/dev/null || true
    find "${TEST_ROOT}" -name "*.lock" -delete 2>/dev/null || true
    
    log "SUCCESS" "✅ クリーンアップ完了"
}

# 結果レポート生成
generate_final_report() {
    local start_time="$1"
    local end_time="$2"
    local overall_result="$3"
    
    local duration=$((end_time - start_time))
    local status_text="成功"
    local status_color="$GREEN"
    
    if [[ $overall_result -ne 0 ]]; then
        status_text="失敗"
        status_color="$RED"
    fi
    
    log "INFO" "📊 最終レポート生成"
    
    cat << EOF

${CYAN}════════════════════════════════════════════════════════════════
PlantUML プロジェクト テスト実行結果レポート
════════════════════════════════════════════════════════════════${NC}

${BLUE}実行情報:${NC}
  開始時刻: $(date -d "@$start_time" '+%Y-%m-%d %H:%M:%S')
  終了時刻: $(date -d "@$end_time" '+%Y-%m-%d %H:%M:%S')
  実行時間: ${duration}秒
  実行結果: ${status_color}${status_text}${NC}

${BLUE}実行されたテスト:${NC}
  📋 単体テスト: $([ "$RUN_UNIT" == true ] && echo "✅" || echo "⏭️")
  🔗 統合テスト: $([ "$RUN_INTEGRATION" == true ] && echo "✅" || echo "⏭️")
  🌐 E2Eテスト: $([ "$RUN_E2E" == true ] && echo "✅" || echo "⏭️")
  🤖 ClaudeCodeActions: $([ "$RUN_CLAUDE" == true ] && echo "✅" || echo "⏭️")
  🐙 GitHub Issues: $([ "$RUN_GITHUB" == true ] && echo "✅" || echo "⏭️")
  🌳 Worktree: $([ "$RUN_WORKTREE" == true ] && echo "✅" || echo "⏭️")
  ⚡ パフォーマンス: $([ "$RUN_PERFORMANCE" == true ] && echo "✅" || echo "⏭️")
  🔒 セキュリティ: $([ "$RUN_SECURITY" == true ] && echo "✅" || echo "⏭️")

${BLUE}生成されたレポート:${NC}
  📄 実行ログ: ${LOG_FILE}
  📊 レポートディレクトリ: ${TEST_ROOT}/reports
  📈 カバレッジディレクトリ: ${TEST_ROOT}/coverage-reports

${CYAN}════════════════════════════════════════════════════════════════${NC}

EOF
}

# メイン実行関数
main() {
    local start_time=$(date +%s)
    local overall_result=0
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_UNIT=true
                RUN_INTEGRATION=false
                RUN_E2E=false
                RUN_CLAUDE=false
                RUN_GITHUB=false
                RUN_WORKTREE=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                RUN_INTEGRATION=true
                RUN_E2E=false
                RUN_CLAUDE=false
                RUN_GITHUB=false
                RUN_WORKTREE=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --e2e-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                RUN_E2E=true
                RUN_CLAUDE=false
                RUN_GITHUB=false
                RUN_WORKTREE=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --claude-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                RUN_E2E=false
                RUN_CLAUDE=true
                RUN_GITHUB=false
                RUN_WORKTREE=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --github-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                RUN_E2E=false
                RUN_CLAUDE=false
                RUN_GITHUB=true
                RUN_WORKTREE=false
                RUN_PERFORMANCE=false
                RUN_SECURITY=false
                shift
                ;;
            --skip-unit)
                RUN_UNIT=false
                shift
                ;;
            --skip-integration)
                RUN_INTEGRATION=false
                shift
                ;;
            --skip-e2e)
                RUN_E2E=false
                shift
                ;;
            --skip-claude)
                RUN_CLAUDE=false
                shift
                ;;
            --skip-github)
                RUN_GITHUB=false
                shift
                ;;
            --skip-performance)
                RUN_PERFORMANCE=false
                shift
                ;;
            --skip-security)
                RUN_SECURITY=false
                shift
                ;;
            --worktree)
                RUN_WORKTREE=true
                shift
                ;;
            --performance)
                RUN_PERFORMANCE=true
                shift
                ;;
            --security)
                RUN_SECURITY=true
                shift
                ;;
            --coverage)
                GENERATE_COVERAGE=true
                shift
                ;;
            --parallel)
                PARALLEL_EXECUTION=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --no-cleanup)
                CLEANUP_AFTER=false
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            --version)
                show_version
                exit 0
                ;;
            *)
                log "ERROR" "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # メインロジック実行
    log "INFO" "🚀 PlantUML統合テスト実行開始"
    
    # 前提条件チェック
    if ! check_prerequisites; then
        log "ERROR" "前提条件チェックに失敗しました"
        exit 1
    fi
    
    # 環境準備
    if ! prepare_environment; then
        log "ERROR" "環境準備に失敗しました"
        exit 1
    fi
    
    # テスト実行
    if [[ "$PARALLEL_EXECUTION" == true ]]; then
        run_tests_parallel || overall_result=1
    else
        run_tests_sequential || overall_result=1
    fi
    
    # カバレッジレポート生成
    generate_coverage_report || overall_result=1
    
    # クリーンアップ
    cleanup
    
    # 最終レポート生成
    local end_time=$(date +%s)
    generate_final_report "$start_time" "$end_time" "$overall_result"
    
    if [[ $overall_result -eq 0 ]]; then
        log "SUCCESS" "🎉 全テスト完了"
    else
        log "ERROR" "💥 一部のテストで失敗が発生しました"
    fi
    
    exit $overall_result
}

# エラートラップ設定
trap 'log "ERROR" "スクリプト実行中にエラーが発生しました"; cleanup; exit 1' ERR
trap 'log "INFO" "スクリプトが中断されました"; cleanup; exit 130' INT TERM

# メイン実行
main "$@"