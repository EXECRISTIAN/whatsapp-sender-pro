import { COUNTRIES, RATE_LIMIT, applyAppearance, buildBackup, buildUrl, callingCode, filterContacts, filterTemplates, flagEmoji, formatPhone, loadAppearance, loadPhoneDefaults, mergeContacts, mergeTemplates, normalizeSettings, onlyDigits, openChat, parseBackup, recentOpens, registerChat, setupEmojiPanel, showToast } from './shared.js';
import { LANGUAGES, getLang, setLang, t, translatePage } from './i18n.js';
import { createPhoneField } from './phone-field.js';
import { countryNames, countrySearchText, fold, languageNames, languageSearchText } from './names.js';
import { createPicker } from './picker.js';
import { RELEASES_URL, compareVersions } from './updater.js';

// Helpers & storage
const qs = sel => document.querySelector(sel);
const getSync = keys => chrome.storage.sync.get(keys);
const setSync = obj => chrome.storage.sync.set(obj);
const getLocal = keys => chrome.storage.local.get(keys);
const setLocal = obj => chrome.storage.local.set(obj);
const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(n)));

const MAX_BG_BYTES = 4 * 1024 * 1024;
const POPUP = { minW: 340, maxW: 800, minH: 400, maxH: 600, w: 400, h: 600 }; // Chrome caps popups at 800×600
const inWindow = window.self !== window.top;
const sendable = r => r.status === 'ok' || r.status === 'doubtful';

let platform = 'app';
let templates = []; // {id, title, text}
let historyItems = [];
let contacts = []; // {id, phone, name, notes, tags, createdAt, lastUsedAt}
let settings = normalizeSettings();
let ui = { width: POPUP.w, height: POPUP.h, scale: 100, tab: 'contacts' };
let background = null;
let editingContactId = null;
let editingTemplateId = null;
let phoneField, contactField;
let clipboardText = '';

// Elements
const phoneFeedback = qs('#phoneFeedback');
const contactInfo = qs('#contactInfo');
const quickSave = qs('#quickSave');
const pasteSuggestion = qs('#pasteSuggestion');
const msgEl = qs('#message');
const charCount = qs('#charCount');
const libSearch = qs('#libSearch');
const libList = qs('#libList');
const libNew = qs('#btnLibNew');
const grips = [qs('#resizeGrip'), qs('#resizeGripLeft')];

// Settings dialog
const dlgSettings = qs('#dlgSettings');
// Settings: language and default country are typed into, with names as natives write them
const pickerItems = new Map();
function memo(key, build){ const k = `${key}|${getLang()}`; if (!pickerItems.has(k)) pickerItems.set(k, build()); return pickerItems.get(k); }
const languageItems = () => memo('lang', () => [
  { value: 'auto', label: t('langAuto'), search: fold(`auto automatic automatico ${t('langAuto')}`) },
  ...LANGUAGES.map(({ code }) => { const n = languageNames(code); return { value: code, label: n.native, sub: n.local, search: languageSearchText(code) }; })
    .sort((a, b) => a.sub.localeCompare(b.sub, getLang()))
]);
const countryItems = () => memo('country', () => COUNTRIES
  .map(code => { const n = countryNames(code); return { value: code, label: n.native, sub: n.local, prefix: flagEmoji(code), right: `+${n.dial}`, search: countrySearchText(code) }; })
  .sort((a, b) => a.sub.localeCompare(b.sub, getLang())));
const langSelect = createPicker(qs('#langSelect'), { items: languageItems, value: 'auto', placeholder: () => t('searchLanguage'), empty: () => t('noLanguages') });
const defaultArea = qs('#defaultArea');
const defaultCountry = createPicker(qs('#defaultCountry'), { items: countryItems, value: 'AR', placeholder: () => t('searchCountry'), empty: () => t('noCountries') });
const themeMode = qs('#themeMode');
const accentColor = qs('#accentColor');
const outlineColor = qs('#outlineColor');
const bgImage = qs('#bgImage');
const bgHint = qs('#bgHint');
const uiScale = qs('#uiScale');
// Shows the zoom percentage while the slider moves
const showScale = () => { qs('#uiScaleValue').textContent = `${uiScale.value}%`; };
uiScale.addEventListener('input', showScale);
const dataContacts = qs('#dataContacts');
const dataTemplates = qs('#dataTemplates');
const importInput = qs('#importInput');

// Contact and template dialogs
const dlgContact = qs('#dlgContact');
const contactName = qs('#contactName');
const contactNotes = qs('#contactNotes');
const contactTags = qs('#contactTags');
const contactError = qs('#contactError');
const dlgTemplate = qs('#dlgTemplate');
const templateTitle = qs('#templateTitle');
const templateText = qs('#templateText');

const findContact = phone => contacts.find(c => c.phone === phone);
const saveUI = () => setSync({ wa_ui: ui });

// Platform toggle
const toggle = qs('#platformToggle');
function setPlatformUI() {
  toggle.querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platform === platform);
    btn.setAttribute('aria-pressed', String(btn.dataset.platform === platform));
  });
}
toggle.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-platform]');
  if (!btn) return;
  platform = btn.dataset.platform;
  setPlatformUI();
  await setSync({ wa_platform: platform });
});

