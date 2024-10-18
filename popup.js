// Function to convert milliseconds to HH:MM:SS
function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}

// Function to switch to the tab tracker view
function switchToTabTracker() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("tabTrackerSection").style.display = "block";
    document.getElementById("backArrow").style.display = "block";

    // Save the current view in storage
    chrome.storage.local.set({ currentView: "tabTracker" });

    // Fetch the latest tab times when switching to the tracker
    chrome.runtime.sendMessage({ action: "getTabTimes" }, (response) => {
        const tabTimes = response.tabTimes || {};
        synchronizeTabs(
            tabTimes,
            response.activeTabId,
            response.activeStartTime
        );
    });
}

// Function to switch to the home menu view
function switchToHome() {
    document.getElementById("tabTrackerSection").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
    document.getElementById("backArrow").style.display = "none";

    // Save the current view in storage
    chrome.storage.local.set({ currentView: "home" });
}

// Back button logic to return to the main menu
document.getElementById("backBtn").addEventListener("click", switchToHome);

// Attach event listeners to switch between home menu and tab tracker
document
    .getElementById("tabTrackerBtn")
    .addEventListener("click", switchToTabTracker);

// Restore the last view when the popup is opened
chrome.storage.local.get("currentView", (data) => {
    const currentView = data.currentView || "tabTracker"; // Default to tab tracker if no value is found

    if (currentView === "home") {
        switchToHome();
    } else {
        switchToTabTracker();
    }
});

// Synchronize and display tabs in the popup
function synchronizeTabs(tabTimes, activeTabId, activeStartTime) {
    const tabsContainer = document.getElementById("tabsContainer");
    tabsContainer.innerHTML = ""; // Clear existing UI

    if (!tabTimes || Object.keys(tabTimes).length === 0) {
        tabsContainer.innerHTML =
            "<tr><td colspan='3'>No tabs being tracked</td></tr>";
        return;
    }

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
    // Remove the tab via chrome API
    chrome.tabs.remove(tabId, () => {
        // Send a message directly to the background script to update tab times and UI
        chrome.runtime.sendMessage({ action: "removeTab", tabId }, () => {
            chrome.runtime.sendMessage(
                { action: "getTabTimes" },
                (response) => {
                    const tabTimes = response.tabTimes || {};
                    synchronizeTabs(
                        tabTimes,
                        response.activeTabId,
                        response.activeStartTime
                    ); // Refresh the UI
                }
            );
        });
    });
}

// Function to close all tabs
function closeAllTabs() {
    const tabIds = Object.keys(tabTimes).map((tabId) => parseInt(tabId));
    chrome.tabs.remove(tabIds, () => {
        tabTimes = {}; // Clear all tracked tabs
        synchronizeTabs({}, null, null); // Refresh the UI
    });
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
