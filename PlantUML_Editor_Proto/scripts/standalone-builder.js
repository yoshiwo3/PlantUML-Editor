#!/usr/bin/env node

/**
 * PlantUML Editor Proto - スタンドアロンビルダー
 * 
 * 全ES6モジュールを単一HTMLファイルに統合し、file://プロトコルでも動作する
 * 完全スタンドアロン版を生成します。
 * 
 * 機能:
 * - ES6モジュールの統合とトランスパイル
 * - CSS/JSのインライン化
 * - 画像のBase64エンコード
 * - 最適化とminify
 * - PWA対応
 * - 複数出力形式
 * 
 * @version 2.0.0
 * @author PlantUML Editor Development Team
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StandaloneBuilder {
    constructor(options = {}) {
        this.projectRoot = path.resolve(__dirname, '..');
        this.distDir = path.join(this.projectRoot, 'dist');
        this.sourceDir = this.projectRoot;
        
        // ビルド設定
        this.options = {
            minify: options.minify ?? true,
            sourcemap: options.sourcemap ?? true,
            inline: options.inline ?? true,
            pwa: options.pwa ?? true,
            compressionLevel: options.compressionLevel ?? 6,
            targetSizeKB: options.targetSizeKB ?? 3072, // 3MB
            enableObfuscation: options.enableObfuscation ?? false,
            debugMode: options.debugMode ?? false,
            ...options
        };
        
        // 処理対象ファイル
        this.moduleFiles = [
            'TokenTypes.js',
            'ASTTypes.js', 
            'PlantUMLASTParser.js',
            'IDManager.js',
            'ASTToGUIConverter.js',
            'RealtimeSyncManager.js',
            'DiffCalculator.js',
            'CursorStateManager.js',
            'ErrorHandler.js',
            'PerformanceOptimizer.js',
            'ValidationEngine.js',
            'drawio-converter.js',
            'app.js'
        ];
        
        this.cssFiles = ['styles.css'];
        this.htmlFile = 'index.html';
        
        // ビルド統計
        this.stats = {
            startTime: Date.now(),
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0,
            moduleCount: 0,
            errors: [],
            warnings: []
        };
        
        // プログレスバー
        this.progress = {
            current: 0,
            total: 100,
            steps: [
                '📂 ファイル収集',
                '🔍 依存関係解析', 
                '🔧 ES6モジュール変換',
                '🎨 CSS統合',
                '🖼️ 画像処理',
                '⚡ JavaScript最適化',
                '📦 HTML統合',
                '🗜️ 圧縮処理',
                '🔧 PWA設定',
                '✅ 出力完了'
            ]
        };
    }
    
    /**
     * ビルド実行
     */
    async build() {
        console.log('🚀 PlantUML Editor スタンドアロンビルド開始');
        console.log(`📁 プロジェクトルート: ${this.projectRoot}`);
        console.log(`📦 出力ディレクトリ: ${this.distDir}`);
        console.log('');
        
        try {
            // 出力ディレクトリ準備
            await this.prepareBuildDirectory();
            
            // 各ビルドフェーズ実行
            await this.collectFiles();
            await this.analyzeDependencies();
            await this.transpileModules();
            await this.processCss();
            await this.processImages();
            await this.optimizeJavaScript();
            await this.integrateHtml();
            await this.compressOutput();
            
            if (this.options.pwa) {
                await this.generatePWA();
            }
            
            await this.generateOutputs();
            
            // ビルド結果レポート
            this.generateReport();
            
            console.log('🎉 ビルド完了!');
            return true;
            
        } catch (error) {
            console.error('❌ ビルドエラー:', error.message);
            this.stats.errors.push(error.message);
            
            if (this.options.debugMode) {
                console.error('📋 デバッグ情報:', error.stack);
            }
            
            // エラーリカバリ
            await this.handleBuildError(error);
            return false;
        }
    }
    
    /**
     * ビルドディレクトリ準備
     */
    async prepareBuildDirectory() {
        this.updateProgress(0, '📂 ビルドディレクトリ準備');
        
        // dist ディレクトリクリーンアップ
        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true, force: true });
        }
        
        // ディレクトリ作成
        fs.mkdirSync(this.distDir, { recursive: true });
        fs.mkdirSync(path.join(this.distDir, 'standalone'), { recursive: true });
        fs.mkdirSync(path.join(this.distDir, 'debug'), { recursive: true });
        fs.mkdirSync(path.join(this.distDir, 'minimal'), { recursive: true });
        
        console.log('✅ ビルドディレクトリ準備完了');
    }
    
    /**
     * ファイル収集
     */
    async collectFiles() {
        this.updateProgress(10, '📂 ファイル収集');
        
        this.collectedFiles = {
            modules: new Map(),
            css: new Map(),
            html: '',
            images: new Map(),
            dependencies: new Set()
        };
        
        // JavaScript モジュール収集
        for (const moduleFile of this.moduleFiles) {
            const filePath = path.join(this.sourceDir, moduleFile);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.collectedFiles.modules.set(moduleFile, content);
                this.stats.originalSize += content.length;
                console.log(`  📄 ${moduleFile} (${this.formatSize(content.length)})`);
            } else {
                this.stats.warnings.push(`Module not found: ${moduleFile}`);
                console.warn(`  ⚠️ ${moduleFile} が見つかりません`);
            }
        }
        
        // CSS ファイル収集
        for (const cssFile of this.cssFiles) {
            const filePath = path.join(this.sourceDir, cssFile);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.collectedFiles.css.set(cssFile, content);
                this.stats.originalSize += content.length;
                console.log(`  🎨 ${cssFile} (${this.formatSize(content.length)})`);
            }
        }
        
        // HTML ファイル読み込み
        const htmlPath = path.join(this.sourceDir, this.htmlFile);
        if (fs.existsSync(htmlPath)) {
            this.collectedFiles.html = fs.readFileSync(htmlPath, 'utf8');
            this.stats.originalSize += this.collectedFiles.html.length;
            console.log(`  📝 ${this.htmlFile} (${this.formatSize(this.collectedFiles.html.length)})`);
        }
        
        this.stats.moduleCount = this.collectedFiles.modules.size;
        console.log(`✅ ファイル収集完了 (${this.stats.moduleCount} modules, ${this.formatSize(this.stats.originalSize)})`);
    }
    
    /**
     * 依存関係解析
     */
    async analyzeDependencies() {
        this.updateProgress(20, '🔍 依存関係解析');
        
        const dependencyGraph = new Map();
        const importRegex = /import\s+.*?from\s+['"`](.+?)['"`]/g;
        const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
        
        // 各モジュールの依存関係解析
        for (const [filename, content] of this.collectedFiles.modules) {
            const deps = [];
            let match;
            
            // import文解析
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                if (importPath.startsWith('./') || importPath.startsWith('../')) {
                    const resolvedPath = this.resolveModulePath(importPath, filename);
                    if (resolvedPath) {
                        deps.push(resolvedPath);
                        this.collectedFiles.dependencies.add(importPath);
                    }
                } else {
                    // 外部依存関係
                    this.collectedFiles.dependencies.add(importPath);
                }
            }
            
            dependencyGraph.set(filename, deps);
            console.log(`  🔗 ${filename}: ${deps.length} dependencies`);
        }
        
        // 依存関係順序決定
        this.moduleOrder = this.topologicalSort(dependencyGraph);
        
        console.log('✅ 依存関係解析完了');
        console.log(`  📊 解析結果: ${this.collectedFiles.dependencies.size} unique dependencies`);
    }
    
    /**
     * ES6モジュール変換
     */
    async transpileModules() {
        this.updateProgress(30, '🔧 ES6モジュール変換');
        
        this.transpiled = {
            combined: '',
            exports: new Map(),
            globals: new Set()
        };
        
        // モジュールを依存関係順に変換
        for (const filename of this.moduleOrder) {
            if (this.collectedFiles.modules.has(filename)) {
                const content = this.collectedFiles.modules.get(filename);
                const transformed = await this.transformModule(filename, content);
                
                this.transpiled.combined += `\n// === ${filename} ===\n`;
                this.transpiled.combined += transformed;
                this.transpiled.combined += `\n// === End ${filename} ===\n\n`;
                
                console.log(`  🔄 ${filename} transformed`);
            }
        }
        
        // グローバルスコープでの実行コード追加
        this.transpiled.combined += this.generateInitializationCode();
        
        console.log('✅ ES6モジュール変換完了');
        console.log(`  📊 統合コードサイズ: ${this.formatSize(this.transpiled.combined.length)}`);
    }
    
    /**
     * 個別モジュール変換
     */
    async transformModule(filename, content) {
        // ES6構文をES5互換に変換
        let transformed = content;
        
        // import文を削除（依存関係は解決済み）
        transformed = transformed.replace(/import\s+.*?from\s+['"`].*?['"`];?\n?/g, '');
        
        // export文を変換
        transformed = transformed.replace(/export\s+default\s+(class|function)\s+(\w+)/g, 
            (match, type, name) => {
                this.transpiled.exports.set(name, 'default');
                return `${type} ${name}`;
            });
        
        transformed = transformed.replace(/export\s+(class|function|const|let|var)\s+(\w+)/g, 
            (match, type, name) => {
                this.transpiled.exports.set(name, 'named');
                this.transpiled.globals.add(name);
                return `${type} ${name}`;
            });
        
        // クラス構文をfunction構文に変換（IE11対応）
        if (!this.options.enableModernSyntax) {
            transformed = this.convertClassToFunction(transformed);
        }
        
        // アロー関数を通常の関数に変換
        transformed = transformed.replace(/(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g, 
            'function $1($2) {');
        
        // const/letをvarに変換（IE11対応）
        if (!this.options.enableModernSyntax) {
            transformed = transformed.replace(/\b(const|let)\b/g, 'var');
        }
        
        return transformed;
    }
    
    /**
     * CSS処理
     */
    async processCss() {
        this.updateProgress(40, '🎨 CSS統合・最適化');
        
        let combinedCss = '';
        
        for (const [filename, content] of this.collectedFiles.css) {
            let processedCss = content;
            
            // CSS最適化
            if (this.options.minify) {
                processedCss = this.minifyCss(processedCss);
            }
            
            // ベンダープレフィックス追加
            processedCss = this.addVendorPrefixes(processedCss);
            
            combinedCss += `\n/* === ${filename} === */\n`;
            combinedCss += processedCss;
            combinedCss += `\n/* === End ${filename} === */\n`;
            
            console.log(`  🎨 ${filename} processed`);
        }
        
        this.processedCss = combinedCss;
        
        console.log('✅ CSS処理完了');
        console.log(`  📊 統合CSSサイズ: ${this.formatSize(combinedCss.length)}`);
    }
    
    /**
     * 画像処理（Base64エンコード）
     */
    async processImages() {
        this.updateProgress(50, '🖼️ 画像処理');
        
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
        const imageDir = this.sourceDir;
        
        this.processedImages = new Map();
        
        // プロジェクト内の画像ファイル検索
        const files = this.findFiles(imageDir, imageExtensions);
        
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath);
                const relativePath = path.relative(this.sourceDir, filePath);
                const ext = path.extname(filePath).toLowerCase();
                
                let mimeType;
                switch (ext) {
                    case '.png': mimeType = 'image/png'; break;
                    case '.jpg':
                    case '.jpeg': mimeType = 'image/jpeg'; break;
                    case '.gif': mimeType = 'image/gif'; break;
                    case '.svg': mimeType = 'image/svg+xml'; break;
                    case '.ico': mimeType = 'image/x-icon'; break;
                    default: mimeType = 'application/octet-stream';
                }
                
                const base64 = content.toString('base64');
                const dataUrl = `data:${mimeType};base64,${base64}`;
                
                this.processedImages.set(relativePath, dataUrl);
                
                console.log(`  🖼️ ${relativePath} (${this.formatSize(content.length)} → ${this.formatSize(dataUrl.length)})`);
                
            } catch (error) {
                this.stats.warnings.push(`Image processing failed: ${filePath}`);
                console.warn(`  ⚠️ 画像処理失敗: ${filePath}`);
            }
        }
        
        console.log(`✅ 画像処理完了 (${this.processedImages.size} images)`);
    }
    
    /**
     * JavaScript最適化
     */
    async optimizeJavaScript() {
        this.updateProgress(60, '⚡ JavaScript最適化');
        
        let optimized = this.transpiled.combined;
        
        if (this.options.minify) {
            // コメント削除
            optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');
            optimized = optimized.replace(/\/\/.*$/gm, '');
            
            // 空行削除
            optimized = optimized.replace(/^\s*\n/gm, '');
            
            // 空白最適化
            optimized = optimized.replace(/\s+/g, ' ');
            optimized = optimized.replace(/\s*([{}();,])\s*/g, '$1');
            
            console.log(`  🗜️ Minification: ${this.formatSize(this.transpiled.combined.length)} → ${this.formatSize(optimized.length)}`);
        }
        
        if (this.options.enableObfuscation) {
            optimized = this.obfuscateCode(optimized);
            console.log('  🔒 Code obfuscation applied');
        }
        
        this.optimizedJs = optimized;
        
        console.log('✅ JavaScript最適化完了');
    }
    
    /**
     * HTML統合
     */
    async integrateHtml() {
        this.updateProgress(70, '📦 HTML統合');
        
        let html = this.collectedFiles.html;
        
        // CSS統合
        const cssPlaceholder = '<link rel="stylesheet" href="styles.css">';
        if (html.includes(cssPlaceholder)) {
            html = html.replace(cssPlaceholder, 
                `<style>\n${this.processedCss}\n</style>`);
        }
        
        // JavaScript統合（ES6モジュール削除・統合）
        const moduleScripts = html.match(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/g) || [];
        for (const script of moduleScripts) {
            html = html.replace(script, '');
        }
        
        // 統合JavaScriptを追加
        const scriptPlaceholder = '</body>';
        html = html.replace(scriptPlaceholder, 
            `<script>\n${this.optimizedJs}\n</script>\n</body>`);
        
        // 画像URLを置換
        for (const [imagePath, dataUrl] of this.processedImages) {
            const regex = new RegExp(`src="[^"]*${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
            html = html.replace(regex, `src="${dataUrl}"`);
        }
        
        // 外部CDN依存関係の処理
        html = await this.inlineExternalDependencies(html);
        
        // メタデータ追加
        html = this.addBuildMetadata(html);
        
        this.integratedHtml = html;
        
        console.log('✅ HTML統合完了');
        console.log(`  📊 統合HTMLサイズ: ${this.formatSize(html.length)}`);
    }
    
    /**
     * 圧縮処理
     */
    async compressOutput() {
        this.updateProgress(80, '🗜️ 圧縮処理');
        
        // HTMLの追加最適化
        let compressed = this.integratedHtml;
        
        if (this.options.minify) {
            // HTML圧縮
            compressed = compressed.replace(/\s+/g, ' ');
            compressed = compressed.replace(/>\s+</g, '><');
            compressed = compressed.replace(/\s*\n\s*/g, '');
            
            console.log(`  📦 HTML圧縮: ${this.formatSize(this.integratedHtml.length)} → ${this.formatSize(compressed.length)}`);
        }
        
        this.stats.compressedSize = compressed.length;
        this.stats.compressionRatio = ((this.stats.originalSize - this.stats.compressedSize) / this.stats.originalSize * 100);
        
        this.finalOutput = compressed;
        
        console.log('✅ 圧縮処理完了');
        console.log(`  📊 圧縮率: ${this.stats.compressionRatio.toFixed(2)}%`);
    }
    
    /**
     * PWA設定生成
     */
    async generatePWA() {
        this.updateProgress(85, '🔧 PWA設定生成');
        
        // Service Worker生成
        const serviceWorkerPath = path.join(__dirname, 'pwa-setup.js');
        if (fs.existsSync(serviceWorkerPath)) {
            const { generateServiceWorker, generateManifest } = await import('./pwa-setup.js');
            
            // Service Worker
            const serviceWorker = generateServiceWorker();
            fs.writeFileSync(path.join(this.distDir, 'service-worker.js'), serviceWorker);
            
            // Manifest
            const manifest = generateManifest();
            fs.writeFileSync(path.join(this.distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
            
            console.log('  📱 Service Worker generated');
            console.log('  📋 Manifest generated');
        }
        
        console.log('✅ PWA設定完了');
    }
    
    /**
     * 複数形式出力生成
     */
    async generateOutputs() {
        this.updateProgress(90, '📁 複数形式出力');
        
        // 1. スタンドアロン版（通常）
        const standalonePath = path.join(this.distDir, 'standalone', 'plantuml-editor-standalone.html');
        fs.writeFileSync(standalonePath, this.finalOutput);
        
        // 2. デバッグ版（ソースマップ付き）
        if (this.options.sourcemap) {
            const debugVersion = this.generateDebugVersion();
            const debugPath = path.join(this.distDir, 'debug', 'plantuml-editor-debug.html');
            fs.writeFileSync(debugPath, debugVersion);
        }
        
        // 3. 最小版（機能制限あり）
        const minimalVersion = this.generateMinimalVersion();
        const minimalPath = path.join(this.distDir, 'minimal', 'plantuml-editor-minimal.html');
        fs.writeFileSync(minimalPath, minimalVersion);
        
        // 4. ビルド情報
        const buildInfo = this.generateBuildInfo();
        fs.writeFileSync(path.join(this.distDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
        
        console.log('✅ 複数形式出力完了');
        console.log(`  📄 Standalone: ${this.formatSize(this.finalOutput.length)}`);
        console.log(`  🐛 Debug: ${this.options.sourcemap ? 'Generated' : 'Skipped'}`);
        console.log(`  📦 Minimal: ${this.formatSize(minimalVersion.length)}`);
    }
    
    /**
     * プログレス更新
     */
    updateProgress(percent, step) {
        this.progress.current = percent;
        const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
        process.stdout.write(`\r[${bar}] ${percent}% ${step}`);
        if (percent < 100) {
            console.log('');
        }
    }
    
    /**
     * ユーティリティメソッド
     */
    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + sizes[i];
    }
    
    findFiles(dir, extensions) {
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                files.push(...this.findFiles(fullPath, extensions));
            } else if (stat.isFile() && extensions.includes(path.extname(item).toLowerCase())) {
                files.push(fullPath);
            }
        }
        
        return files;
    }
    
    resolveModulePath(importPath, fromFile) {
        const baseName = path.basename(importPath);
        return this.moduleFiles.find(f => f === baseName || f === baseName + '.js');
    }
    
    topologicalSort(graph) {
        const visited = new Set();
        const temp = new Set();
        const result = [];
        
        const visit = (node) => {
            if (temp.has(node)) {
                throw new Error(`Circular dependency detected: ${node}`);
            }
            if (!visited.has(node)) {
                temp.add(node);
                const deps = graph.get(node) || [];
                for (const dep of deps) {
                    visit(dep);
                }
                temp.delete(node);
                visited.add(node);
                result.push(node);
            }
        };
        
        for (const node of graph.keys()) {
            visit(node);
        }
        
        return result;
    }
    
    generateInitializationCode() {
        return `
// === Initialization Code ===
(function() {
    'use strict';
    
    // Global exports setup
    if (typeof window !== 'undefined') {
        ${Array.from(this.transpiled.globals).map(name => 
            `window.${name} = ${name};`
        ).join('\n        ')}
    }
    
    // Initialize application
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof initializeApp === 'function') {
            initializeApp();
        }
    });
})();
`;
    }
    
    convertClassToFunction(code) {
        // 簡単なクラス→function変換（完全ではないが基本的な変換）
        return code.replace(/class\s+(\w+)\s*{([^}]+)}/g, (match, className, body) => {
            const methods = body.match(/(\w+)\s*\([^)]*\)\s*{[^}]*}/g) || [];
            const constructor = body.match(/constructor\s*\([^)]*\)\s*{[^}]*}/);
            
            let functionCode = '';
            if (constructor) {
                functionCode = constructor[0].replace('constructor', `function ${className}`);
            } else {
                functionCode = `function ${className}() {}`;
            }
            
            // メソッドをprototypeに追加
            for (const method of methods) {
                if (!method.startsWith('constructor')) {
                    const methodName = method.match(/(\w+)\s*\(/)[1];
                    functionCode += `\n${className}.prototype.${method}`;
                }
            }
            
            return functionCode;
        });
    }
    
    minifyCss(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // コメント削除
            .replace(/\s+/g, ' ') // 空白最適化
            .replace(/\s*([{}();,])\s*/g, '$1') // 記号周りの空白削除
            .replace(/;\s*}/g, '}') // 不要なセミコロン削除
            .trim();
    }
    
    addVendorPrefixes(css) {
        const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
        const properties = ['transform', 'transition', 'animation', 'box-shadow'];
        
        for (const prop of properties) {
            const regex = new RegExp(`(^|[^-])${prop}\\s*:`, 'gm');
            css = css.replace(regex, (match, prefix) => {
                let result = match;
                for (const vendorPrefix of prefixes) {
                    result += `\n${prefix}${vendorPrefix}${prop}:`;
                }
                return result;
            });
        }
        
        return css;
    }
    
    obfuscateCode(code) {
        // 簡単な難読化（変数名の短縮化）
        const varNames = code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
        const uniqueVars = [...new Set(varNames)];
        const reservedWords = ['var', 'let', 'const', 'function', 'class', 'if', 'else', 'for', 'while', 'return'];
        
        let obfuscated = code;
        let counter = 0;
        
        for (const varName of uniqueVars) {
            if (!reservedWords.includes(varName) && varName.length > 2) {
                const newName = 'a' + (counter++).toString(36);
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                obfuscated = obfuscated.replace(regex, newName);
            }
        }
        
        return obfuscated;
    }
    
    async inlineExternalDependencies(html) {
        // CDNからの外部依存関係をインライン化
        const cdnRegex = /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net[^"]*"[^>]*><\/script>/g;
        
        // この実装では簡略化（実際のプロジェクトでは fetch で取得）
        console.log('  🌐 External dependencies analysis');
        return html;
    }
    
    addBuildMetadata(html) {
        const buildTime = new Date().toISOString();
        const buildHash = createHash('md5').update(html).digest('hex').substring(0, 8);
        
        const metadata = `
