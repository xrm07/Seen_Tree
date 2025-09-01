/**
 * Handle page translation button click with comprehensive UI feedback
 * Provides loading states, success/error indicators, and proper error handling
 */
document.getElementById('translate-page').addEventListener('click', async () => {
  const button = document.getElementById('translate-page');
  const originalText = button.textContent;
  
  try {
    // Update UI to show loading state
    button.textContent = '翻訳中...'; // "Translating..." in Japanese
    button.disabled = true;
    
    // Get active tab and send translation request
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_PAGE_TRANSLATION' });
    
    // Handle successful translation
    if (response && response.success) {
      button.textContent = '完了!'; // "Complete!" in Japanese
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
    } else {
      // Handle translation failure
      throw new Error(response?.error || 'Translation failed');
    }
  } catch (error) {
    // Handle any errors with user feedback
    console.error('Translation error:', error);
    button.textContent = 'エラー'; // "Error" in Japanese
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
});
