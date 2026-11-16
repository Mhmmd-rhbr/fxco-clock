import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSIONS, isValidZone, zonedParts, dateKey, addDays, wallToInstant,
  getDayRange, getWeekBoundary, intervalsForRange, sessionState,
  overlaps, nextEvents, dstChanges
} from '../lib/engine.js';

const ms = iso => Date.parse(iso);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const custom = (overrides = {}) => ({
  id: 'custom-test', name: 'Custom', zone: 'UTC', open: '09:00', close: '17:00',
  days: [1, 2, 3, 4, 5], custom: true, ...overrides
});

test('zoned parts and date keys support half-hour zones without host-timezone dependence', () => {
  assert.deepEqual(zonedParts(ms('2026-11-16T21:05:42Z'), 'Asia/Tehran'), {
    year: 2026, month: 11, day: 17, hour: 0, minute: 35, second: 42, weekday: 2
  });
  assert.equal(dateKey(ms('2026-11-16T21:05:42Z'), 'Asia/Tehran'), '2026-11-17');
  assert.equal(wallToInstant('2026-11-16', '09:15', 'Asia/Kolkata'), ms('2026-11-16T03:45:00Z'));
  assert.equal(isValidZone('Europe/Berlin'), true);
  assert.equal(isValidZone('Europe/Frankfurt'), false);
});

test('calendar addition and validation handle leap days and reject malformed input', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.throws(() => addDays('2026-02-29', 1), RangeError);
  assert.throws(() => wallToInstant('2026-11-16', '24:00', 'UTC'), RangeError);
  assert.throws(() => wallToInstant('2026-11-16', '09:00', 'Europe/Frankfurt'), RangeError);
});

test('New York spring DST gap: compatible moves forward, earlier moves back, reject throws', () => {
  assert.equal(wallToInstant('2026-03-08', '02:30', 'America/New_York'), ms('2026-03-08T07:30:00Z'));
  assert.equal(wallToInstant('2026-03-08', '02:30', 'America/New_York', 'later'), ms('2026-03-08T07:30:00Z'));
  assert.equal(wallToInstant('2026-03-08', '02:30', 'America/New_York', 'earlier'), ms('2026-03-08T06:30:00Z'));
  assert.throws(() => wallToInstant('2026-03-08', '02:30', 'America/New_York', 'reject'), /Nonexistent/);
});

test('New York autumn DST fold distinguishes the two instants', () => {
  assert.equal(wallToInstant('2026-11-01', '01:30', 'America/New_York'), ms('2026-11-01T05:30:00Z'));
  assert.equal(wallToInstant('2026-11-01', '01:30', 'America/New_York', 'later'), ms('2026-11-01T06:30:00Z'));
  assert.throws(() => wallToInstant('2026-11-01', '01:30', 'America/New_York', 'reject'), /Ambiguous/);
});

test('DST resolution supports Lord Howe half-hour transitions and the Samoa skipped date', () => {
  assert.equal(wallToInstant('2026-10-04', '02:15', 'Australia/Lord_Howe'), ms('2026-10-03T15:45:00Z'));
  assert.equal(wallToInstant('2026-10-04', '02:15', 'Australia/Lord_Howe', 'earlier'), ms('2026-10-03T15:15:00Z'));
  assert.equal(wallToInstant('2011-12-30', '12:00', 'Pacific/Apia'), ms('2011-12-30T22:00:00Z'));
  assert.throws(() => wallToInstant('2011-12-30', '12:00', 'Pacific/Apia', 'reject'), /Nonexistent/);
});

test('civil day ranges have the actual 23/25-hour duration on DST dates', () => {
  const spring = getDayRange('2026-03-08', 'America/New_York');
  const fall = getDayRange('2026-11-01', 'America/New_York');
  assert.equal(spring.end - spring.start, 23 * HOUR);
  assert.equal(fall.end - fall.start, 25 * HOUR);
  const tehran = getDayRange('2026-11-16', 'Asia/Tehran');
  assert.equal(tehran.start, ms('2026-11-15T20:30:00Z'));
  assert.equal(tehran.end - tehran.start, DAY);
});

test('FX week uses New York DST and half-open Sunday/Friday boundaries', () => {
  assert.equal(getWeekBoundary(ms('2026-03-08T20:59:59Z')).isOpen, false);
  const sunday = getWeekBoundary(ms('2026-03-08T21:00:00Z'));
  assert.equal(sunday.isOpen, true);
  assert.equal(sunday.nextClose, ms('2026-03-13T21:00:00Z'));
  assert.equal(getWeekBoundary(ms('2026-03-13T21:00:00Z')).isOpen, false);
  assert.equal(getWeekBoundary(ms('2026-11-01T21:30:00Z')).nextOpen, ms('2026-11-01T22:00:00Z'));
});