// Info buttons: hover or focus shows the tip, a click pins it (for touch screens)
document.querySelectorAll('.info-btn').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); btn.parentElement.classList.toggle('open'); });
});
document.addEventListener('click', e => {
  document.querySelectorAll('.info.open').forEach(info => { if (!info.contains(e.target)) info.classList.remove('open'); });
});

// Phone feedback: shows the exact number that will be opened
function updatePhoneFeedback(r = phoneField.result()){
  const messages = { ok: `✓ ${r.display}`, doubtful: `${t('phoneDoubtful')} ${r.display}`, bad: t('phoneBad'), empty: '' };
  phoneFeedback.textContent = messages[r.status];
  phoneFeedback.className = { ok: 'ok small', doubtful: 'warn small', bad: 'error small', empty: 'small' }[r.status];
  const contact = sendable(r) ? findContact(r.phone) : null;
  const info = contact ? [contact.name, contact.notes].filter(Boolean).join('\n') : '';
  contactInfo.textContent = info;
  contactInfo.classList.toggle('hidden', !info);
  quickSave.classList.toggle('hidden', !sendable(r) || !!contact);
  if (r.status === 'empty') { if (document.activeElement === phoneField.input) checkClipboard(); }
  else hidePasteSuggestion();
  return r;
}

// Paste suggestion: when the number field is empty and a phone number is on the clipboard
function hidePasteSuggestion(){ pasteSuggestion.classList.add('hidden'); clipboardText = ''; }
async function checkClipboard(){
  if (phoneField.input.value.trim()) return hidePasteSuggestion();
  let text = '';
  try { text = await navigator.clipboard.readText(); } catch { return hidePasteSuggestion(); }
  const r = phoneField.preview(text);
  if (!text || !sendable(r) || phoneField.input.value.trim()) return hidePasteSuggestion();
  clipboardText = text;
  pasteSuggestion.textContent = `📋 ${t('pasteSuggestion', { phone: r.display })}`;
  pasteSuggestion.title = t('pasteSuggestionTitle');
  pasteSuggestion.classList.remove('hidden');
}
function acceptPasteSuggestion(){
  if (!clipboardText) return;
  phoneField.paste(clipboardText);
  hidePasteSuggestion();
  msgEl.focus();
}
pasteSuggestion.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the field
pasteSuggestion.addEventListener('click', acceptPasteSuggestion);
window.addEventListener('focus', () => { if (document.activeElement === phoneField?.input) checkClipboard(); });

// Message: counter and emojis inside the box
function updateCharCount(){ charCount.textContent = String(msgEl.value.length); }
msgEl.addEventListener('input', updateCharCount);
setupEmojiPanel({ msgEl, button: qs('#emojiBtn'), panel: qs('#emojiPanel'), grid: qs('#emojiGrid'), onChange: updateCharCount });
function insertIntoMessage(text){
  if (!msgEl.value) msgEl.value = text;
  else {
    const start = msgEl.selectionStart ?? msgEl.value.length;
    const end = msgEl.selectionEnd ?? start;
    msgEl.value = msgEl.value.slice(0, start) + text + msgEl.value.slice(end);
    msgEl.selectionStart = msgEl.selectionEnd = start + text.length;
  }
  updateCharCount();
  msgEl.focus();
}

// Library: contacts, templates and recent chats in tabs with one search box
function iconButton(text, title, onClick){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'icon-btn ghost'; b.textContent = text; b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return b;
}
function initials(name){
  const words = (name||'').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0,2).map(w => [...w][0]).join('').toUpperCase() : '#';
}
function libItem({ avatar, title, sub, hint, onUse, actions = [] }){
  const row = document.createElement('div'); row.className = 'lib-item';
  const main = document.createElement('button');
  main.type = 'button'; main.className = 'lib-main'; main.title = hint;
  const av = document.createElement('span'); av.className = 'avatar'; av.textContent = avatar;
  const text = document.createElement('span'); text.className = 'lib-text';
  const a = document.createElement('span'); a.className = 'lib-title'; a.textContent = title;
  const b = document.createElement('span'); b.className = 'lib-sub'; b.textContent = sub;
  text.append(a, b);
  main.append(av, text);
  main.addEventListener('click', onUse);
  const tools = document.createElement('span'); tools.className = 'lib-actions';
  tools.append(...actions);
  row.append(main, tools);
  return row;
}
function emptyState(key){
  const empty = document.createElement('div');
  empty.className = 'lib-empty'; empty.textContent = t(key);
  return empty;
}
function timeLabel(ts){
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(getLang(), { day: 'numeric', month: 'short' });
}

