// State management
let allMemos = [];
let categories = new Set(['Work', 'Personal', 'Research']);
let currentFilter = {
  search: '',
  category: 'all',
  sortBy: 'date' // 'date' or 'title'
};

// Initialize the sidebar
async function initializeSidebar() {
  try {
    await loadAndDisplayMemos();
    setupEventListeners();
    setupToolbar();
  } catch (error) {
    console.error('Error initializing sidebar:', error);
    showError('Failed to initialize. Please try refreshing.');
  }
}

// Setup toolbar with action buttons
function setupToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  
  // Sort dropdown
  const sortSelect = document.createElement('select');
  sortSelect.className = 'sort-select';
  sortSelect.innerHTML = `
    <option value="date-desc">Newest first</option>
    <option value="date-asc">Oldest first</option>
    <option value="title">By title</option>
  `;
  
  // Category filter
  const categorySelect = document.createElement('select');
  categorySelect.className = 'category-select';
  categorySelect.innerHTML = `
    <option value="all">All categories</option>
    ${Array.from(categories).map(cat => 
      `<option value="${cat}">${cat}</option>`
    ).join('')}
  `;
  
  // Action buttons
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  actionButtons.innerHTML = `
    <button class="action-button export-btn">Export</button>
    <button class="action-button import-btn">Import</button>
  `;
  
  toolbar.appendChild(sortSelect);
  toolbar.appendChild(categorySelect);
  toolbar.appendChild(actionButtons);
  
  document.querySelector('.search-container').after(toolbar);
  
  // Event listeners for toolbar
  sortSelect.addEventListener('change', (e) => {
    currentFilter.sortBy = e.target.value;
    applyFilters();
  });
  
  categorySelect.addEventListener('change', (e) => {
    currentFilter.category = e.target.value;
    applyFilters();
  });
  
  document.querySelector('.export-btn').addEventListener('click', exportMemos);
  document.querySelector('.import-btn').addEventListener('click', importMemos);
}

// Memo display functions
function displayMemos(memosToDisplay) {
  const memoList = document.getElementById('memoList');
  memoList.innerHTML = '';

  if (memosToDisplay.length === 0) {
    memoList.innerHTML = '<div class="no-memos">No notes found</div>';
    return;
  }

  memosToDisplay.forEach((memo, index) => {
    const memoElement = createMemoElement(memo, index);
    memoList.appendChild(memoElement);
  });
}

// Function to handle opening links and highlighting text
async function openMemoLink(memo) {
  try {
    // First check if there's already a tab with this URL
    const existingTabs = await browser.tabs.query({ url: memo.url });
    
    if (existingTabs.length > 0) {
      // If tab exists, activate it and send highlight message
      await browser.tabs.update(existingTabs[0].id, { active: true });
      await browser.tabs.sendMessage(existingTabs[0].id, {
        action: 'scrollToText',
        scrollPosition: memo.scrollPosition,
        startY: memo.startY,
        endY: memo.endY
      });
    } else {
      // If no existing tab, create new one and wait for it to load
      const tab = await browser.tabs.create({ url: memo.url });
      
      // Add a listener for when the tab completes loading
      browser.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          // Remove the listener to avoid memory leaks
          browser.tabs.onUpdated.removeListener(listener);
          
          // Send the highlight message after a short delay to ensure page is ready
          setTimeout(() => {
            browser.tabs.sendMessage(tab.id, {
              action: 'scrollToText',
              scrollPosition: memo.scrollPosition,
              startY: memo.startY,
              endY: memo.endY
            });
          }, 500);
        }
      });
    }
  } catch (error) {
    console.error('Error opening link:', error);
    showFeedback('Failed to open link', 'error');
  }
}

function updateCategoryDropdowns() {
  const sortedCategories = Array.from(categories).sort();
  const dropdowns = document.querySelectorAll('.category-select');
  
  dropdowns.forEach(dropdown => {
    const currentValue = dropdown.value;
    dropdown.innerHTML = `
      <option value="">Select category</option>
      ${sortedCategories.map(cat => 
        `<option value="${cat}" ${currentValue === cat ? 'selected' : ''}>${cat}</option>`
      ).join('')}
    `;
  });
}


// Update createMemoElement to include category selection
function createMemoElement(memo, index) {
  const memoElement = document.createElement('div');
  memoElement.className = 'memo';
  memoElement.dataset.index = index;

  const isLong = memo.text.length > 100;
  const displayText = isLong ? `${memo.text.slice(0, 100)}...` : memo.text;
  const titleText = memo.title.length > 30 ? `${memo.title.slice(0, 30)}...` : memo.title;

  memoElement.innerHTML = `
    <div class="memo-header">
      <div class="memo-buttons">
        <button class="copy-btn" title="Copy to clipboard">Copy</button>
        <button class="delete-btn" title="Delete note">Delete</button>
        ${isLong ? `<button class="toggle-btn" title="Show more">Show More</button>` : ''}
      </div>
    </div>
    <div class="category-selector">
      <select class="category-select" data-index="${index}">
        <option value="">Select category</option>
        ${Array.from(categories).sort().map(cat => 
          `<option value="${cat}" ${memo.category === cat ? 'selected' : ''}>${cat}</option>`
        ).join('')}
      </select>
    </div>
    <div class="memo-text ${isLong ? '' : 'expanded'}">
      <p>${displayText}</p>
    </div>
    <div class="memo-footer">
      <a href="#" class="memo-link" title="${memo.url}">${titleText}</a>
      <small>${formatDate(memo.date)}</small>
    </div>
  `;

  // Add category change listener
  const categorySelect = memoElement.querySelector('.category-select');
  categorySelect.addEventListener('change', (e) => {
    allMemos[index].category = e.target.value;
    browser.storage.local.set({ memos: allMemos });
    applyFilters();
  });

  // Other event listeners...
  setupMemoEventListeners(memoElement, memo, index);

  return memoElement;
}

