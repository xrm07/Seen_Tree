// Import extension constants
importScripts("constants.js");

/**
 * Retrieve extension settings from Chrome storage
 * @returns {Promise<Object>} Settings object with baseUrl, model, and target
 */
async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });
}

/**
 * Translate text using LM Studio API with comprehensive error handling
 * @param {string} text - Text to translate
 * @returns {Promise<string>} Translated text
 * @throws {Error} If translation fails or settings are invalid
 */
async function translate(text) {
  const { baseUrl, model, target } = await getSettings();
  
  // Validate required settings before attempting translation
  if (!baseUrl || !target) {
    throw new Error('Base URL and target language must be configured in extension options');
  }
  
  // Return original text if input is empty or whitespace-only
  if (!text || !text.trim()) {
    return text;
  }
  
  // Make API request to LM Studio
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `Translate to ${target}. Preserve formatting. No explanations.` },
        { role: 'user', content: text }
      ],
      temperature: 0.2 // Low temperature for consistent translations
    })
  });
  
  // Handle HTTP errors with detailed error information
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(
      `Translation failed (HTTP ${res.status} ${res.statusText}). Original text: "${text.substring(0, 50)}...". Response: ${responseBody}`
    );
  }
  
  // Parse response and extract translated text
  const data = await res.json();
  return data.choices?.[0]?.message?.content || text; // Fallback to original text if no translation
}

/**
 * Message listener for translation requests
 * Handles async operations with proper error handling and response formatting
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'TRANSLATE') {
        const text = await translate(message.text);
        sendResponse({ ok: true, text });
      }
    } catch (err) {
      // Send error response with message for user feedback
      sendResponse({ ok: false, error: err.message });
    }
  })();
  
  // Return true to keep message channel open for async response
  return true;
});
