const baseUrlEl = document.getElementById('baseUrl');
const modelEl = document.getElementById('model');
const targetEl = document.getElementById('target');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(DEFAULTS, items => {
  baseUrlEl.value = items.baseUrl;
  modelEl.value = items.model;
  targetEl.value = items.target;
});

document.getElementById('save').addEventListener('click', () => {
  const baseUrl = baseUrlEl.value.trim();
  const model = modelEl.value.trim();
  const target = targetEl.value.trim();
  
  // Basic validation
  if (!baseUrl) {
    statusEl.textContent = 'Base URL is required';
    statusEl.style.color = 'red';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 3000);
    return;
  }
  
  if (!target) {
    statusEl.textContent = 'Target language is required';
    statusEl.style.color = 'red';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 3000);
    return;
  }
  
  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    statusEl.textContent = 'Invalid Base URL format';
    statusEl.style.color = 'red';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 3000);
    return;
  }
  
  chrome.storage.sync.set({
    baseUrl: baseUrl,
    model: model,
    target: target
  }, () => {
    statusEl.textContent = 'Saved';
    statusEl.style.color = 'green';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 1000);
  });
});
