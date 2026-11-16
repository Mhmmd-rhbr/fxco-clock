import { intervalsForRange, overlaps, zonedParts } from './lib/engine.js';
import { STORAGE_KEY, RESET_GENERATION_KEY, loadSettings, getSessions } from './lib/store.js';

const STATE_KEY = 'amxClockV3Worker';
const EVENT_ALARM = 'amxClockV3.nextEvent';
const BADGE_ALARM = 'amxClockV3.badge';
const MINUTE = 60000;
const DAY = 86400000;
// A device waking much later should not receive yesterday's trading reminders.
const DELIVERY_GRACE = 10 * MINUTE;
let work = Promise.resolve();

function api(target, method, ...args) {
  return new Promise((resolve, reject) => {
    try {
      target[method](...args, result => {
        const error = chrome.runtime.lastError;
        error ? reject(new Error(error.message || `${method} failed`)) : resolve(result);
      });
    } catch (error) { reject(error); }
  });
}

function serial(task) {
  const next = work.then(task, task);
  work = next.catch(error => console.warn('Financial Clock:', error.message));
  return next;
}

function timeMinutes(value) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
export function isQuietTime(at, settings) {
  const { hour, minute } = zonedParts(at, settings.timezone);
  const current = hour * 60 + minute;
  const start = timeMinutes(settings.alerts.quietStart), end = timeMinutes(settings.alerts.quietEnd);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function allowedAt(at, settings) {
  return settings.alerts.days.includes(zonedParts(at, settings.timezone).weekday) && !isQuietTime(at, settings);
}

function reminderFromEvent(event, settings) {
  return { id: `${event.id}:lead:${settings.alerts.leadMinutes}`, kind: event.kind, eventAt: event.at,
    fireAt: event.at - settings.alerts.leadMinutes * MINUTE, sessionIds: event.sessionIds, title: '' };
}

export function buildReminders(settings, sessions, now, preparedIntervals) {
  if (!settings.alerts.enabled) return [];
  const from = now - DELIVERY_GRACE;
  // Padding prevents the query's clipping edges from becoming fake openings.
  const intervals = preparedIntervals || intervalsForRange(sessions, now - 2 * DAY, now + 10 * DAY);
  const events = [];
  for (const interval of intervals) {
    if (settings.alerts.open && interval.start >= from && interval.start < now + 8 * DAY) events.push({ id: `open:${interval.sessionId}:${interval.start}`, kind: 'open', at: interval.start, sessionIds: [interval.sessionId] });
    if (settings.alerts.close && interval.end >= from && interval.end < now + 8 * DAY) events.push({ id: `close:${interval.sessionId}:${interval.end}`, kind: 'close', at: interval.end, sessionIds: [interval.sessionId] });
  }
  if (settings.alerts.overlap) {
    const pair = settings.overlapPair.filter(id => sessions.some(session => session.id === id));
    if (pair.length === 2) {
      for (const interval of overlaps(intervals, pair)) {
        if (interval.start >= from && interval.start < now + 8 * DAY) events.push({ id: `overlap-start:${[...pair].sort().join(',')}:${interval.start}`, kind: 'overlap-start', at: interval.start, sessionIds: pair });
        if (settings.alerts.close && interval.end >= from && interval.end < now + 8 * DAY) events.push({ id: `overlap-end:${[...pair].sort().join(',')}:${interval.end}`, kind: 'overlap-end', at: interval.end, sessionIds: pair });
      }
    }
  }
  const reminders = events.map(event => reminderFromEvent(event, settings));
  for (const plan of settings.plans) {
    // Saved plans are already bounded by the settings schema. Include distant
    // plans so they still create a real alarm when the toolbar badge is off
    // and no recurring session can wake the worker within the query horizon.
    if (plan.remind && plan.start >= from) reminders.push({
      id: `plan:${plan.id}:${plan.start}:lead:${settings.alerts.leadMinutes}`, kind: 'plan', eventAt: plan.start,
      fireAt: plan.start - settings.alerts.leadMinutes * MINUTE, sessionIds: plan.sessionIds, title: plan.title
    });
  }
  return reminders.filter(item => item.fireAt >= from && allowedAt(item.fireAt, settings)).sort((a, b) => a.fireAt - b.fireAt);
}

function safeReminder(input) {
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || input.id.length > 300 ||
      !Number.isFinite(input.fireAt) || !Number.isFinite(input.eventAt) ||
      !['open', 'close', 'overlap-start', 'overlap-end', 'plan'].includes(input.kind)) return null;
  return { id: input.id, kind: input.kind, fireAt: input.fireAt, eventAt: input.eventAt,
    title: typeof input.title === 'string' ? input.title.slice(0, 100) : '',
    sessionIds: Array.isArray(input.sessionIds) ? input.sessionIds.filter(value => typeof value === 'string').slice(0, 12) : [] };
}

