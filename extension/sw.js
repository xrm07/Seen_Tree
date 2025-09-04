self.addEventListener("message", () => {});
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === "TRANSLATE") {
    try {
      const { text } = msg;
      const { baseUrl, model, target } = await loadSettings();
      const translated = await translateWithLMStudio({ baseUrl, model, target, text });
      sendResponse({ ok: true, text: translated });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
    return true;
  }
});

async function loadSettings() {
  const { baseUrl, model, target } = await chrome.storage.sync.get({
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "qwen2.5-7b-instruct",
    target: "ja"
  });
  return { baseUrl, model, target };
}

async function translateWithLMStudio({ baseUrl, model, target, text }) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const body = {
    model,
    messages: [
      { role: "system", content: `Translate to ${target}. Preserve formatting. No explanations.` },
      { role: "user", content: text }
    ],
    temperature: 0.2
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");
  return content;
}
