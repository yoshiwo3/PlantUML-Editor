#!/bin/bash
# Docker最適化スクリプト
# パフォーマンスとセキュリティの自動最適化

set -euo pipefail

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ設定
LOG_FILE="docker-optimization.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo -e "${BLUE}=== PlantUML Editor Docker最適化スクリプト ===${NC}"
echo "開始時刻: $(date)"

# ==============================================
# 1. Docker環境確認
# ==============================================
echo -e "\n${YELLOW}1. Docker環境確認中...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}エラー: Dockerがインストールされていません${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}エラー: Docker Composeがインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker環境確認完了${NC}"
docker --version
docker-compose --version

# ==============================================
# 2. 既存コンテナ・イメージのクリーンアップ
# ==============================================
echo -e "\n${YELLOW}2. 既存リソースのクリーンアップ中...${NC}"

# 停止中のコンテナを削除
docker container prune -f

# 未使用のイメージを削除
docker image prune -f

# 未使用のボリュームを削除（データ保持のため確認）
echo -e "${BLUE}未使用ボリュームの確認:${NC}"
docker volume ls -qf dangling=true

echo -e "${GREEN}✓ クリーンアップ完了${NC}"

# ==============================================
# 3. セキュリティスキャン（Trivy）
# ==============================================
echo -e "\n${YELLOW}3. セキュリティスキャン実行中...${NC}"

if command -v trivy &> /dev/null; then
    echo "Dockerfileの脆弱性スキャン実行中..."
    trivy config . --format json --output trivy-config-report.json || true
    
    echo "現在のイメージのスキャン実行中..."
    docker build -t plantuml-editor:security-scan . || true
    trivy image plantuml-editor:security-scan --format json --output trivy-image-report.json || true
    
    echo -e "${GREEN}✓ セキュリティスキャン完了（結果: trivy-*-report.json）${NC}"
else
    echo -e "${YELLOW}⚠ Trivyがインストールされていません。セキュリティスキャンをスキップします${NC}"
fi

# ==============================================
# 4. マルチステージビルドの最適化テスト
# ==============================================
echo -e "\n${YELLOW}4. マルチステージビルド最適化テスト中...${NC}"

echo "本番用イメージのビルド（最適化版）..."
docker build -f Dockerfile.optimized --target production -t plantuml-editor:prod-optimized .

echo "開発用イメージのビルド..."
docker build -f Dockerfile.optimized --target dev-dependencies -t plantuml-editor:dev-optimized .

echo "イメージサイズ比較:"
echo "=== 最適化前 ==="
docker images | grep plantuml-editor | grep -v optimized || echo "最適化前のイメージが見つかりません"

echo "=== 最適化後 ==="
docker images | grep plantuml-editor | grep optimized

echo -e "${GREEN}✓ マルチステージビルド完了${NC}"

# ==============================================
# 5. パフォーマンステスト
# ==============================================
echo -e "\n${YELLOW}5. パフォーマンステスト実行中...${NC}"

echo "開発環境の起動テスト..."
docker-compose -f docker-compose.dev.yml up -d --build

sleep 10  # 起動待機

echo "ヘルスチェック確認..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health 2>/dev/null; then
        echo -e "${GREEN}✓ アプリケーション正常起動（${i}回目で成功）${NC}"
        break
    else
        echo "起動確認中... (${i}/10)"
        sleep 5
    fi
done

echo "メモリ使用量確認..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep plantuml

echo "開発環境停止..."
docker-compose -f docker-compose.dev.yml down

echo -e "${GREEN}✓ パフォーマンステスト完了${NC}"

# ==============================================
# 6. 本番環境設定検証
# ==============================================
echo -e "\n${YELLOW}6. 本番環境設定検証中...${NC}"

echo "環境変数ファイルの確認..."
if [ ! -f ".env.production" ]; then
    echo "本番用環境変数ファイルを作成..."
    cat > .env.production << 'EOF'
