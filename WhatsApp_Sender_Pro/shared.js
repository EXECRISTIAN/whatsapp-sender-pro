// Shared helpers for the popup, composer and background worker
import { getCountries, getCountryCallingCode, parsePhoneNumber } from './vendor/phone.js';

export const DEFAULT_ACCENT = '#128c5e';
export const DEFAULT_OUTLINE = '#000000';
export const RATE_LIMIT = 8; // chats per minute before warning
const LEGACY_ACCENT = '#6c5ce7';
const RATE_WINDOW_MS = 60000;
const FALLBACK_COUNTRY = 'AR';
// Countries that share a calling code: the one a bare prefix like "1" or "44" means
const MAIN_COUNTRY = { 1:'US', 7:'RU', 39:'IT', 44:'GB', 47:'NO', 61:'AU', 212:'MA', 290:'SH', 358:'FI', 590:'GP', 599:'CW' };

export const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😉','😘','👍','🙏','👌','🔥','💪','🎉','✨','✅','❌','📞','📍','⏰','💰','🚚','📦','📝','📌','📅','⚠️','⭐','🥳','🙌','🤝','🕒','🧾','💬'];

const fold = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Phone numbers
export function onlyDigits(s){ return (s||'').replace(/\D/g,''); }

export const COUNTRIES = getCountries();

export function callingCode(country){
  try { return getCountryCallingCode(country); } catch { return ''; }
}

export function flagEmoji(country){
  return String.fromCodePoint(...[...country].map(ch => 0x1F1A5 + ch.charCodeAt(0)));
}

export function guessCountry(languages = [navigator.language, ...(navigator.languages||[])]){
  for (const lang of languages) {
    const region = (lang||'').split('-')[1];
    if (region && callingCode(region.toUpperCase())) return region.toUpperCase();
  }
  return FALLBACK_COUNTRY;
}

function tryParse(text, country){
  try {
    const parsed = parsePhoneNumber(text, { defaultCountry: country });
    return parsed && parsed.number ? parsed : null;
  } catch { return null; }
}

// WhatsApp expects Argentine mobiles with the 9 and Mexican ones without the old 1
function whatsappForm(parsed){
  const national = parsed.nationalNumber;
  if (parsed.countryCallingCode === '54' && !national.startsWith('9')) {
    const mobile = tryParse(`+549${national}`);
    if (mobile && mobile.isValid()) return mobile;
  }
  if (parsed.countryCallingCode === '52' && !parsed.isValid() && national.startsWith('1')) {
    const modern = tryParse(`+52${national.slice(1)}`);
    if (modern && modern.isValid()) return modern;
  }
  return parsed;
}

// Status: ok (valid), doubtful (right length, unknown range), bad, empty
export function parsePhone(input, country, area = ''){
  const raw = (input||'').trim();
  const digits = onlyDigits(raw);
  if (!digits) return { phone: '', country, status: 'empty', display: '', national: '' };
  const international = raw.startsWith('+') || raw.startsWith('00');
  const candidates = international
    ? [tryParse('+' + (raw.startsWith('00') ? digits.slice(2) : digits), country)]
    : [tryParse(digits, country), area ? tryParse(onlyDigits(area) + digits, country) : null, tryParse('+' + digits, country)];
  const found = candidates.filter(Boolean);
  let best = found.find(p => p.isValid()) || found.find(p => p.isPossible()) || found[0];
  if (!best) return { phone: digits, country, status: 'bad', display: `+${digits}`, national: digits };
  best = whatsappForm(best);
  const display = best.formatInternational();
  // A local number keeps the chosen country (07911 in GB is not Guernsey); one with the code shows its own
  const local = !international && callingCode(country) === best.countryCallingCode && !digits.startsWith(best.countryCallingCode);
  return {
    phone: best.number.slice(1),
    country: local ? country : (best.country || country),
    status: best.isValid() ? 'ok' : best.isPossible() ? 'doubtful' : 'bad',
    display,
    national: display.replace(/^\+\d+\s*/, '')
  };
}

export function formatPhone(phone){
  const parsed = tryParse(`+${phone}`);
  return parsed ? parsed.formatInternational() : `+${phone}`;
}

// Old versions stored one "prefix" like 54911: country code plus area code
export function splitLegacyPrefix(prefix){
  const digits = onlyDigits(prefix);
  for (let len = 1; len <= 3; len++) {
    const code = digits.slice(0, len);
    const country = MAIN_COUNTRY[code] || COUNTRIES.find(c => callingCode(c) === code);
    if (country) {
      let area = digits.slice(len);
      if (country === 'AR' && area.startsWith('9')) area = area.slice(1);
      return { country, area };
    }
  }
  return null;
}

