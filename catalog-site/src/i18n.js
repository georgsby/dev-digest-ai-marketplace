// Minimal message lookup. All user-facing text lives in src/locales/en.js; components
// and the view-model only reference keys. To add a language, add a locale file and
// select it here.
import en from './locales/en.js';

const messages = en;

// tr('bundle.summary', { hooks: '2 hooks' }) replaces {name} placeholders.
// Values that are not strings (arrays, objects) are returned as they are.
export function tr(key, vars) {
  const value = messages[key];
  if (value === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing message: ${key}`);
    return key;
  }
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// Plural forms are stored as `<key>.one` and `<key>.other`; {n} is always available.
export function trp(key, n, vars) {
  return tr(`${key}.${n === 1 ? 'one' : 'other'}`, { n, ...vars });
}

// Language-specific matching vocabulary for the search (stop words, synonyms, intents).
export const searchVocabulary = messages.search;
