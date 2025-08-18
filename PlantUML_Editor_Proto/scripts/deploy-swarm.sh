#!/bin/bash
# Sprint4 Docker Swarm並列実行環境デプロイスクリプト

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
STACK_NAME="plantuml-test"
NETWORK_NAME="plantuml-test-network"
COMPOSE_FILE="docker-compose.swarm.yml"

log_info "🚀 Deploying PlantUML Parallel Test Environment"
echo "=================================================="

# 前提条件チェック
log_info "📋 Checking prerequisites..."

# Docker Swarmの状態確認
if ! docker info | grep -q "Swarm: active"; then
    log_warning "Docker Swarm not active. Initializing..."
    docker swarm init --advertise-addr $(hostname -I | cut -d' ' -f1)
    log_success "Docker Swarm initialized"
else
    log_info "Docker Swarm already active"
fi

# 必要なディレクトリ作成
log_info "📁 Creating required directories..."
mkdir -p test-results/{html-report,allure-results,coverage}
mkdir -p cache/playwright
mkdir -p monitoring/{prometheus,grafana}
log_success "Directories created"

# Dockerイメージの存在確認
log_info "🐳 Checking Docker images..."
if ! docker image inspect plantuml-e2e-permanent:latest >/dev/null 2>&1; then
    log_warning "Building plantuml-e2e-permanent image..."
    cd E2Eテスト/docs/phase2
    docker-compose build
    cd ../../..
    log_success "Image built successfully"
fi

if ! docker image inspect plantuml-editor:latest >/dev/null 2>&1; then
    log_warning "Building plantuml-editor image..."
    docker build -t plantuml-editor:latest .
    log_success "Application image built"
fi

# 監視設定ファイル生成
log_info "📊 Generating monitoring configuration..."

# Prometheus設定
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'plantuml-app'
    static_configs:
      - targets: ['app:8086']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'playwright-workers'
    static_configs:
      - targets: 
        - 'playwright-worker-1:3000'
        - 'playwright-worker-2:3000'
        - 'playwright-worker-3:3000'
        - 'playwright-worker-4:3000'
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'docker-swarm'
    dockerswarm_configs:
      - host: unix:///var/run/docker.sock
        role: services
        port: 9323
EOF

# Grafanaダッシュボード設定
mkdir -p monitoring/grafana/dashboards
cat > monitoring/grafana/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

cat > monitoring/grafana/datasource.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

log_success "Monitoring configuration generated"

# ネットワーク作成
log_info "🌐 Creating overlay network..."
docker network create --driver overlay --attachable $NETWORK_NAME 2>/dev/null || log_info "Network already exists"

# 既存スタックの確認と削除
if docker stack ps $STACK_NAME >/dev/null 2>&1; then
    log_warning "Existing stack found. Removing..."
    docker stack rm $STACK_NAME
    log_info "Waiting for stack removal..."
    sleep 30
fi

# スタックデプロイ
log_info "🚀 Deploying test stack..."
docker stack deploy -c $COMPOSE_FILE $STACK_NAME

# デプロイ状況監視
log_info "⏳ Waiting for services to start..."
sleep 20

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    running_services=$(docker service ls --filter label=com.docker.stack.namespace=$STACK_NAME --format "{{.Replicas}}" | grep -c "1/1" || true)
    total_services=$(docker service ls --filter label=com.docker.stack.namespace=$STACK_NAME | tail -n +2 | wc -l)
    
    if [ "$running_services" -eq "$total_services" ] && [ "$total_services" -gt 0 ]; then
        log_success "All services are running!"
        break
    fi
    
    log_info "Progress: $running_services/$total_services services running"
    sleep 10
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    log_error "Timeout waiting for services to start"
    log_info "Current service status:"
    docker service ls --filter label=com.docker.stack.namespace=$STACK_NAME
    exit 1
fi

# サービス状況表示
log_info "📊 Service Status:"
docker service ls --filter label=com.docker.stack.namespace=$STACK_NAME

log_info "🔍 Service Details:"
docker stack ps $STACK_NAME --no-trunc

# ヘルスチェック
log_info "🏥 Checking service health..."
sleep 30

# アプリケーションヘルスチェック
if curl -sf http://localhost:8086/health >/dev/null 2>&1; then
    log_success "Application is healthy"
else
    log_warning "Application health check failed"
fi

# 監視サービスチェック
if curl -sf http://localhost:9090/-/healthy >/dev/null 2>&1; then
    log_success "Prometheus is healthy"
else
    log_warning "Prometheus health check failed"
fi

if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    log_success "Grafana is healthy"
else
    log_warning "Grafana health check failed"
fi

# アクセス情報表示
log_success "🎉 Deployment completed successfully!"
echo ""
echo "📊 Access Information:"
echo "===================="
echo "Application:     http://localhost:8086"
echo "Prometheus:      http://localhost:9090"
echo "Grafana:         http://localhost:3000 (admin/admin)"
echo "Test Results:    ./test-results/"
echo ""
echo "🛠️  Management Commands:"
echo "======================"
echo "View services:   docker service ls"
echo "View logs:       docker service logs $STACK_NAME_<service>"
echo "Scale service:   docker service scale $STACK_NAME_<service>=<replicas>"
echo "Remove stack:    docker stack rm $STACK_NAME"
echo ""
echo "🧪 Test Execution:"
echo "=================="
echo "Run tests:       ./scripts/run-parallel-tests.sh [group]"
echo "Monitor tests:   ./scripts/monitor-tests.sh"
echo "View results:    open test-results/html-report/index.html"

# 実行可能権限を付与
chmod +x scripts/run-parallel-tests.sh
chmod +x scripts/monitor-tests.sh
chmod +x scripts/cleanup-swarm.sh

log_success "🚀 Ready for parallel test execution!"