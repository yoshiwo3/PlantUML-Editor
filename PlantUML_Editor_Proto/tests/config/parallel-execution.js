/**
 * Sprint4 並列実行環境設定
 * Docker Swarm + Playwright並列実行
 */

import { BrowserMatrix, BrowserMatrixGenerator } from '../scenarios/browser-matrix/browser-config.js';
import { DeviceConfigurationManager } from '../scenarios/browser-matrix/device-config.js';

export class ParallelExecutionManager {
  constructor() {
    this.matrixGenerator = new BrowserMatrixGenerator();
    this.deviceManager = new DeviceConfigurationManager();
    this.workerCount = 4;
    this.dockerConfig = {
      image: 'plantuml-e2e-permanent:latest',
      network: 'plantuml-test-network',
      volumes: [
        './tests:/workspace/tests:ro',
        './test-results:/workspace/test-results:rw'
      ]
    };
  }

  /**
   * Docker Swarm設定生成
   */
  generateDockerSwarmConfig() {
    return {
      version: '3.8',
      services: {
        'playwright-manager': {
          image: this.dockerConfig.image,
          command: ['npm', 'run', 'test:coordinator'],
          environment: {
            NODE_ENV: 'test',
            PLAYWRIGHT_WORKERS: this.workerCount,
            TEST_PARALLELISM: 'enabled'
          },
          networks: [this.dockerConfig.network],
          volumes: this.dockerConfig.volumes,
          deploy: {
            replicas: 1,
            placement: {
              constraints: ['node.role == manager']
            }
          }
        },
        ...this.generateWorkerServices()
      },
      networks: {
        [this.dockerConfig.network]: {
          driver: 'overlay',
          attachable: true
        }
      },
      volumes: {
        'test-results': {
          driver: 'local'
        }
      }
    };
  }

  /**
   * ワーカーサービス生成
   */
  generateWorkerServices() {
    const services = {};
    
    for (let i = 1; i <= this.workerCount; i++) {
      services[`playwright-worker-${i}`] = {
        image: this.dockerConfig.image,
        command: ['npm', 'run', 'test:worker'],
        environment: {
          NODE_ENV: 'test',
          WORKER_ID: i,
          WORKER_COUNT: this.workerCount,
          APP_URL: 'http://app:8086'
        },
        networks: [this.dockerConfig.network],
        volumes: this.dockerConfig.volumes,
        depends_on: ['app'],
        deploy: {
          replicas: 1,
          placement: {
            constraints: ['node.role == worker']
          }
        }
      };
    }

    // アプリケーションサービス追加
    services.app = {
      image: 'plantuml-editor:latest',
      ports: ['8086:8086'],
      environment: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'error'
      },
      networks: [this.dockerConfig.network],
      deploy: {
        replicas: 1
      }
    };