async function loadState(now) {
  const result = await api(chrome.storage.local, 'get', [STATE_KEY, RESET_GENERATION_KEY]);
  const generation = typeof result[RESET_GENERATION_KEY] === 'string' ? result[RESET_GENERATION_KEY] : 'initial';
  const stale = Boolean(result[STATE_KEY] && result[STATE_KEY].generation !== generation);
  const value = stale ? {} : result[STATE_KEY] || {};
  const sent = {};
  if (value.sent && typeof value.sent === 'object') {
    for (const [id, at] of Object.entries(value.sent).slice(-1000)) if (id.length < 320 && Number.isFinite(at) && at > now - 9 * DAY) sent[id] = at;
  }
  const snoozes = (Array.isArray(value.snoozes) ? value.snoozes : []).slice(0, 20).map(safeReminder).filter(item => item && item.fireAt >= now - DELIVERY_GRACE);
  const notices = {};
  if (value.notices && typeof value.notices === 'object') {
    for (const [id, notice] of Object.entries(value.notices).slice(-30)) {
      const safe = safeReminder(notice);
      if (id.startsWith('amxClockV3:') && id.length <= 320 && safe && safe.fireAt > now - DAY) notices[id] = safe;
    }
  }
  return { sent, snoozes, notices, generation, stale, lastNotice: safeReminder(value.lastNotice), lastNotificationId: typeof value.lastNotificationId === 'string' ? value.lastNotificationId.slice(0, 320) : '' };
}

async function saveState(state) {
  const current = await api(chrome.storage.local, 'get', [RESET_GENERATION_KEY]);
  const generation = typeof current[RESET_GENERATION_KEY] === 'string' ? current[RESET_GENERATION_KEY] : 'initial';
  if (generation !== state.generation) return;
  await api(chrome.storage.local, 'set', { [STATE_KEY]: state });
}

async function resetGeneration() {
  const result = await api(chrome.storage.local, 'get', [RESET_GENERATION_KEY]);
  return typeof result[RESET_GENERATION_KEY] === 'string' ? result[RESET_GENERATION_KEY] : 'initial';
}

async function canNotify() {
  if (!chrome.notifications || !chrome.permissions) return false;
  try { return await api(chrome.permissions, 'contains', { permissions: ['notifications'] }); } catch { return false; }
}

