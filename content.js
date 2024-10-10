let addLink = null;

function createAddLink() {
  const link = document.createElement('a');
  link.className = 'my-addon-add-link';
  link.textContent = 'add';
  link.href = '#';
  link.style.display = 'none';
  document.body.appendChild(link);
  return link;
}

function showAddLink(e) {
  const selection = window.getSelection();
  if (selection.toString().trim().length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!addLink) {
      addLink = createAddLink();
    }

    addLink.style.display = 'block';
    addLink.style.top = `${window.scrollY + rect.bottom + 5}px`;
    addLink.style.left = `${window.scrollX + rect.right}px`;

    addLink.onclick = (e) => {
      e.preventDefault();

      // Get the current scroll position
      const scrollPosition = window.scrollY;

      browser.runtime.sendMessage({
        action: 'saveSelection',
        text: selection.toString(),
        url: window.location.href,
        title: document.title,
        scrollPosition: scrollPosition // Store the scroll position
      });
      addLink.style.display = 'none';
    };
  } else if (addLink) {
    addLink.style.display = 'none';
  }
}

document.addEventListener('mouseup', showAddLink);
document.addEventListener('selectionchange', showAddLink);

// Listen for scroll requests and use the saved scroll position
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrollToText') {
    scrollToPosition(message.scrollPosition); // Scroll to the stored scroll position
  }
});

function scrollToPosition(scrollPosition) {
  // Scroll to the stored scroll position
  window.scrollTo(0, scrollPosition);

  // Optionally, you can highlight the selected text
  setTimeout(() => {
    highlightCurrentSelection();
  }, 500); // Wait for the scroll to complete
}

function highlightCurrentSelection() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const highlight = document.createElement('span');
  highlight.style.backgroundColor = 'yellow';
  highlight.style.color = 'black';

  try {
    range.surroundContents(highlight);
  } catch (e) {
    console.error('Failed to highlight selection:', e);
  }

  setTimeout(() => {
    try {
      const parent = highlight.parentNode;
      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }
      parent.removeChild(highlight);
      parent.normalize();
    } catch (e) {
      console.error('Failed to remove highlight:', e);
    }
  }, 2000);
}
