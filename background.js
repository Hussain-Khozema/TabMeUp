let tabTimes = {};
let activeTabId = null;
let activeStartTime = null;

let popupPort = null; // A variable to store the connection with the popup

// Listen for a connection from popup.js
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "popup") {
        popupPort = port;

        port.onDisconnect.addListener(() => {
            popupPort = null; // Reset the popup connection when it's closed
        });
    }
});

(function () {
    function updateActiveTabTime() {
        if (activeTabId !== null && activeStartTime !== null) {
            const elapsedTime = Date.now() - activeStartTime;
            if (tabTimes[activeTabId]) {
                tabTimes[activeTabId].timeSpent += elapsedTime;
            } else {
                tabTimes[activeTabId] = { title: "", timeSpent: elapsedTime };
            }
            activeStartTime = null; // Reset the start time since the tab is being closed
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

    chrome.runtime.onStartup.addListener(() => {
        tabTimes = {};
        trackExistingTabs();
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
        updateActiveTabTime();
        activeTabId = activeInfo.tabId;
        activeStartTime = Date.now();
        updateTabTitle(activeTabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.title) {
            updateTabTitle(tabId);
        }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
        // Update the active tab time if the removed tab is the current active one
        if (tabId === activeTabId) {
            updateActiveTabTime();
            activeTabId = null; // Reset since the active tab is closed
        }

        delete tabTimes[tabId]; // Remove the closed tab from tracking

        // Send a message to the popup if it's connected
        if (popupPort && popupPort.sender) {
            popupPort.postMessage({ action: "tabRemoved", tabId });
        }
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
        if (
            windowId === chrome.windows.WINDOW_ID_NONE &&
            activeTabId !== null &&
            activeStartTime !== null
        ) {
            updateActiveTabTime();
            activeStartTime = null;
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "removeTab") {
            const tabId = request.tabId;
            if (tabTimes[tabId]) {
                delete tabTimes[tabId];
            }
            sendResponse(); // Ensure the response is sent back
        } else if (request.action === "getTabTimes") {
            updateActiveTabTime();
            sendResponse({ tabTimes, activeTabId, activeStartTime });
        }
    });

    trackExistingTabs();
})();