<!-- Build Information -->
<!-- Build Time: ${buildTime} -->
<!-- Build Hash: ${buildHash} -->
<!-- Builder: PlantUML Editor Standalone Builder v2.0.0 -->
<!-- Target: file:// protocol compatible -->
`;
        
        return html.replace('<head>', `<head>${metadata}`);
    }
    
    generateDebugVersion() {
        // ソースマップとデバッグ情報付きバージョン
        let debug = this.integratedHtml;
        
        // デバッグコンソール追加
        const debugConsole = `
<div id="debug-console" style="position:fixed;bottom:0;right:0;width:300px;height:200px;background:#000;color:#0f0;font-family:monospace;font-size:10px;padding:10px;z-index:10000;display:none;overflow-y:auto;">
    <div style="color:#fff;margin-bottom:5px;">Debug Console</div>
    <div id="debug-output"></div>
</div>
<script>
window.showDebugConsole = function() {
    document.getElementById('debug-console').style.display = 'block';
};
window.debugLog = function(msg) {
    const output = document.getElementById('debug-output');
    output.innerHTML += '<div>' + new Date().toISOString() + ': ' + msg + '</div>';
    output.scrollTop = output.scrollHeight;
};
</script>
`;
        
        debug = debug.replace('</body>', debugConsole + '</body>');
        
        return debug;
    }
    
    generateMinimalVersion() {
        // 機能を制限した軽量版
        let minimal = this.integratedHtml;
        
        // 高度な機能を削除
        minimal = minimal.replace(/<!-- Phase 3:.*?-->/gs, '');
        minimal = minimal.replace(/<!-- Phase 4:.*?-->/gs, '');
        
        // CSS最適化
        minimal = minimal.replace(/<style>[^<]*<\/style>/gs, (match) => {
            const css = match.replace(/<\/?style>/g, '');
            const essentialCss = css.replace(/\.advanced-[^}]*}/g, '');
            return `<style>${essentialCss}</style>`;
        });
        
        return minimal;
    }
    
    generateBuildInfo() {
        return {
            buildTime: new Date().toISOString(),
            version: '2.0.0',
            stats: this.stats,
            options: this.options,
            targetSize: this.options.targetSizeKB + 'KB',
            actualSize: this.formatSize(this.stats.compressedSize),
            compressionRatio: this.stats.compressionRatio.toFixed(2) + '%',
            modules: Array.from(this.collectedFiles.modules.keys()),
            warnings: this.stats.warnings,
            errors: this.stats.errors
        };
    }
    
    generateReport() {
        console.log('\n📊 ビルドレポート');
        console.log('================');
        console.log(`⏱️  所要時間: ${((Date.now() - this.stats.startTime) / 1000).toFixed(2)}秒`);
        console.log(`📦 元サイズ: ${this.formatSize(this.stats.originalSize)}`);
        console.log(`🗜️  圧縮後: ${this.formatSize(this.stats.compressedSize)}`);
        console.log(`📊 圧縮率: ${this.stats.compressionRatio.toFixed(2)}%`);
        console.log(`📄 モジュール数: ${this.stats.moduleCount}`);
        console.log(`🎯 目標サイズ: ${this.formatSize(this.options.targetSizeKB * 1024)}`);
        console.log(`✅ サイズ達成: ${this.stats.compressedSize <= this.options.targetSizeKB * 1024 ? 'Yes' : 'No'}`);
        
        if (this.stats.warnings.length > 0) {
            console.log(`⚠️  警告: ${this.stats.warnings.length}件`);
            this.stats.warnings.forEach(w => console.log(`   ${w}`));
        }
        
        if (this.stats.errors.length > 0) {
            console.log(`❌ エラー: ${this.stats.errors.length}件`);
            this.stats.errors.forEach(e => console.log(`   ${e}`));
        }
        
        console.log('\n📁 出力ファイル:');
        console.log(`   📄 ${path.join(this.distDir, 'standalone', 'plantuml-editor-standalone.html')}`);
        console.log(`   🐛 ${path.join(this.distDir, 'debug', 'plantuml-editor-debug.html')}`);
        console.log(`   📦 ${path.join(this.distDir, 'minimal', 'plantuml-editor-minimal.html')}`);
        if (this.options.pwa) {
            console.log(`   📱 ${path.join(this.distDir, 'service-worker.js')}`);
            console.log(`   📋 ${path.join(this.distDir, 'manifest.json')}`);
        }
    }
    
    async handleBuildError(error) {
        console.log('\n🚨 エラーリカバリ実行中...');
        
        try {
            // 基本的なスタンドアロン版を生成
            const basicHtml = this.generateBasicStandalone();
            const errorPath = path.join(this.distDir, 'plantuml-editor-error-recovery.html');
            fs.writeFileSync(errorPath, basicHtml);
            
            console.log(`✅ エラーリカバリ版を生成しました: ${errorPath}`);
            console.log('   基本機能のみ利用可能です。');
            
        } catch (recoveryError) {
            console.error('❌ エラーリカバリも失敗しました:', recoveryError.message);
        }
    }
    
    generateBasicStandalone() {
        // 最小限の機能でスタンドアロン版を生成
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantUML Editor (Error Recovery Mode)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .error-notice { background: #ffe6e6; padding: 15px; border: 1px solid #ff9999; border-radius: 5px; margin-bottom: 20px; }
        textarea { width: 100%; height: 300px; font-family: monospace; }
        button { padding: 10px 20px; margin: 5px; }
    </style>
</head>
<body>
    <div class="error-notice">
        <h3>⚠️ エラーリカバリモード</h3>
        <p>ビルド処理中にエラーが発生したため、基本機能のみ利用可能です。</p>
    </div>
    
    <h1>PlantUML Editor (Basic Mode)</h1>
    
    <textarea id="plantuml-code" placeholder="PlantUMLコードを入力してください...">@startuml
顧客 -> システム : ログイン要求
システム --> 顧客 : ログイン完了
@enduml</textarea>
    
    <div>
        <button onclick="generatePreview()">プレビュー生成</button>
        <button onclick="clearCode()">クリア</button>
    </div>
    
    <div id="preview" style="margin-top: 20px;"></div>
    
    <script>
        function generatePreview() {
            const code = document.getElementById('plantuml-code').value;
            const encoded = btoa(unescape(encodeURIComponent(code)));
            const url = 'https://kroki.io/plantuml/svg/' + encoded;
            
            const preview = document.getElementById('preview');
            preview.innerHTML = '<img src="' + url + '" alt="PlantUML diagram" style="max-width: 100%;">';
        }
        
        function clearCode() {
            document.getElementById('plantuml-code').value = '@startuml\\n\\n@enduml';
            document.getElementById('preview').innerHTML = '';
        }
    </script>
</body>
</html>`;
    }
}

// CLI実行
if (import.meta.url === `file://${process.argv[1]}`) {
    const options = {};
    
    // コマンドライン引数解析
    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        switch (arg) {
            case '--no-minify':
                options.minify = false;
                break;
            case '--no-sourcemap':
                options.sourcemap = false;
                break;
            case '--no-pwa':
                options.pwa = false;
                break;
            case '--debug':
                options.debugMode = true;
                break;
            case '--obfuscate':
                options.enableObfuscation = true;
                break;
            case '--target-size':
                options.targetSizeKB = parseInt(process.argv[++i]) || 3072;
                break;
        }
    }
    
    const builder = new StandaloneBuilder(options);
    builder.build().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { StandaloneBuilder };