    return services;
  }

  /**
   * テストスイート分散
   */
  distributeTestSuites(testGroups) {
    const distribution = [];
    
    for (const [groupName, group] of Object.entries(testGroups)) {
      const matrix = this.matrixGenerator.generateMatrix(groupName);
      const chunks = this.splitMatrix(matrix, this.workerCount);
      
      chunks.forEach((chunk, index) => {
        distribution.push({
          workerId: index + 1,
          groupName,
          combinations: chunk,
          estimatedTime: chunk.length * 30, // 30秒/テスト
          priority: group.priority
        });
      });
    }

    return this.balanceWorkload(distribution);
  }

  /**
   * マトリックス分割
   */
  splitMatrix(matrix, workerCount) {
    const chunks = Array.from({ length: workerCount }, () => []);
    
    matrix.forEach((combination, index) => {
      const workerIndex = index % workerCount;
      chunks[workerIndex].push(combination);
    });

    return chunks;
  }

  /**
   * ワークロード均等化
   */
  balanceWorkload(distribution) {
    // 実行時間による並べ替え
    distribution.sort((a, b) => b.estimatedTime - a.estimatedTime);
    
    const workers = Array.from({ length: this.workerCount }, (_, i) => ({
      id: i + 1,
      tasks: [],
      totalTime: 0
    }));

    // 最短時間のワーカーに割り当て
    distribution.forEach(task => {
      const targetWorker = workers.reduce((min, worker) => 
        worker.totalTime < min.totalTime ? worker : min
      );
      
      targetWorker.tasks.push(task);
      targetWorker.totalTime += task.estimatedTime;
    });

    return workers;
  }

  /**
   * Playwright並列設定生成
   */
  generatePlaywrightConfig(testGroup = 'critical') {
    const matrix = this.matrixGenerator.generateMatrix(testGroup);
    
    return {
      testDir: './tests/scenarios',
      timeout: 30000,
      expect: {
        timeout: 5000
      },
      forbidOnly: !!process.env.CI,
      retries: process.env.CI ? 2 : 0,
      workers: this.workerCount,
      
      // レポーター設定
      reporter: [
        ['html', { outputFolder: 'test-results/html-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['allure-playwright', { outputFolder: 'test-results/allure-results' }]
      ],

      // グローバル設定
      use: {
        baseURL: 'http://app:8086',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 5000,
        navigationTimeout: 10000
      },

      // プロジェクト設定
      projects: matrix.map(combination => ({
        name: `${combination.browser.name}-${combination.device.name}`,
        use: {
          ...combination.device.viewport ? { viewport: combination.device.viewport } : {},
          deviceScaleFactor: combination.device.deviceScaleFactor,
          locale: combination.localization.locale,
          timezoneId: combination.localization.timezone,
          ...combination.browser.config
        },
        testMatch: this.getTestPatternForCombination(combination)
      })),

      // Web Server設定
      webServer: {
        command: 'npm start',
        port: 8086,
        reuseExistingServer: !process.env.CI,
        timeout: 60000
      }
    };
  }

  /**
   * 組み合わせ別テストパターン
   */
  getTestPatternForCombination(combination) {
    const patterns = ['**/*.spec.js'];
    
    // モバイルデバイスではモバイル特化テストを追加
    if (combination.device.type === 'mobile') {
      patterns.push('**/mobile/*.spec.js');
    }

    // 低性能デバイスではパフォーマンステストをスキップ
    if (combination.device.performance?.cpu === 'low') {
      patterns.push('!**/performance/*.spec.js');
    }

    // ブラウザ特化テスト
    if (combination.browser.name === 'Safari') {
      patterns.push('**/webkit-specific/*.spec.js');
    }

    return patterns;
  }

  /**
   * 実行スクリプト生成
   */
  generateExecutionScripts() {
    const scripts = {
      // Docker Swarm デプロイ
      'deploy-swarm.sh': `#!/bin/bash
set -e

echo "🚀 Deploying Playwright Test Swarm"

# Swarm初期化（未初期化の場合）
if ! docker info | grep -q "Swarm: active"; then
    echo "Initializing Docker Swarm..."
    docker swarm init
fi

# ネットワーク作成
docker network create --driver overlay ${this.dockerConfig.network} || true

# サービスデプロイ
docker stack deploy -c docker-compose.swarm.yml plantuml-test

echo "✅ Test Swarm deployed successfully"
echo "📊 Monitoring: docker service ls"
`,

      // 並列テスト実行
      'run-parallel-tests.sh': `#!/bin/bash
set -e

TEST_GROUP=\${1:-critical}
WORKERS=\${2:-${this.workerCount}}

echo "🧪 Running parallel tests for group: $TEST_GROUP"
echo "👷 Workers: $WORKERS"

# 結果ディレクトリ準備
mkdir -p test-results/{html-report,allure-results}

# テスト実行
docker service update --force plantuml-test_playwright-manager

# 結果待機
echo "⏳ Waiting for test completion..."
timeout 1800 bash -c '
while [ $(docker service ps --filter "desired-state=running" plantuml-test_playwright-manager | wc -l) -gt 1 ]; do
    sleep 10
    echo -n "."
done
'

# 結果収集
echo "📊 Collecting test results..."
docker service logs plantuml-test_playwright-manager > test-results/execution.log

echo "✅ Parallel test execution completed"
`,

      // クリーンアップ
      'cleanup-swarm.sh': `#!/bin/bash
echo "🧹 Cleaning up test environment"

# サービス停止
docker stack rm plantuml-test

# 未使用リソース削除
docker system prune -f

echo "✅ Cleanup completed"
`,

      // 監視スクリプト
      'monitor-tests.sh': `#!/bin/bash
echo "📊 Test Execution Monitor"
echo "========================="

while true; do
    clear
    echo "📊 Service Status:"
    docker service ls --filter label=com.docker.stack.namespace=plantuml-test
    
    echo -e "\\n📈 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"
    
    echo -e "\\n📝 Recent Logs:"
    docker service logs --tail 5 plantuml-test_playwright-manager 2>/dev/null || echo "No logs yet"
    
    sleep 5
done
`
    };

    return scripts;
  }

  /**
   * 結果集約設定
   */
  generateResultAggregationConfig() {
    return {
      collectors: [
        {
          name: 'junit-merge',
          type: 'xml',
          pattern: 'test-results/**/junit.xml',
          output: 'test-results/merged-junit.xml'
        },
        {
          name: 'html-report-merge',
          type: 'html',
          pattern: 'test-results/**/html-report/**',
          output: 'test-results/consolidated-report'
        },
        {
          name: 'allure-merge',
          type: 'allure',
          pattern: 'test-results/**/allure-results/**',
          output: 'test-results/allure-report'
        },
        {
          name: 'coverage-merge',
          type: 'coverage',
          pattern: 'test-results/**/coverage.json',
          output: 'test-results/merged-coverage.json'
        }
      ],

      notifications: {
        slack: {
          enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
          webhook: process.env.SLACK_WEBHOOK_URL,
          channel: '#plantuml-tests',
          onSuccess: true,
          onFailure: true
        },
        email: {
          enabled: false,
          smtp: {
            host: 'smtp.example.com',
            port: 587,
            auth: {
              user: 'test@example.com',
              pass: 'password'
            }
          },
          recipients: ['team@example.com']
        }
      },

      storage: {
        s3: {
          enabled: false,
          bucket: 'plantuml-test-results',
          region: 'us-east-1',
          path: 'test-results/{date}/{build}'
        },
        gcs: {
          enabled: false,
          bucket: 'plantuml-test-results',
          path: 'test-results/{date}/{build}'
        }
      }
    };
  }

  /**
   * パフォーマンス最適化設定
   */
  generateOptimizationConfig() {
    return {
      resourceLimits: {
        cpu: {
          manager: '2',
          worker: '1'
        },
        memory: {
          manager: '4G',
          worker: '2G'
        }
      },

      caching: {
        browserBinaries: {
          enabled: true,
          path: '/tmp/playwright-browsers',
          mountPath: '/ms-playwright'
        },
        nodeModules: {
          enabled: true,
          path: '/tmp/node_modules',
          mountPath: '/workspace/node_modules'
        },
        testArtifacts: {
          enabled: true,
          path: '/tmp/test-artifacts',
          retention: '7d'
        }
      },

      networkOptimization: {
        dns: {
          enabled: true,
          servers: ['8.8.8.8', '1.1.1.1']
        },
        bandwidth: {
          limit: false,
          upload: '100M',
          download: '100M'
        }
      }
    };
  }

  /**
   * 実行統計取得
   */
  getExecutionStats(testGroup) {
    const matrix = this.matrixGenerator.generateMatrix(testGroup);
    const distribution = this.distributeTestSuites({ [testGroup]: { priority: 'high' } });
    
    return {
      testGroup,
      totalCombinations: matrix.length,
      workerCount: this.workerCount,
      distribution: distribution.map(worker => ({
        workerId: worker.id,
        taskCount: worker.tasks.length,
        estimatedTime: worker.totalTime,
        efficiency: worker.totalTime / Math.max(...distribution.map(w => w.totalTime))
      })),
      estimatedTotalTime: Math.max(...distribution.map(w => w.totalTime)),
      parallelEfficiency: (matrix.length * 30) / Math.max(...distribution.map(w => w.totalTime)),
      resourceRequirements: {
        totalCPU: this.workerCount + 1, // workers + manager
        totalMemory: (this.workerCount * 2 + 4) + 'GB', // workers + manager
        diskSpace: '10GB'
      }
    };
  }
}

/**
 * 実行時設定
 */
export const ExecutionConfiguration = {
  environments: {
    local: {
      workers: 2,
      browserCount: 2,
      deviceCount: 1,
      timeout: 60000
    },
    ci: {
      workers: 4,
      browserCount: 4,
      deviceCount: 2,
      timeout: 300000
    },
    staging: {
      workers: 8,
      browserCount: 4,
      deviceCount: 3,
      timeout: 600000
    }
  },

  scaling: {
    autoScale: true,
    minWorkers: 2,
    maxWorkers: 16,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
    cooldownPeriod: 300 // 5 minutes
  }
};

export default ParallelExecutionManager;