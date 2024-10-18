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
// Function to dynamically load a JavaScript file
function loadScript(url, callback) {
    const script = document.createElement("script");
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Function to load an HTML file into a div
function loadHtml(url, elementId, callback) {
    fetch(url)
        .then((response) => response.text())
        .then((html) => {
            document.getElementById(elementId).innerHTML = html;
            if (callback) callback(); // Ensure events are bound after loading
        })
        .catch((error) => {
            console.error("Error loading HTML:", error);
        });
}

// Function to switch to the tab tracker view
function switchToTabTracker() {
    document.getElementById("content").style.display = "none";
    document.getElementById("tabTrackerSection").style.display = "block";

    // Save the current view in storage
    chrome.storage.local.set({ currentView: "tabTracker" });

    // Load the tab tracker script
    loadScript("tabTracker.js", () => {
        console.log("Tab Tracker script loaded");
    });
}

// Function to switch to the sessions tracker view
function switchToSessionsTracker() {
    document.getElementById("content").style.display = "none";
    document.getElementById("tabTrackerSection").style.display = "none";

    // Load the sessions tracker HTML and script
    loadHtml("sessionsTracker.html", "content", () => {
        console.log("Sessions Tracker loaded");
        loadScript("sessionsTracker.js", () => {
            console.log("Sessions Tracker script loaded");
        });
    });

    // Save the current view in storage
    chrome.storage.local.set({ currentView: "sessionsTracker" });
}

// Function to switch to the home menu view
function switchToHome() {
    document.getElementById("tabTrackerSection").style.display = "none";
    document.getElementById("content").style.display = "block";

    // Load the main menu HTML
    loadHtml("mainMenu.html", "content", () => {
        document
            .getElementById("tabTrackerBtn")
            .addEventListener("click", switchToTabTracker);
        document
            .getElementById("sessionsTrackerBtn")
            .addEventListener("click", switchToSessionsTracker);
    });

    // Save the current view in storage
    chrome.storage.local.set({ currentView: "home" });
}

// Back button logic to return to the main menu
document.getElementById("backBtn").addEventListener("click", switchToHome);

// Restore the last view when the popup is opened
chrome.storage.local.get("currentView", (data) => {
    const currentView = data.currentView || "tabTracker"; // Default to tab tracker if no value is found

    if (currentView === "home") {
        switchToHome();
    } else if (currentView === "sessionsTracker") {
        switchToSessionsTracker();
    } else {
        switchToTabTracker();
    }
});
