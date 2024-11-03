let addLink = null;
let previewBox = null;
let selectionTimeout = null;
let highlightElements = [];

// Create UI elements
function createAddLink() {
  const link = document.createElement('a');
  link.className = 'my-addon-add-link';
  link.textContent = '+ Save';
  link.href = '#';
  link.classList.add('hidden');
  link.title = 'Save selection to Temp Notes (Ctrl+Shift+S)';
  document.body.appendChild(link);
  return link;
}

function createPreviewBox() {
  const box = document.createElement('div');
  box.className = 'my-addon-preview hidden';
  document.body.appendChild(box);
  return box;
}

// Selection handling
function getSelectionInfo() {
  const selection = window.getSelection();
  const selectionText = selection.toString().trim();
  if (!selectionText) return null;

  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    return {
      text: selectionText,
      range,
      rect,
      startY: window.scrollY + rect.top,
      endY: window.scrollY + rect.bottom
    };
  } catch (error) {
    console.error('Error getting selection info:', error);
    return null;
  }
}

function updateUIPosition(addLinkElement, previewBoxElement, rect) {
  const { top, right, bottom, left, width } = rect;
  
  // Update add link position
  addLinkElement.style.top = `${window.scrollY + bottom + 5}px`;
  addLinkElement.style.left = `${window.scrollX + right - addLinkElement.offsetWidth}px`;

  // Update preview box position
  previewBoxElement.style.top = `${window.scrollY + bottom + 40}px`;
  previewBoxElement.style.left = `${window.scrollX + left}px`;
  previewBoxElement.style.maxWidth = `${Math.min(width, 300)}px`;
}

function showAddLink() {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  selectionTimeout = setTimeout(() => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo) {
      hideUI();
      return;
    }

    const { text, rect } = selectionInfo;

    // Initialize UI elements if they don't exist
    if (!addLink) addLink = createAddLink();
    if (!previewBox) previewBox = createPreviewBox();

    // Show elements
    addLink.classList.remove('hidden');
    previewBox.classList.remove('hidden');

    // Update positions
    updateUIPosition(addLink, previewBox, rect);

    // Update preview text
    previewBox.textContent = text.length > 100 ? `${text.slice(0, 100)}...` : text;

    // Set up click handler
    addLink.onclick = (e) => {
      e.preventDefault();
      saveSelection(selectionInfo);
    };
  }, 200);
}

function hideUI() {
  addLink?.classList.add('hidden');
  previewBox?.classList.add('hidden');
}

async function saveSelection(selectionInfo) {
  try {
    const { text, startY, endY } = selectionInfo;
    
    await browser.runtime.sendMessage({
      action: 'saveSelection',
      text,
      url: window.location.href,
      title: document.title,
      scrollPosition: window.scrollY,
      startY,
      endY,
      timestamp: Date.now()
    });

    showFeedback('Saved!', 'success');
    hideUI();
    
  } catch (error) {
    console.error('Error saving selection:', error);
    showFeedback('Error saving', 'error');
  }
}

// Feedback UI
function showFeedback(message, type) {
  const feedback = document.createElement('div');
  feedback.className = `my-addon-feedback ${type}`;
  feedback.textContent = message;
  
  document.body.appendChild(feedback);
  
  feedback.addEventListener('animationend', () => {
    feedback.classList.add('fade-out');
    feedback.addEventListener('transitionend', () => {
      document.body.removeChild(feedback);
    }, { once: true });
  }, { once: true });
}

// Highlight functionality
function highlightText(startY, endY, duration = 10000) {
  clearHighlights();

  const highlightElement = document.createElement('div');
  highlightElement.className = 'my-addon-highlight';
  highlightElement.style.top = `${startY}px`;
  highlightElement.style.height = `${endY - startY}px`;

  document.body.appendChild(highlightElement);
  highlightElements.push(highlightElement);

  setTimeout(() => {
    highlightElement.classList.add('fade-out');
    highlightElement.addEventListener('transitionend', () => {
      clearHighlights();
    }, { once: true });
  }, duration);
}

function clearHighlights() {
  highlightElements.forEach(element => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  });
  highlightElements = [];
}

// Scroll handling
function scrollToPosition(scrollPosition) {
  window.scrollTo({
    top: scrollPosition,
    behavior: 'smooth'
  });
}

// Event handlers
document.addEventListener('selectionchange', showAddLink);

document.addEventListener('scroll', hideUI);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    const selectionInfo = getSelectionInfo();
    if (selectionInfo) {
      saveSelection(selectionInfo);
    }
  }
});

// Message handling
browser.runtime.onMessage.addListener((message) => {
  if (!message?.action) return;

  switch (message.action) {
    case 'highlightAfterLoad': {
      const { scrollPosition, startY, endY } = message;
      if (typeof scrollPosition === 'number' && typeof startY === 'number' && typeof endY === 'number') {
        handleHighlightAfterLoad(scrollPosition, startY, endY);
      }
      break;
    }
    case 'scrollToText': {
      const { scrollPosition, startY, endY } = message;
      if (typeof scrollPosition === 'number' && typeof startY === 'number' && typeof endY === 'number') {
        scrollToPosition(scrollPosition);
        highlightText(startY, endY);
      }
      break;
    }
  }
});

// Handle highlighting after page load
function handleHighlightAfterLoad(scrollPosition, startY, endY) {
  if (document.readyState === 'complete') {
    scrollToPosition(scrollPosition);
    highlightText(startY, endY);
  } else {
    window.addEventListener('load', () => {
      scrollToPosition(scrollPosition);
      highlightText(startY, endY);
    }, { once: true });
  }
}

// Cleanup on page unload
window.addEventListener('unload', () => {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  clearHighlights();
});