test('Sydney reference session is clipped to the Sunday NY open; custom weekend is not', () => {
  const start = ms('2026-11-01T20:00:00Z');
  const end = ms('2026-11-02T08:00:00Z');
  const sydney = intervalsForRange([SESSIONS.find(session => session.id === 'sydney')], start, end);
  assert.equal(sydney.length, 1);
  assert.equal(sydney[0].start, ms('2026-11-01T22:00:00Z'));
  assert.equal(sydney[0].end, ms('2026-11-02T06:00:00Z'));
  const weekend = intervalsForRange([custom({ days: [0], open: '20:00', close: '23:00' })], start, end);
  assert.equal(weekend[0].start, start);
  assert.equal(weekend[0].end, ms('2026-11-01T23:00:00Z'));
});

test('local opening weekdays and overnight sessions include the previous date', () => {
  const session = custom({ open: '18:00', close: '00:30' });
  const at = ms('2026-11-17T00:15:00Z');
  const state = sessionState(session, at);
  assert.equal(state.active, true);
  assert.equal(state.current.start, ms('2026-11-16T18:00:00Z'));
  assert.equal(state.endsAt, ms('2026-11-17T00:30:00Z'));
  assert.equal(sessionState(session, ms('2026-11-17T00:30:00Z')).active, false);
  assert.equal(sessionState(session, ms('2026-11-15T19:00:00Z')).active, false);
});

test('session breaks split exact instants, including breaks after midnight', () => {
  const normal = custom({ breaks: [{ open: '11:30', close: '12:15' }] });
  const pieces = intervalsForRange([normal], ms('2026-11-16T00:00:00Z'), ms('2026-11-17T00:00:00Z'));
  assert.deepEqual(pieces.map(piece => [piece.start, piece.end]), [
    [ms('2026-11-16T09:00:00Z'), ms('2026-11-16T11:30:00Z')],
    [ms('2026-11-16T12:15:00Z'), ms('2026-11-16T17:00:00Z')]
  ]);
  const overnight = custom({ open: '22:00', close: '04:00', breaks: [{ open: '00:30', close: '01:00' }] });
  assert.equal(sessionState(overnight, ms('2026-11-17T00:45:00Z')).active, false);
  assert.equal(sessionState(overnight, ms('2026-11-17T01:00:00Z')).active, true);
});

test('recurring overnight pauses trim openings and carry across civil-date anchors', () => {
  const broker = custom({ open: '17:05', close: '16:59', breaks: [{ open: '17:00', close: '17:10' }] });
  const range = intervalsForRange([broker], ms('2026-11-16T17:00:00Z'), ms('2026-11-17T17:00:00Z'));
  assert.deepEqual(range.map(interval => [interval.start, interval.end]), [
    [ms('2026-11-16T17:10:00Z'), ms('2026-11-17T16:59:00Z')]
  ]);
  const shift = custom({ open: '18:00', close: '17:00', breaks: [{ open: '17:00', close: '18:30' }] });
  assert.equal(sessionState(shift, ms('2026-11-16T18:15:00Z')).active, false);
  assert.equal(sessionState(shift, ms('2026-11-16T18:30:00Z')).active, true);
  assert.equal(sessionState(shift, ms('2026-11-17T16:59:00Z')).active, true);
  assert.equal(sessionState(shift, ms('2026-11-17T17:00:00Z')).active, false);
  const daytime = custom({ open: '09:00', close: '17:00', breaks: [{ open: '23:00', close: '10:00' }] });
  assert.equal(sessionState(daytime, ms('2026-11-16T09:30:00Z')).active, false);
  assert.equal(sessionState(daytime, ms('2026-11-16T10:00:00Z')).active, true);
});

test('disabled and empty-day sessions produce no intervals', () => {
  const start = ms('2026-11-16T00:00:00Z');
  assert.deepEqual(intervalsForRange([custom({ enabled: false })], start, start + DAY), []);
  assert.deepEqual(intervalsForRange([custom({ days: [] })], start, start + DAY), []);
  assert.throws(() => intervalsForRange([custom({ days: [7] })], start, start + DAY), RangeError);
});

