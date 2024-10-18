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
        console.log("updateActiveTabTime", activeTabId, activeStartTime);
        if (activeTabId !== null && activeStartTime !== null) {
            const elapsedTime = Date.now() - activeStartTime;
            if (tabTimes[activeTabId]) {
                tabTimes[activeTabId].timeSpent += elapsedTime;
            } else {
                tabTimes[activeTabId] = { title: "", timeSpent: elapsedTime };
            }
            // Reset activeStartTime to Date.now() when tracking the same tab's time
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
            tabs.forEach((tab) => {
                if (!tabTimes[tab.id]) {
                    tabTimes[tab.id] = { title: tab.title, timeSpent: 0 };
                }
            });
            console.log(tabTimes);
        });
    }

    chrome.runtime.onStartup.addListener(() => {
        console.log("Extension started/restarted");
        trackExistingTabs();
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
        // Before switching, save the time spent on the previous tab
        updateActiveTabTime();
        // Set the new active tab ID and start tracking its time
        activeTabId = activeInfo.tabId;
        activeStartTime = Date.now(); // Reset the start time for the new tab
        // Optionally update the title for the new active tab
        updateTabTitle(activeTabId);
        console.log("After switching active tab", tabTimes);
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
        // If no window is active (WINDOW_ID_NONE), stop tracking the active tab's time
        if (
            windowId === chrome.windows.WINDOW_ID_NONE &&
            activeTabId !== null &&
            activeStartTime !== null
        ) {
            updateActiveTabTime(); // Update the time for the currently active tab
            activeStartTime = null; // Stop tracking since the window is not in focus
        } else if (
            windowId !== chrome.windows.WINDOW_ID_NONE &&
            activeTabId !== null
        ) {
            // When the window regains focus, restart the timer for the active tab
            activeStartTime = Date.now();
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
