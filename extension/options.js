const baseUrlEl = document.getElementById('baseUrl');
const modelEl = document.getElementById('model');
const targetEl = document.getElementById('target');
const statusEl = document.getElementById('status');

const DEFAULTS = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  model: '',
  target: 'ja'
};

chrome.storage.sync.get(DEFAULTS, items => {
  baseUrlEl.value = items.baseUrl;
  modelEl.value = items.model;
  targetEl.value = items.target;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    baseUrl: baseUrlEl.value,
    model: modelEl.value,
    target: targetEl.value
  }, () => {
    statusEl.textContent = 'Saved';
    setTimeout(() => (statusEl.textContent = ''), 1000);
  });
});
