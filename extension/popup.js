const DIR_KEYS = { enja: { source: "en", target: "ja" }, jaen: { source: "ja", target: "en" } };

async function load() {
  const data = await chrome.storage.sync.get({
    direction: "enja",
    autoTranslate: false,
    showSourceOnHover: false,
    showSelectionButton: true
  });

  document.getElementById("autoTranslate").checked = !!data.autoTranslate;
  document.getElementById("showSourceOnHover").checked = !!data.showSourceOnHover;
  document.getElementById("showSelectionButton").checked = !!data.showSelectionButton;
  try { document.getElementById("ver").textContent = `version ${chrome.runtime.getManifest().version}`; } catch {}

  setDirectionUI(data.direction);
}

function setDirectionUI(dir) {
  const a = document.getElementById("dir_enja");
  const b = document.getElementById("dir_jaen");
  if (dir === "jaen") {
    a.classList.remove("active");
    b.classList.add("active");
  } else {
    b.classList.remove("active");
    a.classList.add("active");
  }
}

async function save(partial) {
  await chrome.storage.sync.set(partial);
}

document.getElementById("dir_enja").addEventListener("click", async () => {
  setDirectionUI("enja");
  await save({ direction: "enja" });
});

document.getElementById("dir_jaen").addEventListener("click", async () => {
  setDirectionUI("jaen");
  await save({ direction: "jaen" });
});

document.getElementById("autoTranslate").addEventListener("change", e => save({ autoTranslate: e.target.checked }));
document.getElementById("showSourceOnHover").addEventListener("change", e => save({ showSourceOnHover: e.target.checked }));
document.getElementById("showSelectionButton").addEventListener("change", e => save({ showSelectionButton: e.target.checked }));

document.getElementById("btn_page").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const { direction } = await chrome.storage.sync.get({ direction: "enja" });
    chrome.tabs.sendMessage(tab.id, { type: "START_PAGE_TRANSLATION", direction });
  }
});

document.addEventListener("DOMContentLoaded", load);
