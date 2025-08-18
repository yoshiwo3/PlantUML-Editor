# E2Eテスト用最適化Dockerコンテナ
# Node.js 20.18.0 + Playwright + 全ブラウザサポート

FROM node:20.18.0-bullseye-slim

# メタデータ
LABEL maintainer="PlantUML Editor Test Team"
LABEL description="Optimized E2E Testing Environment for PlantUML Editor"
LABEL version="2.0.0"

# 環境変数設定
ENV NODE_ENV=test
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    # 基本ツール
    curl \
    wget \
    git \
    unzip \
    xvfb \
    dbus \
    dbus-x11 \
    # フォント（日本語対応）
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    # ブラウザ依存関係
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    # WebKit依存関係
    libwoff1 \
    libopus0 \
    libwebp6 \
    libwebpdemux2 \
    libenchant-2-2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    # 画像処理
    libvips-dev \
    # タイムゾーン設定
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# タイムゾーン設定
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure --frontend noninteractive tzdata

# 作業ディレクトリ設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production=false

# Playwrightブラウザのインストール
RUN npx playwright install chromium firefox webkit msedge
RUN npx playwright install-deps

# アプリケーションファイルをコピー
COPY . .

# テストファイルの権限設定
RUN chmod +x scripts/* || true

# 非rootユーザーの作成
RUN groupadd -r playwright && \
    useradd -r -g playwright -G audio,video playwright && \
    mkdir -p /home/playwright/Downloads && \
    chown -R playwright:playwright /home/playwright && \
    chown -R playwright:playwright /app && \
    chown -R playwright:playwright /ms-playwright

# ディスプレイ設定
ENV DISPLAY=:99

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8086/health || exit 1

# 実行ユーザー切り替え
USER playwright

# ポート公開
EXPOSE 8086 8087 9323

# デフォルトコマンド
CMD ["npm", "run", "test:e2e"]

# ビルド時引数
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# ラベル
LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"