import { DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TARGET } from "./constants.js";
self.addEventListener("message", () => {});
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === "TRANSLATE") {
    try {
      const { text } = msg;
      const { baseUrl, model, target, direction } = await loadSettingsWithDirection(msg.direction);
      const translated = await translateWithLMStudio({ baseUrl, model, target, text });
      sendResponse({ ok: true, text: translated });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
    return true;
  }
  if (msg?.type === "LIST_MODELS") {
    try {
      const { baseUrl } = await loadSettingsWithDirection();
      const url = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "") + "/models";
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      sendResponse({ ok: true, models: ids });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
    return true;
  }
});

// Context menu to start page translation
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({ id: "lmstudio-translate-page", title: "このページを翻訳", contexts: ["page"] });
  } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "lmstudio-translate-page" && tab?.id) {
    const { direction } = await chrome.storage.sync.get({ direction: "enja" });
    chrome.tabs.sendMessage(tab.id, { type: "START_PAGE_TRANSLATION", direction });
  }
});

async function loadSettingsWithDirection(overrideDirection) {
  const data = await chrome.storage.sync.get({
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    target: DEFAULT_TARGET,
    direction: "enja"
  });
  const direction = overrideDirection || data.direction || "enja";
  const target = direction === "jaen" ? "en" : "ja";
  return { baseUrl: data.baseUrl, model: data.model, target, direction };
}

async function translateWithLMStudio({ baseUrl, model, target, text }) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
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
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch (_) {
      try { detail = await res.text(); } catch (_) { /* noop */ }
    }
    throw new Error(`HTTP ${res.status} (${model} @ ${url}): ${detail}`);
  }
  const json = await res.json();
  const content = (json?.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("Empty response");
  return content;
}
