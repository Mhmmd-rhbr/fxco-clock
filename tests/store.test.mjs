import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, STORAGE_KEY, RESET_GENERATION_KEY, sanitizeSettings, loadSettings, saveSettings, resetSettings, getSessions } from '../lib/store.js';
import { SESSIONS, sessionState } from '../lib/engine.js';

const local = {}, sync = {};
let syncReads = 0, syncWrites = 0;
const listeners = {};
const event = name => ({ addListener(fn) { listeners[name] = fn; } });
const copy = value => value === undefined ? undefined : structuredClone(value);
const area = (data, isSync = false) => ({
  get(keys, callback) {
    if (isSync) syncReads++;
    const result = {};
    for (const key of keys) if (key in data) result[key] = copy(data[key]);
    queueMicrotask(() => callback(result));
  },
  set(values, callback) {
    if (isSync) syncWrites++;
    Object.assign(data, copy(values));
    queueMicrotask(() => callback?.());
  },
  remove(keys, callback) { for (const key of keys) delete data[key]; queueMicrotask(() => callback?.()); }
});
const alarms = new Map(), notifications = [], action = {};
let notificationPermission = true;
globalThis.chrome = {
  runtime: { id: 'test-extension', lastError: undefined, onInstalled: event('install'), onStartup: event('startup'), onMessage: event('message'), getURL: path => `chrome-extension://test-extension/${path}` },
  storage: { local: area(local), sync: area(sync, true), onChanged: event('storage') },
  permissions: { contains(_query, callback) { callback(notificationPermission); }, onAdded: event('permissionAdded'), onRemoved: event('permissionRemoved') },
  alarms: { create(name, info) { alarms.set(name, copy(info)); return Promise.resolve(); }, get(name, callback) { callback(alarms.get(name)); }, clear(name, callback) { callback(alarms.delete(name)); }, onAlarm: event('alarm') },
  action: { setBadgeText(value, callback) { action.text = value.text; callback(); }, setTitle(value, callback) { action.title = value.title; callback(); }, setBadgeBackgroundColor(_value, callback) { callback(); } },
  notifications: { create(id, options, callback) { notifications.push({ id, options }); callback(id); }, clear(_id, callback) { callback(true); }, onClicked: event('click'), onButtonClicked: event('button') },
  tabs: { create(info, callback) { callback(info); } }
};

test('strict sanitization validates zones, times, dates and identifiers while bounding user data', () => {
  const settings = sanitizeSettings({ timezone: 'invalid/zone', language: 'other', notes: 'x'.repeat(5000), selectedSessions: ['london', 'invalid', 'london'],
    alerts: { leadMinutes: 500, days: [1, 1, -1, 7], quietStart: '25:00' },
    customSessions: [{ id: 'london', zone: 'UTC' }, { id: 'mine', name: '<svg>', zone: 'Asia/Kathmandu', open: '09:15', close: '18:45', color: 'url(x)', breaks: [{ open: '12:00', close: '13:00' }] }],
    plans: [{ id: 'good', title: 'Plan', start: '2026-11-16T12:00:00Z', end: '2026-11-16T13:00:00Z', sessionIds: ['mine', 'invalid'], remind: true }, { id: 'bad', start: 'invalid', end: 'invalid' }, { id: 'reverse', start: 1794826800000, end: 1794820000000 }] });
  assert.equal(settings.timezone, DEFAULTS.timezone);
  assert.equal(settings.language, 'en');
  assert.equal(settings.notes.length, 4000);
  assert.deepEqual(settings.selectedSessions, ['london']);
  assert.deepEqual(settings.alerts.days, [1]);
  assert.equal(settings.alerts.leadMinutes, 240);
  assert.equal(settings.alerts.quietStart, '22:00');
  assert.equal(settings.customSessions.length, 1);
  assert.equal(settings.customSessions[0].color, '#A2D4E5');
  assert.equal(settings.customSessions[0].name, '<svg>'); // Stored text is data; UI uses textContent.
  assert.equal(settings.plans.length, 1);
  assert.equal(typeof settings.plans[0].start, 'number');
  assert.deepEqual(settings.plans[0].sessionIds, ['mine']);
});

test('settings preserve intentionally empty day/session/checklist selections and independent defaults', () => {
  const settings = sanitizeSettings({ selectedSessions: [], checklist: [], alerts: { days: [] }, availability: { days: [] } });
  assert.deepEqual(settings.selectedSessions, []);
  assert.deepEqual(settings.checklist, []);
  assert.deepEqual(settings.alerts.days, []);
  assert.deepEqual(settings.availability.days, []);
  const first = sanitizeSettings({}), second = sanitizeSettings({});
  first.alerts.days.push(0);
  first.checklist[0].done = true;
  assert.equal(second.alerts.days.includes(0), false);
  assert.equal(second.checklist[0].done, false);
});