function setupMemoEventListeners(memoElement, memo, index) {
  // Toggle button
  const toggleBtn = memoElement.querySelector('.toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const memoText = memoElement.querySelector('.memo-text');
      memoText.classList.toggle('expanded');
      if (memoText.classList.contains('expanded')) {
        memoText.querySelector('p').textContent = memo.text;
        toggleBtn.textContent = 'Show Less';
      } else {
        memoText.querySelector('p').textContent = memo.text.slice(0, 100) + '...';
        toggleBtn.textContent = 'Show More';
      }
    });
  }

  // Delete button
  memoElement.querySelector('.delete-btn').addEventListener('click', async () => {
    if (await confirmDialog('Delete this note?')) {
      await deleteMemo(index);
    }
  });

  // Copy button
  memoElement.querySelector('.copy-btn').addEventListener('click', () => {
    copyMemoToClipboard(memo);
  });

  // Memo link
  const memoLink = memoElement.querySelector('.memo-link');
  if (memoLink) {
    memoLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await openMemoLink(memo);
    });
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // If less than 24 hours ago, show relative time
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Otherwise show date
  return date.toLocaleString();
}

async function copyMemoToClipboard(memo) {
  try {
    await navigator.clipboard.writeText(memo.text);
    showFeedback('Copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showFeedback('Failed to copy', 'error');
  }
}

async function deleteMemo(index) {
  try {
    allMemos.splice(index, 1);
    await browser.storage.local.set({ memos: allMemos });
    applyFilters();
    showFeedback('Note deleted');
  } catch (error) {
    console.error('Error deleting memo:', error);
    showFeedback('Failed to delete', 'error');
  }
}

// Storage operations
async function loadAndDisplayMemos() {
  try {
    const result = await browser.storage.local.get('memos');
    allMemos = result.memos || [];
    applyFilters();
  } catch (error) {
    console.error('Error loading memos:', error);
    showFeedback('Failed to load notes', 'error');
  }
}

// Filter and sort functions
function applyFilters() {
  let filteredMemos = [...allMemos];

  // Apply search filter
  if (currentFilter.search) {
    const searchLower = currentFilter.search.toLowerCase();
    filteredMemos = filteredMemos.filter(memo =>
      memo.text.toLowerCase().includes(searchLower) ||
      memo.title.toLowerCase().includes(searchLower)
    );
  }

  // Apply category filter
  if (currentFilter.category !== 'all') {
    filteredMemos = filteredMemos.filter(memo => 
      memo.category === currentFilter.category
    );
  }

  // Apply sorting
  switch (currentFilter.sortBy) {
    case 'date-desc':
      filteredMemos.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      filteredMemos.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'title':
      filteredMemos.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  displayMemos(filteredMemos);
}

// Export/Import functions
async function exportMemos() {
  try {
    const exportData = {
      memos: allMemos,
      categories: Array.from(categories),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `temp-notes-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showFeedback('Notes exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    showFeedback('Export failed', 'error');
  }
}

async function importMemos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    try {
      const file = e.target.files[0];
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      if (!importedData.memos || !Array.isArray(importedData.memos)) {
        throw new Error('Invalid import file format');
      }
      
      allMemos = importedData.memos;
      if (importedData.categories) {
        categories = new Set(importedData.categories);
      }
      
      await browser.storage.local.set({ memos: allMemos });
      applyFilters();
      showFeedback('Notes imported successfully');
      
    } catch (error) {
      console.error('Import failed:', error);
      showFeedback('Import failed', 'error');
    }
  };
  
  input.click();
}

// UI feedback
function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.textContent = message;
  
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }, 2000);
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="confirm-yes">Yes</button>
          <button class="confirm-no">No</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.confirm-yes').onclick = () => {
      document.body.removeChild(dialog);
      resolve(true);
    };
    
    dialog.querySelector('.confirm-no').onclick = () => {
      document.body.removeChild(dialog);
      resolve(false);
    };
  });
}

// Event listeners setup
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    currentFilter.search = e.target.value;
    applyFilters();
  });

  // Listen for new memos
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'newMemo') {
      loadAndDisplayMemos();
    }
  });

  // Listen for storage changes
  browser.storage.onChanged.addListener((changes) => {
    if (changes.memos) {
      loadAndDisplayMemos();
    }
  });
}

// Initialize the sidebar
initializeSidebar();