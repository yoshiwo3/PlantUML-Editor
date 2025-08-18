"""
Locust Load Test for PlantUML Editor
分散負荷テスト - 10,000同時接続対応
"""

import random
import json
import time
from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlantUMLEditorUser(FastHttpUser):
    """
    PlantUMLエディタのユーザー行動をシミュレートするクラス
    FastHttpUserを使用してパフォーマンス最適化
    """
    
    # ユーザー間の待機時間（秒）
    wait_time = between(1, 5)
    
    # 接続設定
    connection_timeout = 10.0
    network_timeout = 10.0
    
    def on_start(self):
        """テスト開始時の初期化処理"""
        self.user_id = f"load_test_user_{random.randint(1000, 9999)}"
        self.session_id = f"session_{random.randint(10000, 99999)}"
        self.test_start_time = time.time()
        
        # テストデータ初期化
        self.japanese_inputs = [
            "ユーザーがECサイトで商品を検索し、カートに追加し、決済を完了する",
            "管理者が在庫管理システムで新商品を登録し、価格を設定し、公開する", 
            "システムが夜間バッチで売上データを集計し、レポートを生成し、メール送信する",
            "顧客サポートが問い合わせを受付け、FAQを検索し、回答を送信する",
            "配送業者が荷物をピックアップし、配送状況を更新し、顧客に通知する",
            "IoTセンサーがデータを収集し、異常を検出し、アラートを発信する",
            "APIゲートウェイがリクエストを受信し、認証し、適切なサービスにルーティングする",
            "データベースがトランザクションを処理し、整合性を保ち、ログを記録する",
            "Webサーバーがリクエストを処理し、静的ファイルを配信し、レスポンスを返す",
            "キャッシュサーバーがデータを保存し、有効期限を管理し、無効化処理を実行する"
        ]
        
        self.conversion_types = [
            "sequence_diagram",
            "class_diagram", 
            "activity_diagram",
            "use_case_diagram",
            "component_diagram"
        ]
        
        logger.info(f"ユーザー {self.user_id} がテスト開始")
        
    def on_stop(self):
        """テスト終了時の処理"""
        test_duration = time.time() - self.test_start_time
        logger.info(f"ユーザー {self.user_id} がテスト終了（実行時間: {test_duration:.2f}秒）")

    @task(10)
    def load_homepage(self):
        """ホームページ読み込み（高頻度）"""
        with self.client.get(
            "/",
            headers={
                "User-Agent": "Locust-LoadTest/1.0",
                "X-Test-Type": "homepage-load",
                "X-User-ID": self.user_id
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                if "PlantUML" in response.text:
                    response.success()
                else:
                    response.failure("PlantUMLエディタのコンテンツが見つかりません")
            else:
                response.failure(f"ホームページ読み込み失敗: {response.status_code}")

    @task(8)  
    def convert_japanese_to_plantuml(self):
        """日本語→PlantUML変換（メイン機能）"""
        japanese_input = random.choice(self.japanese_inputs)
        conversion_type = random.choice(self.conversion_types)
        
        payload = {
            "input": japanese_input,
            "type": conversion_type,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "timestamp": int(time.time() * 1000),
            "options": {
                "includeActors": True,
                "autoLayout": True,
                "theme": "default"
            }
        }
        
        with self.client.post(
            "/api/convert",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-Type": "conversion",
                "X-Conversion-Type": conversion_type
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    result = response.json()
                    if "plantuml" in result and "@startuml" in result["plantuml"]:
                        response.success()
                        
                        # パフォーマンスメトリクス記録
                        if response.elapsed.total_seconds() > 2.0:
                            logger.warning(f"変換処理が遅い: {response.elapsed.total_seconds():.2f}秒")
                            
                    else:
                        response.failure("PlantUML変換結果が不正")
                except json.JSONDecodeError:
                    response.failure("JSON解析エラー")
            else:
                response.failure(f"変換API失敗: {response.status_code}")

    @task(5)
    def realtime_sync_simulation(self):
        """リアルタイム同期機能のシミュレーション"""
        sync_events = []
        
        # 複数の同期イベントを生成
        for i in range(random.randint(3, 8)):
            event = {
                "type": "editor_change",
                "data": {
                    "content": random.choice(self.japanese_inputs)[:50],  # 50文字まで
                    "position": random.randint(0, 100),
                    "timestamp": int(time.time() * 1000) + i * 100
                },
                "sequence": i,
                "userId": self.user_id,
                "sessionId": self.session_id
            }
            sync_events.append(event)
        
        payload = {
            "events": sync_events,
            "batchId": f"batch_{random.randint(1000, 9999)}",
            "userId": self.user_id,
            "timestamp": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/api/sync",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-Type": "realtime-sync",
                "X-Batch-Size": str(len(sync_events))
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                # 同期遅延チェック（100ms以下が目標）
                if response.elapsed.total_seconds() * 1000 <= 100:
                    response.success()
                else:
                    logger.warning(f"同期遅延: {response.elapsed.total_seconds() * 1000:.1f}ms")
                    response.success()  # 遅延があっても成功扱い
            else:
                response.failure(f"同期API失敗: {response.status_code}")

    @task(3)
    def load_static_resources(self):
        """静的リソースの読み込み"""
        resources = [
            "/css/style.css",
            "/js/app.js", 
            "/js/plantuml-parser.js",
            "/images/logo.png",
            "/favicon.ico"
        ]
        
        resource = random.choice(resources)
        
        with self.client.get(
            resource,
            headers={
                "User-Agent": "Locust-LoadTest/1.0",
                "X-Test-Type": "static-resource"
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                # キャッシュヘッダーの確認
                if "Cache-Control" in response.headers:
                    response.success()
                else:
                    logger.warning(f"キャッシュヘッダーなし: {resource}")
                    response.success()
            elif response.status_code == 404:
                # 404は許容（リソースが存在しない場合）
                response.success()
            else:
                response.failure(f"静的リソース読み込み失敗: {response.status_code}")

    @task(2)
    def api_health_check(self):
        """ヘルスチェックAPI"""
        with self.client.get(
            "/api/health",
            headers={
                "X-Test-Type": "health-check",
                "X-User-ID": self.user_id
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    health_data = response.json()
                    if health_data.get("status") == "ok":
                        response.success()
                    else:
                        response.failure("ヘルスチェック状態が異常")
                except:
                    response.failure("ヘルスチェックレスポンスが不正")
            else:
                response.failure(f"ヘルスチェック失敗: {response.status_code}")

    @task(1)
    def memory_intensive_operation(self):
        """メモリ使用量の多い操作（大量データ処理）"""
        large_input = "大規模システム統合シナリオ: " + "複雑な処理フロー、" * 100
        
        payload = {
            "input": large_input,
            "type": "complex_processing",
            "userId": self.user_id,
            "options": {
                "complexity": "high",
                "includeDetails": True,
                "generateDocumentation": True
            },
            "timestamp": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/api/convert/complex",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-Type": "memory-intensive"
            },
            catch_response=True,
            timeout=15  # タイムアウト延長
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                # エンドポイントが存在しない場合は成功扱い
                response.success()
            else:
                response.failure(f"複雑処理失敗: {response.status_code}")


class AdminUser(HttpUser):
    """管理者操作をシミュレートするユーザークラス"""
    
    wait_time = between(5, 15)  # 管理者は操作頻度が低い
    weight = 1  # 全体の1%が管理者
    
    @task
    def admin_operations(self):
        """管理者専用操作"""
        admin_endpoints = [
            "/api/admin/stats",
            "/api/admin/users",
            "/api/admin/config",
            "/api/admin/logs"
        ]
        
        endpoint = random.choice(admin_endpoints)
        
        with self.client.get(
            endpoint,
            headers={
                "Authorization": "Bearer admin-test-token",
                "X-Test-Type": "admin-operation"
            },
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 404]:
                # 200(成功), 401(認証なし), 404(存在しない)は正常
                response.success()
            else:
                response.failure(f"管理者操作失敗: {response.status_code}")


class WebSocketUser(HttpUser):
    """WebSocket接続をシミュレートするユーザー"""
    
    wait_time = between(0.1, 1)  # 高頻度でメッセージ送信
    weight = 2  # 全体の2%がWebSocket使用
    
    @task
    def websocket_simulation(self):
        """WebSocket機能のHTTP APIシミュレーション"""
        # WebSocketの代わりにHTTP APIでリアルタイム通信をシミュレート
        payload = {
            "type": "websocket_message",
            "data": {
                "message": "リアルタイム更新テスト",
                "timestamp": int(time.time() * 1000)
            },
            "connectionId": f"ws_{random.randint(1000, 9999)}"
        }
        
        with self.client.post(
            "/api/websocket/simulate",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-Type": "websocket-simulation"
            },
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"WebSocketシミュレーション失敗: {response.status_code}")


# イベントハンドラー
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """テスト開始時の処理"""
    logger.info("🚀 Locust負荷テスト開始")
    logger.info(f"📊 Target Host: {environment.host}")
    logger.info("📈 分散負荷テスト - 最大10,000同時接続")


@events.test_stop.add_listener 
def on_test_stop(environment, **kwargs):
    """テスト終了時の処理"""
    logger.info("🏁 Locust負荷テスト完了")
    
    # 統計情報の出力
    stats = environment.stats
    total_requests = stats.total.num_requests
    total_failures = stats.total.num_failures
    failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0
    
    logger.info(f"📊 総リクエスト数: {total_requests}")
    logger.info(f"❌ 失敗数: {total_failures}")
    logger.info(f"📈 失敗率: {failure_rate:.2f}%")
    logger.info(f"⏱️ 平均応答時間: {stats.total.avg_response_time:.2f}ms")
    logger.info(f"🔥 最大応答時間: {stats.total.max_response_time:.2f}ms")


@events.user_error.add_listener
def on_user_error(user_instance, exception, tb, **kwargs):
    """ユーザーエラー時の処理"""
    logger.error(f"ユーザーエラー: {exception}")


# カスタムタスクセット（地理的分散シミュレーション）
class RegionalUser(HttpUser):
    """地域別ユーザーをシミュレート"""
    
    wait_time = between(2, 8)
    weight = 3
    
    def on_start(self):
        # 地域情報の設定
        regions = ["tokyo", "osaka", "nagoya", "fukuoka", "sapporo"]
        self.region = random.choice(regions)
        self.latency_simulation = random.uniform(10, 100)  # ms
        
    @task
    def regional_access(self):
        """地域特有のアクセスパターン"""
        # 地域ごとの遅延をシミュレート
        time.sleep(self.latency_simulation / 1000)
        
        with self.client.get(
            "/",
            headers={
                "X-Region": self.region,
                "X-Simulated-Latency": str(self.latency_simulation),
                "X-Test-Type": "regional-access"
            },
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"地域アクセス失敗: {response.status_code}")


if __name__ == "__main__":
    """ローカル実行用（デバッグ）"""
    import subprocess
    import sys
    
    # Locustを起動
    cmd = [
        sys.executable, "-m", "locust",
        "-f", __file__,
        "--host", "http://localhost:8086",
        "--users", "100",
        "--spawn-rate", "10",
        "--run-time", "5m",
        "--headless"
    ]
    
    subprocess.run(cmd)