function noticeContent(item, sessions, settings, now) {
  const fa = settings.language === 'fa';
  const names = item.sessionIds.map(id => sessions.find(session => session.id === id)?.name || id).join(' + ');
  const eventName = item.kind === 'plan' ? item.title : names;
  const remaining = Math.ceil((item.eventAt - now) / MINUTE);
  const labels = fa ? { open: 'شروع سشن', close: 'پایان سشن', 'overlap-start': 'شروع هم‌پوشانی', 'overlap-end': 'پایان هم‌پوشانی', plan: 'برنامه شما' }
    : { open: 'Session opening', close: 'Session closing', 'overlap-start': 'Overlap starting', 'overlap-end': 'Overlap ending', plan: 'Your session plan' };
  const when = remaining > 0 ? (fa ? `تا ${remaining} دقیقه دیگر` : `in ${remaining} min`)
    : remaining < 0 ? (fa ? `زمان برنامه‌ریزی‌شده ${Math.abs(remaining)} دقیقه پیش بود` : `scheduled ${Math.abs(remaining)} min ago`) : (fa ? 'اکنون' : 'now');
  return { title: `${labels[item.kind]} · ${eventName}`, message: fa ? `${when}. برنامه زمانی مرجع را در افزونه بررسی کنید.` : `${when}. Check the reference schedule in Financial Clock.`, snooze: fa ? '۱۰ دقیقه بعد' : 'Snooze 10 min' };
}

async function deliver(item, state, sessions, settings, now) {
  if (state.sent[item.id] || !allowedAt(now, settings)) return false;
  if (await resetGeneration() !== state.generation) return false;
  const content = noticeContent(item, sessions, settings, now);
  const notificationId = `amxClockV3:${item.id}`.slice(0, 320);
  try {
    await api(chrome.notifications, 'create', notificationId, { type: 'basic', iconUrl: 'assets/logoamx.png', title: content.title,
      message: content.message, priority: 0, buttons: [{ title: content.snooze }] });
    state.sent[item.id] = now;
    state.lastNotice = item;
    state.lastNotificationId = notificationId;
    state.notices[notificationId] = item;
    await saveState(state);
    return true;
  } catch { return false; }
}

async function updateBadge(settings, sessions, now, intervals) {
  if (!settings.badge) {
    await api(chrome.action, 'setBadgeText', { text: '' });
    await api(chrome.action, 'setTitle', { title: 'AryamerX Financial Clock' });
    await api(chrome.alarms, 'clear', BADGE_ALARM);
    return;
  }
  const active = sessions.filter(session => intervals.some(interval => interval.sessionId === session.id && interval.start <= now && interval.end > now));
  const nextOpen = intervals.find(interval => interval.start > now);
  const fa = settings.language === 'fa';
  const minutes = nextOpen ? Math.max(1, Math.ceil((nextOpen.start - now) / MINUTE)) : null;
  const badge = active.length ? String(active.length) : minutes == null ? '—' : minutes > 999 ? `${Math.ceil(minutes / 60)}h` : String(minutes);
  const title = active.length ? `${active.length} ${fa ? 'سشن مرجع فعال' : 'reference sessions active'}: ${active.map(session => session.name).join(', ')}`
    : minutes == null ? (fa ? 'سشن فعالی انتخاب نشده است' : 'No upcoming selected session') : `${fa ? 'شروع سشن بعدی در' : 'Next selected session opens in'} ${minutes} min`;
  await api(chrome.action, 'setBadgeText', { text: badge.slice(0, 4) });
  await api(chrome.action, 'setBadgeBackgroundColor', { color: active.length ? '#527E80' : '#45596B' });
  await api(chrome.action, 'setTitle', { title: `AryamerX · ${title}` });
  const existing = await api(chrome.alarms, 'get', BADGE_ALARM);
  if (!existing || existing.periodInMinutes !== 1) await chrome.alarms.create(BADGE_ALARM, { delayInMinutes: 1, periodInMinutes: 1 });
}

