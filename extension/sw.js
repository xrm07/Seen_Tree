importScripts("constants.js");

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });
}

async function translate(text) {
  const { baseUrl, model, target } = await getSettings();
  
  // Validate settings
  if (!baseUrl || !target) {
    throw new Error('Base URL and target language must be configured in extension options');
  }
  
  if (!text || !text.trim()) {
    return text; // Return original text if empty
  }
  
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
      `Translation failed (HTTP ${res.status} ${res.statusText}). Original text: "${text.substring(0, 50)}...". Response: ${responseBody}`
    );
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || text; // Return original text if no translation
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
