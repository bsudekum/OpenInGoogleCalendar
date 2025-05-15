function formatForGoogleCalendar(dateObj) {
  // YYYYMMDDTHHmmssZ (UTC) or omit 'Z' for local TZ.
  if (!dateObj) return "";
  // Pad month/date/hours/minutes/seconds
  function pad(n) { return n < 10 ? '0' + n : n; }
  // Always use local time (Google Calendar expects it by default)
  return dateObj.getFullYear().toString() +
    pad(dateObj.getMonth() + 1) +
    pad(dateObj.getDate()) + 'T' +
    pad(dateObj.getHours()) +
    pad(dateObj.getMinutes()) +
    pad(dateObj.getSeconds());
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-gcal",
    title: "Add Event to Google Calendar",
    contexts: ["selection"]
  });
});

// Listen for right-click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-gcal") {
    const selection = info.selectionText.trim();

    console.log("Selected text:", selection);

    // Get the user's timezone (IANA ID, e.g. "America/Denver")
    const [{ result: userTimeZone }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Basic date/time extraction (naive, native only)
    // Look for a date/time phrase, e.g. "June 1st 2025 9am-10am"
    let match = selection.match(
      /(\d{1,2}[:.]\d{2}\s*(AM|PM|am|pm)?)?[--to]+(\d{1,2}[:.]\d{2}\s*(AM|PM|am|pm)?)/ // time range
    );
    let date = Date.parse(selection);
    let startDate = null, endDate = null;

    if (!isNaN(date)) {
      startDate = new Date(date);
      // If time range found, make end time +1 hour
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Parse location after "at" or "in", e.g. "at 123 Main St, City"
    let locMatch = selection.match(/\b(at|in)\s+([A-Za-z0-9\s,]+)/i);
    let location = locMatch ? locMatch[2].trim() : "";

    // Fill out the deeper link dynamically
    let url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(selection)}`;
    if (startDate && endDate) {
      url += `&dates=${formatForGoogleCalendar(startDate)}/${formatForGoogleCalendar(endDate)}`;
    }
    url += `&details=&location=${encodeURIComponent(location)}&ctz=${encodeURIComponent(userTimeZone)}`;

    chrome.tabs.create({ url });
  }
});
