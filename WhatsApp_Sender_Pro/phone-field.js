// One phone input with a country picker (flag + calling code), like intl_phone_field
import { COUNTRIES, callingCode, detectCountry, extractPhone, flagEmoji, parsePhone } from './shared.js';
import { getLang, t } from './i18n.js';

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function createPhoneField(root, { country, area = '', onChange = () => {}, onCountryPick = () => {} }){
  root.classList.add('phone-field');
  root.innerHTML = `
    <div class="pf-row">
      <button type="button" class="pf-country" aria-haspopup="listbox" aria-expanded="false">
        <span class="flag"></span><span class="pf-code"></span><span class="pf-caret" aria-hidden="true">▾</span>
      </button>
      <input class="pf-input" type="tel" autocomplete="off" />
      <button type="button" class="pf-clear hidden" tabindex="-1">✕</button>
    </div>
    <div class="pf-panel hidden">
      <input class="pf-search" type="search" autocomplete="off" />
      <div class="pf-list" role="listbox"></div>
    </div>`;
  const button = root.querySelector('.pf-country');
  const input = root.querySelector('.pf-input');
  const clearBtn = root.querySelector('.pf-clear');
  const panel = root.querySelector('.pf-panel');
  const search = root.querySelector('.pf-search');
  const list = root.querySelector('.pf-list');
  if (root.dataset.inputId) input.id = root.dataset.inputId;
  input.required = root.dataset.required !== undefined;

  let current = country;
  let home = country; // chosen by the user; pasted numbers are read from here, not from the last detected one
  let names = null;

  function countryName(code){
    if (!names) names = new Intl.DisplayNames([getLang()], { type: 'region' });
    return names.of(code) || code;
  }
  function showCountry(code){
    current = code;
    button.querySelector('.flag').textContent = flagEmoji(code);
    button.querySelector('.pf-code').textContent = `+${callingCode(code)}`;
    button.title = countryName(code);
  }
  function result(){
    clearBtn.classList.toggle('hidden', !input.value);
    return parsePhone(input.value, current, area);
  }
  function changed(){
    const r = result();
    // Follow the country code of a number typed with + or 00, digit by digit
    const detected = r.status === 'ok' ? r.country : detectCountry(input.value, current);
    if (detected && detected !== current && /^(\+|00)/.test(input.value.trim())) showCountry(detected);
    onChange(result());
  }
  function tidy(){
    const r = result();
    if (r.status === 'ok' || r.status === 'doubtful') {
      showCountry(r.country);
      input.value = r.national;
    } else {
      const detected = detectCountry(input.value, current);
      if (detected) showCountry(detected);
    }
    onChange(result());
  }

  function renderList(){
    const q = fold(search.value.trim());
    const digits = q.replace(/\D/g, '');
    const items = COUNTRIES
      .map(code => ({ code, name: countryName(code), dial: callingCode(code) }))
      .filter(c => !q || fold(c.name).includes(q) || c.code.toLowerCase() === q || (digits && c.dial.startsWith(digits)))
      .sort((a,b) => (b.code === current) - (a.code === current) || a.name.localeCompare(b.name, getLang()));
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'small pf-empty'; empty.textContent = t('noCountries');
      list.appendChild(empty);
      return;
    }
    items.forEach(c => {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'pf-item'; item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(c.code === current));
      item.dataset.code = c.code;
      const flag = document.createElement('span'); flag.className = 'flag'; flag.textContent = flagEmoji(c.code);
      const name = document.createElement('span'); name.className = 'pf-name'; name.textContent = c.name;
      const dial = document.createElement('span'); dial.className = 'small'; dial.textContent = `+${c.dial}`;
      item.append(flag, name, dial);
      item.addEventListener('click', () => pick(c.code));
      list.appendChild(item);
    });
  }
  function openPanel(){
    names = null;
    search.placeholder = t('searchCountry');
    search.value = '';
    renderList();
    panel.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
    search.focus();
  }
  function closePanel(focusInput){
    panel.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    if (focusInput) input.focus();
  }
  function pick(code){
    home = code;
    showCountry(code);
    onCountryPick(code);
    closePanel(true);
    onChange(result());
  }

  button.addEventListener('click', () => panel.classList.contains('hidden') ? openPanel() : closePanel(false));
  search.addEventListener('input', renderList);
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = list.querySelector('.pf-item');
      if (first) pick(first.dataset.code);
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      closePanel(true);
    }
  });
  document.addEventListener('click', e => { if (!root.contains(e.target)) closePanel(false); });
  input.addEventListener('input', changed);
  clearBtn.addEventListener('click', () => { input.value = ''; showCountry(home); onChange(result()); input.focus(); });
  input.addEventListener('blur', tidy);
  input.addEventListener('paste', e => {
    e.preventDefault();
    pasteText(e.clipboardData.getData('text'));
  });

  function pasteText(text){
    input.value = extractPhone(text) || (text||'').trim();
    showCountry(home);
    tidy();
  }

  showCountry(current);
  return {
    input,
    result,
    get country(){ return current; },
    setValue(value){ input.value = value || ''; tidy(); },
    paste: pasteText,
    // What a paste of this text would give, read from the chosen country
    preview(text){ return parsePhone(extractPhone(text) || (text||'').trim(), home, area); },
    clear(){ input.value = ''; showCountry(home); onChange(result()); },
    setArea(value){ area = value; onChange(result()); },
    setCountry(code){ home = code; showCountry(code); onChange(result()); },
    refreshLabels(){ names = null; input.placeholder = t('phonePlaceholder'); clearBtn.title = t('clear'); clearBtn.setAttribute('aria-label', t('clear')); showCountry(current); }
  };
}