test('legacy Sync preferences migrate once into local storage without writes or deletion in Sync', async () => {
  sync.forexTimeSettings = { theme: 'light', timezone: 'Asia/Tehran', marketHoursFormat: '12h', selectedMarkets: ['London', 'New York'], notifications: { marketOpen: true, marketClose: false } };
  const [first, concurrent] = await Promise.all([loadSettings(), loadSettings()]);
  assert.equal(syncReads, 1);
  assert.deepEqual(first, concurrent);
  assert.deepEqual(first.selectedSessions, ['london', 'new-york']);
  assert.equal(first.hour12, true);
  assert.equal(first.alerts.enabled, true);
  assert.equal(local[STORAGE_KEY].theme, 'light');
  assert.equal(local.amxClockV3Migrated.completed, true);
  assert.equal(syncWrites, 0);
  assert.ok(sync.forexTimeSettings);
  await loadSettings();
  assert.equal(syncReads, 1);
});

test('local changes persist and reset erases personal content and worker state without resurrecting Sync', async () => {
  const readsBefore = syncReads;
  const settings = await loadSettings();
  settings.notes = 'private';
  settings.plans = [{ id: 'private-plan', start: Date.UTC(2026, 10, 16), end: Date.UTC(2026, 10, 16, 1), title: 'Private' }];
  await saveSettings(settings);
  local.amxClockV3Worker = { sent: { reminder: 1000 }, snoozes: [{ secret: true }] };
  const reset = await resetSettings();
  assert.equal(reset.notes, '');
  assert.deepEqual(reset.plans, []);
  assert.deepEqual(reset.customSessions, []);
  assert.equal(local.amxClockV3Worker, undefined);
  assert.equal(local.amxClockV3Migrated.completed, true);
  assert.equal(typeof local[RESET_GENERATION_KEY], 'string');
  assert.equal((await loadSettings()).theme, DEFAULTS.theme);
  assert.equal(syncReads, readsBefore);
  assert.equal(syncWrites, 0);
});

test('removed-only legacy centers get useful FX defaults while deliberately empty legacy selections remain empty', async () => {
  delete local[STORAGE_KEY];
  delete local.amxClockV3Migrated;
  sync.forexTimeSettings = { selectedMarkets: ['Shanghai', 'Hong Kong', 'Mumbai'], timezone: 'Asia/Tehran', theme: 'light' };
  const migrated = await loadSettings();
  assert.deepEqual(migrated.selectedSessions, DEFAULTS.selectedSessions);
  assert.equal(migrated.timezone, 'Asia/Tehran');
  assert.equal(migrated.theme, 'light');
  assert.equal(syncWrites, 0);
  delete local[STORAGE_KEY];
  delete local.amxClockV3Migrated;
  sync.forexTimeSettings = { selectedMarkets: [] };
  assert.deepEqual((await loadSettings()).selectedSessions, []);
});

test('session resolver includes selected references, personal schedules and enabled broker without FX-week clipping', () => {
  const sessions = getSessions({ selectedSessions: ['london'], customSessions: [{ id: 'custom-one', name: 'Desk', zone: 'UTC', open: '09:00', close: '17:00' }], broker: { enabled: true } });
  assert.deepEqual(sessions.map(item => item.id), ['london', 'custom-one', 'broker']);
  assert.equal(sessions[1].fxWeek, false);
  assert.equal(sessions[2].custom, true);
  assert.deepEqual(sessions[2].days, [0, 1, 2, 3, 4]);
  assert.deepEqual(sessions[2].breaks, [{ open: '16:59', close: '17:05' }]);
  const [broker] = getSessions({ selectedSessions: [], broker: { enabled: true, zone: 'UTC', open: '00:00', close: '23:59', days: [1], rolloverStart: '12:00', rolloverEnd: '13:00' } });
  assert.equal(sessionState(broker, Date.UTC(2026, 10, 16, 12, 30)).active, false);
  assert.equal(sessionState(broker, Date.UTC(2026, 10, 16, 14)).active, true);
  assert.deepEqual(getSessions({ selectedSessions: [], broker: { enabled: true, rolloverStart: '12:00', rolloverEnd: '12:00' } })[0].breaks, []);
});

test('currency focus uses the same selected references for UI, badge and alerts while preserving personal schedules', () => {
  const selectedSessions = SESSIONS.map(session => session.id);
  assert.deepEqual(getSessions({ selectedSessions, pair: 'EURUSD' }).map(session => session.id), ['frankfurt', 'london', 'new-york']);
  assert.deepEqual(getSessions({ selectedSessions, pair: 'USDJPY' }).map(session => session.id), ['tokyo', 'new-york']);
  assert.deepEqual(getSessions({ selectedSessions, pair: 'USDCAD', broker: { enabled: true }, customSessions: [{ id: 'custom-one', zone: 'UTC' }] }).map(session => session.id), ['new-york', 'custom-one', 'broker']);
  assert.deepEqual(getSessions({ selectedSessions: ['london'], pair: 'USDJPY' }), []);
});

