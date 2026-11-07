// A select you can type into: shows the chosen item, and on focus lists all items filtered by what is typed.
// Enter picks the highlighted one, arrows move, Esc restores the previous choice.
import { matches } from './names.js';

export function createPicker(root, { items, value, onPick = () => {}, placeholder = '', empty = '', label = '' }){
  root.classList.add('picker');
  root.innerHTML = `
    <div class="pk-field">
      <span class="pk-prefix" aria-hidden="true"></span>
      <input class="pk-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" />
      <span class="pk-caret" aria-hidden="true">▾</span>
    </div>
    <div class="pk-list hidden" role="listbox"></div>`;
  const input = root.querySelector('.pk-input');
  const prefix = root.querySelector('.pk-prefix');
  const list = root.querySelector('.pk-list');
  if (root.dataset.inputId) input.id = root.dataset.inputId;
  if (label) input.setAttribute('aria-label', label);
  let current = value;
  let shown = [];
  let active = 0;
  let open = false;

  const find = v => items().find(i => i.value === v);
  function showCurrent(){
    const item = find(current);
    input.value = item ? item.label : '';
    prefix.textContent = item?.prefix || '';
    prefix.classList.toggle('hidden', !item?.prefix);
    input.title = item?.sub || '';
  }
  function render(query){
    const all = items();
    shown = query ? all.filter(i => matches(i.search, query)) : all;
    active = Math.max(0, query ? 0 : shown.findIndex(i => i.value === current));
    list.innerHTML = '';
    if (!shown.length) {
      const none = document.createElement('div');
      none.className = 'small pk-empty'; none.textContent = typeof empty === 'function' ? empty() : empty;
      list.appendChild(none);
      return;
    }
    shown.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'pk-item'; row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(item.value === current));
      if (index === active) row.classList.add('active');
      if (item.prefix) { const p = document.createElement('span'); p.className = 'pk-item-prefix'; p.textContent = item.prefix; row.appendChild(p); }
      const text = document.createElement('span'); text.className = 'pk-text';
      const main = document.createElement('span'); main.className = 'pk-main'; main.textContent = item.label;
      text.appendChild(main);
      if (item.sub && item.sub !== item.label) { const sub = document.createElement('span'); sub.className = 'pk-sub'; sub.textContent = item.sub; text.appendChild(sub); }
      row.appendChild(text);
      if (item.right) { const r = document.createElement('span'); r.className = 'small'; r.textContent = item.right; row.appendChild(r); }
      row.addEventListener('mousedown', e => { e.preventDefault(); pick(item.value); });
      list.appendChild(row);
    });
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }
  function setOpen(state){
    open = state;
    list.classList.toggle('hidden', !state);
    input.setAttribute('aria-expanded', String(state));
  }
  function pick(v){
    current = v;
    setOpen(false);
    showCurrent();
    onPick(v);
  }
  function move(step){
    if (!shown.length) return;
    list.children[active]?.classList.remove('active');
    active = (active + step + shown.length) % shown.length;
    list.children[active]?.classList.add('active');
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', () => { input.select(); prefix.classList.add('hidden'); input.placeholder = typeof placeholder === 'function' ? placeholder() : placeholder; render(''); setOpen(true); });
  input.addEventListener('input', () => { render(input.value); setOpen(true); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { render(''); setOpen(true); } else move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { if (open && shown[active]) { e.preventDefault(); pick(shown[active].value); input.blur(); } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); showCurrent(); input.blur(); } }
  });
  input.addEventListener('blur', () => { setOpen(false); showCurrent(); });
  root.querySelector('.pk-caret').addEventListener('mousedown', e => { e.preventDefault(); input.focus(); });
  showCurrent();

  return {
    get value(){ return current; },
    set value(v){ current = v; showCurrent(); },
    refresh: showCurrent,
    input
  };
}
