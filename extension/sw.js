import { DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TARGET } from "./constants.js";
self.addEventListener("message", () => {});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "TRANSLATE" && msg?.type !== "LIST_MODELS") {
    return undefined;
  }
  (async () => {
    try {
      const result = msg.type === "TRANSLATE"
        ? await handleTranslateRequest(msg)
        : await handleListModelsRequest();
      sendResponse(result);
      return;
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true;
});

async function handleTranslateRequest(msg) {
  try {
    const { text, model: requestModel } = msg;
    const settings = await loadSettingsWithDirection(msg.direction);
    const model = requestModel || settings.model;
    const { baseUrl, target, direction, apiKey } = settings;
    const translated = await translateWithLMStudio({ baseUrl, model, target, text, apiKey });
    return { ok: true, text: translated, direction };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function handleListModelsRequest() {
  const attempted = [];
  try {
    const { baseUrl, apiKey } = await loadSettingsWithDirection();
    const candidates = buildModelEndpointCandidates(baseUrl || DEFAULT_BASE_URL);
    let lastError = null;
    for (const u of candidates) {
      try {
        attempted.push(u);
        const headers = buildAuthHeaders(apiKey);
        const res = await fetch(u, headers ? { method: "GET", headers } : { method: "GET" });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }
        const json = await res.json();
        const normalize = (m) => {
          if (typeof m === "string") return m;
          return m?.id || m?.name || m?.model || null;
        };
        let ids = [];
        if (Array.isArray(json?.data)) ids = json.data.map(normalize).filter(Boolean);
        else if (Array.isArray(json?.models)) ids = json.models.map(normalize).filter(Boolean);
        else if (Array.isArray(json)) ids = json.map(normalize).filter(Boolean);
        else ids = [];
        return { ok: true, models: ids, usedUrl: u, attemptedUrls: attempted.slice() };
      } catch (e) {
        lastError = e;
        // try next candidate
      }
    }
    throw lastError || new Error("モデル一覧の取得に失敗しました");
  } catch (err) {
    return { ok: false, error: String(err?.message || err), attemptedUrls: attempted.slice() };
  }
}

async function loadSettingsWithDirection(overrideDirection) {
  const data = await chrome.storage.sync.get(["baseUrl", "model", "target", "direction", "apiKey"]);
  const direction = overrideDirection ?? data.direction ?? "enja";
  const baseUrl = data.baseUrl || DEFAULT_BASE_URL;
  const model = data.model || DEFAULT_MODEL;
  const fallbackTarget = direction === "jaen" ? "en" : direction === "enja" ? "ja" : DEFAULT_TARGET;
  const storedTarget = typeof data.target === "string" && data.target.trim() ? data.target.trim().toLowerCase() : null;
  const target = storedTarget ? storedTarget : fallbackTarget;
  const apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
  return { baseUrl, model, target, direction, apiKey };
}

// Context menu to start page translation
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({ id: "lmstudio-translate-page", title: "このページを翻訳", contexts: ["page"] });
  } catch (error) {
    console.warn("Failed to create context menu", error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "lmstudio-translate-page" && tab?.id) {
    const { direction } = await chrome.storage.sync.get({ direction: "enja" });
    chrome.tabs.sendMessage(tab.id, { type: "START_PAGE_TRANSLATION", direction });
  }
});

function buildModelEndpointCandidates(base) {
  const b = (base || "").trim().replace(/\/$/, "");
  const urls = [];
  const versionedBase = ensureVersionedBase(b);
  // Prefer versioned endpoint first to avoid 404s on bare hosts
  const baseCandidates = [];
  if (versionedBase) baseCandidates.push(versionedBase);
  if (b) baseCandidates.push(b);
  const bareBase = stripFinalVersionSegment(b);
  if (bareBase && bareBase !== b) {
    baseCandidates.push(bareBase);
  }
  for (const candidate of baseCandidates) {
    urls.push(`${candidate}/models`);
  }
  // Legacy LM Studio lives at /api/v0/models from the origin
  try {
    const { origin } = new URL(b);
    urls.push(`${origin}/api/v0/models`);
  } catch {
    const legacyBase = b.replace(/\/v\d+\b$/, "");
    urls.push(`${legacyBase || b}/api/v0/models`);
  }
  // Deduplicate while preserving order
  return Array.from(new Set(urls));
}

function ensureVersionedBase(base) {
  const trimmed = (base || "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/\/api\/v\d+\b/.test(trimmed)) return trimmed;
  if (/\/v\d+\b/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function stripFinalVersionSegment(base) {
  const trimmed = (base || "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return trimmed.replace(/\/(api\/)?v\d+\b$/, (match, apiPrefix) => (apiPrefix ? "\/api" : ""));
}

function buildAuthHeaders(apiKey) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) return null;
  return { Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}` };
}

async function translateWithLMStudio({ baseUrl, model, target, text, apiKey }) {
  const url = buildApiUrl(baseUrl, "/chat/completions");
  const body = {
    model,
    messages: [
      { role: "system", content: `You are a professional translator. Task: Translate the user's text into ${target}. Preserve original formatting, punctuation, whitespace, and inline code. Return only the translated text, no extra explanations.` },
      { role: "user", content: text }
    ],
    temperature: 0.2,
    max_tokens: -1,
    stream: false
  };
  const headers = { "Content-Type": "application/json" };
  const authHeaders = buildAuthHeaders(apiKey);
  if (authHeaders) Object.assign(headers, authHeaders);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch (parseError) {
      console.debug("Failed to parse LM Studio error response", parseError);
      try {
        detail = await res.text();
      } catch (textError) {
        console.debug("Failed to read LM Studio error body", textError);
      }
    }
    throw new Error(`翻訳エラー: HTTP ${res.status} (${model} @ ${url}): ${detail}`);
  }
  const json = await res.json();
  const content = (json?.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("翻訳結果が空です");
  return content;
}

function buildApiUrl(baseUrl, path) {
  const trimmed = (baseUrl || "").trim().replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (!trimmed) return suffix;
  if (/\/api\/v\d+\b/.test(trimmed)) return `${trimmed}${suffix}`;
  if (/\/v\d+\b/.test(trimmed)) return `${trimmed}${suffix}`;
  return `${trimmed}/v1${suffix}`;
}