test('worker delivers once, persists dedupe, snoozes, clears disabled alarms and respects optional permission', async () => {
  const actualNow = Date.now;
  let now = Date.UTC(2026, 10, 16, 12, 45); // NY 08:00 opening is 13:00 UTC.
  Date.now = () => now;
  try {
    const settings = sanitizeSettings({ timezone: 'UTC', badge: false, selectedSessions: ['london', 'new-york'],
      alerts: { enabled: true, open: true, close: false, overlap: false, leadMinutes: 15, days: [1], quietStart: '00:00', quietEnd: '00:00' } });
    await saveSettings(settings);
    const worker = await import('../background.js');
    const message = value => new Promise(resolve => listeners.message(value, { id: 'test-extension' }, resolve));
    await message({ type: 'refresh' });
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].options.title, /New York/);
    assert.ok(local.amxClockV3Worker.sent);
    listeners.alarm({ name: 'amxClockV3.nextEvent' });
    await message({ type: 'refresh' });
    assert.equal(notifications.length, 1, 'same event must not deliver again');
    const result = await message({ type: 'snooze', minutes: 10 });
    assert.equal(result.ok, true);
    assert.equal(local.amxClockV3Worker.snoozes.length, 1);
    assert.equal(alarms.get('amxClockV3.nextEvent').when, now + 10 * 60000);
    now += 10 * 60000;
    listeners.alarm({ name: 'amxClockV3.nextEvent' });
    await message({ type: 'refresh' });
    assert.equal(notifications.length, 2);
    assert.equal(local.amxClockV3Worker.snoozes.length, 0);
    assert.equal(worker.isQuietTime(Date.UTC(2026, 10, 16, 23), sanitizeSettings({ timezone: 'UTC' })), true);
    assert.equal(worker.isQuietTime(Date.UTC(2026, 10, 16, 12), sanitizeSettings({ timezone: 'UTC' })), false);
    assert.equal(worker.isQuietTime(Date.UTC(2026, 10, 16, 23), settings), false);
    notificationPermission = false;
    await message({ type: 'refresh' });
    assert.equal(alarms.has('amxClockV3.nextEvent'), false);
    assert.equal(alarms.has('amxClockV3.badge'), false);
    assert.equal(action.text, '');
    assert.equal(notifications.length, 2);
    local[RESET_GENERATION_KEY] = 'new-erase-generation';
    await message({ type: 'refresh' });
    assert.equal(local.amxClockV3Worker, undefined, 'an old in-flight generation cannot preserve erased reminder data');

    notificationPermission = true;
    await saveSettings(sanitizeSettings({ timezone: 'UTC', badge: false, selectedSessions: [],
      alerts: { enabled: true, open: false, close: false, overlap: false, leadMinutes: 0, days: [0, 1, 2, 3, 4, 5, 6], quietStart: '00:00', quietEnd: '00:00' },
      plans: [{ id: 'distant-plan', title: 'Ten days ahead', start: now + 10 * 86400000, end: now + 10 * 86400000 + 3600000, remind: true }] }));
    await message({ type: 'refresh' });
    assert.equal(alarms.has('amxClockV3.badge'), false);
    assert.equal(alarms.get('amxClockV3.nextEvent').when, now + 10 * 86400000,
      'a saved plan beyond the session horizon must schedule its own wakeup with the badge off');

    // Race: a worker has read an old personal plan, then erase happens while
    // an async Chrome API is pending, before it loads reminder state.
    await saveSettings(sanitizeSettings({ timezone: 'UTC', badge: false, selectedSessions: [],
      alerts: { enabled: true, open: false, close: false, overlap: false, leadMinutes: 0, days: [0, 1, 2, 3, 4, 5, 6], quietStart: '00:00', quietEnd: '00:00' },
      plans: [{ id: 'private-plan', title: 'Private title erased during refresh', start: now, end: now + 3600000, remind: true }] }));
    const originalBadgeSetter = chrome.action.setBadgeText;
    let unblock, enteredResolve, held = false;
    const entered = new Promise(resolve => { enteredResolve = resolve; });
    chrome.action.setBadgeText = (value, callback) => {
      if (!held) { held = true; action.text = value.text; unblock = callback; enteredResolve(); }
      else originalBadgeSetter(value, callback);
    };
    chrome.runtime.sendMessage = (value, callback) => listeners.message(value, { id: 'test-extension' }, callback);
    const beforeEraseNotices = notifications.length;
    try {
      listeners.alarm({ name: 'amxClockV3.nextEvent' });
      await entered;
      const erasing = resetSettings();
      for (let turn = 0; turn < 50 && local[STORAGE_KEY].plans.length; turn++) await Promise.resolve();
      assert.equal(local[STORAGE_KEY].plans.length, 0, 'erase must replace the old settings before the worker resumes');
      unblock();
      await erasing;
      assert.equal(notifications.length, beforeEraseNotices, 'an old refresh cannot deliver a plan after its erase generation changes');
      assert.equal(local.amxClockV3Worker, undefined, 'an old settings snapshot cannot recreate erased private reminder records');
    } finally {
      chrome.action.setBadgeText = originalBadgeSetter;
      delete chrome.runtime.sendMessage;
    }
  } finally { Date.now = actualNow; }
});