function contactItems(){
  return filterContacts(contacts, libSearch.value).map(c => libItem({
    avatar: initials(c.name),
    title: c.name || formatPhone(c.phone),
    sub: [c.name ? formatPhone(c.phone) : '', c.notes, (c.tags||[]).map(tag => `#${tag}`).join(' ')].filter(Boolean).join(' · '),
    hint: t('useContact'),
    onUse: () => { phoneField.setValue(`+${c.phone}`); msgEl.focus(); },
    actions: [
      iconButton('✎', t('edit'), () => openContactDialog(c)),
      iconButton('🗑', t('delete'), async () => {
        if (!confirm(t('confirmDeleteContact', { name: c.name || formatPhone(c.phone) }))) return;
        contacts = contacts.filter(x => x.id !== c.id);
        await saveContacts();
      })
    ]
  }));
}
function templateItems(){
  return filterTemplates(templates, libSearch.value).map(tpl => libItem({
    avatar: '❝',
    title: tpl.title || t('untitled'),
    sub: (tpl.text || '').replace(/\s+/g, ' '),
    hint: t('useTemplate'),
    onUse: () => insertIntoMessage(tpl.text || ''),
    actions: [
      iconButton('✎', t('edit'), () => openTemplateDialog(tpl)),
      iconButton('🗑', t('delete'), async () => {
        if (!confirm(t('confirmDeleteTemplate', { name: tpl.title || t('untitled') }))) return;
        templates = templates.filter(x => x.id !== tpl.id);
        await saveTemplates();
      })
    ]
  }));
}
function recentItems(){
  const q = libSearch.value.trim().toLowerCase();
  const digits = onlyDigits(q);
  return historyItems
    .map(it => ({ ...it, contact: findContact(it.phone), message: decodeURIComponent(it.text || '') }))
    .filter(it => !q || `${it.contact?.name || ''} ${it.message}`.toLowerCase().includes(q) || (digits.length >= 3 && it.phone.includes(digits)))
    .map(it => libItem({
      avatar: it.contact ? initials(it.contact.name) : '🕒',
      title: it.contact?.name || formatPhone(it.phone),
      sub: [timeLabel(it.ts), it.message.replace(/\s+/g, ' ')].filter(Boolean).join(' · '),
      hint: t('useRecent'),
      onUse: () => {
        phoneField.setValue(`+${it.phone}`);
        msgEl.value = it.message; updateCharCount(); msgEl.focus();
      },
      actions: it.contact ? [] : [iconButton('＋', t('addContactFromHistory'), () => openContactDialog(null, `+${it.phone}`))]
    }));
}
function renderLibrary(){
  document.querySelectorAll('.tabs [role="tab"]').forEach(tabBtn => {
    const active = tabBtn.dataset.tab === ui.tab;
    tabBtn.setAttribute('aria-selected', String(active));
    tabBtn.tabIndex = active ? 0 : -1;
  });
  qs('#countContacts').textContent = contacts.length || '';
  qs('#countTemplates').textContent = templates.length || '';
  libSearch.placeholder = t({ contacts: 'searchContacts', templates: 'searchTemplates', recents: 'searchRecents' }[ui.tab]);
  libNew.classList.toggle('hidden', ui.tab === 'recents');
  libNew.title = t(ui.tab === 'templates' ? 'newTemplate' : 'newContact');
  libNew.setAttribute('aria-label', libNew.title);
  const source = { contacts, templates, recents: historyItems }[ui.tab];
  const items = { contacts: contactItems, templates: templateItems, recents: recentItems }[ui.tab]();
  libList.innerHTML = '';
  if (!source.length) libList.appendChild(emptyState({ contacts: 'noContacts', templates: 'noTemplates', recents: 'noRecents' }[ui.tab]));
  else if (!items.length) libList.appendChild(emptyState('noMatches'));
  else libList.append(...items);
}
qs('.tabs').addEventListener('click', e => {
  const tabBtn = e.target.closest('[role="tab"]');
  if (!tabBtn || tabBtn.dataset.tab === ui.tab) return;
  ui.tab = tabBtn.dataset.tab;
  libSearch.value = '';
  renderLibrary(); saveUI();
});
qs('.tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  const next = tabs[(tabs.findIndex(x => x.dataset.tab === ui.tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.click(); next.focus();
});
libSearch.addEventListener('input', renderLibrary);
libSearch.addEventListener('keydown', e => {
  const first = libList.querySelector('.lib-main');
  if (e.key === 'Enter') { e.preventDefault(); first?.click(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); first?.focus(); }
});
libList.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const mains = [...libList.querySelectorAll('.lib-main')];
  const i = mains.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  if (e.key === 'ArrowUp' && i === 0) libSearch.focus();
  else mains[Math.max(0, Math.min(mains.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
});
libNew.addEventListener('click', () => {
  if (ui.tab === 'templates') openTemplateDialog(null, msgEl.value);
  else { const r = phoneField.result(); openContactDialog(null, sendable(r) ? `+${r.phone}` : ''); }
});

// Contacts
async function saveContacts(){
  await setLocal({ wa_contacts: contacts });
  renderLibrary(); updatePhoneFeedback();
}
function openContactDialog(contact, phone = ''){
  editingContactId = contact ? contact.id : null;
  qs('#contactDialogTitle').textContent = t(contact ? 'contactEdit' : 'contactNew');
  contactField.setCountry(phoneField.country);
  contactField.setValue(contact ? `+${contact.phone}` : phone);
  contactName.value = contact ? contact.name || '' : '';
  contactNotes.value = contact ? contact.notes || '' : '';
  contactTags.value = contact ? (contact.tags||[]).join(', ') : '';
  contactError.textContent = '';
  dlgContact.showModal();
  (contact || phone ? contactName : contactField.input).focus();
}
qs('#contactForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const r = contactField.result();
  if (!sendable(r)) { contactError.textContent = t('reviewNumber'); return; }
  const fields = {
    phone: r.phone,
    name: contactName.value.trim(),
    notes: contactNotes.value.trim(),
    tags: contactTags.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean)
  };
  const target = contacts.find(c => c.id === editingContactId) || findContact(r.phone);
  if (target) Object.assign(target, fields);
  else contacts.push({ id: crypto.randomUUID(), ...fields, createdAt: Date.now(), lastUsedAt: 0 });
  await saveContacts();
  dlgContact.close();
  showToast(t('contactSaved'));
});
qs('#btnCloseContact').addEventListener('click', () => dlgContact.close());
qs('#btnCancelContact').addEventListener('click', () => dlgContact.close());
quickSave.addEventListener('click', () => openContactDialog(null, `+${phoneField.result().phone}`));