// Country of the calling code at the start of "+…" or "00…", while it is still being typed
export function detectCountry(input, current){
  const raw = (input||'').trim();
  if (!/^(\+|00)/.test(raw)) return null;
  const digits = onlyDigits(raw).slice(raw.startsWith('00') ? 2 : 0);
  for (let len = 1; len <= 3; len++) {
    const code = digits.slice(0, len);
    if (code.length < len) return null;
    if (callingCode(current) === code) return current;
    const country = MAIN_COUNTRY[code] || COUNTRIES.find(c => callingCode(c) === code);
    if (country) return country;
  }
  return null;
}

export function isValidPhone(phone){ return /^[1-9]\d{6,14}$/.test(phone||''); }

export function extractPhone(text){
  const match = (text||'').match(/\+?\d[\d\s().-]{5,}\d/);
  return match ? match[0] : '';
}

export function buildUrl(platform, phone, text){
  const base = platform === 'web' ? 'https://web.whatsapp.com' : 'https://api.whatsapp.com';
  const params = text ? `&text=${encodeURIComponent(text)}` : '';
  return `${base}/send?phone=${phone}${params}`;
}

// Contacts
export function mergeContacts(existing, incoming, now = Date.now()){
  const contacts = existing.map(c => ({ ...c }));
  const result = { contacts, added: 0, updated: 0, skipped: 0 };
  incoming.forEach(item => {
    const phone = onlyDigits(item && item.phone);
    if (!isValidPhone(phone)) { result.skipped++; return; }
    const found = contacts.find(c => c.phone === phone);
    const name = String(item.name || '');
    const notes = String(item.notes || '');
    const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
    if (found) {
      found.name = name || found.name;
      found.notes = notes || found.notes;
      found.tags = tags.length ? tags : found.tags;
      result.updated++;
    } else {
      contacts.push({ id: crypto.randomUUID(), phone, name, notes, tags, createdAt: Number(item.createdAt) || now, lastUsedAt: Number(item.lastUsedAt) || 0 });
      result.added++;
    }
  });
  return result;
}

