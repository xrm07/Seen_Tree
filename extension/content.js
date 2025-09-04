(() => {
  let hoverButton = null;
  let resultPopup = null;
  let settings = {
    direction: "enja",
    autoTranslate: false,
    showSourceOnHover: false,
    showSelectionButton: true
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, v] of Object.entries(changes)) {
      settings[k] = v.newValue;
    }
  });

  (async () => {
    const s = await chrome.storage.sync.get(settings);
    settings = Object.assign(settings, s);
    if (settings.autoTranslate) {
      startPageTranslation();
    }
  })();

  document.addEventListener("mouseup", () => {
    const sel = window.getSelection();
    const text = sel && sel.toString().trim();
    if (!text) { hideUI(); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (settings.showSelectionButton) {
      showButtonNear(rect, text);
    }
  });

  chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg?.type === "START_PAGE_TRANSLATION") {
      if (msg.direction) settings.direction = msg.direction;
      await translateWholePage();
    }
  });

  function showButtonNear(rect, text) {
    if (!hoverButton) {
      hoverButton = document.createElement("button");
      hoverButton.textContent = "翻訳";
      hoverButton.style.position = "fixed";
      hoverButton.style.zIndex = 2147483647;
      document.body.appendChild(hoverButton);
      hoverButton.addEventListener("click", () => translateSelected(text, rect));
    }
    hoverButton.style.top = `${rect.bottom + 6}px`;
    hoverButton.style.left = `${rect.right + 6}px`;
    hoverButton.style.display = "block";
  }

  function hideUI() {
    if (hoverButton) hoverButton.style.display = "none";
    if (resultPopup) resultPopup.remove(), resultPopup = null;
  }

  async function translateSelected(text, rect) {
    const res = await chrome.runtime.sendMessage({ type: "TRANSLATE", text });
    if (!res?.ok) { console.error(res?.error); return; }
    showPopup(rect, res.text);
  }

  function showPopup(rect, content) {
    if (!resultPopup) {
      resultPopup = document.createElement("div");
      resultPopup.style.position = "fixed";
      resultPopup.style.maxWidth = "360px";
      resultPopup.style.padding = "8px 10px";
      resultPopup.style.background = "#111";
      resultPopup.style.color = "#fff";
      resultPopup.style.borderRadius = "6px";
      resultPopup.style.zIndex = 2147483647;
      resultPopup.style.boxShadow = "0 2px 10px rgba(0,0,0,.2)";
      resultPopup.addEventListener("click", () => resultPopup?.remove());
      document.body.appendChild(resultPopup);
    }
    resultPopup.textContent = content;
    resultPopup.style.top = `${rect.bottom + 6}px`;
    resultPopup.style.left = `${Math.min(rect.left, window.innerWidth - 380)}px`;
  }

  async function translateWholePage() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (nodes.length < 500 && walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      if (/^(SCRIPT|STYLE|NOSCRIPT)$/i.test(n.parentElement?.tagName || "")) continue;
      nodes.push(n);
    }
    for (const n of nodes) {
      try {
        const res = await chrome.runtime.sendMessage({ type: "TRANSLATE", text: n.nodeValue, direction: settings.direction });
        if (res?.ok) {
          if (settings.showSourceOnHover) {
            const original = n.nodeValue;
            const span = document.createElement("span");
            span.textContent = res.text;
            span.title = original;
            n.parentNode.replaceChild(span, n);
          } else {
            n.nodeValue = res.text;
          }
        }
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
  }

  function startPageTranslation() {
    translateWholePage();
  }
})();
