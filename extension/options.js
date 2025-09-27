import { DEFAULT_MODEL, DEFAULT_BASE_URL, DEFAULT_TARGET } from "./constants.js";

async function load() {
  const data = await chrome.storage.sync.get({
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    target: DEFAULT_TARGET
  });
  for (const k of Object.keys(data)) {
    const el = document.getElementById(k);
    if (el) el.value = data[k];
  }
}

const saveButton = document.getElementById("save");
const statusRegion = (() => {
  const existing = document.getElementById("statusMessage");
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = "statusMessage";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.marginTop = "12px";
  el.style.minHeight = "1.2em";
  el.style.fontSize = "13px";
  document.body.appendChild(el);
  return el;
})();

function showStatus(message, tone = "info") {
  if (!statusRegion) return;
  const palette = {
    info: "#1d4ed8",
    success: "#15803d",
    error: "#b91c1c"
  };
  statusRegion.textContent = message;
  statusRegion.style.color = palette[tone] || palette.info;
}

function setSavingState(isSaving) {
  if (!saveButton) return;
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? "保存中..." : "保存";
}

function validateInputs() {
  const baseUrlInput = document.getElementById("baseUrl");
  const modelInput = document.getElementById("model");
  const targetInput = document.getElementById("target");
  const errors = [];
  const fieldErrors = {};

  const baseUrl = baseUrlInput?.value.trim() || "";
  if (!baseUrl) {
    fieldErrors.baseUrl = "Base URL is required.";
  } else {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:") {
        throw new Error("Base URL must use http:// for LM Studio's local server.");
      }
    } catch (err) {
      fieldErrors.baseUrl = err?.message || "Invalid Base URL.";
    }
  }

  const model = modelInput?.value.trim() || "";
  if (!model) {
    fieldErrors.model = "Model is required.";
  } else if (/\s/.test(model)) {
    fieldErrors.model = "Model cannot contain whitespace.";
  }

  const target = targetInput?.value.trim() || "";
  if (!target) {
    fieldErrors.target = "Target language is required.";
  } else if (!/^[a-z]{2,5}$/i.test(target)) {
    fieldErrors.target = "Target must be 2-5 alphabetic characters.";
  }

  const entries = [
    { id: "baseUrl", message: fieldErrors.baseUrl },
    { id: "model", message: fieldErrors.model },
    { id: "target", message: fieldErrors.target }
  ];

  let firstInvalid = null;
  for (const { id, message } of entries) {
    const input = document.getElementById(id);
    if (!input) continue;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (typeof input.setCustomValidity === "function") input.setCustomValidity(message);
      errors.push(message);
      if (!firstInvalid) firstInvalid = input;
    } else {
      input.removeAttribute("aria-invalid");
      if (typeof input.setCustomValidity === "function") input.setCustomValidity("");
    }
  }

  if (errors.length) {
    if (firstInvalid && typeof firstInvalid.reportValidity === "function") {
      firstInvalid.reportValidity();
    }
    showStatus(errors.join("\n"), "error");
    return null;
  }

  return {
    baseUrl,
    model,
    target: target.toLowerCase()
  };
}

async function save() {
  const values = validateInputs();
  if (!values) return;
  showStatus("", "info");
  setSavingState(true);
  try {
    await chrome.storage.sync.set(values);
    showStatus("保存しました", "success");
  } catch (err) {
    console.error("Failed to save options", err);
    showStatus(`保存に失敗しました: ${err?.message || err}`, "error");
  } finally {
    setSavingState(false);
  }
}

document.addEventListener("DOMContentLoaded", load);
if (saveButton) saveButton.addEventListener("click", save);