test('continuous custom schedules do not invent a closing time at the search horizon', () => {
  const session = custom({ open: '09:00', close: '09:00', days: [0, 1, 2, 3, 4, 5, 6] });
  const at = ms('2026-11-16T12:00:00Z');
  const state = sessionState(session, at);
  assert.equal(state.active, true);
  assert.equal(state.continuous, true);
  assert.equal(state.endsAt, null);
  assert.equal(state.startsAt, null);
  assert.deepEqual(nextEvents([session], at), []);
});

test('exact overlap uses minutes, all requested ids, and half-open endpoints', () => {
  const intervals = [
    { sessionId: 'a', start: 0, end: 90 },
    { sessionId: 'b', start: 30, end: 120 },
    { sessionId: 'c', start: 60, end: 75 },
    { sessionId: 'd', start: 120, end: 150 }
  ];
  assert.deepEqual(overlaps(intervals, ['a', 'b']), [{ start: 30, end: 90, sessionIds: ['a', 'b'] }]);
  assert.deepEqual(overlaps(intervals, ['a', 'b', 'c']), [{ start: 60, end: 75, sessionIds: ['a', 'b', 'c'] }]);
  assert.deepEqual(overlaps(intervals, ['b', 'd']), []);
  assert.deepEqual(overlaps(intervals).map(value => [value.start, value.end, value.sessionIds.length]), [[30, 60, 2], [60, 75, 3], [75, 90, 2]]);
});

test('US/Europe spring mismatch changes London/New York overlap by one hour', () => {
  const pair = SESSIONS.filter(session => ['london', 'new-york'].includes(session.id));
  const length = date => {
    const day = getDayRange(date, 'UTC');
    return overlaps(intervalsForRange(pair, day.start, day.end), ['london', 'new-york']).reduce((sum, interval) => sum + interval.end - interval.start, 0);
  };
  assert.equal(length('2026-03-06'), 4 * HOUR);
  assert.equal(length('2026-03-09'), 5 * HOUR);
  assert.equal(length('2026-03-30'), 4 * HOUR);
});

test('next events are sorted, stable, deduped and do not invent a query-start opening', () => {
  const sessions = [custom({ id: 'a', open: '09:00', close: '17:00' }), custom({ id: 'b', open: '09:30', close: '18:00' })];
  const at = ms('2026-11-16T10:15:00Z');
  const events = nextEvents(sessions, at, 1);
  assert.equal(events.some(event => event.at === at), false);
  assert.equal(events.some(event => event.kind === 'close' && event.at === ms('2026-11-16T17:00:00Z') && event.sessionIds[0] === 'a'), true);
  assert.equal(events.some(event => event.kind === 'overlap-end' && event.at === ms('2026-11-16T17:00:00Z')), true);
  assert.equal(new Set(events.map(event => event.id)).size, events.length);
  assert.deepEqual(events, nextEvents(sessions, at, 1));
  assert.equal(events.every((event, index) => !index || event.at >= events[index - 1].at), true);
});

test('DST calendar reports precise transition and local reference opening shift', () => {
  const london = SESSIONS.find(session => session.id === 'london');
  const changes = dstChanges([london], ms('2026-03-01T00:00:00Z'), 40, 'Asia/Tehran');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].at, ms('2026-03-29T01:00:00Z'));
  assert.equal(changes[0].beforeOffset, 0);
  assert.equal(changes[0].afterOffset, 60);
  assert.equal(changes[0].beforeLocal, '11:30');
  assert.equal(changes[0].afterLocal, '10:30');
  assert.deepEqual(dstChanges([custom({ zone: 'Asia/Tehran' })], ms('2026-01-01T00:00:00Z'), 365), []);
});

test('DST calendar includes display-zone shifts for a session with no DST', () => {
  const tokyo = SESSIONS.find(session => session.id === 'tokyo');
  const changes = dstChanges([tokyo], ms('2026-03-01T00:00:00Z'), 14, 'America/New_York');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].at, ms('2026-03-08T07:00:00Z'));
  assert.equal(changes[0].reason, 'display');
  assert.equal(changes[0].changedZone, 'America/New_York');
  assert.equal(changes[0].beforeLocal, '19:00');
  assert.equal(changes[0].afterLocal, '20:00');
});

test('coincident source/display DST shifts do not fabricate a local session shift', () => {
  const london = SESSIONS.find(session => session.id === 'london');
  assert.deepEqual(dstChanges([london], ms('2026-03-01T00:00:00Z'), 40, 'Europe/Berlin'), []);
  assert.deepEqual(dstChanges([london], ms('2026-03-01T00:00:00Z'), 40, 'Europe/London'), []);
});
