import { DEFAULT_MODEL } from "./constants.js";

async function load() {
  const data = await chrome.storage.sync.get({
    direction: "enja",
    autoTranslate: false,
    showSourceOnHover: false,
    showSelectionButton: true,
    model: DEFAULT_MODEL
  });

  document.getElementById("autoTranslate").checked = !!data.autoTranslate;
  document.getElementById("showSourceOnHover").checked = !!data.showSourceOnHover;
  document.getElementById("showSelectionButton").checked = !!data.showSelectionButton;
  try {
    const verEl = document.getElementById("ver");
    if (verEl) verEl.textContent = `version ${chrome.runtime.getManifest().version}`;
  } catch (err) {
    console.warn("Failed to set version text", err);
    const fallback = document.getElementById("ver");
    if (fallback && !fallback.textContent) fallback.textContent = "version unavailable";
  }

  setDirectionUI(data.direction);
  await populateModels();
  const modelSel = document.getElementById("model");
  if (modelSel && data.model) modelSel.value = data.model;
}

function setDirectionUI(dir) {
  const a = document.getElementById("dir_enja");
  const b = document.getElementById("dir_jaen");
  if (dir === "jaen") {
    a.classList.remove("active");
    b.classList.add("active");
  } else {
    b.classList.remove("active");
    a.classList.add("active");
  }
}

async function save(partial) {
  await chrome.storage.sync.set(partial);
}

document.getElementById("dir_enja").addEventListener("click", async () => {
  setDirectionUI("enja");
  await save({ direction: "enja" });
});

document.getElementById("dir_jaen").addEventListener("click", async () => {
  setDirectionUI("jaen");
  await save({ direction: "jaen" });
});

document.getElementById("autoTranslate").addEventListener("change", e => save({ autoTranslate: e.target.checked }));
document.getElementById("showSourceOnHover").addEventListener("change", e => save({ showSourceOnHover: e.target.checked }));
document.getElementById("showSelectionButton").addEventListener("change", e => save({ showSelectionButton: e.target.checked }));

document.getElementById("btn_page").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const { direction } = await chrome.storage.sync.get({ direction: "enja" });
    chrome.tabs.sendMessage(tab.id, { type: "START_PAGE_TRANSLATION", direction });
  }
});

document.addEventListener("DOMContentLoaded", load);

async function populateModels() {
  const sel = document.getElementById("model");
  const hint = document.getElementById("modelHint");
  if (!sel) return;
  sel.innerHTML = "<option>読み込み中...</option>";
  try {
    const res = await chrome.runtime.sendMessage({ type: "LIST_MODELS" });
    if (res?.ok && Array.isArray(res.models)) {
      sel.innerHTML = "";
      if (res.models.length === 0) {
        sel.innerHTML = '<option value="">(ロード済みモデルなし)</option>';
      } else {
        for (const id of res.models) {
          const opt = document.createElement("option");
          opt.value = id; opt.textContent = id; sel.appendChild(opt);
        }
      }
      const { model } = await chrome.storage.sync.get({ model: null });
      if (model) {
        if (![...sel.options].some(o => o.value === model)) {
          const extra = document.createElement("option");
          extra.value = model; extra.textContent = `${model} (保存)`; sel.appendChild(extra);
        }
        sel.value = model;
      }
      if (hint) {
        const used = res.usedUrl ? `取得元: ${res.usedUrl}` : "";
        const current = sel.value ? `現在使用モデル: ${sel.value}` : "";
        hint.textContent = [current, used].filter(Boolean).join(" / ");
      }
    } else {
      sel.innerHTML = `<option value="">取得失敗${res?.error ? `: ${String(res.error)}` : ""}</option>`;
      if (hint) {
        const extra = Array.isArray(res?.attemptedUrls) && res.attemptedUrls.length ? `試行URL: ${res.attemptedUrls.join(", ")}` : "";
        hint.textContent = ["LM Studioの起動とBase URLを確認してください", extra].filter(Boolean).join(" / ");
      }
    }
  } catch (e) {
    sel.innerHTML = `<option value="">エラー: ${String(e && e.message || e)}</option>`;
    if (hint) hint.textContent = "ネットワークエラーの可能性。LM StudioとURL設定を確認してください";
  }
}

document.getElementById("refreshModels")?.addEventListener("click", populateModels);
document.getElementById("model")?.addEventListener("change", async (e) => {
  const model = e.target.value;
  await chrome.storage.sync.set({ model });
});
