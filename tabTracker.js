// Fetch and display the tabs when switching to Tab Tracker
function loadTabTrackerData() {
    chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
        const tabTimes = response.tabTimes || {};
        const activeTabId = response.activeTabId;
        const activeStartTime = response.activeStartTime;

        // Now we can call synchronizeTabs with the fetched data
        synchronizeTabs(tabTimes, activeTabId, activeStartTime);
    });
}

function synchronizeTabs(tabTimes, activeTabId, activeStartTime) {
    const tabsContainer = document.getElementById("tabsContainer");
    tabsContainer.innerHTML = ""; // Clear existing UI

    if (!tabTimes || Object.keys(tabTimes).length === 0) {
        tabsContainer.innerHTML =
            "<tr><td colspan='3'>No tabs being tracked</td></tr>";
        return;
    }

    let activeTabRow = null;

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

        // If this is the active tab, store it separately
        if (parseInt(tabId) === activeTabId) {
            activeTabRow = row;
        } else {
            tabsContainer.appendChild(row);
        }
    }

    // If there is an active tab, prepend it to the container
    if (activeTabRow) {
        tabsContainer.insertBefore(activeTabRow, tabsContainer.firstChild);
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
            loadTabTrackerData(); // Reload the tab data after closing
        });
    });
}

// Call the loadTabTrackerData function to fetch and display the tracked tabs
loadTabTrackerData();

// Function to close all tabs
function closeAllTabs() {
    const confirmation = window.confirm(
        "Are you sure you want to close all tabs?"
    );
    if (confirmation) {
        chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
            const tabTimes = response.tabTimes || {};
            const tabIds = Object.keys(tabTimes).map((tabId) =>
                parseInt(tabId)
            );
            chrome.tabs.remove(tabIds, () => {
                tabTimes = {}; // Clear all tracked tabs
                synchronizeTabs({}, null, null); // Refresh the UI
            });
        });
    }
}

// Attach event listener for "Close All Tabs" button
document.getElementById("closeAllBtn").addEventListener("click", closeAllTabs);

// Set an interval to update the UI every second while in the tab tracker
setInterval(() => {
    if (
        document.getElementById("tabTrackerSection").style.display === "block"
    ) {
        chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
            const tabTimes = response.tabTimes || {};
            synchronizeTabs(
                tabTimes,
                response.activeTabId,
                response.activeStartTime
            );
        });
    }
}, 1000);
