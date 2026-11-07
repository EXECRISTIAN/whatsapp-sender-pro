import { RATE_LIMIT, applyAppearance, buildUrl, loadAppearance, loadPhoneDefaults, openChat, recentOpens, registerChat, setupEmojiPanel, showToast } from './shared.js';
import { setLang, t, translatePage } from './i18n.js';
import { createPhoneField } from './phone-field.js';

const qs = sel => document.querySelector(sel);
chrome.runtime.connect({ name: 'wa_ui' }); // a pending update waits until this page is closed
const sendable = r => r.status === 'ok' || r.status === 'doubtful';

let platform = 'app';
let contacts = [];
let phoneField;

const phoneFeedback = qs('#phoneFeedback');
const contactInfo = qs('#contactInfo');
const msgEl = qs('#message');
const charCount = qs('#charCount');

function updateCharCount(){ charCount.textContent = String(msgEl.value.length); }
msgEl.addEventListener('input', updateCharCount);
setupEmojiPanel({ msgEl, button: qs('#emojiBtn'), panel: qs('#emojiPanel'), grid: qs('#emojiGrid'), onChange: updateCharCount });

function updatePhoneFeedback(r = phoneField.result()){
  const messages = { ok: `✓ ${r.display}`, doubtful: `${t('phoneDoubtful')} ${r.display}`, bad: t('phoneBad'), empty: '' };
  phoneFeedback.textContent = messages[r.status];
  phoneFeedback.className = { ok: 'ok small', doubtful: 'warn small', bad: 'error small', empty: 'small' }[r.status];
  const contact = sendable(r) ? contacts.find(c => c.phone === r.phone) : null;
  const info = contact ? [contact.name, contact.notes].filter(Boolean).join('\n') : '';
  contactInfo.textContent = info;
  contactInfo.classList.toggle('hidden', !info);
  return r;
}

document.querySelectorAll('.info-btn').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); btn.parentElement.classList.toggle('open'); });
});
document.addEventListener('click', e => {
  document.querySelectorAll('.info.open').forEach(info => { if (!info.contains(e.target)) info.classList.remove('open'); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); qs('#copyLink').click(); }
  else if (e.key === 'Enter' && e.target === phoneField?.input) { e.preventDefault(); qs('#sendBtn').click(); }
});

qs('#sendBtn').addEventListener('click', async ()=>{
  const r = updatePhoneFeedback();
  if (!sendable(r)) { showToast(t('reviewNumber')); return; }
  if (await recentOpens() >= RATE_LIMIT && !confirm(t('rateWarning'))) return;
  await registerChat(r.phone, msgEl.value);
  await openChat(platform, buildUrl(platform, r.phone, msgEl.value));
});
qs('#copyLink').addEventListener('click', async ()=>{
  const r = updatePhoneFeedback();
  if (!sendable(r)) { showToast(t('reviewNumber')); return; }
  try {
    await navigator.clipboard.writeText(buildUrl(platform, r.phone, msgEl.value));
    showToast(t('linkCopied'));
  } catch { showToast(t('copyFailed')); }
});

(async function init(){
  const { wa_platform='app' } = await chrome.storage.sync.get(['wa_platform']);
  const { wa_contacts=[] } = await chrome.storage.local.get(['wa_contacts']);
  const { settings, ui, bg } = await loadAppearance();
  platform = wa_platform; contacts = wa_contacts;
  setLang(settings.lang);
  translatePage();
  document.title = t('composeTitle');
  applyAppearance(settings, bg);
  document.documentElement.style.setProperty('--scale', String((ui.scale||100)/100));
  phoneField = createPhoneField(qs('#phoneField'), {
    ...(await loadPhoneDefaults()),
    onChange: updatePhoneFeedback
  });
  phoneField.refreshLabels();
  const phone = new URL(location.href).searchParams.get('phone') || '';
  phoneField.setValue(phone ? `+${phone}` : '');
  updateCharCount();
  (phone ? msgEl : phoneField.input).focus();
})();
