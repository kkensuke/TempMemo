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

      // Get the start and end positions of the selection
      const startY = window.scrollY + range.getBoundingClientRect().top;
      const endY = window.scrollY + range.getBoundingClientRect().bottom;

      browser.runtime.sendMessage({
        action: 'saveSelection',
        text: selection.toString(),
        url: window.location.href,
        title: document.title,
        scrollPosition: scrollPosition,
        startY: startY,
        endY: endY
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
    scrollToPosition(message.scrollPosition);
    highlightText(message.startY, message.endY);
  }
});

function scrollToPosition(scrollPosition) {
  // Scroll to the stored scroll position
  window.scrollTo(0, scrollPosition);
}

function highlightText(startY, endY) {
  const highlightElement = document.createElement('div');
  highlightElement.className = 'my-addon-highlight';
  highlightElement.style.position = 'absolute';
  highlightElement.style.left = '0';
  highlightElement.style.width = '100%';
  highlightElement.style.top = `${startY}px`;
  highlightElement.style.height = `${endY - startY}px`;
  highlightElement.style.backgroundColor = 'yellow';
  highlightElement.style.opacity = '0.5';
  highlightElement.style.pointerEvents = 'none';
  highlightElement.style.zIndex = '9998';

  document.body.appendChild(highlightElement);

  // Remove the highlight after 3 seconds
  setTimeout(() => {
    document.body.removeChild(highlightElement);
  }, 10000);
}

// Function to handle highlighting after page load
function handleHighlightAfterLoad(scrollPosition, startY, endY) {
  // Wait for the page to finish loading
  if (document.readyState === 'complete') {
    scrollToPosition(scrollPosition);
    highlightText(startY, endY);
  } else {
    window.addEventListener('load', () => {
      scrollToPosition(scrollPosition);
      highlightText(startY, endY);
    });
  }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'highlightAfterLoad') {
    handleHighlightAfterLoad(message.scrollPosition, message.startY, message.endY);
  }
});