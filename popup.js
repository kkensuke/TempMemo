document.getElementById('openSidebar').addEventListener('click', () => {
  browser.sidebarAction.open();
  window.close();
});