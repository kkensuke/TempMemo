function displayMemos() {
  browser.storage.local.get('memos', (result) => {
    const memos = result.memos || [];
    const memoList = document.getElementById('memoList');
    memoList.innerHTML = '';

    memos.forEach((memo, index) => {
      const memoElement = document.createElement('div');
      memoElement.className = 'memo';

      // Check if the memo is long by counting characters
      const isLong = memo.text.length > 100;
      const displayText = isLong ? memo.text.slice(0, 100) + '...' : memo.text;

      // Limit the title length to 30 characters
      const titleText =
        memo.title.length > 30 ? memo.title.slice(0, 30) + '...' : memo.title;

      memoElement.innerHTML = `
        <div class="memo-buttons">
          <button class="copy-btn" data-index="${index}">Copy</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
          ${
            isLong
              ? `<button class="toggle-btn" data-index="${index}">Show More</button>`
              : ''
          }
        </div>
        <div class="memo-text ${isLong ? '' : 'expanded'}">
          <p>${displayText}</p>
        </div>
        <a href="#" class="memo-link" data-url="${
          memo.url
        }" data-index="${index}">${titleText}</a>
        <small>${new Date(memo.date).toLocaleString()}</small>
      `;
      memoList.appendChild(memoElement);

      if (isLong) {
        const toggleBtn = memoElement.querySelector('.toggle-btn');
        const memoText = memoElement.querySelector('.memo-text');
        toggleBtn.addEventListener('click', () => {
          memoText.classList.toggle('expanded');
          if (memoText.classList.contains('expanded')) {
            memoText.querySelector('p').textContent = memo.text;
            toggleBtn.textContent = 'Show Less';
          } else {
            memoText.querySelector('p').textContent = displayText;
            toggleBtn.textContent = 'Show More';
          }
        });
      }
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        memos.splice(index, 1);
        browser.storage.local.set({ memos }, displayMemos);
      });
    });

    // Add event listeners to copy buttons
    document.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        const memoText = memos[index].text;
        navigator.clipboard
          .writeText(memoText)
          .then(() => {
            // Provide visual feedback
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 1500);
          })
          .catch((err) => {
            console.error('Failed to copy text: ', err);
          });
      });
    });

    // Add event listeners to memo links
    document.querySelectorAll('.memo-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(e.target.getAttribute('data-index'));
        const url = e.target.getAttribute('data-url');
        const memo = memos[index];

        browser.tabs.query({ url: url }, (tabs) => {
          if (tabs.length > 0) {
            browser.tabs.update(tabs[0].id, { active: true });
            browser.tabs.sendMessage(tabs[0].id, {
              action: 'highlightAfterLoad',
              scrollPosition: memo.scrollPosition,
              startY: memo.startY,
              endY: memo.endY
            });
          } else {
            browser.tabs.create({ url: url }, (tab) => {
              browser.tabs.onUpdated.addListener(function listener(
                tabId,
                info
              ) {
                if (tabId === tab.id && info.status === 'complete') {
                  browser.tabs.onUpdated.removeListener(listener);
                  browser.tabs.sendMessage(tab.id, {
                    action: 'highlightAfterLoad',
                    scrollPosition: memo.scrollPosition,
                    startY: memo.startY,
                    endY: memo.endY
                  });
                }
              });
            });
          }
        });
      });
    });
  });
}

// Initial display of memos
displayMemos();

// Listen for new memos
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'newMemo') {
    displayMemos();
  }
});