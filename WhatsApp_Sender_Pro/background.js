// Background: context menus + routing
import { buildUrl, findPhone, loadPhoneDefaults, migrateStorage, normalizeSettings, openChat, parsePhone, registerChat } from './shared.js';
import { setLang, t } from './i18n.js';
import { setupUpdater } from './updater.js';
import { setupDataBackup } from './databackup.js';

setupUpdater();
setupDataBackup();

async function setupMenus(){
  const { wa_settings } = await chrome.storage.sync.get(['wa_settings']);
  setLang(normalizeSettings(wa_settings).lang);
  await chrome.contextMenus.removeAll();
  // Direct message first: it is the quickest path
  chrome.contextMenus.create({ id: 'wa_direct', title: t('menuDirect'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'wa_compose', title: t('menuCompose'), contexts: ['selection'] });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'update') await migrateStorage();
  await setupMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.wa_settings) setupMenus();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const { wa_platform='app' } = await chrome.storage.sync.get(['wa_platform']);
  const { country, area } = await loadPhoneDefaults();
  const found = findPhone(info.selectionText, country, area);
  // "Send direct message" goes straight to WhatsApp whenever the selection has a usable number;
  // only without any number it opens the compose page, so the number can be typed
  if (info.menuItemId === 'wa_direct' && found) {
    await registerChat(found.phone, '');
    await openChat(wa_platform, buildUrl(wa_platform, found.phone, ''));
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL(`compose.html?phone=${found ? found.phone : ''}`) });
  }
});
