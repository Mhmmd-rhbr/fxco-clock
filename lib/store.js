import { SESSIONS } from './engine.js';

export const STORAGE_KEY = 'amxClockV3';
export const RESET_GENERATION_KEY = 'amxClockV3ResetGeneration';
const MIGRATION_KEY = 'amxClockV3Migrated';
const LEGACY_KEY = 'forexTimeSettings';
const BUILTIN_IDS = new Set(SESSIONS.map(session => session.id));
const PAIRS = new Set(['ALL', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCHF', 'EURAUD', 'GBPAUD', 'AUDCAD', 'CADJPY', 'CHFJPY', 'NZDJPY', 'AUDNZD', 'EURCAD', 'GBPCAD', 'EURSEK', 'EURNOK', 'USDSGD', 'USDHKD', 'USDCNH', 'USDINR']);
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const WEEKDAYS = [1, 2, 3, 4, 5];

function validZone(value) {
  if (typeof value !== 'string' || value.length > 80) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}
function detectedZone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return validZone(zone) ? zone : 'Asia/Tehran';
}
function text(value, fallback = '', limit = 120) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit) : fallback;
}
function bool(value, fallback) { return typeof value === 'boolean' ? value : fallback; }
function time(value, fallback) { return typeof value === 'string' && TIME.test(value) ? value : fallback; }
function days(value, fallback = WEEKDAYS) {
  return Array.isArray(value) ? [...new Set(value.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort() : [...fallback];
}
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function integer(value, fallback, min, max) { return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback; }
function instant(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  if (typeof value === 'string' && value.length > 80) return NaN;
  const result = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(result) && result >= Date.UTC(2000, 0, 1) && result < Date.UTC(2101, 0, 1) ? result : NaN;
}

export const DEFAULTS = {
  schemaVersion: 3,
  theme: 'dark', language: 'en', timezone: detectedZone(), hour12: false,
  selectedSessions: ['sydney', 'tokyo', 'london', 'new-york'], pair: 'ALL',
  overlapPair: ['london', 'new-york'], badge: true,
  alerts: { enabled: false, leadMinutes: 15, open: true, close: false, overlap: true, days: [...WEEKDAYS], quietStart: '22:00', quietEnd: '07:00' },
  availability: { days: [...WEEKDAYS], start: '16:00', end: '20:00' },
  plans: [],
  checklist: [
    { id: 'review-plan', text: 'Review my session plan', done: false },
    { id: 'check-schedule', text: 'Check broker hours and scheduled events', done: false },
    { id: 'prepare-workspace', text: 'Prepare my workspace', done: false }
  ],
  customSessions: [],
  broker: { enabled: false, name: 'My broker', zone: 'America/New_York', open: '17:05', close: '16:59', days: [0, 1, 2, 3, 4], rolloverStart: '16:59', rolloverEnd: '17:05' },
  notes: ''
};

export function sanitizeSettings(input) {
  const source = object(input), alerts = object(source.alerts), availability = object(source.availability), broker = object(source.broker);
  const customSeen = new Set();
  const customSessions = (Array.isArray(source.customSessions) ? source.customSessions : []).slice(0, 12).flatMap((entry) => {
    const item = object(entry), id = text(item.id, '', 60);
    if (!SLUG.test(id) || BUILTIN_IDS.has(id) || id === 'broker' || customSeen.has(id) || !validZone(item.zone)) return [];
    customSeen.add(id);
    const breaks = (Array.isArray(item.breaks) ? item.breaks : []).slice(0, 4).flatMap((pause) => {
      const value = object(pause);
      return TIME.test(value.open) && TIME.test(value.close) && value.open !== value.close ? [{ open: value.open, close: value.close }] : [];
    });
    return [{ id, name: text(item.name, 'Custom session', 60).trim() || 'Custom session', zone: item.zone, open: time(item.open, '09:00'), close: time(item.close, '17:00'), days: days(item.days), breaks,
      color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#A2D4E5',
      currencies: Array.isArray(item.currencies) ? [...new Set(item.currencies.filter(value => typeof value === 'string' && /^[A-Z]{3}$/.test(value)))].slice(0, 8) : [] }];
  });
  const allIds = new Set([...BUILTIN_IDS, ...customSeen, 'broker']);
  const selectedSessions = Array.isArray(source.selectedSessions) ? [...new Set(source.selectedSessions.filter(id => BUILTIN_IDS.has(id)))].slice(0, 8) : [...DEFAULTS.selectedSessions];
  const overlapPair = Array.isArray(source.overlapPair) ? [...new Set(source.overlapPair.filter(id => allIds.has(id)))].slice(0, 2) : [...DEFAULTS.overlapPair];
  const planSeen = new Set();
  const plans = (Array.isArray(source.plans) ? source.plans : []).slice(0, 50).flatMap((entry) => {
    const item = object(entry), id = text(item.id, '', 60), start = instant(item.start), end = instant(item.end);
    if (!SLUG.test(id) || planSeen.has(id) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 31 * 86400000) return [];
    planSeen.add(id);
    return [{ id, title: text(item.title, 'Session plan', 100).trim() || 'Session plan', start, end,
      sessionIds: Array.isArray(item.sessionIds) ? [...new Set(item.sessionIds.filter(value => allIds.has(value)))].slice(0, 12) : [], remind: bool(item.remind, false) }];
  });
  const checkSeen = new Set();
  const checklist = (Array.isArray(source.checklist) ? source.checklist : DEFAULTS.checklist).slice(0, 20).flatMap((entry) => {
    const item = object(entry), id = text(item.id, '', 60), label = text(item.text, '', 240).trim();
    if (!SLUG.test(id) || !label || checkSeen.has(id)) return [];
    checkSeen.add(id); return [{ id, text: label, done: bool(item.done, false) }];
  });
  return {
    schemaVersion: 3,
    theme: ['dark', 'light', 'auto'].includes(source.theme) ? source.theme : DEFAULTS.theme,
    language: ['en', 'fa'].includes(source.language) ? source.language : DEFAULTS.language,
    timezone: validZone(source.timezone) ? source.timezone : DEFAULTS.timezone,
    hour12: bool(source.hour12, DEFAULTS.hour12), selectedSessions,
    pair: PAIRS.has(source.pair) ? source.pair : 'ALL', overlapPair: overlapPair.length === 2 ? overlapPair : [...DEFAULTS.overlapPair],
    badge: bool(source.badge, DEFAULTS.badge),
    alerts: { enabled: bool(alerts.enabled, false), leadMinutes: integer(alerts.leadMinutes, 15, 0, 240), open: bool(alerts.open, true), close: bool(alerts.close, false), overlap: bool(alerts.overlap, true), days: days(alerts.days), quietStart: time(alerts.quietStart, '22:00'), quietEnd: time(alerts.quietEnd, '07:00') },
    availability: { days: days(availability.days), start: time(availability.start, '16:00'), end: time(availability.end, '20:00') },
    plans, checklist, customSessions,
    broker: { enabled: bool(broker.enabled, false), name: text(broker.name, 'My broker', 60).trim() || 'My broker', zone: validZone(broker.zone) ? broker.zone : 'America/New_York', open: time(broker.open, '17:05'), close: time(broker.close, '16:59'), days: days(broker.days, [0, 1, 2, 3, 4]), rolloverStart: time(broker.rolloverStart, '16:59'), rolloverEnd: time(broker.rolloverEnd, '17:05') },
    notes: text(source.notes, '', 4000)
  };
}

export function getSessions(settings) {
  const safe = sanitizeSettings(settings);
  const currencies = safe.pair === 'ALL' ? null : [safe.pair.slice(0, 3), safe.pair.slice(3, 6)];
  const sessions = SESSIONS.filter(session => safe.selectedSessions.includes(session.id) &&
    (!currencies || session.currencies.some(currency => currencies.includes(currency))));
  sessions.push(...safe.customSessions.map(session => ({ ...session, custom: true, fxWeek: false, sourceLabel: 'Personal schedule' })));
  if (safe.broker.enabled) sessions.push({ ...safe.broker, id: 'broker', custom: true, fxWeek: false,
    breaks: safe.broker.rolloverStart !== safe.broker.rolloverEnd ? [{ open: safe.broker.rolloverStart, close: safe.broker.rolloverEnd }] : [],
    color: '#E5C38D', currencies: [], sourceLabel: 'Personal broker schedule' });
  return sessions;
}

function chromeStore(area, method, value) {
  return new Promise((resolve, reject) => {
    try {
      globalThis.chrome.storage[area][method](value, (result) => {
        const error = globalThis.chrome.runtime?.lastError;
        error ? reject(new Error(error.message || 'Settings storage failed')) : resolve(result);
      });
    } catch (error) { reject(error); }
  });
}
function isPreview() {
  return typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}
async function readLocal(keys) {
  if (globalThis.chrome?.storage?.local) return chromeStore('local', 'get', keys);
  if (!isPreview() || typeof localStorage === 'undefined') throw new Error('Local extension storage is unavailable');
  const result = {};
  for (const key of keys) { try { result[key] = JSON.parse(localStorage.getItem(key)); } catch { result[key] = undefined; } }
  return result;
}
async function writeLocal(values) {
  if (globalThis.chrome?.storage?.local) return chromeStore('local', 'set', values);
  if (!isPreview() || typeof localStorage === 'undefined') throw new Error('Local extension storage is unavailable');
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
}
function migrateLegacy(value) {
  const legacy = object(value), notifications = object(legacy.notifications);
  const names = { Sydney: 'sydney', Tokyo: 'tokyo', Shanghai: 'shanghai', 'Hong Kong': 'hong-kong', Mumbai: 'mumbai', Frankfurt: 'frankfurt', London: 'london', 'New York': 'new-york' };
  let selectedSessions;
  if (Array.isArray(legacy.selectedMarkets)) {
    selectedSessions = legacy.selectedMarkets.slice(0, 16).map(name => typeof name === 'string' ? names[name] : null).filter(id => BUILTIN_IDS.has(id));
    // Retired stock-exchange centers cannot become phantom FX sessions. Keep
    // an intentionally empty selection, but give removed-only users a usable
    // reference set rather than migrating them into an empty dashboard.
    if (legacy.selectedMarkets.length && !selectedSessions.length) selectedSessions = [...DEFAULTS.selectedSessions];
  }
  return sanitizeSettings({ ...legacy, selectedSessions,
    hour12: legacy.marketHoursFormat === '12h',
    alerts: { enabled: notifications.marketOpen === true || notifications.marketClose === true, open: notifications.marketOpen === true, close: notifications.marketClose === true } });
}

let loading;
export async function loadSettings() {
  if (loading) return loading;
  loading = (async () => {
    const local = await readLocal([STORAGE_KEY, MIGRATION_KEY]);
    if (local[STORAGE_KEY]) return sanitizeSettings(local[STORAGE_KEY]);
    let settings = sanitizeSettings(DEFAULTS);
    if (!local[MIGRATION_KEY] && globalThis.chrome?.storage?.sync) {
      try {
        const legacy = await chromeStore('sync', 'get', [LEGACY_KEY]);
        if (legacy[LEGACY_KEY]) settings = migrateLegacy(legacy[LEGACY_KEY]);
      } catch { /* A disabled Sync service must not prevent local use. */ }
    }
    await writeLocal({ [STORAGE_KEY]: settings, [MIGRATION_KEY]: { completed: true, at: Date.now() } });
    return settings;
  })();
  try { return await loading; } finally { loading = undefined; }
}

export async function saveSettings(settings) {
  const safe = sanitizeSettings(settings);
  await writeLocal({ [STORAGE_KEY]: safe, [MIGRATION_KEY]: { completed: true, at: Date.now() } });
  return safe;
}

export async function resetSettings() {
  await writeLocal({ [RESET_GENERATION_KEY]: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` });
  if (globalThis.chrome?.storage?.local) await chromeStore('local', 'remove', ['amxClockV3Worker']);
  else if (isPreview() && typeof localStorage !== 'undefined') localStorage.removeItem('amxClockV3Worker');
  const settings = await saveSettings(DEFAULTS);
  if (globalThis.chrome?.runtime?.sendMessage) {
    // Wait for pending worker work and its reset-generation cleanup before the
    // UI reports that erasing reminders has completed.
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 3000);
      const finish = () => { clearTimeout(timer); resolve(); };
      try { chrome.runtime.sendMessage({ type: 'refresh' }, () => { void chrome.runtime.lastError; finish(); }); }
      catch { finish(); }
    });
  }
  return settings;
}