async function refresh({ deliverDue = true } = {}) {
  // Capture the erase generation BEFORE loading settings. Otherwise an old
  // settings snapshot could attach itself to the new generation after erase
  // and recreate deleted plan titles in notification/deduplication records.
  const generation = await resetGeneration();
  const settings = await loadSettings(), sessions = getSessions(settings), now = Date.now();
  const intervals = settings.badge || settings.alerts.enabled ? intervalsForRange(sessions, now - 2 * DAY, now + 10 * DAY) : [];
  await updateBadge(settings, sessions, now, intervals);
  const state = await loadState(now);
  if (generation !== state.generation) return;
  if (!settings.alerts.enabled || !await canNotify()) {
    await api(chrome.alarms, 'clear', EVENT_ALARM);
    // Turning alerts off cancels pending snoozes as well as session reminders.
    if (state.stale) await api(chrome.storage.local, 'remove', [STATE_KEY]);
    else if (state.snoozes.length) { state.snoozes = []; await saveState(state); }
    return;
  }
  const reminders = [...buildReminders(settings, sessions, now, intervals), ...state.snoozes.filter(item => allowedAt(item.fireAt, settings))].sort((a, b) => a.fireAt - b.fireAt);
  if (deliverDue) {
    for (const item of reminders) {
      if (item.fireAt <= now && item.fireAt >= now - DELIVERY_GRACE && !state.sent[item.id]) await deliver(item, state, sessions, settings, now);
    }
  }
  state.snoozes = state.snoozes.filter(item => !state.sent[item.id] && item.fireAt >= now - DELIVERY_GRACE);
  await saveState(state);
  const next = reminders.find(item => (deliverDue ? item.fireAt > now : item.fireAt >= now - DELIVERY_GRACE) && !state.sent[item.id]);
  if (next) await chrome.alarms.create(EVENT_ALARM, { when: Math.max(now + 1000, next.fireAt) });
  else await api(chrome.alarms, 'clear', EVENT_ALARM);
}

async function snooze(minutes = 10, notificationId) {
  const settings = await loadSettings();
  if (!settings.alerts.enabled || !await canNotify()) return false;
  const now = Date.now(), state = await loadState(now);
  const original = notificationId ? state.notices[notificationId] : state.lastNotice;
  if (!original) return false;
  const delay = Number.isInteger(minutes) ? Math.max(1, Math.min(60, minutes)) : 10;
  const item = { ...original, id: `${original.id.split(':snooze:')[0]}:snooze:${now}`, fireAt: now + delay * MINUTE };
  state.snoozes.push(item);
  await saveState(state);
  if (notificationId) await api(chrome.notifications, 'clear', notificationId);
  await refresh({ deliverDue: false });
  return true;
}

function openDashboard() { return api(chrome.tabs, 'create', { url: chrome.runtime.getURL('dashboard.html') }); }

chrome.runtime.onInstalled.addListener(() => { serial(async () => {
  await api(chrome.alarms, 'clear', 'checkMarketStatus');
  await refresh();
}); });
chrome.runtime.onStartup.addListener(() => { serial(() => refresh()); });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === EVENT_ALARM || alarm.name === BADGE_ALARM) serial(() => refresh());
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) serial(() => refresh({ deliverDue: false }));
});
chrome.permissions.onAdded.addListener(() => { registerNotificationListeners(); serial(() => refresh({ deliverDue: false })); });
chrome.permissions.onRemoved.addListener(() => { serial(() => refresh({ deliverDue: false })); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return false;
  if (message.type === 'refresh') {
    serial(() => refresh({ deliverDue: false })).then(() => respond({ ok: true }), () => respond({ ok: false }));
    return true;
  }
  if (message.type === 'snooze') {
    serial(() => snooze(message.minutes)).then(ok => respond({ ok }), () => respond({ ok: false }));
    return true;
  }
  return false;
});
let notificationListenersRegistered = false;
function registerNotificationListeners() {
  if (!chrome.notifications || notificationListenersRegistered) return;
  notificationListenersRegistered = true;
  chrome.notifications.onButtonClicked.addListener((id, index) => {
    if (id.startsWith('amxClockV3:') && index === 0) serial(() => snooze(10, id));
  });
  chrome.notifications.onClicked.addListener(id => {
    if (id.startsWith('amxClockV3:')) { openDashboard().catch(() => {}); api(chrome.notifications, 'clear', id).catch(() => {}); }
  });
}
registerNotificationListeners();
// Top-level registration plus reconstruction handles ephemeral MV3 workers and browser restarts.
serial(() => refresh());
