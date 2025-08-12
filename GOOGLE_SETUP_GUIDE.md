# Google スプレッドシート連携設定ガイド

## 🚀 手順

### 1. Google Cloud Consoleでプロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（例：`bom-management-system`）
3. プロジェクトを選択

### 2. Google Sheets APIの有効化
1. 左メニューの「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 3. APIキーの作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「APIキー」
3. 作成されたAPIキーをコピー
4. **推奨**: 「APIキーを制限」で以下を設定：
   - アプリケーションの制限：HTTPリファラー
   - ウェブサイトの制限：`https://your-domain.netlify.app/*`
   - API制限：Google Sheets API

### 4. OAuth 2.0クライアントIDの作成
1. 「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類：「ウェブアプリケーション」
3. 名前：任意（例：`BOM Management System`）
4. **重要**: 承認済みJavaScriptオリジンに以下を追加：
   ```
   https://your-actual-netlify-url.netlify.app
   http://localhost:3000
   http://localhost:8080
   http://127.0.0.1:3000
   http://127.0.0.1:8080
   ```
   **注意**: `your-actual-netlify-url`は実際のNetlifyアプリのURLに置き換えてください
5. **承認済みリダイレクトURI**は空のままにしてください（JavaScript OAuth2フローでは不要）
6. 作成されたクライアントIDをコピー

### 5. システムでの設定
1. 部品マスタページの「Google連携設定」ボタンをクリック
2. APIキーとクライアントIDを入力
3. 「接続テスト」で動作確認
4. 「保存」

## ❌ よくあるエラーと解決方法

### エラー: "API Key not valid"
- **原因**: APIキーが無効、または制限設定が間違っている
- **解決**: 
  - APIキーが正しくコピーされているか確認
  - Google Cloud ConsoleでAPIキーの制限を確認
  - Google Sheets APIが有効化されているか確認

### エラー: "Invalid client ID"
- **原因**: クライアントIDが無効、またはOAuth設定が間違っている
- **解決**:
  - クライアントIDが正しくコピーされているか確認
  - OAuth設定の「承認済みJavaScriptオリジン」を確認

### エラー: "redirect_uri_mismatch" または "Origin not allowed"
- **原因**: 現在のURLがOAuth設定で許可されていない
- **解決**:
  1. 現在アクセスしているURLを確認（例：`https://abc123.netlify.app`）
  2. Google Cloud ConsoleのOAuth設定で該当URLを追加：
     - 「APIとサービス」→「認証情報」
     - OAuth 2.0クライアントIDを選択
     - 「承認済みJavaScriptオリジン」に実際のURLを追加
  3. 設定保存後、数分待ってから再試行

### エラー: "Sheets API not enabled"
- **原因**: Google Sheets APIが有効化されていない
- **解決**:
  - Google Cloud ConsoleでSheets APIを有効化

## 🔍 デバッグ方法

1. システムの「Google連携設定」で「デバッグ情報」ボタンをクリック
2. 以下の情報を確認：
   - `gapiLoaded`: Google API JavaScript クライアントの読み込み状況
   - `googleOAuth`: Google Identity Services の読み込み状況
   - `storedApiKey`: APIキーの保存状況
   - `storedClientId`: クライアントIDの保存状況

## 📋 スプレッドシート準備

### データ形式（部品マスタの場合）
| A列（品番） | B列（部品名） | C列（カテゴリ） | D列（メーカー） | E列（定価） | F列（仕入れ値） | G列（発注先） | H列（リードタイム） |
|------------|-------------|-------------|-------------|----------|-------------|-------------|----------------|
| P001       | 抵抗器       | electronic  | ABC Electronics | 100 | 80 | サンプル商社 | 7 |
| P002       | コンデンサ   | electronic  | XYZ Components | 200 | 160 | サンプル商社 | 10 |

### 共有設定
1. スプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. 「制限付き」→「リンクを知っている全員」に変更
4. 「閲覧者」権限で設定

## 🔒 セキュリティ考慮事項

- APIキーにはHTTPリファラー制限を設定
- OAuth クライアントには必要最小限のオリジンのみ追加
- スプレッドシートの共有は「閲覧者」権限のみ
- 定期的にAPIキーとクライアントIDをローテーション

## 📞 サポート

設定で問題が発生した場合：
1. デバッグ情報を確認
2. ブラウザのコンソールエラーをチェック
3. Google Cloud Consoleの設定を再確認
