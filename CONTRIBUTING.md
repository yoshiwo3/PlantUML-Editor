# 🤝 コントリビューションガイドライン / Contributing Guide

## 🌟 プロジェクトへの参加を歓迎します！

PlantUML日本語変換プロジェクトにご興味をお持ちいただき、ありがとうございます！このプロジェクトは、コミュニティの皆様の貢献により成り立っています。

## 📋 目次

- [コントリビューションの種類](#コントリビューションの種類)
- [開始前の準備](#開始前の準備)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [コーディング規約](#コーディング規約)
- [プルリクエストのガイドライン](#プルリクエストのガイドライン)
- [Issue報告のガイドライン](#issue報告のガイドライン)
- [コミュニティ行動規範](#コミュニティ行動規範)
- [質問・サポート](#質問・サポート)

## 🎯 コントリビューションの種類

### 💻 コード貢献

- **🐛 バグ修正**: 既存の問題を修正
- **✨ 新機能**: 新しい機能の実装
- **⚡ パフォーマンス改善**: 処理速度やメモリ使用量の最適化
- **🔧 リファクタリング**: コード品質の改善
- **🧪 テスト**: テストカバレッジの向上

### 📚 ドキュメント

- **📖 ドキュメント改善**: README、Wiki、APIドキュメントの更新
- **🌐 翻訳**: 多言語サポートの追加・改善
- **📝 チュートリアル**: 使用方法や実装例の作成
- **❓ FAQ**: よくある質問への回答

### 🎨 デザイン・UX

- **🖼️ UI/UXデザイン**: ユーザーインターフェースの改善
- **🎨 アイコン・グラフィック**: 視覚的要素の作成・改善
- **📱 レスポンシブ対応**: モバイル・タブレット対応の改善

### 🧪 品質保証

- **🔍 テスト**: 手動・自動テストの実施
- **🐛 バグ報告**: 問題の発見と報告
- **📊 パフォーマンス測定**: 性能の測定と分析

### 💬 コミュニティ

- **❓ サポート**: 他のユーザーの質問に回答
- **📢 広報**: プロジェクトの宣伝・普及
- **🎉 イベント企画**: 勉強会やハッカソンの企画

## 🚀 開始前の準備

### 1. 📋 既存の作業を確認

- **Issues**: [既存のIssue](https://github.com/your-org/plantuml-jp2en/issues)を確認
- **Pull Requests**: [進行中のPR](https://github.com/your-org/plantuml-jp2en/pulls)を確認
- **Discussions**: [コミュニティディスカッション](https://github.com/your-org/plantuml-jp2en/discussions)を確認

### 2. 🎯 作業内容を決定

- **小さな変更から始める**: 最初は小さなバグ修正や文書更新から
- **Issue作成**: 大きな変更の場合は事前にIssueを作成して議論
- **担当者確認**: 誰も作業していないことを確認

### 3. 🤝 コミュニティに参加

- **自己紹介**: [Discussions](https://github.com/your-org/plantuml-jp2en/discussions)で自己紹介
- **質問**: 不明な点があれば気軽に質問
- **方針確認**: 実装方針について事前に相談

## 🔧 開発環境のセットアップ

### 必要な環境

- **Node.js**: v20.x 以上
- **npm**: v9.x 以上
- **Git**: v2.x 以上
- **Docker**: v20.x 以上（オプション）

### セットアップ手順

```bash
# 1. リポジトリをフォーク・クローン
git clone https://github.com/your-username/plantuml-jp2en.git
cd plantuml-jp2en

# 2. 依存関係をインストール
npm install
cd jp2plantuml && npm install

# 3. 開発サーバーを起動
npm run dev

# 4. ブラウザで確認
# http://localhost:8086
```

### Docker環境（推奨）

```bash
# Docker Composeで環境構築
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 環境確認

```bash
# テスト実行
npm test

# リント実行
npm run lint

# ビルド確認
npm run build
```

## 📏 コーディング規約

### JavaScript/Node.js

```javascript
// ✅ 良い例
/**
 * PlantUML構文を解析する関数
 * @param {string} input - 日本語テキスト
 * @returns {string} PlantUML構文
 */
function convertToPlantUML(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('入力値が無効です');
  }
  
  // 処理ロジック
  return result;
}

// ❌ 悪い例
function convert(i) {
  return i.replace(/[あ-ん]/g, '');
}
```

### 命名規則

- **関数**: `camelCase` - `getUserData()`, `validateInput()`
- **変数**: `camelCase` - `userName`, `isValid`
- **定数**: `UPPER_CASE` - `MAX_LENGTH`, `API_ENDPOINT`
- **クラス**: `PascalCase` - `PlantUMLParser`, `DataValidator`
- **ファイル**: `kebab-case` - `user-service.js`, `data-parser.js`

### コメント規則

```javascript
/**
 * 日本語テキストをPlantUML形式に変換
 * 
 * @description この関数は日本語で書かれたシステム仕様を
 *              PlantUML構文に変換します
 * 
 * @param {string} japaneseText - 変換する日本語テキスト
 * @param {Object} options - 変換オプション
 * @param {boolean} options.includeComments - コメントを含めるか
 * @returns {Promise<string>} 変換されたPlantUML構文
 * 
 * @throws {Error} 入力値が無効な場合
 * @throws {ValidationError} バリデーションエラー
 * 
 * @example
 * const result = await convertJapaneseToPlantUML('ユーザーがログインする');
 * console.log(result); // '@startuml\nactor User\nUser -> System : login\n@enduml'
 */
async function convertJapaneseToPlantUML(japaneseText, options = {}) {
  // 実装
}
```

### エラーハンドリング

```javascript
// ✅ 適切なエラーハンドリング
try {
  const result = await processInput(data);
  return result;
} catch (error) {
  logger.error('処理エラー:', {
    error: error.message,
    stack: error.stack,
    input: data
  });
  
  if (error instanceof ValidationError) {
    throw new UserFriendlyError('入力データが正しくありません');
  }
  
  throw new InternalError('システムエラーが発生しました');
}
```

### CSS/スタイル規則

```css
/* ✅ BEM記法を使用 */
.plantuml-editor {
  background-color: #ffffff;
  border: 1px solid #e1e5e9;
}

.plantuml-editor__input {
  padding: 16px;
  font-size: 14px;
}

.plantuml-editor__button--primary {
  background-color: #007bff;
  color: white;
}

/* ❌ 避けるべき記法 */
.editor div input {
  background: blue;
}
```

## 🔄 プルリクエストのガイドライン

### PR作成前のチェックリスト

- [ ] **ブランチ作成**: `feature/機能名` または `fix/修正内容`
- [ ] **テスト実行**: すべてのテストが通る
- [ ] **リント実行**: コーディング規約に準拠
- [ ] **ドキュメント**: 必要に応じてドキュメントを更新
- [ ] **コミットメッセージ**: 規約に従った明確なメッセージ

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**例:**
```
feat(parser): 日本語アクティビティ図の解析機能を追加

- 日本語でのアクティビティ定義をサポート
- 条件分岐パターンの認識を改善
- テストケースを30個追加

Closes #123
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

### PR作成手順

1. **ブランチ作成**
   ```bash
   git checkout -b feature/新機能名
   ```

2. **開発・コミット**
   ```bash
   git add .
   git commit -m "feat: 新機能を追加"
   ```

3. **プッシュ**
   ```bash
   git push origin feature/新機能名
   ```

4. **PR作成**
   - GitHub上でPull Requestを作成
   - テンプレートに従って内容を記入
   - レビュアーをアサイン

### レビュープロセス

1. **自動チェック**: CI/CDパイプラインでの自動テスト
2. **コードレビュー**: メンテナーによるレビュー
3. **修正対応**: 指摘事項への対応
4. **マージ**: 承認後にmainブランチにマージ

## 🐛 Issue報告のガイドライン

### バグ報告

```markdown
## 🐛 バグの概要
[バグの簡潔な説明]

## 🔄 再現手順
1. [ステップ1]
2. [ステップ2]
3. [エラー発生]

## 🌍 環境情報
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 118]
- Version: [e.g. v1.0.0]

## 📎 追加情報
[スクリーンショット、ログなど]
```

### 機能要求

```markdown
## ✨ 機能概要
[機能の説明]

## 🎯 解決したい課題
[現在の問題点]

## 💡 提案する解決策
[具体的な機能案]

## 📋 受け入れ条件
- [ ] [条件1]
- [ ] [条件2]
```

## 👥 コミュニティ行動規範

### 私たちの約束

私たちは開放的で親しみやすい環境を作るために、以下のことを約束します：

- **🤝 尊重**: すべての参加者を尊重する
- **💬 建設的**: 建設的で有益なフィードバックを提供する
- **🌍 多様性**: 多様な背景と経験を歓迎する
- **📚 学習**: 学習とスキル向上をサポートする
- **🎯 協力**: 共通の目標に向かって協力する

### 期待される行動

- **丁寧なコミュニケーション**: 敬語を使わず、親しみやすい口調で
- **包括的な言語**: 差別的・排他的な表現を避ける
- **建設的な批判**: 人ではなく、アイデアや行動に対して
- **他者への敬意**: 異なる意見や経験を尊重する
- **プライバシーの尊重**: 個人情報や機密情報の保護

### 禁止される行動

- 嫌がらせ、侮辱、差別的発言
- 他者への個人攻撃
- 公的・私的な嫌がらせ
- 許可なく個人情報を公開すること
- プロジェクトにそぐわない商業的宣伝

## 🎓 学習リソース

### 🔧 技術スキル

- **[Node.js公式ドキュメント](https://nodejs.org/ja/docs/)**
- **[JavaScript MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript)**
- **[PlantUML公式サイト](https://plantuml.com/ja/)**
- **[Git基本操作](https://git-scm.com/book/ja/v2)**

### 🤝 オープンソース

- **[初心者向けOSS貢献ガイド](https://opensource.guide/ja/)**
- **[GitHub使い方](https://docs.github.com/ja)**
- **[コードレビューのベストプラクティス](https://google.github.io/eng-practices/review/)**

## 🆘 質問・サポート

### 💬 気軽に質問してください！

- **[GitHub Discussions](https://github.com/your-org/plantuml-jp2en/discussions)**: 一般的な質問
- **[Discord](https://discord.gg/yourproject)**: リアルタイム相談
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/plantuml-jp2en)**: 技術的な質問

### 📧 メンテナー連絡先

- **一般的な質問**: community@yourproject.com
- **セキュリティ**: security@yourproject.com
- **コミュニティマネージャー**: @community-manager

## 🏆 貢献者の認定

### 🌟 貢献度による認定制度

- **🥇 Core Contributor**: 継続的な重要な貢献
- **🥈 Active Contributor**: 定期的な貢献
- **🥉 First-time Contributor**: 初回貢献の方

### 🎁 特典

- **Hall of Fame**: READMEでの掲載
- **スペシャルバッジ**: GitHubプロフィールでの表示
- **プロジェクトグッズ**: ステッカーやTシャツ（可能な場合）

## 📅 定期イベント

### 毎月のイベント

- **🎉 コミュニティミートアップ**: 毎月第3土曜日
- **👨‍💻 コーディングセッション**: 毎月第1日曜日
- **📚 ドキュメンテーション**: 毎月第2土曜日

### 年次イベント

- **🏆 コントリビューター表彰式**: 年末
- **📊 プロジェクト振り返り**: 年始
- **🚀 ロードマップ策定**: 四半期ごと

## 📝 更新履歴

| 日付       | バージョン | 変更内容                          |
|-----------|-----------|-----------------------------------|
| 2025-08-13 | v1.0.0    | コントリビューションガイド初版作成 |

---

## 🙏 最後に

**あなたの貢献を心待ちにしています！**

小さな変更でも大歓迎です。一緒により良いプロジェクトを作りましょう。

質問があれば、いつでもお気軽にお声がけください。私たちのコミュニティは、新しいメンバーをいつでも温かく歓迎します。

**Happy Coding! 🎉**

---

*このガイドラインは定期的に更新されます。最新版は常にGitHubリポジトリで確認してください。*