// Interface strings: one file per language in locales/. Missing keys fall back to English.
import es from './locales/es.js';
import en from './locales/en.js';
import pt from './locales/pt.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import it from './locales/it.js';
import nl from './locales/nl.js';
import pl from './locales/pl.js';
import ru from './locales/ru.js';
import uk from './locales/uk.js';
import tr from './locales/tr.js';
import ar from './locales/ar.js';
import fa from './locales/fa.js';
import hi from './locales/hi.js';
import bn from './locales/bn.js';
import ur from './locales/ur.js';
import id from './locales/id.js';
import vi from './locales/vi.js';
import th from './locales/th.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';

const STRINGS = { es, en, pt, fr, de, it, nl, pl, ru, uk, tr, ar, fa, hi, bn, ur, id, vi, th, zh, ja, ko };

// Shown in Settings with each language's own name
export const LANGUAGES = [
  ['es', 'Español'], ['en', 'English'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['ru', 'Русский'], ['uk', 'Українська'],
  ['tr', 'Türkçe'], ['ar', 'العربية'], ['fa', 'فارسی'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ur', 'اردو'],
  ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['zh', '中文（简体）'], ['ja', '日本語'], ['ko', '한국어']
].map(([code, name]) => ({ code, name }));

const RTL = new Set(['ar', 'fa', 'ur']);

let current = 'es';

export const getLang = () => current;
export const isRtl = () => RTL.has(current);

export function setLang(lang){
  const wanted = String(lang === 'auto' || !lang ? chrome.i18n.getUILanguage() : lang).toLowerCase();
  const base = wanted.split(/[-_]/)[0];
  current = STRINGS[wanted] ? wanted : STRINGS[base] ? base : 'en';
  return current;
}

export function t(key, vars = {}){
  const text = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

export function translatePage(){
  document.documentElement.lang = current;
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}
