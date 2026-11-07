// Automatic copy of contacts and templates outside Chrome, through the Windows helper (updater/host.ps1).
// Chrome deletes an extension's data when it is removed; with this copy a fresh install gets it back.
// Updates that replace the files keep the data anyway: the "key" in manifest.json keeps the same ID in any folder.
import { buildBackup, mergeContacts, mergeTemplates, parseBackup } from './shared.js';
import { HOST } from './updater.js';

const KEYS = ['wa_contacts', 'wa_templates'];
let timer = 0;

async function saveCopy(){
  const { wa_contacts = [], wa_templates = [] } = await chrome.storage.local.get(KEYS);
  const backup = buildBackup({ contacts: wa_contacts, templates: wa_templates }, { contacts: true, templates: true }, chrome.runtime.getManifest().version);
  try { await chrome.runtime.sendNativeMessage(HOST, { action: 'backup', json: JSON.stringify(backup) }); } catch {} // no helper: nothing to do
}

// Only on a fresh install with no data, so deleting everything on purpose is never undone
export async function restoreOnInstall(){
  const { wa_contacts = [], wa_templates = [] } = await chrome.storage.local.get(KEYS);
  if (wa_contacts.length || wa_templates.length) return null;
  let data = null;
  try {
    const res = await chrome.runtime.sendNativeMessage(HOST, { action: 'restore' });
    if (res && res.ok && res.json) data = parseBackup(JSON.parse(res.json));
  } catch {}
  if (!data || !(data.contacts.length || data.templates.length)) {
    await chrome.storage.local.set({ wa_freshInstall: true }); // the popup offers to import a backup file
    return null;
  }
  const contacts = mergeContacts([], data.contacts).contacts;
  const templates = mergeTemplates([], data.templates).templates;
  const restored = { contacts: contacts.length, templates: templates.length, at: Date.now() };
  await chrome.storage.local.set({ wa_contacts: contacts, wa_templates: templates, wa_restored: restored });
  return restored;
}

export function setupDataBackup(){
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !KEYS.some(key => key in changes)) return;
    clearTimeout(timer);
    timer = setTimeout(saveCopy, 2000);
  });
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') restoreOnInstall();
    else saveCopy(); // first copy right after an update
  });
}
