/**
 * PlantUML統合テストフレームワーク設定
 * ClaudeCodeActionsとGitHub Issues統合対応
 * 
 * @version 1.0.0
 * @author AI-Driven Test Automation Specialist
 */

const path = require('path');

const FRAMEWORK_CONFIG = {
  // 基本設定
  projectRoot: path.resolve(__dirname, '../..'),
  testTimeout: 60000,
  maxConcurrency: 4,
  retryCount: 3,
  
  // テスト環境設定
  environments: {
    local: {
      baseUrl: 'http://localhost:8086',
      apiUrl: 'http://localhost:8086/api',
      dockerCompose: path.resolve(__dirname, '../../jp2plantuml/docker-compose.yml')
    },
    docker: {
      baseUrl: 'http://localhost:8086',
      apiUrl: 'http://localhost:8086/api',
      containerName: 'jp2plantuml-app-1'
    },
    ci: {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8086',
      apiUrl: process.env.TEST_API_URL || 'http://localhost:8086/api',
      headless: true
    }
  },
  
  // ClaudeCodeActions統合設定
  claudeCodeActions: {
    enabled: true,
    apiEndpoint: process.env.CLAUDE_API_ENDPOINT,
    webhookUrl: process.env.CLAUDE_WEBHOOK_URL,
    validationRules: {
      codeQuality: {
        minCoverage: 85,
        maxComplexity: 10,
        lintErrors: 0
      },
      security: {
        vulnerabilities: 0,
        auditLevel: 'high'
      },
      performance: {
        maxLoadTime: 3000,
        maxMemoryUsage: '512MB',
        maxResponseTime: 500
      }
    }
  },
  
  // GitHub Issues統合設定
  githubIntegration: {
    enabled: true,
    repository: process.env.GITHUB_REPOSITORY || 'PlantUML',
    token: process.env.GITHUB_TOKEN,
    labels: {
      autoTest: 'automated-test',
      bugReport: 'bug',
      testFailure: 'test-failure',
      performance: 'performance'
    },
    issueTemplates: {
      testFailure: path.resolve(__dirname, '../templates/test-failure-issue.md'),
      performanceRegression: path.resolve(__dirname, '../templates/performance-issue.md')
    }
  },
  
  // Worktree環境設定
  worktreeConfig: {
    enabled: true,
    baseDirectory: path.resolve(__dirname, '../../..'),
    testBranches: ['feature/*', 'develop', 'main'],
    isolationLevel: 'full', // full, partial, minimal
    parallelExecution: true
  },
  
  // テストスイート構成
  testSuites: {
    unit: {
      directory: path.resolve(__dirname, '../../jp2plantuml/__tests__'),
      pattern: '**/*.test.js',
      coverage: {
        enabled: true,
        threshold: {
          global: {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
          }
        }
      }
    },
    
    integration: {
      directory: path.resolve(__dirname, '../integration'),
      pattern: '**/*.integration.test.js',
      beforeAll: 'setup-test-environment.js',
      afterAll: 'cleanup-test-environment.js'
    },
    
    e2e: {
      directory: path.resolve(__dirname, '../e2e'),
      pattern: '**/*.e2e.test.js',
      playwright: {
        config: path.resolve(__dirname, '../e2e/playwright.config.js'),
        browsers: ['chromium', 'firefox', 'webkit'],
        headless: process.env.CI === 'true',
        viewport: { width: 1280, height: 720 },
        timeout: 30000
      }
    },
    
    claudeCodeActions: {
      directory: path.resolve(__dirname, '../claudecodeactions'),
      pattern: '**/*.claude.test.js',
      aiIntegration: true,
      validationRules: true
    },
    
    githubIssues: {
      directory: path.resolve(__dirname, '../github-issues'),
      pattern: '**/*.github.test.js',
      apiIntegration: true,
      webhookTesting: true
    }
  },
  
  // レポート設定
  reporting: {
    formats: ['html', 'json', 'junit', 'lcov'],
    outputDirectory: path.resolve(__dirname, '../reports'),
    coverage: {
      directory: path.resolve(__dirname, '../coverage-reports'),
      includeSubprojects: true
    },
    performance: {
      enabled: true,
      metrics: ['loadTime', 'memoryUsage', 'cpuUsage', 'responseTime'],
      thresholds: {
        loadTime: 3000,
        memoryUsage: 512 * 1024 * 1024, // 512MB
        responseTime: 500
      }
    }
  },
  
  // 通知設定
  notifications: {
    slack: {
      enabled: process.env.SLACK_WEBHOOK_URL !== undefined,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#test-automation',
      mentionOnFailure: ['@test-team']
    },
    email: {
      enabled: false,
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      recipients: process.env.TEST_NOTIFICATION_EMAILS?.split(',') || []
    },
    github: {
      enabled: true,
      createIssueOnFailure: true,
      commentOnPR: true
    }
  },
  
  // パフォーマンス設定
  performance: {
    monitoring: {
      enabled: true,
      interval: 1000, // ms
      duration: 30000 // ms
    },
    loadTesting: {
      enabled: true,
      concurrent: 10,
      duration: 60, // seconds
      rampUp: 10 // seconds
    },
    memoryProfiling: {
      enabled: true,
      heapSnapshots: true,
      gcAnalysis: true
    }
  },
  
  // セキュリティ設定
  security: {
    audit: {
      enabled: true,
      level: 'high',
      autoFix: false
    },
    dependencies: {
      checkUpdates: true,
      vulnerabilityCheck: true,
      licenseCheck: true
    },
    codeScanning: {
      enabled: true,
      tools: ['eslint-security', 'semgrep'],
      rules: 'security-recommended'
    }
  },
  
  // データベーステスト設定
  database: {
    enabled: false, // PlantUMLアプリは現在DBを使用しない
    testData: {
      fixtures: path.resolve(__dirname, '../fixtures'),
      cleanup: true,
      isolation: true
    }
  },
  
  // モック・スタブ設定
  mocking: {
    external: {
      kroKiAPI: {
        enabled: true,
        mockData: path.resolve(__dirname, '../mocks/kroki-responses.json'),
        scenarios: ['success', 'error', 'timeout']
      }
    },
    internal: {
      fileSystem: false,
      network: true,
      timers: false
    }
  }
};

module.exports = FRAMEWORK_CONFIG;