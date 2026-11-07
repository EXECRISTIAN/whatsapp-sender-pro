// Background: context menus + routing
import { buildUrl, extractPhone, loadPhoneDefaults, migrateStorage, normalizeSettings, openChat, parsePhone, registerChat } from './shared.js';
import { setLang, t } from './i18n.js';
import { setupUpdater } from './updater.js';
import { setupDataBackup } from './databackup.js';

setupUpdater();
setupDataBackup();

async function setupMenus(){
  const { wa_settings } = await chrome.storage.sync.get(['wa_settings']);
  setLang(normalizeSettings(wa_settings).lang);
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'wa_compose', title: t('menuCompose'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'wa_direct', title: t('menuDirect'), contexts: ['selection'] });
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
  const { phone, status } = parsePhone(extractPhone(info.selectionText), country, area);
  if (info.menuItemId === 'wa_direct' && (status === 'ok' || status === 'doubtful')) {
    await registerChat(phone, '');
    await openChat(wa_platform, buildUrl(wa_platform, phone, ''));
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL(`compose.html?phone=${phone}`) });
  }
});
