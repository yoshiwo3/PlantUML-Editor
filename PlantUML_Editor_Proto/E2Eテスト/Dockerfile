# Playwright公式イメージ（Ubuntu 22.04ベース、Node.js 20含む）
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# 作業ディレクトリ設定
WORKDIR /app

# package.jsonをコピー（依存関係のキャッシュ効率化のため）
COPY package.json ./

# 依存関係のインストール（Playwrightはすでにインストール済み）
RUN npm install --omit=dev

# Playwrightブラウザのインストール（必要最小限）
RUN npx playwright install chromium

# テストファイルをコピー
COPY . .

# テスト実行用のエントリーポイント
ENTRYPOINT ["npm", "run"]
CMD ["test"]