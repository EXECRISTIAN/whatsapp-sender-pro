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
import he from './locales/he.js';
import el from './locales/el.js';
import cs from './locales/cs.js';
import ro from './locales/ro.js';
import hu from './locales/hu.js';
import sv from './locales/sv.js';
import ms from './locales/ms.js';
import sw from './locales/sw.js';
import ca from './locales/ca.js';
import da from './locales/da.js';
import fi from './locales/fi.js';
import et from './locales/et.js';
import lt from './locales/lt.js';
import lv from './locales/lv.js';
import sk from './locales/sk.js';
import sl from './locales/sl.js';
import hr from './locales/hr.js';
import sr from './locales/sr.js';
import bg from './locales/bg.js';
import nb from './locales/nb.js';
import fil from './locales/fil.js';
import am from './locales/am.js';
import zhTW from './locales/zh-TW.js';
import gu from './locales/gu.js';
import kn from './locales/kn.js';
import ml from './locales/ml.js';
import mr from './locales/mr.js';
import ta from './locales/ta.js';
import te from './locales/te.js';

const STRINGS = { es, en, pt, fr, de, it, nl, pl, ru, uk, tr, ar, fa, hi, bn, ur, id, vi, th, zh, ja, ko, he, el, cs, ro, hu, sv, ms, sw,
  ca, da, fi, et, lt, lv, sk, sl, hr, sr, bg, nb, fil, am, 'zh-TW': zhTW, gu, kn, ml, mr, ta, te };

// Shown in Settings with each language's own name
export const LANGUAGES = [
  ['es', 'Español'], ['en', 'English'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['ru', 'Русский'], ['uk', 'Українська'],
  ['tr', 'Türkçe'], ['ar', 'العربية'], ['fa', 'فارسی'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ur', 'اردو'],
  ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['zh', '中文（简体）'], ['ja', '日本語'], ['ko', '한국어'],
  ['he', 'עברית'], ['el', 'Ελληνικά'], ['cs', 'Čeština'], ['ro', 'Română'], ['hu', 'Magyar'], ['sv', 'Svenska'],
  ['ms', 'Bahasa Melayu'], ['sw', 'Kiswahili'], ['ca', 'Català'], ['da', 'Dansk'], ['fi', 'Suomi'], ['et', 'Eesti'],
  ['lt', 'Lietuvių'], ['lv', 'Latviešu'], ['sk', 'Slovenčina'], ['sl', 'Slovenščina'], ['hr', 'Hrvatski'], ['sr', 'Српски'],
  ['bg', 'Български'], ['nb', 'Norsk bokmål'], ['fil', 'Filipino'], ['am', 'አማርኛ'], ['zh-TW', '中文（繁體）'],
  ['gu', 'ગુજરાતી'], ['kn', 'ಕನ್ನಡ'], ['ml', 'മലയാളം'], ['mr', 'मराठी'], ['ta', 'தமிழ்'], ['te', 'తెలుగు']
].map(([code, name]) => ({ code, name }));

const RTL = new Set(['ar', 'fa', 'ur', 'he']);
// Older names some systems still report
const ALIASES = { iw: 'he', in: 'id', tl: 'fil', no: 'nb', nn: 'nb', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW', 'zh-hant': 'zh-TW', 'zh-cn': 'zh', 'zh-sg': 'zh', 'zh-hans': 'zh' };

let current = 'es';

export const getLang = () => current;
export const isRtl = () => RTL.has(current);

export function setLang(lang){
  const wanted = String(lang === 'auto' || !lang ? chrome.i18n.getUILanguage() : lang).replace('_', '-').toLowerCase();
  const first = wanted.split('-')[0];
  // Codes are matched without case (zh-TW, zh-tw); old or regional codes go to the closest language
  const find = code => Object.keys(STRINGS).find(k => k.toLowerCase() === String(code || '').toLowerCase());
  current = find(wanted) || find(ALIASES[wanted]) || find(first) || find(ALIASES[first]) || 'en';
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
