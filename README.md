# LM Studio Translator (MV3, minimal)

LM Studio互換APIのみを叩く最小Chrome拡張。
要件:

LM StudioのAPI設定で作動
選択テキスト時に選択近傍へ拡張アイコンを出し、クリックで翻訳→結果を近傍ポップ表示
右上の拡張ポップから「全文翻訳」開始。終了後ページ上テキストを置換
1. 構成

/extension ├─ manifest.json # MV3宣言。SW・権限・コンテントスクリプト・ポップ ├─ sw.js # Service Worker。LM Studioへfetch、翻訳実行 ├─ content.js # 選択検知→フローティングボタン→結果ポップ、全文置換ロジック ├─ popup.html / popup.js # 右上ポップ。全文翻訳の開始ボタン ├─ options.html / options.js # LM Studio Base URL / Model / Target言語設定（storage.sync） └─ README.md

データフロー

content.js → chrome.runtime.sendMessage → sw.js → fetch( LM Studio /v1/chat/completions ) → 応答返却
全文はcontent.jsがDOMテキストノードを列挙→逐次翻訳→置換
2. インストール

LM StudioでローカルAPIサーバを起動（Developer/Local Server）
このリポジトリを取得
Chrome → chrome://extensions → デベロッパーモード → パッケージ化されていない拡張機能を読み込む → /extensionを選択
拡張の「詳細」→「拡張機能のオプション」から以下を設定
Base URL: http://127.0.0.1:1234/v1
Model: 例 qwen2.5-7b-instruct（LM Studioでロードしたモデル名）
Target Lang: ja など
3. 使い方

選択翻訳（近傍ポップ）

ページ上でテキストを選択
選択近くに小ボタン「翻訳」が出る
ボタンを押す → 近傍に結果ポップが表示
全文翻訳（置換）

ブラウザ右上の拡張アイコンを開く
「このページを全文翻訳して置換」を押す
完了後、ページ内のテキストノードが翻訳結果で置換
4. 設定・権限

host_permissions:
http://127.0.0.1:1234/*
http://localhost:1234/*
permissions: storage, activeTab, scripting
設定保存は chrome.storage.sync（モデル名・Base URL・Target）。同期上限は約100KB
5. LM Studio API（OpenAI互換）

エンドポイント: POST {BASE}/chat/completions
例ボディ:
{
  "model": "qwen2.5-7b-instruct",
  "messages": [
    { "role": "system", "content": "Translate to ja. Preserve formatting. No explanations." },
    { "role": "user", "content": "source text..." }
  ],
  "temperature": 0.2
}

  •	応答: OpenAI形式。choices[0].message.contentを取り出して使用
  •	LM StudioのローカルAPIは通常APIキー不要

⸻

主要ファイル
manifest.json（抜粋）

{ "manifest_version": 3, "name": "LM Studio Translator (minimal)", "version": "0.1.0", "permissions": ["storage", "activeTab", "scripting"], "host_permissions": [ "http://127.0.0.1:1234/", "http://localhost:1234/" ], "background": { "service_worker": "sw.js", "type": "module" }, "action": { "default_title": "Translate", "default_popup": "popup.html" }, "options_page": "options.html", "content_scripts": [ { "matches": ["<all_urls>"], "js": ["content.js"], "run_at": "document_idle" } ] }

sw.js（役割） • 受信: { type: "TRANSLATE", text } • 送信: { ok: true, text } or { ok: false, error } • fetchでLM Studioの/v1/chat/completionsへPOST

content.js（役割） • mouseupで選択文字列を取得 • 近傍に「翻訳」ボタンを描画→クリック時にSWへメッセージ • 結果を近傍ポップに描画 • START_PAGE_TRANSLATION受信でページ全文を逐次翻訳して置換 • 過負荷防止のため最大処理ノード数を制限（必要に応じ調整）

popup.html / popup.js • ボタン押下でtabs.sendMessage→START_PAGE_TRANSLATION

options.html / options.js • Base URL / Model / Targetをstorage.syncに保存・読込

⸻

開発メモ • MV3は永続BGではなくService Worker。状態はストレージ側で管理 • クロスオリジンfetchはSW側で実行。host_permissionsで許可しておく • コンテントスクリプトはDOM操作とSWメッセージングに専念 • 同期ストレージは軽設定向け。大量データはstorage.localやIndexedDBへ
⸻

トラブルシュート • 応答が空: モデル未指定、サーバ未起動、Base URL誤りを確認 • CORS/権限エラー: host_permissionsとSW側でのfetch実行を確認 • 全文翻訳で欠落: 非表示要素や除外タグ（SCRIPT等）は対象外。上限数も確認
⸻

ライセンス • 任意（テンプレート）。Plamo等の商標やトレードドレスの模倣は回避
出典:
