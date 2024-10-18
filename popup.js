function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

let tabTimes = {};
let activeTabId = null;
let activeStartTime = null;

// Function to update the display
function updatePopupDisplay() {
  const tabsContainer = document.getElementById("tabsContainer");
  tabsContainer.innerHTML = "";  // Clear existing UI

  for (let tabId in tabTimes) {
    const tabInfo = tabTimes[tabId];
    let timeSpent = tabInfo.timeSpent;

    // If it's the active tab, calculate the real-time active time
    if (parseInt(tabId) === activeTabId && activeStartTime !== null) {
      const elapsedTime = Date.now() - activeStartTime;
      timeSpent += elapsedTime;
    }

    const tabTime = msToTime(timeSpent);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="tab-info">${tabInfo.title}</td>
      <td>${tabTime}</td>
      <td><button class="close-btn" data-tabid="${tabId}">Close</button></td>
    `;
    tabsContainer.appendChild(row);
  }

  // Attach event listeners for the "Close" buttons
  document.querySelectorAll(".close-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = parseInt(this.getAttribute("data-tabid"));
      closeTab(tabId);
    });
  });
}

// Function to close a specific tab
function closeTab(tabId) {
  chrome.tabs.remove(tabId, () => {
    chrome.runtime.sendMessage({ action: "removeTab", tabId }, () => {
      // Fetch the updated tabTimes and refresh the UI
      chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
        tabTimes = response.tabTimes;
        updatePopupDisplay();  // Refresh the UI after receiving the updated tab list
      });
    });
  });
}

// Force synchronization with open tabs
function synchronizeTabs() {
  chrome.tabs.query({}, function(tabs) {
    // Create a new object based on current open tabs
    const currentTabs = {};
    tabs.forEach((tab) => {
      if (tabTimes[tab.id]) {
        currentTabs[tab.id] = tabTimes[tab.id];
      } else {
        currentTabs[tab.id] = { title: tab.title, timeSpent: 0 };
      }
    });

    tabTimes = currentTabs;
    updatePopupDisplay();  // Refresh the UI with the synchronized tab data
  });
}

// Fetch tab times from the background script and display them
chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
  tabTimes = response.tabTimes;
  activeTabId = response.activeTabId;
  activeStartTime = response.activeStartTime;

  // Synchronize with the currently open tabs to remove any closed tabs
  synchronizeTabs();
});

// Attach event listener for "Close All Tabs" button
document.getElementById("closeAllBtn").addEventListener("click", closeAllTabs);

// Listen for tab removal events from the background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "tabRemoved") {
    chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
      tabTimes = response.tabTimes;
      updatePopupDisplay();  // Refresh the UI after a tab is removed
    });
  }
});

// Function to close all tabs
function closeAllTabs() {
  const tabIds = Object.keys(tabTimes).map((tabId) => parseInt(tabId));
  chrome.tabs.remove(tabIds, () => {
    tabTimes = {};  // Clear all tracked tabs
    updatePopupDisplay();  // Refresh the UI
  });
}

// Set an interval to update the UI every second
setInterval(updatePopupDisplay, 1000);
