function createButton(x, y) {
  let btn = document.getElementById('lmst-translate-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'lmst-translate-btn';
    btn.textContent = '\u7ffb\u8a33';
    btn.style.position = 'absolute';
    btn.style.zIndex = 2147483647;
    document.body.appendChild(btn);
    btn.addEventListener('click', async () => {
      const text = window.getSelection().toString();
      removeButton();
      const res = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text });
      showPopup(x, y, res.ok ? res.text : `Error: ${res.error}`);
    });
  }
  btn.style.left = `${window.scrollX + x}px`;
  btn.style.top = `${window.scrollY + y}px`;
}

function removeButton() {
  const btn = document.getElementById('lmst-translate-btn');
  if (btn) btn.remove();
}

function showPopup(x, y, text) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.position = 'absolute';
  div.style.background = 'white';
  div.style.border = '1px solid #ccc';
  div.style.padding = '4px';
  div.style.zIndex = 2147483647;
  div.style.left = `${window.scrollX + x}px`;
  div.style.top = `${window.scrollY + y + 20}px`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    removeButton();
    return;
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  createButton(rect.right, rect.bottom);
});

const MAX_TRANSLATABLE_NODES = 200;

async function translateAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  const SKIP_PARENTS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);
  while (nodes.length < MAX_TRANSLATABLE_NODES && walker.nextNode()) {
    const node = walker.currentNode;
    const parentName = node.parentNode && node.parentNode.nodeName;
    if (node.nodeValue.trim() && !SKIP_PARENTS.has(parentName)) {
      nodes.push(node);
    }
  }
  
  if (nodes.length === 0) {
    console.log('No translatable text nodes found');
    return;
  }
  
  console.log(`Starting translation of ${nodes.length} text nodes`);
  
  const concurrency = 5;
  let index = 0;
  let successful = 0;
  let failed = 0;
  
  async function worker() {
    while (index < nodes.length) {
      const node = nodes[index++];
      try {
        const res = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: node.nodeValue });
        if (res.ok) {
          node.nodeValue = res.text;
          successful++;
        } else {
          console.warn('Translation failed for node:', node.nodeValue.substring(0, 50), res.error);
          failed++;
        }
      } catch (error) {
        console.error('Error translating node:', error);
        failed++;
      }
    }
  }
  
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`Translation completed. Successful: ${successful}, Failed: ${failed}`);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_PAGE_TRANSLATION') {
    translateAll().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Translation failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});
