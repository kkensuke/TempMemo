browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

browser.contextMenus.create({
  id: 'save-selection',
  title: 'Save selection as memo',
  contexts: ['selection'],
});

function saveMemo(info) {
  const memo = {
    text: info.text,
    url: info.url,
    title: info.title,
    date: new Date().toISOString(),
    scrollPosition: info.scrollPosition,
    startY: info.startY,
    endY: info.endY
  };
  browser.storage.local.get('memos', (result) => {
    const memos = result.memos || [];
    memos.push(memo);
    browser.storage.local.set({ memos }, () => {
      // Send a message to the sidebar to update
      browser.runtime.sendMessage({ action: 'newMemo', memo });
    });
  });
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-selection') {
    saveMemo(info);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveSelection') {
    saveMemo(message);
  }
});