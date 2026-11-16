/**
 * Offline time/session engine. All instants are epoch milliseconds, intervals
 * are half-open [start, end), and calendar operations use IANA time zones.
 *
 * The built-ins are reference regional FX-session conventions, not exchange or
 * broker opening hours, a holiday calendar, or a statement of market liquidity.
 */

const DAY = 86_400_000;
const NY_ZONE = 'America/New_York';
const WEEKDAYS = Object.freeze([1, 2, 3, 4, 5]);
const formatterCache = new Map();
const zoneCache = new Map();
const weekdayNumbers = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const BUILTIN_IDS = new Set(['sydney', 'tokyo', 'frankfurt', 'london', 'new-york']);

export const SESSIONS = Object.freeze([
  { id: 'sydney', name: 'Sydney', zone: 'Australia/Sydney', open: '08:00', close: '17:00', color: '#38bdf8', currencies: ['AUD', 'NZD'] },
  { id: 'tokyo', name: 'Tokyo', zone: 'Asia/Tokyo', open: '09:00', close: '18:00', color: '#f472b6', currencies: ['JPY'] },
  { id: 'frankfurt', name: 'Frankfurt', zone: 'Europe/Berlin', open: '08:00', close: '17:00', color: '#a78bfa', currencies: ['EUR', 'CHF'] },
  { id: 'london', name: 'London', zone: 'Europe/London', open: '08:00', close: '17:00', color: '#34d399', currencies: ['GBP', 'EUR', 'CHF'] },
  { id: 'new-york', name: 'New York', zone: NY_ZONE, open: '08:00', close: '17:00', color: '#fbbf24', currencies: ['USD', 'CAD'] }
].map(session => Object.freeze({
  ...session,
  currencies: Object.freeze(session.currencies),
  days: WEEKDAYS,
  fxWeek: true,
  sourceLabel: 'Reference regional FX session · local weekdays · not broker or exchange hours'
})));

function instant(value) {
  const ms = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new RangeError('Invalid timestamp');
  return ms;
}

export function isValidZone(zone) {
  if (typeof zone !== 'string' || !zone || zone.length > 100) return false;
  if (!zoneCache.has(zone)) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(0);
      zoneCache.set(zone, true);
    } catch {
      zoneCache.set(zone, false);
    }
  }
  return zoneCache.get(zone);
}

function formatter(zone) {
  if (!isValidZone(zone)) throw new RangeError(`Invalid time zone: ${zone}`);
  if (!formatterCache.has(zone)) {
    formatterCache.set(zone, new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short', hourCycle: 'h23'
    }));
  }
  return formatterCache.get(zone);
}

/** weekday is the JavaScript convention: Sunday=0 ... Saturday=6. */
export function zonedParts(timestamp, zone) {
  const values = {};
  for (const part of formatter(zone).formatToParts(instant(timestamp))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour) % 24, minute: Number(values.minute), second: Number(values.second),
    weekday: weekdayNumbers[values.weekday]
  };
}

const pad = value => String(value).padStart(2, '0');
const partsKey = parts => `${String(parts.year).padStart(4, '0')}-${pad(parts.month)}-${pad(parts.day)}`;

export function dateKey(timestamp, zone) {
  return partsKey(zonedParts(timestamp, zone));
}

function wallSerial(parts) {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour || 0, parts.minute || 0, parts.second || 0, 0);
  return date.getTime();
}

function parseDate(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Date must be YYYY-MM-DD');
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(wallSerial(parts));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return parts;
}

function parseTime(value) {
  const match = typeof value === 'string' && /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) {
    throw new RangeError('Time must be HH:mm or HH:mm:ss');
  }
  return { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] || 0) };
}

