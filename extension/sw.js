importScripts("constants.js");

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });
}

async function translate(text) {
  const { baseUrl, model, target } = await getSettings();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `Translate to ${target}. Preserve formatting. No explanations.` },
        { role: 'user', content: text }
      ],
      temperature: 0.2
    })
  });
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(
      `Translation failed (HTTP ${res.status} ${res.statusText}). Original text: "${text}". Response: ${responseBody}`
    );
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'TRANSLATE') {
        const text = await translate(message.text);
        sendResponse({ ok: true, text });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true;
});
