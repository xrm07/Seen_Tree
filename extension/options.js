// Get DOM elements for the options form
const baseUrlEl = document.getElementById('baseUrl');
const modelEl = document.getElementById('model');
const targetEl = document.getElementById('target');
const statusEl = document.getElementById('status');

// Load saved settings from Chrome storage when page loads
chrome.storage.sync.get(DEFAULTS, items => {
  baseUrlEl.value = items.baseUrl;
  modelEl.value = items.model;
  targetEl.value = items.target;
});

/**
 * Save settings with comprehensive validation and user feedback
 * Validates required fields, URL format, and provides colored status messages
 */
document.getElementById('save').addEventListener('click', () => {
  // Get trimmed values from form inputs
  const baseUrl = baseUrlEl.value.trim();
  const model = modelEl.value.trim();
  const target = targetEl.value.trim();
  
  /**
   * Display status message with color and auto-clear timeout
   * @param {string} message - Message to display
   * @param {string} color - CSS color for the message
   * @param {number} timeout - Milliseconds before clearing message
   */
  function showStatus(message, color, timeout = 3000) {
    statusEl.textContent = message;
    statusEl.style.color = color;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, timeout);
  }
  
  // Validate required fields
  if (!baseUrl) {
    showStatus('Base URL is required', 'red');
    return;
  }
  
  if (!target) {
    showStatus('Target language is required', 'red');
    return;
  }
  
  // Validate URL format using built-in URL constructor
  try {
    new URL(baseUrl);
  } catch {
    showStatus('Invalid Base URL format', 'red');
    return;
  }
  
  // Save validated settings to Chrome storage
  chrome.storage.sync.set({
    baseUrl: baseUrl,
    model: model,
    target: target
  }, () => {
    showStatus('Saved', 'green', 1000);
  });
});
