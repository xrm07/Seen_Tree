# LM Studio Translator (MV3, minimal)

LM Studio のローカル API（OpenAI 互換）を呼び出して、選択テキストやページ全文を最小構成で翻訳する Chrome 拡張です。ローカル環境のみを対象とし、CORS を有効化した LM Studio に接続して動作します。

## 主な機能
- 選択テキスト翻訳: テキストをドラッグで選び、近傍に表示される「翻訳」ボタンで即時翻訳。
- ページ全文翻訳: ポップアップのボタン、またはページのコンテキストメニュー「このページを翻訳」から一括処理。
- モデル切り替え: LM Studio の `/models` エンドポイントからロード済みモデル一覧を取得し、ポップアップで選択。
- 設定同期: 翻訳方向（英→日 / 日→英）、自動翻訳、原文ホバー表示、選択ボタン表示などを `chrome.storage.sync` に保存。

## 前提条件
- LM Studio の Local Server（OpenAI Compatibility API）を `http://localhost:1234/v1`（または `http://127.0.0.1:1234/v1`）で起動し、**CORS を有効化**していること。
  - CLI 例: `lms server start --cors --port 1234`
  - ドキュメント: [LM Studio Docs – OpenAI Compatibility API](https://lmstudio.ai/docs/local-server/openai-compatibility-api)
- Google Chrome（Manifest V3 対応版）。

## 構成とデータフロー
1. `content.js` が選択テキストやページ DOM テキストノードを取得。
2. `chrome.runtime.sendMessage` で Service Worker (`sw.js`) に翻訳要求 (`TRANSLATE`) やモデル一覧要求 (`LIST_MODELS`) を送信。
3. `sw.js` が `fetch` で LM Studio の `/v1/chat/completions` または `/v1/models`（フォールバックで `/models`）にアクセスし、結果を返却。
4. `content.js` が結果をポップ表示、またはページノードのテキストを置換。

## インストール手順
1. LM Studio を起動し、左下の **Developer > Local Server** から API サーバーを開始（デフォルトはポート `1234`。必要に応じて変更を確認）。
2. このリポジトリを取得して `extension/` ディレクトリを保持。
3. Chrome で `chrome://extensions` を開き、右上の「デベロッパーモード」をオン。
4. 「パッケージ化されていない拡張機能を読み込む」→ リポジトリ内の `extension/` を選択。
5. 拡張の「詳細」→「拡張機能のオプション」で Base URL、モデル、翻訳方向などを設定。

## 使い方
### 選択テキストを翻訳
1. ページ上でテキストを選択。
2. 近傍に表示される「翻訳」ボタンをクリック。
3. ボタン付近にポップアップで翻訳結果が表示され、クリックで閉じられます。

### ページ全文を翻訳
- 拡張ポップアップで「このページを全文翻訳して置換」を押す。
- または、ページ上で右クリック→「このページを翻訳」を選択（コンテキストメニュー）。
- 進捗オーバーレイに処理件数が表示され、キャンセルボタンで中断できます。

### ポップアップで設定できる項目
- 翻訳方向 (`enja` / `jaen`)
- 自動全文翻訳（ページロード時に実行）
- 原文ホバー表示（翻訳結果の `title` 属性に原文を残す）
- 選択ボタンの表示有無
- モデル選択（一覧の再取得や保存済みモデルの保持）

## 設定と権限
- `chrome.storage.sync` に Base URL / モデル名 / 翻訳方向 / UI 設定を保存（同期上限は約 100 KB）。
- `manifest.json` の主な権限:
  - `permissions`: `storage`, `activeTab`, `scripting`, `contextMenus`
  - `host_permissions`: `http://127.0.0.1/*`, `http://localhost/*`
- 背景スクリプトは MV3 Service Worker (`sw.js`) として動作し、ネットワークアクセスやコンテキストメニュー登録を担当します。

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

- モデル一覧取得は `GET http://127.0.0.1:1234/v1/models` を利用（必要に応じて `/models` や `/api/v0/models` をフォールバックで試行）。
- 応答は OpenAI 形式で、`choices[0].message.content` を翻訳結果として利用します。

## 主要ファイル
- `extension/manifest.json`: MV3 用 manifest。バージョン `0.1.1`、コンテキストメニュー許可などを定義。
- `extension/sw.js`: 翻訳・モデル一覧リクエストの仲介、エラーハンドリング、コンテキストメニュー登録。
- `extension/content.js`: 選択テキスト UI、全文翻訳ロジック、進捗表示。
- `extension/popup.{html,js}`: 設定 UI とメッセージ送信、モデル一覧の更新。
- `extension/options.{html,js}`: Base URL / モデル / 翻訳方向などの保存。
- `extension/constants.js`: デフォルトの Base URL・モデル・翻訳方向・最大処理ノード数を定義。

## トラブルシュート
- 応答が返らない: LM Studio の Local Server が起動しているか、Base URL に `/v1` が含まれているか確認。
- モデル一覧が空: LM Studio でモデルがロード済みか確認し、ポップアップの「再取得」で `/models` エンドポイントへの接続を再試行。
- 全文翻訳が途中で止まる: 進捗オーバーレイのキャンセルを誤って押していないか確認し、`options` で `maxNodes` を調整。
- CORS や権限エラー: LM Studio 側で CORS が有効化されているか、拡張の `host_permissions` に対象ホストが含まれているか確認。

## ライセンス
- ライセンスは `LICENSE` を参照してください。ブランドやロゴの無断使用は避けてください。
