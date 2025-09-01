/**
 * Creates and positions a translate button near the selected text
 * @param {number} x - X coordinate for button placement
 * @param {number} y - Y coordinate for button placement
 */
function createButton(x, y) {
  let btn = document.getElementById('lmst-translate-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'lmst-translate-btn';
    btn.textContent = '\u7ffb\u8a33'; // "翻訳" in Japanese
    btn.style.position = 'absolute';
    btn.style.zIndex = 2147483647; // Highest possible z-index
    document.body.appendChild(btn);
    
    // Handle click to translate selected text
    btn.addEventListener('click', async () => {
      const text = window.getSelection().toString();
      removeButton();
      const res = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text });
      showPopup(x, y, res.ok ? res.text : `Error: ${res.error}`);
    });
  }
  // Position button relative to selection
  btn.style.left = `${window.scrollX + x}px`;
  btn.style.top = `${window.scrollY + y}px`;
}

/**
 * Removes the translate button from the page
 */
function removeButton() {
  const btn = document.getElementById('lmst-translate-btn');
  if (btn) btn.remove();
}

/**
 * Shows a popup with translation result near the selected text
 * @param {number} x - X coordinate for popup placement
 * @param {number} y - Y coordinate for popup placement
 * @param {string} text - Text to display in the popup
 */
function showPopup(x, y, text) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.position = 'absolute';
  div.style.background = 'white';
  div.style.border = '1px solid #ccc';
  div.style.padding = '4px';
  div.style.zIndex = 2147483647;
  div.style.left = `${window.scrollX + x}px`;
  div.style.top = `${window.scrollY + y + 20}px`; // Offset below the selection
  document.body.appendChild(div);
  
  // Auto-remove popup after 5 seconds
  setTimeout(() => div.remove(), 5000);
}

// Event listener for text selection - shows translate button when text is selected
document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) {
    removeButton(); // Hide button if no text selected
    return;
  }
  
  // Position button near the end of selection
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  createButton(rect.right, rect.bottom);
});

// Maximum number of text nodes to translate to prevent performance issues
const MAX_TRANSLATABLE_NODES = 200;

/**
 * Translates all text content on the current page
 * Uses a tree walker to find translatable text nodes and processes them concurrently
 * @returns {Promise<void>} Resolves when translation is complete
 */
async function translateAll() {
  // Create tree walker to traverse all text nodes in the document
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  
  // Skip translation for these element types to avoid breaking functionality
  const SKIP_PARENTS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);
  
  // Collect translatable text nodes up to the maximum limit
  while (nodes.length < MAX_TRANSLATABLE_NODES && walker.nextNode()) {
    const node = walker.currentNode;
    const parentName = node.parentNode && node.parentNode.nodeName;
    if (node.nodeValue.trim() && !SKIP_PARENTS.has(parentName)) {
      nodes.push(node);
    }
  }
  
  // Early return if no translatable content found
  if (nodes.length === 0) {
    console.log('No translatable text nodes found');
    return;
  }
  
  console.log(`Starting translation of ${nodes.length} text nodes`);
  
  // Process translations concurrently to improve performance
  const concurrency = 5;
  let index = 0;
  let successful = 0;
  let failed = 0;
  
  /**
   * Worker function that processes translation requests concurrently
   * Each worker processes nodes until all are completed
   */
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
  
  // Start concurrent workers and wait for all to complete
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`Translation completed. Successful: ${successful}, Failed: ${failed}`);
}

// Message listener for page translation requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_PAGE_TRANSLATION') {
    // Handle async translation with proper error handling and response
    translateAll().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Translation failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    // Keep message channel open for async response
    return true;
  }
});