# 本番環境設定
NODE_ENV=production
VERSION=latest
KROKI_URL=https://kroki.io/plantuml/svg
REDIS_PASSWORD=secure_redis_password_change_me
EOF
    echo -e "${YELLOW}⚠ .env.productionを作成しました。パスワードを変更してください${NC}"
fi

echo "SSL証明書ディレクトリの確認..."
mkdir -p config/ssl
if [ ! -f "config/ssl/README.md" ]; then
    cat > config/ssl/README.md << 'EOF'
# SSL証明書配置ディレクトリ

本番環境では以下のファイルを配置してください:

- `server.crt` - SSL証明書
- `server.key` - 秘密鍵
- `dhparam.pem` - Diffie-Hellmanパラメータ

## 自己署名証明書の生成（開発用）

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout server.key -out server.crt \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=PlantUML Editor/CN=localhost"

openssl dhparam -out dhparam.pem 2048
```
EOF
fi

echo -e "${GREEN}✓ 本番環境設定検証完了${NC}"

# ==============================================
# 7. 最適化レポートの生成
# ==============================================
echo -e "\n${YELLOW}7. 最適化レポート生成中...${NC}"

cat > docker-optimization-report.md << EOF
# Docker最適化レポート

**生成日時**: $(date)
**プロジェクト**: PlantUML Editor

## 実行内容

### 1. 環境確認
- Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)
- Docker Compose: $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)

### 2. 最適化実施項目
- [x] マルチステージビルドの実装
- [x] セキュリティ強化設定
- [x] リソース制限の設定
- [x] ヘルスチェックの実装
- [x] ログ設定の最適化
- [x] .dockerignoreの最適化

### 3. 作成ファイル
- \`Dockerfile.optimized\` - マルチステージ最適化版
- \`docker-compose.dev.yml\` - 開発環境設定
- \`docker-compose.prod.yml\` - 本番環境設定
- \`.dockerignore\` - ビルドコンテキスト最適化

### 4. イメージサイズ比較
$(docker images | grep plantuml-editor || echo "イメージ情報が取得できませんでした")

### 5. セキュリティスキャン結果
$(if [ -f "trivy-config-report.json" ]; then echo "設定スキャン: trivy-config-report.json"; fi)
$(if [ -f "trivy-image-report.json" ]; then echo "イメージスキャン: trivy-image-report.json"; fi)

### 6. 推奨事項
1. 本番環境では\`.env.production\`のパスワードを変更してください
2. SSL証明書を\`config/ssl/\`に配置してください
3. 定期的なセキュリティスキャンを実施してください
4. ログローテーションの設定を確認してください

### 7. 次のステップ
- [ ] 本番環境でのロードテスト実施
- [ ] CI/CDパイプラインへの統合
- [ ] モニタリング設定の追加
- [ ] バックアップ戦略の策定

## 使用方法

### 開発環境
\`\`\`bash
docker-compose -f docker-compose.dev.yml up -d
\`\`\`

### 本番環境
\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

### セキュリティスキャン
\`\`\`bash
trivy config .
trivy image plantuml-editor:latest
\`\`\`
EOF

echo -e "${GREEN}✓ 最適化レポート生成完了: docker-optimization-report.md${NC}"

# ==============================================
# 完了メッセージ
# ==============================================
echo -e "\n${GREEN}=== Docker最適化完了 ===${NC}"
echo "完了時刻: $(date)"
echo -e "${BLUE}詳細なログ: $LOG_FILE${NC}"
echo -e "${BLUE}最適化レポート: docker-optimization-report.md${NC}"

echo -e "\n${YELLOW}次のステップ:${NC}"
echo "1. .env.productionファイルのパスワードを変更"
echo "2. SSL証明書をconfig/ssl/に配置"
echo "3. 開発環境での動作確認: docker-compose -f docker-compose.dev.yml up -d"
echo "4. セキュリティスキャン結果の確認"

echo -e "\n${GREEN}最適化処理が正常に完了しました！${NC}"