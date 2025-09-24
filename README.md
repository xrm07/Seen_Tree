# LM Studio Translator (MV3, minimal)

LM Studio のローカル API（OpenAI 互換）を呼び出して、選択テキストやページ全文を最小構成で翻訳する Chrome 拡張です。

## 主な機能
- 選択テキスト翻訳: テキストをドラッグで選び、近傍に表示される「翻訳」ボタンで即時翻訳。
- ページ全文翻訳: ポップアップのボタン、またはページのコンテキストメニュー「このページを翻訳」から一括処理。
- モデル切り替え: LM Studio の `/models` エンドポイントからロード済みモデル一覧を取得し、ポップアップで選択。
- 設定同期: 翻訳方向（英→日 / 日→英）、自動翻訳、原文ホバー表示、選択ボタン表示などを `chrome.storage.sync` に保存。
- API キー対応: LM Studio 側で API キー認証を有効化している場合でも、Authorization ヘッダーを付与してアクセス可能。

## 前提条件
- LM Studio の Local Server 機能を有効化し、OpenAI 互換 API を `http://localhost:1234/v1`（または `127.0.0.1`）で公開していること。
  詳細: [LM Studio Docs – OpenAI Compatibility API](https://lmstudio.ai/docs/local-server/openai-compatibility-api)
- Google Chrome (MV3 対応版)。

## 構成とデータフロー
1. `content.js` が選択テキストやページ DOM テキストノードを取得。
2. `chrome.runtime.sendMessage` で Service Worker (`sw.js`) に翻訳要求 (`TRANSLATE`) やモデル一覧要求 (`LIST_MODELS`) を送信。
3. `sw.js` が `fetch` で LM Studio の `/v1/chat/completions` または `/models` にアクセスし、結果を返却。
4. `content.js` が結果をポップ表示、またはページノードのテキストを置換。

## インストール手順
1. LM Studio を起動し、左下の **Developer > Local Server** から API サーバーを開始（デフォルトでポート `1234`）。
2. このリポジトリを取得し、`extension/` ディレクトリを保持する。
3. Chrome で `chrome://extensions` を開き、右上「デベロッパーモード」をオン。
4. 「パッケージ化されていない拡張機能を読み込む」→ このリポジトリの `extension/` を選択。
5. オプションページ（拡張の「詳細」→「拡張機能のオプション」）で Base URL、モデル、翻訳言語、必要に応じて API キーを設定。

## 使い方
### 選択テキストを翻訳
1. ページ上でテキストを選択。
2. 近傍に表示される「翻訳」ボタンをクリック。
3. ボタンの近辺にポップアップで翻訳結果が表示され、クリックすると閉じる。

### ページ全文を翻訳
- 拡張ポップアップで「このページを全文翻訳して置換」を押す。
- もしくは、ページ上で右クリック→「このページを翻訳」を選択（コンテキストメニュー）。
- 進捗オーバーレイに処理件数が表示され、設定でキャンセルも可能。

### ポップアップで設定できる項目
- 翻訳方向（`enja` / `jaen`）。
- 自動全文翻訳（ページロード時に開始）。
- 原文ホバー表示（翻訳結果に原文を `title` 属性で保持）。
- 選択ボタンの表示有無。
- モデル選択（一覧再取得、保存済みモデルの保持 / 通信失敗時も保存済みモデルを表示）。
- LM Studio API キーの入力（必要な環境のみ）。

## 設定と権限
- `chrome.storage.sync` に Base URL / モデル名 / 方向 / UI 設定 / API キー（必要な場合）を保存。同期上限は約 100 KB。
- `manifest.json` の主要権限:
  - `permissions`: `storage`, `activeTab`, `scripting`, `contextMenus`
  - `host_permissions`: `http://127.0.0.1/*`, `http://localhost/*`
- 背景スクリプトは MV3 Service Worker (`sw.js`) として動作し、ネットワークアクセスとコンテキストメニュー登録を担当。

## LM Studio API 呼び出し例
```http
POST http://127.0.0.1:1234/v1/chat/completions
Content-Type: application/json

{
  "model": "google/gemma-3-1b",
  "messages": [
    { "role": "system", "content": "Translate the user's text into ja. Preserve formatting." },
    { "role": "user", "content": "source text" }
  ],
  "temperature": 0.2,
  "stream": false
}
```
- モデル一覧取得は `GET http://127.0.0.1:1234/v1/models` を利用（バージョン付きエンドポイントを優先し、常に `/models` 非バージョンパスと `/api/v0/models` をフォールバックとして試行）。

## 主要ファイル
- `extension/manifest.json`: MV3 用 manifest。バージョン `0.1.1`、コンテキストメニュー許可などを定義。
- `extension/sw.js`: 翻訳・モデル一覧リクエストの仲介とエラーハンドリング、コンテキストメニュー登録。
- `extension/content.js`: 選択テキスト UI、全文翻訳ロジック、進捗表示。
- `extension/popup.{html,js}`: 設定 UI とメッセージ送信、モデル一覧更新。
- `extension/options.{html,js}`: Base URL / モデル / ターゲット言語 / API キー設定の保存。
- `extension/constants.js`: デフォルトの Base URL・モデル・ターゲット言語を定義。

## トラブルシュート
- 応答が返ってこない: LM Studio の Local Server が起動しているか、Base URL が `/v1` 付きになっているかを確認。
- モデル一覧が空: LM Studio の UI でモデルがロード済みか確認。ポップアップの「再取得」を押して `/models` エンドポイントへの接続を再試行（拡張機能は `/v1/models` → `/models` → `/api/v0/models` の順で試行し、失敗しても保存済みモデルを表示）。
- 全文翻訳が途中で止まる: 進捗オーバーレイのキャンセルボタンを誤って押していないか、`maxNodes` 設定値を `options` 画面で調整。
- CORS や権限エラー: `host_permissions` に対象ホストが含まれているか、拡張を再読み込みして設定を反映させる。

## ライセンス
- LICENSE ファイルを参照。ブランドやロゴの無断使用は避けてください。