// Templates
async function saveTemplates(){
  await setLocal({ wa_templates: templates });
  renderLibrary();
}
function openTemplateDialog(tpl, text = ''){
  editingTemplateId = tpl ? tpl.id : null;
  qs('#templateDialogTitle').textContent = t(tpl ? 'templateEdit' : 'templateNew');
  templateTitle.value = tpl ? tpl.title || '' : '';
  templateText.value = tpl ? tpl.text || '' : text;
  dlgTemplate.showModal();
  (tpl ? templateText : templateTitle).focus();
}
qs('#templateForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fields = { title: templateTitle.value.trim() || t('untitled'), text: templateText.value };
  const target = templates.find(x => x.id === editingTemplateId);
  if (target) Object.assign(target, fields);
  else templates.push({ id: crypto.randomUUID(), ...fields });
  await saveTemplates();
  dlgTemplate.close();
  if (ui.tab !== 'templates') { ui.tab = 'templates'; libSearch.value = ''; renderLibrary(); saveUI(); }
  showToast(t('templateSaved'));
});
qs('#btnCloseTemplate').addEventListener('click', () => dlgTemplate.close());
qs('#btnCancelTemplate').addEventListener('click', () => dlgTemplate.close());
qs('#saveAsTemplate').addEventListener('click', () => openTemplateDialog(null, msgEl.value));

// Submit
qs('#form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const r = updatePhoneFeedback();
  if (!sendable(r)) { showToast(t('reviewNumber')); return; }
  if (await recentOpens() >= RATE_LIMIT && !confirm(t('rateWarning'))) return;
  await registerChat(r.phone, msgEl.value);
  await openChat(platform, buildUrl(platform, r.phone, msgEl.value));
  const { wa_history=[], wa_contacts=[] } = await getLocal(['wa_history','wa_contacts']);
  historyItems = wa_history; contacts = wa_contacts;
  renderLibrary(); updatePhoneFeedback();
});
// Enter in an empty number field takes the number suggested from the clipboard
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && e.target === phoneField?.input && !phoneField.input.value.trim() && clipboardText) {
    e.preventDefault();
    acceptPasteSuggestion();
  }
}, true);

qs('#copyLink').addEventListener('click', async ()=>{
  const r = updatePhoneFeedback();
  if (!sendable(r)) { showToast(t('reviewNumber')); return; }
  try {
    await navigator.clipboard.writeText(buildUrl(platform, r.phone, msgEl.value));
    showToast(t('linkCopied'));
  } catch { showToast(t('copyFailed')); }
});

// Size: drag the corner; the size is saved for next time
function applyUI(){
  document.documentElement.style.setProperty('--scale', String(ui.scale/100));
  if (inWindow) { document.body.classList.add('in-window'); return; }
  document.body.style.width = ui.width + 'px';
  document.body.style.height = ui.height + 'px';
}
// One grip in each bottom corner: dragging either one outwards makes the popup wider
for (const grip of grips) grip.addEventListener('pointerdown', e => {
  if (inWindow || e.button !== 0) return;
  e.preventDefault();
  grip.setPointerCapture(e.pointerId);
  const start = { x: e.screenX, y: e.screenY, w: ui.width, h: ui.height };
  const dir = grip.dataset.side === 'left' ? -1 : 1;
  let warned = false;
  const move = ev => {
    const w = start.w + dir * (ev.screenX - start.x), h = start.h + ev.screenY - start.y;
    ui.width = clamp(w, POPUP.minW, POPUP.maxW);
    ui.height = clamp(h, POPUP.minH, POPUP.maxH);
    applyUI();
    // Chrome does not let a popup grow past 800 × 600: point to the window, which has no limit
    if (!warned && (h > POPUP.maxH + 24 || w > POPUP.maxW + 24)) { warned = true; showToast(t('popupMaxSize')); }
  };
  const up = async () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    grip.removeEventListener('pointercancel', up);
    applyUI();
    await saveUI();
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('pointercancel', up);
});
async function resetSize(){
  ui.width = POPUP.w; ui.height = POPUP.h;
  applyUI();
  await saveUI();
  await chrome.storage.local.remove('wa_window');
}
for (const grip of grips) grip.addEventListener('dblclick', resetSize);
qs('#btnResetSize').addEventListener('click', resetSize);

