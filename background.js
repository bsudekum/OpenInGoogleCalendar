function formatForGoogleCalendar(dateObj) {
  if (!dateObj) return "";
  function pad(n) { return n < 10 ? '0' + n : n; }
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-gcal") {
    const selection = info.selectionText.trim();

    // Get timezone
    const [{ result: userTimeZone }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Get page metadata (title, description, url)
    const [{ result: pageMeta }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const description = document.querySelector('meta[name="description"]')?.content || document.title;
        return {
          title: document.title,
          url: window.location.href,
          description
        };
      }
    });

    // Parse time from selected text
    const date = Date.parse(selection);
    let startDate = null, endDate = null;

    if (!isNaN(date)) {
      startDate = new Date(date);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
    }

    // Parse location
    let locMatch = selection.match(/\b(at|in)\s+([A-Za-z0-9\s,]+)/i);
    let location = locMatch ? locMatch[2].trim() : "";

    // Construct GCal URL
    let url = `https://calendar.google.com/calendar/r/eventedit`;
    url += `?text=${encodeURIComponent(pageMeta.description)}`;
    if (startDate && endDate) {
      url += `&dates=${formatForGoogleCalendar(startDate)}/${formatForGoogleCalendar(endDate)}`;
    }
    url += `&details=${encodeURIComponent(pageMeta.url)}`;
    if (location) url += `&location=${encodeURIComponent(location)}`;
    url += `&ctz=${encodeURIComponent(userTimeZone)}`;

    chrome.tabs.create({ url });
  }
});

function extractDateTime(text) {
  let date = Date.parse(text);
  if (!isNaN(date)) {
    return { start: new Date(date), end: new Date(date + 60 * 60 * 1000) };
  }
  return { start: null, end: null };
}
