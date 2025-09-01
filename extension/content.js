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

async function translateAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (nodes.length < 200 && walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.trim()) nodes.push(node);
  }
  for (const node of nodes) {
    const res = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: node.nodeValue });
    if (res.ok) {
      node.nodeValue = res.text;
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_PAGE_TRANSLATION') {
    translateAll();
  }
});