// Settings
qs('#btnSettings').addEventListener('click', () => openSettings());
async function openSettings(focusData = false, scrollTo = ''){
  const { country, area } = await loadPhoneDefaults();
  fillCountrySelect(country);
  langSelect.value = settings.lang;
  defaultArea.value = area;
  themeMode.value = settings.theme;
  accentColor.value = settings.accent;
  outlineColor.value = settings.outline;
  uiScale.value = ui.scale;
  showScale();
  qs('#dataContactsCount').textContent = `(${contacts.length})`;
  qs('#dataTemplatesCount').textContent = `(${templates.length})`;
  qs('#dataHint').textContent = `${t('dataHint')}${inWindow ? '' : ' ' + t('dataHintPopup')}`;
  qs('#extensionId').textContent = chrome.runtime.id;
  qs('#versionBadge').textContent = `v${chrome.runtime.getManifest().version}`;
  qs('#versionBadge').title = t('versionTitle');
  dlgSettings.showModal();
  renderUpdate(); // starts watching for the updater setup while Settings is open
  refreshLocationUI();
  if (scrollTo) qs(scrollTo).scrollIntoView({ block: 'start' });
  if (focusData) { qs('#btnImport').scrollIntoView({ block: 'center' }); qs('#btnImport').focus(); showToast(t('importWindow')); }
}
function fillCountrySelect(selected){
  defaultCountry.value = selected;
}
qs('#btnCloseSettings').addEventListener('click', () => dlgSettings.close());
qs('#btnClearBg').addEventListener('click', async ()=>{
  bgImage.value = '';
  background = null;
  await chrome.storage.local.remove('wa_bg');
  applyAppearance(settings, background);
});
qs('#btnSaveSettings').addEventListener('click', async ()=>{
  const file = bgImage.files[0];
  if (file && file.size > MAX_BG_BYTES) { showToast(t('bgTooLarge')); return; }
  settings = { ...settings, lang: langSelect.value, theme: themeMode.value, accent: accentColor.value, outline: outlineColor.value };
  if (file) {
    background = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
    await setLocal({ wa_bg: background });
    bgImage.value = '';
  }
  ui.scale = clamp(parseInt(uiScale.value,10) || 100, 50, 200);
  const area = onlyDigits(defaultArea.value);
  const { country: oldCountry } = await loadPhoneDefaults();
  const country = defaultCountry.value || oldCountry;
  await setSync({ wa_settings: settings, wa_ui: ui, wa_defaultArea: area, wa_defaultCountry: country });
  defaultCountryNow = country;
  phoneField.setArea(area); contactField.setArea(area);
  if (country !== oldCountry) { phoneField.setCountry(country); contactField.setCountry(country); }
  setLang(settings.lang);
  translatePage(); phoneField.refreshLabels(); contactField.refreshLabels();
  renderLibrary(); updatePhoneFeedback();
  applyAppearance(settings, background); applyUI();
  dlgSettings.close();
  showToast(t('settingsSaved'));
});

