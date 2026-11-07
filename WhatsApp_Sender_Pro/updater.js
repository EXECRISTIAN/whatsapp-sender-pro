// Automatic updates from the project's GitHub releases.
// Chrome does not let an unpacked extension rewrite its own files, so the copy is done by a small
// Windows helper (updater/host.ps1) installed once with instalar-actualizador.cmd. This module decides
// when: it checks once a day and every time the extension opens, and installs only while no page of
// the extension is open (popup, window or composer).

export const REPO = 'EXECRISTIAN/whatsapp-sender-pro';
export const RELEASES_URL = `https://github.com/${REPO}/releases`;
const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;
export const HOST = 'com.execristian.whatsapp_sender_pro';
const OPEN_CHECK_GAP_MS = 60 * 1000; // opening the popup many times in a row checks at most once a minute
export const DAILY_ALARM = 'wa_update_daily';
export const RETRY_ALARM = 'wa_update_retry';

export function compareVersions(a, b){
  const pa = String(a||'').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b||'').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

// Picks the version and ZIP from a GitHub "latest release" response
export function readRelease(release){
  if (!release || release.draft || release.prerelease) return null;
  const version = String(release.tag_name || '').replace(/^v/i, '');
  if (!/^\d+(\.\d+){0,3}$/.test(version)) return null;
  const asset = (release.assets || []).find(a => /\.zip$/i.test(a.name) && String(a.browser_download_url || '').startsWith(DOWNLOAD_PREFIX));
  return { version, url: asset ? asset.browser_download_url : '', notes: String(release.body || '').slice(0, 600), page: release.html_url || RELEASES_URL };
}

const getState = async () => (await chrome.storage.local.get('wa_update')).wa_update || {};
async function setState(patch){
  const state = { ...(await getState()), ...patch };
  await chrome.storage.local.set({ wa_update: state });
  return state;
}

export async function pingHelper(){
  try {
    const res = await chrome.runtime.sendNativeMessage(HOST, { action: 'ping' });
    return !!(res && res.ok);
  } catch { return false; }
}

export async function extensionInUse(){
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['POPUP', 'TAB', 'SIDE_PANEL'] });
  return contexts.length > 0;
}

export async function checkForUpdate({ force = false } = {}){
  const current = chrome.runtime.getManifest().version;
  const state = await getState();
  if (!force && state.checkedAt && Date.now() - state.checkedAt < OPEN_CHECK_GAP_MS && state.current === current) return state;
  const next = { current, checkedAt: Date.now(), error: '', helper: await pingHelper() };
  try {
    const res = await fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (res.status === 404) Object.assign(next, { status: 'none', latest: current });
    else if (!res.ok) throw new Error(`GitHub ${res.status}`);
    else {
      const release = readRelease(await res.json());
      if (release && compareVersions(release.version, current) > 0) {
        Object.assign(next, { status: release.url ? 'available' : 'noAsset', latest: release.version, url: release.url, notes: release.notes, page: release.page });
      } else Object.assign(next, { status: 'none', latest: release ? release.version : current });
    }
  } catch (e) {
    Object.assign(next, { status: state.status === 'available' ? 'available' : 'none', error: 'network' });
  }
  if (state.status === 'failed' && next.status === 'available' && state.latest === next.latest && !force) {
    next.status = 'failed'; next.error = state.error; // don't retry a failed install until a new check is asked for
  }
  const saved = await setState(next);
  if (saved.status === 'available' && autoOn(saved)) await applyUpdate();
  return saved;
}

// Automatic updates are on unless the user turned them off in Settings
export const autoOn = state => state.auto !== false;

// Installs the pending update now if nothing of the extension is open; otherwise retries every minute.
// With automatic updates off it only installs after the user pressed Install (installRequested).
export async function applyUpdate(){
  const state = await getState();
  if (state.status !== 'available' || !state.url || !(autoOn(state) || state.installRequested)) { await chrome.alarms.clear(RETRY_ALARM); return state; }
  if (!state.helper && !(await pingHelper())) { await chrome.alarms.clear(RETRY_ALARM); return setState({ helper: false }); }
  if (await extensionInUse()) {
    await chrome.alarms.create(RETRY_ALARM, { delayInMinutes: 1, periodInMinutes: 1 });
    return setState({ waiting: true });
  }
  await chrome.alarms.clear(RETRY_ALARM);
  await setState({ status: 'installing', waiting: false });
  let res;
  try {
    res = await chrome.runtime.sendNativeMessage(HOST, { action: 'update', url: state.url, version: state.latest, current: chrome.runtime.getManifest().version });
  } catch (e) { res = { ok: false, error: e.message }; }
  if (res && res.ok) {
    await setState({ status: 'updated', installRequested: false, updatedFrom: chrome.runtime.getManifest().version, updatedTo: res.version, updatedAt: Date.now(), notice: true });
    chrome.runtime.reload();
    return getState();
  }
  return setState({ status: 'failed', installRequested: false, error: (res && res.error) || 'unknown' });
}

export function setupUpdater(){
  const ensureDaily = async () => {
    if (!(await chrome.alarms.get(DAILY_ALARM))) chrome.alarms.create(DAILY_ALARM, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
  };
  chrome.runtime.onInstalled.addListener(ensureDaily);
  chrome.runtime.onStartup.addListener(async () => { await ensureDaily(); checkForUpdate({ force: true }); });
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === DAILY_ALARM) checkForUpdate({ force: true });
    if (alarm.name === RETRY_ALARM) applyUpdate();
  });
  // When the last page of the extension closes, install a pending update right away
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'wa_ui') return;
    port.onDisconnect.addListener(() => setTimeout(applyUpdate, 1500));
  });
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'wa_checkUpdate') { checkForUpdate({ force: !!msg.force }).then(reply, () => reply(null)); return true; }
    if (msg && msg.type === 'wa_updateState') { getState().then(reply); return true; }
    if (msg && msg.type === 'wa_setAuto') {
      setState({ auto: !!msg.auto, installRequested: false }).then(async s => { if (s.auto && s.status === 'available') await applyUpdate(); reply(await getState()); });
      return true;
    }
    // Install button: install as soon as the extension closes, even with automatic updates off
    if (msg && msg.type === 'wa_requestInstall') { setState({ installRequested: true }).then(() => reply(true)); return true; }
    // Settings polls this while waiting for the one-time helper setup, so it turns green by itself
    if (msg && msg.type === 'wa_pingHelper') { pingHelper().then(helper => setState({ helper })).then(reply); return true; }
    if (msg && msg.type === 'wa_dismissNotice') { setState({ notice: false }).then(() => reply(true)); return true; }
    return false;
  });
}
