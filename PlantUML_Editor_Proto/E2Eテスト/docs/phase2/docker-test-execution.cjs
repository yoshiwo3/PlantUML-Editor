/**
 * Docker環境でのテスト実行スクリプト
 * Dockerビルドとテスト実行の自動化
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// カラー出力
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(color, symbol, message) {
    console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

// Docker環境確認
async function checkDockerEnvironment() {
    return new Promise((resolve) => {
        exec('docker --version', (error, stdout, stderr) => {
            if (error) {
                resolve({ available: false, error: error.message });
            } else {
                resolve({ 
                    available: true, 
                    version: stdout.trim(),
                    compose: false
                });
            }
        });
    });
}

// Docker Compose確認
async function checkDockerCompose() {
    return new Promise((resolve) => {
        exec('docker-compose --version', (error, stdout, stderr) => {
            if (error) {
                resolve({ available: false, error: error.message });
            } else {
                resolve({ 
                    available: true, 
                    version: stdout.trim()
                });
            }
        });
    });
}

// Dockerビルド実行
async function buildDockerImage() {
    return new Promise((resolve) => {
        log('blue', '🐳', 'Dockerイメージをビルド中...');
        
        const buildProcess = spawn('docker-compose', ['build'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        buildProcess.stdout.on('data', (data) => {
            stdout += data;
            process.stdout.write(data);
        });
        
        buildProcess.stderr.on('data', (data) => {
            stderr += data;
            process.stderr.write(data);
        });
        
        buildProcess.on('close', (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code
            });
        });
    });
}

// Dockerテスト実行
async function runDockerTest(testType = 'all') {
    return new Promise((resolve) => {
        const testCommand = `npm run test:${testType}`;
        log('blue', '🧪', `Dockerテスト実行中: ${testCommand}`);
        
        const testProcess = spawn('docker-compose', [
            'run', '--rm', 'playwright', 'npm', 'run', `test:${testType}`
        ], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        testProcess.stdout.on('data', (data) => {
            stdout += data;
            process.stdout.write(data);
        });
        
        testProcess.stderr.on('data', (data) => {
            stderr += data;
            process.stderr.write(data);
        });
        
        testProcess.on('close', (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code,
                testType
            });
        });
    });
}

// メイン実行
async function main() {
    console.log(`\n${colors.magenta}==============================================`);
    console.log(`  Phase2 Docker テスト実行スクリプト`);
    console.log(`==============================================${colors.reset}\n`);
    
    // Docker環境確認
    log('cyan', '🔍', 'Docker環境を確認中...');
    const dockerCheck = await checkDockerEnvironment();
    
    if (!dockerCheck.available) {
        log('red', '❌', 'Dockerが利用できません');
        log('yellow', '⚠️', `エラー: ${dockerCheck.error}`);
        log('blue', 'ℹ️', 'Dockerをインストールしてから再実行してください');
        return;
    }
    
    log('green', '✅', `Docker利用可能: ${dockerCheck.version}`);
    
    // Docker Compose確認
    const composeCheck = await checkDockerCompose();
    
    if (!composeCheck.available) {
        log('red', '❌', 'Docker Composeが利用できません');
        log('yellow', '⚠️', `エラー: ${composeCheck.error}`);
        return;
    }
    
    log('green', '✅', `Docker Compose利用可能: ${composeCheck.version}`);
    
    // 必要ファイルの確認
    const requiredFiles = [
        'Dockerfile',
        'docker-compose.yml',
        'package.json'
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            log('green', '✓', `${file} 存在確認`);
        } else {
            log('red', '✗', `${file} が見つかりません`);
            allFilesExist = false;
        }
    });
    
    if (!allFilesExist) {
        log('red', '❌', '必要ファイルが不足しています');
        return;
    }
    
    // コマンドライン引数の解析
    const args = process.argv.slice(2);
    const command = args[0] || 'test';
    const testType = args[1] || 'all';
    
    console.log(`\n${colors.cyan}実行設定:`);
    console.log(`  コマンド: ${command}`);
    console.log(`  テストタイプ: ${testType}${colors.reset}\n`);
    
    try {
        switch (command) {
            case 'build':
                const buildResult = await buildDockerImage();
                if (buildResult.success) {
                    log('green', '🎉', 'Dockerビルド成功');
                } else {
                    log('red', '❌', `Dockerビルド失敗 (exit code: ${buildResult.exitCode})`);
                }
                break;
                
            case 'test':
                // まずビルドを実行
                log('blue', '🔨', 'テスト前にDockerイメージをビルドします...');
                const preBuildResult = await buildDockerImage();
                
                if (!preBuildResult.success) {
                    log('red', '❌', 'ビルドに失敗したためテストを中断します');
                    return;
                }
                
                // テスト実行
                const testResult = await runDockerTest(testType);
                
                console.log(`\n${colors.magenta}========================================`);
                console.log(`  Dockerテスト結果サマリー`);
                console.log(`========================================${colors.reset}`);
                
                if (testResult.success) {
                    log('green', '🎉', `テスト成功: ${testResult.testType}`);
                } else {
                    log('red', '❌', `テスト失敗: ${testResult.testType} (exit code: ${testResult.exitCode})`);
                }
                
                break;
                
            case 'shell':
                log('blue', '🐚', 'Dockerシェルを起動します...');
                const shellProcess = spawn('docker-compose', [
                    'run', '--rm', 'playwright', 'bash'
                ], {
                    cwd: __dirname,
                    stdio: 'inherit'
                });
                
                shellProcess.on('close', (code) => {
                    log('blue', 'ℹ️', `シェル終了 (exit code: ${code})`);
                });
                break;
                
            default:
                log('yellow', '⚠️', `未知のコマンド: ${command}`);
                console.log(`\n使用方法:`);
                console.log(`  node docker-test-execution.cjs build              # Dockerイメージビルド`);
                console.log(`  node docker-test-execution.cjs test [type]       # テスト実行`);
                console.log(`  node docker-test-execution.cjs shell             # シェル起動`);
                console.log(`\nテストタイプ:`);
                console.log(`  all, sync, complex, performance`);
                break;
        }
        
    } catch (error) {
        log('red', '💥', `実行エラー: ${error.message}`);
    }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    log('red', '💥', `未処理エラー: ${error}`);
    process.exit(1);
});

// 実行
if (require.main === module) {
    main().catch(error => {
        log('red', '💥', `メイン実行エラー: ${error}`);
        process.exit(1);
    });
}

module.exports = {
    checkDockerEnvironment,
    checkDockerCompose,
    buildDockerImage,
    runDockerTest
};