// Backup: contacts and templates, together or separately
const include = () => ({ contacts: dataContacts.checked, templates: dataTemplates.checked });
qs('#btnExport').addEventListener('click', ()=>{
  const what = include();
  if (!what.contacts && !what.templates) { showToast(t('dataNothing')); return; }
  const backup = buildBackup({ contacts, templates }, what, chrome.runtime.getManifest().version);
  const kind = what.contacts && what.templates ? 'backup' : what.contacts ? 'contacts' : 'templates';
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `whatsapp-sender-${kind}-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
qs('#btnImport').addEventListener('click', ()=>{
  const what = include();
  if (!what.contacts && !what.templates) { showToast(t('dataNothing')); return; }
  // The toolbar popup closes when a file picker opens, so the picker lives in the window
  if (inWindow) importInput.click();
  else openWindow('#import');
});
importInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = parseBackup(JSON.parse(await file.text()));
    if (!data) throw new Error('not a backup');
    const what = include();
    const messages = [];
    if (what.contacts && data.contacts.length) {
      const result = mergeContacts(contacts, data.contacts);
      contacts = result.contacts;
      await setLocal({ wa_contacts: contacts });
      if (result.added || result.updated) messages.push(t('importContacts', result));
    }
    if (what.templates && data.templates.length) {
      const result = mergeTemplates(templates, data.templates);
      templates = result.templates;
      await setLocal({ wa_templates: templates });
      if (result.added) messages.push(t('importTemplates', result));
    }
    qs('#dataContactsCount').textContent = `(${contacts.length})`;
    qs('#dataTemplatesCount').textContent = `(${templates.length})`;
    renderLibrary(); updatePhoneFeedback();
    showToast(messages.join(' ') || t('importNothing'));
  } catch { showToast(t('importInvalid')); }
  finally { e.target.value = ''; }
});

// Updates: the background checks GitHub; this page shows the state and keeps a port open so a
// pending update waits until the extension is closed
chrome.runtime.connect({ name: 'wa_ui' });
let updateState = {};
const dataNotice = { restored: null, fresh: false };
const updateBanner = qs('#updateBanner');
const updateAction = qs('#updateAction');
const installBtn = qs('#btnInstallUpdate');
function renderUpdate(){
  const s = updateState || {};
  let text = '', action = '', isError = false, dismiss = false;
  const auto = s.auto !== false;
  if (s.notice && s.updatedTo === chrome.runtime.getManifest().version) { text = t('bannerUpdated', { version: s.updatedTo }); dismiss = true; }
  // With automatic updates working nothing is shown: the update installs by itself when the extension closes
  else if (s.status === 'available' && !(auto && s.helper)) { text = t(auto ? 'bannerNeedsHelper' : 'bannerManual', s); action = 'goto'; }
  else if (s.status === 'failed') { text = t('bannerFailed', { latest: s.latest, error: s.error }); action = 'retry'; isError = true; }
  else if (s.status === 'noAsset') { text = t('bannerNoAsset', s); isError = true; }
  // Data: restored from the automatic copy, or a fresh install with nothing saved yet
  let kind = text ? 'update' : '';
  if (!text && dataNotice.restored) { text = t('dataRestored', dataNotice.restored); dismiss = true; kind = 'restored'; }
  else if (!text && dataNotice.fresh && !contacts.length && !templates.length) { text = t('dataFreshInstall'); action = 'import'; dismiss = true; kind = 'fresh'; }
  updateBanner.dataset.kind = kind;
  qs('#updateText').textContent = text;
  updateBanner.classList.toggle('hidden', !text);
  updateBanner.classList.toggle('error', isError);
  updateAction.dataset.action = action;
  updateAction.textContent = action ? t({ goto: 'bannerGoToUpdates', retry: 'bannerRetry', import: 'dataImportBackup' }[action]) : '';
  updateAction.classList.toggle('hidden', !action);
  qs('#updateDismiss').classList.toggle('hidden', !dismiss);
  // Settings section
  const when = s.checkedAt ? new Date(s.checkedAt).toLocaleString(getLang(), { dateStyle: 'short', timeStyle: 'short' }) : t('updateNever');
  qs('#updateInfo').textContent = [t('updateInfo', { current: chrome.runtime.getManifest().version, latest: s.latest || '—', when }), s.error === 'network' ? t('updateNetwork') : ''].filter(Boolean).join(' ');
  autoSwitch.checked = auto;
  qs('#autoBackupInfo').textContent = t(s.helper ? 'autoBackupOn' : 'autoBackupOff');
  const needsHelper = auto && !s.helper;
  qs('#helperInfo').textContent = t(!auto ? 'autoOff' : s.helper ? 'helperOn' : 'helperOff');
  qs('#helperSteps').classList.toggle('hidden', !needsHelper);
  qs('#btnOpenFolder').classList.toggle('hidden', !needsHelper);
  watchHelper(needsHelper && dlgSettings.open);
  const canInstall = (s.status === 'available' || s.status === 'failed') && !!s.url && compareVersions(s.latest, chrome.runtime.getManifest().version) > 0;
  installBtn.classList.toggle('hidden', !canInstall);
  installBtn.textContent = canInstall ? t(s.helper ? 'installNow' : 'installDownload', { latest: s.latest }) : '';
  installBtn.title = canInstall ? t(s.helper ? 'installNowHint' : 'installDownloadHint') : '';
  if (!canInstall) qs('#installHint').classList.add('hidden');
}
installBtn.addEventListener('click', () => {
  const s = updateState || {};
  if (!s.url) return;
  if (s.helper) { // the updater installs as soon as no page of the extension is open
    chrome.runtime.sendMessage({ type: 'wa_requestInstall' }).finally(() => window.top.close());
    return;
  }
  // Without the updater Chrome cannot replace the extension's files: download the ZIP and explain the last step
  chrome.tabs.create({ url: s.url, active: false });
  const hint = qs('#installHint');
  hint.textContent = t('installManualSteps', { latest: s.latest });
  hint.classList.remove('hidden');
});
async function refreshUpdate(force = false){
  if (force) qs('#updateInfo').textContent = t('updateChecking');
  try { updateState = await chrome.runtime.sendMessage({ type: 'wa_checkUpdate', force }) || updateState; } catch {}
  renderUpdate();
}
updateAction.addEventListener('click', async () => {
  const action = updateAction.dataset.action;
  if (action === 'goto') openSettings(false, '#updatesTitle');
  else if (action === 'import') openSettings(true);
  else if (action === 'retry') refreshUpdate(true);
});
qs('#updateDismiss').addEventListener('click', async () => {
  const kind = updateBanner.dataset.kind;
  if (kind === 'restored') { dataNotice.restored = null; await chrome.storage.local.remove('wa_restored'); }
  else if (kind === 'fresh') { dataNotice.fresh = false; await chrome.storage.local.remove('wa_freshInstall'); }
  else { updateState.notice = false; await chrome.runtime.sendMessage({ type: 'wa_dismissNotice' }); }
  renderUpdate();
});
const autoSwitch = qs('#autoUpdate');
autoSwitch.addEventListener('change', async () => {
  updateState = { ...updateState, auto: autoSwitch.checked };
  renderUpdate();
  try { updateState = await chrome.runtime.sendMessage({ type: 'wa_setAuto', auto: autoSwitch.checked }) || updateState; } catch {}
  renderUpdate();
});
// While the one-time setup is pending, check every few seconds so the switch turns active by itself
let helperTimer = 0;
function watchHelper(on){
  if (on && !helperTimer) helperTimer = setInterval(async () => {
    if (!dlgSettings.open) { watchHelper(false); return; }
    try { await chrome.runtime.sendMessage({ type: 'wa_pingHelper' }); } catch {}
  }, 3000);
  if (!on && helperTimer) { clearInterval(helperTimer); helperTimer = 0; }
}
// chrome://extensions shows "Loaded from: <folder>"; clicking it opens the folder that has instalar-actualizador.cmd
qs('#btnOpenFolder').addEventListener('click', () => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }));
qs('#btnCheckUpdate').addEventListener('click', () => refreshUpdate(true));
qs('#btnReleases').addEventListener('click', () => chrome.tabs.create({ url: RELEASES_URL }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.wa_update) { updateState = changes.wa_update.newValue || {}; renderUpdate(); renderLocation(); }
  if (area === 'local' && changes.wa_location) { locState = changes.wa_location.newValue || {}; renderLocation(); }
});

// Picking another country in the phone field offers to keep it as the default, so nobody has to find
// that setting; after 3 "no" (or once accepted) it stops asking.
const COUNTRY_PROMPT_LIMIT = 3;
let defaultCountryNow = '';
async function offerDefaultCountry(code){
  const { wa_countryPrompt = {} } = await chrome.storage.sync.get(['wa_countryPrompt']);
  if (wa_countryPrompt.done || (wa_countryPrompt.declined || 0) >= COUNTRY_PROMPT_LIMIT || code === defaultCountryNow) return;
  const dlg = qs('#dlgDefaultCountry');
  const country = `${flagEmoji(code)} ${countryNames(code).native}`;
  qs('#defaultCountryQuestion').textContent = t('defaultCountryAsk', { country });
  const yes = await new Promise(resolve => {
    const finish = answer => { dlg.close(); resolve(answer); };
    qs('#btnKeepCountry').onclick = () => finish(true);
    qs('#btnSkipCountry').onclick = () => finish(false);
    dlg.oncancel = e => { e.preventDefault(); finish(false); };
    dlg.showModal();
    qs('#btnKeepCountry').focus();
  });
  if (yes) {
    defaultCountryNow = code;
    await setSync({ wa_defaultCountry: code, wa_countryPrompt: { ...wa_countryPrompt, done: true } });
    showToast(t('defaultCountrySaved', { country }));
  } else {
    await setSync({ wa_countryPrompt: { ...wa_countryPrompt, declined: (wa_countryPrompt.declined || 0) + 1 } });
  }
  phoneField.input.focus();
}

// Settings › Location: where the program's files are kept (its own folder, e.g. C:\WhatsApp Sender Pro)
let locState = {};
const locDrive = qs('#locationDrive');
const samePath = (a, b) => String(a || '').replace(/[\\/]+$/, '').toLowerCase() === String(b || '').replace(/[\\/]+$/, '').toLowerCase();
const gigabytes = bytes => bytes >= 1e12
  ? new Intl.NumberFormat(getLang(), { style: 'unit', unit: 'terabyte', maximumFractionDigits: 1 }).format(bytes / 1e12)
  : new Intl.NumberFormat(getLang(), { style: 'unit', unit: 'gigabyte', maximumFractionDigits: bytes < 10e9 ? 1 : 0 }).format(bytes / 1e9);
function locationTarget(){
  const base = String(locDrive.value || '').replace(/[\\/]+$/, '');
  if (!base) return '';
  const name = locState.folderName || 'WhatsApp Sender Pro';
  return base.split(/[\\/]/).pop() === name ? base : `${base}\\${name}`;
}
function renderLocation(){
  const s = locState, helper = !!updateState.helper;
  qs('#locationCurrent').textContent = !helper ? t('locationNeedsHelper') : s.current ? t('locationCurrent', { path: s.current }) : t('locationChecking');
  qs('#locationControls').classList.toggle('hidden', !helper || !s.drives);
  if (helper && s.drives) {
    const options = s.drives.map(d => ({ value: `${d.name}\\`, label: t('locationFree', { drive: d.label ? `${d.name} (${d.label})` : d.name, free: gigabytes(d.free) }) }));
    if (s.base && !options.some(o => samePath(o.value, s.base))) options.push({ value: s.base, label: `📁 ${s.base}` });
    const wanted = s.base || `${s.systemDrive || 'C:'}\\`;
    locDrive.innerHTML = '';
    options.forEach(o => locDrive.add(new Option(o.label, o.value)));
    locDrive.value = options.find(o => samePath(o.value, wanted))?.value || options[0]?.value || '';
    const target = locationTarget();
    const same = samePath(target, s.current);
    qs('#locationTarget').textContent = same ? t('locationSame') : t('locationTarget', { path: target });
    qs('#btnMoveHere').disabled = same || s.status === 'moving';
  }
  const result = qs('#locationResult');
  let text = '', openBtn = false;
  if (s.status === 'moving') text = t('locationMoving');
  else if (s.status === 'error') text = t('locationError', { error: s.error });
  else if (s.status === 'moved' && s.moved) {
    if (samePath(s.current, s.moved.path)) text = t('locationDone', { path: s.moved.path, previous: s.moved.previous });
    else { text = t('locationMoved', { path: s.moved.path }); openBtn = true; }
  }
  result.textContent = text;
  result.classList.toggle('hidden', !text);
  qs('#btnOpenExtensions').classList.toggle('hidden', !openBtn);
}
async function refreshLocationUI(){
  locState = (await getLocal(['wa_location'])).wa_location || {};
  renderLocation();
  if (updateState.helper) { try { locState = await chrome.runtime.sendMessage({ type: 'wa_location' }) || locState; } catch {} renderLocation(); }
}
locDrive.addEventListener('change', async () => {
  locState = { ...locState, base: locDrive.value, status: locState.status === 'moving' ? 'moving' : '' };
  await chrome.storage.local.set({ wa_location: locState });
});
// The popup may close while the Windows folder dialog is open; the choice is saved and shown next time
qs('#btnPickFolder').addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'wa_pickFolder' }).catch(() => {}); });
qs('#btnMoveHere').addEventListener('click', async () => {
  qs('#btnMoveHere').disabled = true;
  try { locState = await chrome.runtime.sendMessage({ type: 'wa_relocate', base: locDrive.value }) || locState; } catch {}
  renderLocation();
});
// Last step is Chrome's: load the new folder (path copied, ready to paste in the folder dialog)
qs('#btnOpenExtensions').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(locState.moved?.path || ''); } catch {}
  chrome.tabs.create({ url: 'chrome://extensions' });
});

// Window mode: opens with the size and position it had last time
async function openWindow(hash = ''){
  const { wa_window } = await getLocal(['wa_window']);
  const box = wa_window || {};
  const opts = { url: chrome.runtime.getURL(`app.html${hash}`), type: 'popup', width: box.width || 820, height: box.height || 720 };
  if (Number.isFinite(box.left) && Number.isFinite(box.top)) Object.assign(opts, { left: box.left, top: box.top });
  try { await chrome.windows.create(opts); }
  catch { await chrome.windows.create({ url: opts.url, type: 'popup', width: 820, height: 720 }); }
  if (!inWindow) window.close();
}
qs('#btnOpenWindow').addEventListener('click', () => openWindow());

// Shortcuts: Enter in the phone field submits natively, Enter in the message adds a line
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    qs('#copyLink').click();
  }
});

// Init
(async function init(){
  const { wa_platform='app' } = await getSync(['wa_platform']);
  const { wa_templates=[], wa_history=[], wa_contacts=[], wa_restored=null, wa_freshInstall=false } = await getLocal(['wa_templates','wa_history','wa_contacts','wa_restored','wa_freshInstall']);
  Object.assign(dataNotice, { restored: wa_restored, fresh: wa_freshInstall });
  const appearance = await loadAppearance();
  const phoneDefaults = await loadPhoneDefaults();
  platform = wa_platform; templates = wa_templates; historyItems = wa_history; contacts = wa_contacts;
  settings = appearance.settings; background = appearance.bg;
  ui = { ...ui, ...appearance.ui };
  ui.width = clamp(ui.width, POPUP.minW, POPUP.maxW);
  ui.height = clamp(ui.height, POPUP.minH, POPUP.maxH);
  if (!['contacts','templates','recents'].includes(ui.tab)) ui.tab = 'contacts';
  setLang(settings.lang);
  translatePage();
  defaultCountryNow = phoneDefaults.country;
  phoneField = createPhoneField(qs('#phoneField'), { ...phoneDefaults, onChange: updatePhoneFeedback, onCountryPick: offerDefaultCountry });
  contactField = createPhoneField(qs('#contactPhoneField'), { ...phoneDefaults, onChange: () => { contactError.textContent = ''; } });
  phoneField.refreshLabels(); contactField.refreshLabels();
  phoneField.input.addEventListener('focus', checkClipboard);
  bgImage.classList.toggle('hidden', !inWindow);
  bgHint.textContent = t(inWindow ? 'backgroundHint' : 'backgroundWindowHint');
  qs('#btnOpenWindow').classList.toggle('hidden', inWindow);
  for (const grip of grips) grip.classList.toggle('hidden', inWindow);
  setPlatformUI(); renderLibrary(); updateCharCount(); updatePhoneFeedback();
  applyAppearance(settings, background); applyUI();
  phoneField.input.focus();
  if (location.hash === '#import') openSettings(true);
  const { wa_update } = await getLocal(['wa_update']);
  updateState = wa_update || {};
  renderUpdate();
  refreshUpdate();
})();
