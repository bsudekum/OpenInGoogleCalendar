// --- DATE REGEX PATTERNS ---
const datePatterns = [
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, // e.g. 5/15/2025, 15-05-2025
  /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g,   // e.g. 2025-05-15
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4}\b/gi, // e.g. May 15, 2025
  /\b\d{1,2}(:\d{2})?\s?(AM|PM|am|pm)\b/g      // e.g. 9am, 11:30 PM
];

// --- UTILS: TIME/DATE FORMATTING ---
function pad(n) { return n < 10 ? '0' + n : n; }
function formatForGoogleCalendar(dateObj) {
  return dateObj.getFullYear().toString() +
    pad(dateObj.getMonth() + 1) +
    pad(dateObj.getDate()) + 'T' +
    pad(dateObj.getHours()) +
    pad(dateObj.getMinutes()) +
    pad(dateObj.getSeconds());
}
function extractDateTime(text) {
  let date = Date.parse(text);
  if (!isNaN(date)) {
    return { start: new Date(date), end: new Date(date + 60 * 60 * 1000) };
  }
  return { start: null, end: null };
}
function openGoogleCalendar(dateText) {
  const { start, end } = extractDateTime(dateText);
  let dates = "";
  if (start && end) {
    dates = `${formatForGoogleCalendar(start)}/${formatForGoogleCalendar(end)}`;
  }
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(dateText)}`;
  if (dates) url += `&dates=${dates}`;
  url += `&ctz=${encodeURIComponent(timezone)}`;
  window.open(url, '_blank');
}

// --- HANDLE UNDERLINED DATE SELECTION (CLICK, ENTER, SPACE, TOUCH) ---
function handleDateActivate(e) {
  const target = e.target;
  if (
    target.classList &&
    target.classList.contains('gcal-date') &&
    (
      (e.type === 'click') ||
      (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' ')) ||
      (e.type === 'touchstart')
    )
  ) {
    openGoogleCalendar(target.textContent);
    e.preventDefault();
    e.stopPropagation();
  }
}
document.body.addEventListener('click', handleDateActivate, true);
document.body.addEventListener('keydown', handleDateActivate, true);
document.body.addEventListener('touchstart', handleDateActivate, true);

// --- MAKE UNDERLINED DATES FOCUSABLE FOR A11Y ---
function makeSpanFocusable(span) {
  span.tabIndex = 0; // allow keyboard focus
  span.setAttribute('role', 'button');
  span.setAttribute('aria-label', 'Open this date in Google Calendar');
}

// --- RECURSIVELY UNDERLINE DATES IN PAGE ---
function underlineDates(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    let replaced = node.nodeValue;
    let hasDate = false;
    let fragments = [replaced];
    for (const pattern of datePatterns) {
      let temp = [];
      fragments.forEach(frag => {
        if (typeof frag === "string") {
          let lastIndex = 0, match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(frag)) !== null) {
            hasDate = true;
            if (match.index > lastIndex)
              temp.push(frag.slice(lastIndex, match.index));
            const span = document.createElement('span');
            span.textContent = match[0];
            span.style.textDecoration = "underline";
            span.style.textDecorationColor = "#0080ffd4";
            span.style.textDecorationStyle = "wavy";
            span.style.cursor = "pointer";
            span.className = 'gcal-date';
            makeSpanFocusable(span);
            temp.push(span);
            lastIndex = pattern.lastIndex;
          }
          if (lastIndex < frag.length)
            temp.push(frag.slice(lastIndex));
        } else temp.push(frag);
      });
      fragments = temp;
    }
    if (hasDate) {
      const parent = node.parentNode;
      fragments.forEach(frag => {
        if (typeof frag === "string")
          parent.insertBefore(document.createTextNode(frag), node);
        else
          parent.insertBefore(frag, node);
      });
      parent.removeChild(node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CODE', 'INPUT', 'TEXTAREA'];
    if (!skipTags.includes(node.tagName)) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        underlineDates(node.childNodes[i]);
      }
    }
  }
}
underlineDates(document.body);