export function addDays(dateString, days) {
  if (!Number.isInteger(days)) throw new RangeError('Days must be an integer');
  const date = new Date(wallSerial(parseDate(dateString)));
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  if (year < 0 || year > 9999) throw new RangeError('Date is outside the supported calendar range');
  return `${String(year).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function offsetAt(timestamp, zone) {
  const ms = instant(timestamp);
  return wallSerial(zonedParts(ms, zone)) - Math.floor(ms / 1000) * 1000;
}

/**
 * Convert a wall date/time in an IANA zone into an instant.
 * compatible (default): earlier instant in a repeated time; move forward by the
 * size of a DST gap for a nonexistent time. earlier/later select the respective
 * side; reject throws RangeError for BOTH ambiguous and nonexistent times.
 */
export function wallToInstant(dateString, timeString, zone, disambiguation = 'compatible') {
  if (!['compatible', 'earlier', 'later', 'reject'].includes(disambiguation)) {
    throw new RangeError('Unknown time disambiguation');
  }
  if (!isValidZone(zone)) throw new RangeError(`Invalid time zone: ${zone}`);
  const target = { ...parseDate(dateString), ...parseTime(timeString) };
  const serial = wallSerial(target);
  const offsets = new Set();
  // Sampling both sides also supports half-hour shifts and a skipped civil day.
  for (const hours of [-48, -36, -24, -12, -6, 0, 6, 12, 24, 36, 48]) {
    offsets.add(offsetAt(serial + hours * 3_600_000, zone));
  }
  const candidates = [...offsets].map(offset => serial - offset).sort((a, b) => a - b);
  const matches = candidates.filter(ms => wallSerial(zonedParts(ms, zone)) === serial);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    if (disambiguation === 'reject') throw new RangeError(`Ambiguous wall time in ${zone}`);
    return disambiguation === 'later' ? matches[matches.length - 1] : matches[0];
  }
  if (disambiguation === 'reject') throw new RangeError(`Nonexistent wall time in ${zone}`);
  const mapped = candidates.map(ms => ({ ms, delta: wallSerial(zonedParts(ms, zone)) - serial }));
  const before = mapped.filter(value => value.delta < 0).sort((a, b) => b.delta - a.delta)[0];
  const after = mapped.filter(value => value.delta > 0).sort((a, b) => a.delta - b.delta)[0];
  const selected = disambiguation === 'earlier' ? before : after;
  if (!selected) throw new RangeError(`Cannot resolve wall time in ${zone}`);
  return selected.ms;
}

/** A local civil day can contain 23, 24, 25, or other numbers of hours. */
export function getDayRange(dateString, zone) {
  parseDate(dateString);
  return {
    start: wallToInstant(dateString, '00:00', zone),
    end: wallToInstant(addDays(dateString, 1), '00:00', zone)
  };
}

/** Reference FX week: Sunday 17:00 to Friday 17:00 in New York. */
export function getWeekBoundary(at) {
  const ms = instant(at);
  const local = zonedParts(ms, NY_ZONE);
  const sunday = addDays(partsKey(local), -local.weekday);
  const weekOpen = wallToInstant(sunday, '17:00', NY_ZONE);
  const weekClose = wallToInstant(addDays(sunday, 5), '17:00', NY_ZONE);
  const isOpen = ms >= weekOpen && ms < weekClose;
  const following = ms < weekOpen ? sunday : addDays(sunday, 7);
  const nextOpen = wallToInstant(following, '17:00', NY_ZONE);
  const nextClose = isOpen ? weekClose : wallToInstant(addDays(following, 5), '17:00', NY_ZONE);
  return { open: isOpen, isOpen, currentOpen: weekOpen, nextOpen, nextClose, close: nextClose, weekOpen, weekClose };
}

function forexWindows(start, end) {
  const boundary = getWeekBoundary(start);
  let sunday = dateKey(boundary.isOpen ? boundary.weekOpen : boundary.nextOpen, NY_ZONE);
  const windows = [];
  while (true) {
    const open = wallToInstant(sunday, '17:00', NY_ZONE);
    if (open >= end) break;
    windows.push({ start: open, end: wallToInstant(addDays(sunday, 5), '17:00', NY_ZONE) });
    sunday = addDays(sunday, 7);
  }
  return windows;
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object' || typeof session.id !== 'string' || !session.id) {
    throw new RangeError('Each session needs a nonempty id');
  }
  if (!isValidZone(session.zone)) throw new RangeError(`Invalid session zone: ${session.zone}`);
  const openParts = parseTime(session.open);
  const closeParts = parseTime(session.close);
  const days = session.days === undefined ? WEEKDAYS : session.days;
  if (!Array.isArray(days) || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new RangeError('Session days must use weekdays 0 through 6');
  }
  if (session.breaks !== undefined && !Array.isArray(session.breaks)) throw new RangeError('Session breaks must be an array');
  const breaks = (session.breaks || []).map(value => {
    if (!value || typeof value !== 'object') throw new RangeError('Invalid session break');
    return { open: value.open, close: value.close, openParts: parseTime(value.open), closeParts: parseTime(value.close) };
  });
  const seconds = value => value.hour * 3600 + value.minute * 60 + value.second;
  return {
    ...session, days, breaks,
    openSeconds: seconds(openParts), closeSeconds: seconds(closeParts),
    clipFx: session.custom !== true && session.type !== 'custom' && session.fxWeek !== false &&
      (session.fxWeek === true || BUILTIN_IDS.has(session.id))
  };
}

function subtractBreaks(start, end, breaks) {
  let pieces = [{ start, end }];
  for (const pause of breaks) {
    pieces = pieces.flatMap(piece => {
      if (pause.end <= piece.start || pause.start >= piece.end) return [piece];
      const result = [];
      if (pause.start > piece.start) result.push({ start: piece.start, end: pause.start });
      if (pause.end < piece.end) result.push({ start: pause.end, end: piece.end });
      return result;
    });
  }
  return pieces;
}

function mergeIntervals(intervals) {
  const groups = new Map();
  for (const interval of intervals) {
    if (!(interval.end > interval.start)) continue;
    if (!groups.has(interval.sessionId)) groups.set(interval.sessionId, []);
    groups.get(interval.sessionId).push({ ...interval });
  }
  const result = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.start - b.start || a.end - b.end);
    let previous;
    for (const interval of group) {
      if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
      else {
        previous = interval;
        result.push(previous);
      }
    }
  }
  return result.sort((a, b) => a.start - b.start || a.end - b.end || a.sessionId.localeCompare(b.sessionId));
}

/**
 * Generate real intervals, split breaks, clip to [startMs,endMs), then merge
 * adjacent intervals of the same session. Built-in FX sessions are additionally
 * clipped to the reference FX week. Custom sessions are not FX-week-clipped.
 * days describes the local weekday on which the session OPENS.
 */
export function intervalsForRange(sessions, startMs, endMs) {
  const start = instant(startMs);
  const end = instant(endMs);
  if (!Array.isArray(sessions)) throw new TypeError('Sessions must be an array');
  if (end <= start) return [];
  if (end - start > DAY * 3660) throw new RangeError('Requested range exceeds ten years');
  const results = [];
  let fxWindows;
  for (const input of sessions) {
    if (input?.enabled === false) continue;
    const session = normalizeSession(input);
    let localDate = addDays(dateKey(start, session.zone), -2);
    const finalDate = addDays(dateKey(end, session.zone), 1);
    if (session.clipFx && !fxWindows) fxWindows = forexWindows(start, end);
    while (localDate <= finalDate) {
      const weekday = new Date(wallSerial(parseDate(localDate))).getUTCDay();
      if (session.days.includes(weekday)) {
        const sessionStart = wallToInstant(localDate, session.open, session.zone);
        const overnight = session.closeSeconds <= session.openSeconds;
        const closeDate = overnight ? addDays(localDate, 1) : localDate;
        const sessionEnd = wallToInstant(closeDate, session.close, session.zone);
        if (sessionEnd > start && sessionStart < end) {
          // A recurring pause can begin before the session opens and carry
          // into it. Generate neighbouring civil-date anchors rather than
          // assigning every early-clock pause to the following day.
          const pauses = session.breaks.flatMap(pause => {
            const pauseSeconds = pause.openParts.hour * 3600 + pause.openParts.minute * 60 + pause.openParts.second;
            const pauseCloseSeconds = pause.closeParts.hour * 3600 + pause.closeParts.minute * 60 + pause.closeParts.second;
            return [-1, 0, 1].map(delta => {
              const pauseDate = addDays(localDate, delta);
              return {
                start: wallToInstant(pauseDate, pause.open, session.zone),
                end: wallToInstant(pauseCloseSeconds <= pauseSeconds ? addDays(pauseDate, 1) : pauseDate, pause.close, session.zone)
              };
            });
          });
          for (const piece of subtractBreaks(sessionStart, sessionEnd, pauses)) {
            const ranges = session.clipFx ? fxWindows : [{ start, end }];
            for (const window of ranges) {
              const clippedStart = Math.max(start, piece.start, window.start);
              const clippedEnd = Math.min(end, piece.end, window.end);
              if (clippedEnd > clippedStart) results.push({ sessionId: session.id, start: clippedStart, end: clippedEnd });
            }
          }
        }
      }
      localDate = addDays(localDate, 1);
    }
  }
  return mergeIntervals(results);
}

export function sessionState(session, atMs) {
  const at = instant(atMs);
  const searchEnd = at + 10 * DAY;
  const intervals = intervalsForRange([session], at - 2 * DAY, searchEnd);
  const current = intervals.find(interval => interval.start <= at && at < interval.end) || null;
  const next = intervals.find(interval => interval.start > at) || null;
  // Weekly recurring all-day schedules can be continuously open. A query's
  // clipping edge is not a real closing event; never present it as a deadline.
  const continuous = Boolean(current && current.end === searchEnd);
  return { active: Boolean(current), current, next, endsAt: current && !continuous ? current.end : null, startsAt: next?.start ?? null, continuous };
}

/**
 * With ids: intersection of ALL requested ids; unrelated active ids are ignored.
 * Without ids: segments with >=2 sessions, carrying their exact concurrent ids.
 */
export function overlaps(intervals, ids) {
  if (!Array.isArray(intervals)) throw new TypeError('Intervals must be an array');
  const requested = ids === undefined ? null : [...new Set(ids)].sort();
  if (requested && requested.length < 2) return [];
  const points = new Map();
  for (const interval of intervals) {
    if (requested && !requested.includes(interval.sessionId)) continue;
    const start = instant(interval.start);
    const end = instant(interval.end);
    if (end <= start) continue;
    for (const [at, delta] of [[start, 1], [end, -1]]) {
      if (!points.has(at)) points.set(at, new Map());
      const changes = points.get(at);
      changes.set(interval.sessionId, (changes.get(interval.sessionId) || 0) + delta);
    }
  }
  const times = [...points.keys()].sort((a, b) => a - b);
  const active = new Map();
  const result = [];
  for (let index = 0; index < times.length - 1; index++) {
    const start = times[index];
    for (const [id, delta] of points.get(start)) {
      const count = (active.get(id) || 0) + delta;
      if (count > 0) active.set(id, count);
      else active.delete(id);
    }
    const sessionIds = requested || [...active.keys()].sort();
    const valid = requested ? requested.every(id => active.has(id)) : sessionIds.length >= 2;
    if (!valid) continue;
    const end = times[index + 1];
    const previous = result[result.length - 1];
    if (previous && previous.end === start && previous.sessionIds.join('\0') === sessionIds.join('\0')) previous.end = end;
    else result.push({ start, end, sessionIds: [...sessionIds] });
  }
  return result;
}

/** Upcoming real session boundaries and pairwise overlap boundaries, deduped. */
export function nextEvents(sessions, atMs, horizonDays = 8) {
  const at = instant(atMs);
  if (!Number.isFinite(horizonDays) || horizonDays <= 0 || horizonDays > 366) throw new RangeError('Invalid event horizon');
  const until = at + horizonDays * DAY;
  // Padding avoids fabricating boundaries where the query clips an interval.
  const intervals = intervalsForRange(sessions, at - 2 * DAY, until + 2 * DAY);
  const events = new Map();
  const add = (kind, time, ids) => {
    if (time < at || time > until) return;
    const sessionIds = [...ids].sort();
    const id = `${kind}:${sessionIds.join('+')}:${time}`;
    events.set(id, { id, kind, at: time, sessionIds });
  };
  for (const interval of intervals) {
    add('open', interval.start, [interval.sessionId]);
    add('close', interval.end, [interval.sessionId]);
  }
  const ids = [...new Set(intervals.map(interval => interval.sessionId))].sort();
  for (let first = 0; first < ids.length; first++) {
    for (let second = first + 1; second < ids.length; second++) {
      for (const overlap of overlaps(intervals, [ids[first], ids[second]])) {
        add('overlap-start', overlap.start, overlap.sessionIds);
        add('overlap-end', overlap.end, overlap.sessionIds);
      }
    }
  }
  return [...events.values()].sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

/**
 * Upcoming changes affecting a session's displayed reference opening time.
 * Both session-zone and display-zone transitions are considered. Offsets are
 * numeric minutes east of UTC for changedZone (the session zone wins if both
 * zones change at the same instant).
 * beforeLocal/afterLocal are reference session OPEN times displayed in
 * displayZone on the nearest opening-date before/after the transition; they
 * are not claims that a market trades on the transition date.
 */
export function dstChanges(sessions, fromMs, days = 100, displayZone = 'Asia/Tehran') {
  const from = instant(fromMs);
  if (!Array.isArray(sessions)) throw new TypeError('Sessions must be an array');
  if (!Number.isFinite(days) || days <= 0 || days > 3660) throw new RangeError('Invalid DST horizon');
  if (!isValidZone(displayZone)) throw new RangeError(`Invalid time zone: ${displayZone}`);
  const until = from + days * DAY;
  const normalized = sessions.filter(session => session?.enabled !== false).map(normalizeSession);
  const transitions = new Map();
  for (const zone of new Set([...normalized.map(session => session.zone), displayZone])) {
    const changes = [];
    let previousAt = from;
    let previousOffset = offsetAt(previousAt, zone);
    while (previousAt < until) {
      const probe = Math.min(previousAt + 6 * 3_600_000, until);
      const newOffset = offsetAt(probe, zone);
      if (newOffset !== previousOffset) {
        let low = Math.floor(previousAt / 1000);
        let high = Math.ceil(probe / 1000);
        while (high - low > 1) {
          const middle = Math.floor((low + high) / 2);
          if (offsetAt(middle * 1000, zone) === previousOffset) low = middle;
          else high = middle;
        }
        changes.push({ at: high * 1000, changedZone: zone, beforeOffset: previousOffset / 60_000, afterOffset: newOffset / 60_000 });
      }
      previousAt = probe;
      previousOffset = newOffset;
    }
    transitions.set(zone, changes);
  }
  const results = [];
  for (const session of normalized) {
    const relevant = new Map();
    for (const change of transitions.get(displayZone)) relevant.set(change.at, { ...change, reason: 'display' });
    for (const change of transitions.get(session.zone)) {
      const coincidentDisplay = relevant.has(change.at);
      relevant.set(change.at, { ...change, reason: coincidentDisplay && session.zone !== displayZone ? 'both' : 'session' });
    }
    for (const change of relevant.values()) {
      const localDate = dateKey(change.at, session.zone);
      const openings = [-2, -1, 0, 1, 2].map(delta => wallToInstant(addDays(localDate, delta), session.open, session.zone));
      const before = openings.filter(ms => ms < change.at).sort((a, b) => b - a)[0];
      const after = openings.filter(ms => ms >= change.at).sort((a, b) => a - b)[0];
      const localTime = ms => {
        const parts = zonedParts(ms, displayZone);
        return `${pad(parts.hour)}:${pad(parts.minute)}`;
      };
      // Simultaneous equal shifts (or viewing the session in its own zone)
      // leave the displayed opening time unchanged and need no watch entry.
      if (localTime(before) === localTime(after)) continue;
      results.push({
        sessionId: session.id, ...change,
        beforeLocal: localTime(before), afterLocal: localTime(after),
        beforeLocalDate: dateKey(before, displayZone), afterLocalDate: dateKey(after, displayZone)
      });
    }
  }
  return results.sort((a, b) => a.at - b.at || a.sessionId.localeCompare(b.sessionId));
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 60_000) || 0);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', minutes || (!days && !hours) ? `${minutes}m` : ''].filter(Boolean).join(' ');
}
