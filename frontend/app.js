const shortenForm = document.querySelector('#shorten-form');
const shortenButton = document.querySelector('#shorten-button');
const urlInput = document.querySelector('#long-url');
const expirySelect = document.querySelector('#expiry-days');
const formMessage = document.querySelector('#form-message');
const resultCard = document.querySelector('#result-card');
const shortUrlLink = document.querySelector('#short-url');
const originalUrlText = document.querySelector('#original-url');
const copyButton = document.querySelector('#copy-button');
const viewStatsButton = document.querySelector('#view-stats-button');

const statsForm = document.querySelector('#stats-form');
const statsCodeInput = document.querySelector('#stats-code');
const statsMessage = document.querySelector('#stats-message');
const statsResult = document.querySelector('#stats-result');

let latestShortCode = '';

function showMessage(element, message = '') {
  element.textContent = message;
}

function getShortCode(value) {
  const cleaned = value.trim();
  if (!cleaned) return '';

  try {
    const parsed = new URL(cleaned);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.at(-1) || '';
  } catch {
    return cleaned.replace(/^\/+|\/+$/g, '');
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function readError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item) => item.msg).join(', ');
  } catch {
    // The server may return an empty or non-JSON error response.
  }
  return 'Something went wrong. Please try again.';
}

shortenForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(formMessage);
  resultCard.hidden = true;
  shortenButton.disabled = true;
  shortenButton.textContent = 'Working…';

  const payload = { url: urlInput.value.trim() };
  if (expirySelect.value) payload.expires_in_days = Number(expirySelect.value);

  try {
    const response = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await readError(response));

    const data = await response.json();
    latestShortCode = data.short_code;
    shortUrlLink.href = data.short_url;
    shortUrlLink.textContent = data.short_url;
    originalUrlText.textContent = data.long_url;
    resultCard.hidden = false;
    statsCodeInput.value = data.short_code;
  } catch (error) {
    showMessage(formMessage, error.message || 'Could not create the short link.');
  } finally {
    shortenButton.disabled = false;
    shortenButton.innerHTML = 'Shorten URL <span aria-hidden="true">→</span>';
  }
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortUrlLink.href);
    copyButton.textContent = 'Copied!';
  } catch {
    // Clipboard access can be blocked in some browser contexts.
    const temporaryInput = document.createElement('input');
    temporaryInput.value = shortUrlLink.href;
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    document.execCommand('copy');
    temporaryInput.remove();
    copyButton.textContent = 'Copied!';
  }
  window.setTimeout(() => { copyButton.textContent = 'Copy link'; }, 1600);
});

viewStatsButton.addEventListener('click', () => {
  statsCodeInput.value = latestShortCode;
  document.querySelector('#stats-heading').scrollIntoView({ behavior: 'smooth', block: 'center' });
  statsCodeInput.focus({ preventScroll: true });
  statsForm.requestSubmit();
});

statsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(statsMessage);
  statsResult.hidden = true;

  const shortCode = getShortCode(statsCodeInput.value);
  if (!shortCode) {
    showMessage(statsMessage, 'Enter a short code or a complete short URL.');
    return;
  }

  try {
    const response = await fetch(`/stats/${encodeURIComponent(shortCode)}`);
    if (!response.ok) throw new Error(await readError(response));

    const data = await response.json();
    document.querySelector('#click-count').textContent = data.click_count ?? 0;
    document.querySelector('#detail-code').textContent = data.short_code;
    document.querySelector('#detail-created').textContent = formatDate(data.created_at);
    document.querySelector('#detail-expires').textContent = formatDate(data.expires_at) === '—' ? 'Never' : formatDate(data.expires_at);

    const destination = document.querySelector('#detail-destination');
    destination.href = data.long_url;
    destination.textContent = 'Open original URL ↗';
    statsResult.hidden = false;
  } catch (error) {
    showMessage(statsMessage, error.message || 'Could not load statistics.');
  }
});
