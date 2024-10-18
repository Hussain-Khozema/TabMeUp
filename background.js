let tabTimes = {};
let activeTabId = null;
let activeStartTime = null;

// Clear tabTimes when the extension starts or is reloaded
chrome.runtime.onStartup.addListener(() => {
  tabTimes = {};  // Clear all previously tracked times
});

// Function to track the time of the active tab
function updateActiveTabTime() {
  if (activeTabId !== null && activeStartTime !== null) {
    const elapsedTime = Date.now() - activeStartTime;
    if (tabTimes[activeTabId]) {
      tabTimes[activeTabId].timeSpent += elapsedTime;
    } else {
      tabTimes[activeTabId] = { title: "", timeSpent: elapsedTime };
    }
    activeStartTime = Date.now();  // Reset the start time for the current active tab
  }
}

// Function to update the title of a tab
function updateTabTitle(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab) {
      if (tabTimes[tabId]) {
        tabTimes[tabId].title = tab.title;  // Set the actual title of the tab
      } else {
        tabTimes[tabId] = { title: tab.title, timeSpent: 0 };
      }
    }
  });
}

// Function to track existing tabs and their time
function trackExistingTabs() {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach((tab) => {
      if (!tabTimes[tab.id]) {
        tabTimes[tab.id] = { title: tab.title, timeSpent: 0 };
      }
    });
  });
}

// Handle tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateActiveTabTime();  // Update the time for the previously active tab

  activeTabId = activeInfo.tabId;
  activeStartTime = Date.now();  // Start timing for the new active tab

  updateTabTitle(activeTabId);  // Update the title of the newly active tab
});

// Handle when a tab is updated (e.g., when the title changes or a new tab loads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.title) {
    updateTabTitle(tabId);  // Update the title when a tab's title is available or changes
  }
});

// Handle when a tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  updateActiveTabTime();  // Update time for the tab before it's removed
  delete tabTimes[tabId];  // Remove it from tracking

  // Notify popup to refresh the UI
  chrome.runtime.sendMessage({ action: "tabRemoved" });
});

// Handle when the window loses focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE && activeTabId !== null && activeStartTime !== null) {
    updateActiveTabTime();
    activeStartTime = null;  // Stop tracking time until the window regains focus
  }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "removeTab") {
    const tabId = request.tabId;
    if (tabTimes[tabId]) {
      delete tabTimes[tabId];  // Remove the tab from background.js' tracking
    }
  } else if (request.action === "getTabTimes") {
    updateActiveTabTime();  // Make sure to update the active tab's time before sending data
    sendResponse({ tabTimes, activeTabId, activeStartTime });
  }
});

// Initialize tracking of existing tabs
trackExistingTabs();
