document.getElementById('translate-page').addEventListener('click', async () => {
  const button = document.getElementById('translate-page');
  const originalText = button.textContent;
  
  try {
    button.textContent = '翻訳中...';
    button.disabled = true;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_PAGE_TRANSLATION' });
    
    if (response && response.success) {
      button.textContent = '完了!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
    } else {
      throw new Error(response?.error || 'Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    button.textContent = 'エラー';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
});
