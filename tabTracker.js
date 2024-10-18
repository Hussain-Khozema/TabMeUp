let tabTimes = {};
let activeTabId = null;
let activeStartTime = null;

function updateActiveTabTime() {
  if (activeTabId !== null && activeStartTime !== null) {
    const elapsedTime = Date.now() - activeStartTime;
    if (tabTimes[activeTabId]) {
      tabTimes[activeTabId].timeSpent += elapsedTime;
    } else {
      tabTimes[activeTabId] = { title: "", timeSpent: elapsedTime };
    }
    activeStartTime = Date.now();
  }
}

function updateTabTitle(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab) {
      if (tabTimes[tabId]) {
        tabTimes[tabId].title = tab.title;
      } else {
        tabTimes[tabId] = { title: tab.title, timeSpent: 0 };
      }
    }
  });
}

function trackExistingTabs() {
  chrome.tabs.query({}, function (tabs) {
    tabTimes = {};
    tabs.forEach((tab) => {
      if (!tabTimes[tab.id]) {
        tabTimes[tab.id] = { title: tab.title, timeSpent: 0 };
      }
    });
  });
}

export { updateActiveTabTime, updateTabTitle, trackExistingTabs };
