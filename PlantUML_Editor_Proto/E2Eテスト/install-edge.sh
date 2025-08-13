#!/bin/bash
# MS Edge インストールスクリプト

echo "MS Edgeをインストール中..."

# 必要なパッケージをインストール
apt-get update
apt-get install -y wget curl gnupg

# Microsoftのキーを追加
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/microsoft.gpg
install -o root -g root -m 644 /tmp/microsoft.gpg /etc/apt/trusted.gpg.d/
rm /tmp/microsoft.gpg

# Edgeリポジトリを追加
echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge-stable.list

# パッケージリストを更新してEdgeをインストール
apt-get update
apt-get install -y microsoft-edge-stable

# バージョン確認
microsoft-edge --version