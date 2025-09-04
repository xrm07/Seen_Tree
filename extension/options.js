async function load() {
  const data = await chrome.storage.sync.get({
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "qwen2.5-7b-instruct",
    target: "ja"
  });
  for (const k of Object.keys(data)) {
    const el = document.getElementById(k);
    if (el) el.value = data[k];
  }
}

async function save() {
  const baseUrl = document.getElementById("baseUrl").value.trim();
  const model = document.getElementById("model").value.trim();
  const target = document.getElementById("target").value.trim();
  await chrome.storage.sync.set({ baseUrl, model, target });
  alert("保存しました");
}

document.addEventListener("DOMContentLoaded", load);
document.getElementById("save").addEventListener("click", save);