export function filterContacts(contacts, query){
  const q = fold(query).trim();
  const digits = onlyDigits(q);
  const sorted = [...contacts].sort((a,b) => (b.lastUsedAt||0) - (a.lastUsedAt||0) || (a.name||a.phone).localeCompare(b.name||b.phone));
  if (!q) return sorted;
  return sorted.filter(c => fold([c.name, c.phone, c.notes, ...(c.tags||[])].join(' ')).includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
}

// Storage: small preferences in sync, lists and images in local
export function filterTemplates(templates, query){
  const q = fold(query).trim();
  return q ? templates.filter(tpl => fold(`${tpl.title} ${tpl.text}`).includes(q)) : templates;
}

// Templates match by title + text, so importing the same file twice adds nothing
export function mergeTemplates(existing, incoming){
  const templates = existing.map(tpl => ({ ...tpl }));
  const result = { templates, added: 0, skipped: 0 };
  incoming.forEach(item => {
    const text = String((item && item.text) || '');
    const title = String((item && item.title) || '').trim();
    if (!text.trim()) { result.skipped++; return; }
    if (templates.some(tpl => tpl.text === text && (tpl.title || '') === title)) { result.skipped++; return; }
    templates.push({ id: crypto.randomUUID(), title, text });
    result.added++;
  });
  return result;
}

// Backup file: { app, version, exportedAt, contacts?, templates? }. A bare list is an old contacts export.
export function buildBackup({ contacts = [], templates = [] }, include, version = '', now = new Date()){
  const backup = { app: 'WhatsApp Sender Pro', version, exportedAt: now.toISOString() };
  if (include.contacts) backup.contacts = contacts.map(({ phone, name, notes, tags, createdAt, lastUsedAt }) => ({ phone, name, notes, tags, createdAt, lastUsedAt }));
  if (include.templates) backup.templates = templates.map(({ title, text }) => ({ title, text }));
  return backup;
}
export function parseBackup(data){
  if (Array.isArray(data)) return { contacts: data, templates: [] };
  if (data && typeof data === 'object' && (Array.isArray(data.contacts) || Array.isArray(data.templates))) {
    return { contacts: Array.isArray(data.contacts) ? data.contacts : [], templates: Array.isArray(data.templates) ? data.templates : [] };
  }
  return null;
}

export function normalizeSettings(saved){
  const settings = { lang:'auto', theme:'auto', accent:DEFAULT_ACCENT, outline:DEFAULT_OUTLINE, ...(saved||{}) };
  if (settings.accent === LEGACY_ACCENT) settings.accent = DEFAULT_ACCENT;
  if (settings.theme === 'custom') settings.theme = 'auto';
  delete settings.bg;
  return settings;
}

export async function migrateStorage(){
  const old = await chrome.storage.sync.get(['wa_templates','wa_history','wa_settings','wa_defaultPrefix']);
  const local = await chrome.storage.local.get(['wa_templates','wa_history','wa_bg']);
  const updates = {};
  if (old.wa_templates && !local.wa_templates) {
    updates.wa_templates = old.wa_templates.map(({ files, ...tpl }) => tpl);
  }
  if (old.wa_history && !local.wa_history) updates.wa_history = old.wa_history;
  if (old.wa_settings && old.wa_settings.bg && !local.wa_bg) updates.wa_bg = old.wa_settings.bg;
  await chrome.storage.local.set(updates);
  if (old.wa_settings) await chrome.storage.sync.set({ wa_settings: normalizeSettings(old.wa_settings) });
  const legacy = splitLegacyPrefix(old.wa_defaultPrefix);
  if (legacy) await chrome.storage.sync.set({ wa_defaultCountry: legacy.country, wa_defaultArea: legacy.area });
  await chrome.storage.sync.remove(['wa_templates','wa_history','wa_defaultPrefix']);
}

export async function loadPhoneDefaults(){
  const { wa_defaultCountry, wa_defaultArea='' } = await chrome.storage.sync.get(['wa_defaultCountry','wa_defaultArea']);
  return { country: callingCode(wa_defaultCountry) ? wa_defaultCountry : guessCountry(), area: wa_defaultArea };
}

export async function loadAppearance(){
  const { wa_settings, wa_ui } = await chrome.storage.sync.get(['wa_settings','wa_ui']);
  const { wa_bg } = await chrome.storage.local.get(['wa_bg']);
  return { settings: normalizeSettings(wa_settings), ui: wa_ui || {}, bg: wa_bg || null };
}

export function applyAppearance(settings, bg){
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.style.setProperty('--accent', settings.accent);
  root.style.setProperty('--outline', settings.outline);
  document.body.classList.toggle('has-bg', !!bg);
  document.body.style.backgroundImage = bg ? `url("${bg}")` : '';
}

// Opening chats
export async function recentOpens(now = Date.now()){
  const { wa_opens=[] } = await chrome.storage.local.get(['wa_opens']);
  return wa_opens.filter(ts => now - ts < RATE_WINDOW_MS).length;
}

// Must run before openChat: creating a tab closes the popup and stops its script
export async function registerChat(phone, text, now = Date.now()){
  const { wa_history=[], wa_contacts=[], wa_opens=[] } = await chrome.storage.local.get(['wa_history','wa_contacts','wa_opens']);
  await chrome.storage.local.set({
    wa_history: [{ phone, text: encodeURIComponent(text||''), ts: now }, ...wa_history.filter(h => h.phone !== phone || h.text !== encodeURIComponent(text||''))].slice(0,20),
    wa_contacts: wa_contacts.map(c => c.phone === phone ? { ...c, lastUsedAt: now } : c),
    wa_opens: [...wa_opens.filter(ts => now - ts < RATE_WINDOW_MS), now]
  });
}

// WhatsApp Web only works in one tab, so an open one is reused
export async function openChat(platform, url){
  if (platform === 'web') {
    const [tab] = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (tab) {
      await chrome.tabs.update(tab.id, { url, active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    }
  }
  await chrome.tabs.create({ url });
}

// Page widgets
export function setupEmojiPanel({ msgEl, button, panel, grid, onChange }){
  function open(){
    panel.classList.remove('hidden');
    grid.innerHTML = '';
    EMOJIS.forEach(e => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = e;
      b.addEventListener('click', () => {
        const start = msgEl.selectionStart ?? msgEl.value.length;
        const end = msgEl.selectionEnd ?? start;
        msgEl.value = msgEl.value.slice(0,start) + e + msgEl.value.slice(end);
        msgEl.focus();
        msgEl.selectionStart = msgEl.selectionEnd = start + e.length;
        onChange();
      });
      grid.appendChild(b);
    });
    const rect = button.getBoundingClientRect();
    const panelW = Math.min(280, document.documentElement.clientWidth - 16), panelH = 300;
    panel.style.width = panelW + 'px';
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    // The button sits in the bottom-right corner of the message box: align the panel to its right edge
    let left = Math.min(rect.right - panelW, vw - panelW - 8), top = rect.bottom + 4;
    left = Math.max(8, left);
    if (top + panelH > vh) top = rect.top - panelH - 4;
    panel.style.left = left + 'px';
    panel.style.top = Math.max(0, top) + 'px';
  }
  button.addEventListener('click', () => {
    if (panel.classList.contains('hidden')) open(); else panel.classList.add('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !button.contains(e.target)) panel.classList.add('hidden');
  });
}

let toastTimer;
export function showToast(text){
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}
