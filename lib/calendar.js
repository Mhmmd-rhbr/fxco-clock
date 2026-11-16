// Local-only RFC 5545 export. UTC timestamps need no external timezone registry.
const escapeText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid calendar date');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};
const fold = value => {
  const encoder = new TextEncoder();
  let result = '', line = '', bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { result += `${line}\r\n`; line = ' '; bytes = 1; }
    line += character;
    bytes += size;
  }
  return result + line;
};
export function createCalendar(plans, now = Date.now()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AryamerX//Financial Clock 3//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const plan of plans) {
    if (!Number.isFinite(plan.start) || !Number.isFinite(plan.end) || plan.end <= plan.start) throw new RangeError('Invalid calendar interval');
    const uid = String(plan.id || `${plan.start}-${plan.end}`).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100);
    lines.push('BEGIN:VEVENT', `UID:${uid}@financial-clock.aryamerx`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(plan.start)}`, `DTEND:${stamp(plan.end)}`, `SUMMARY:${escapeText(plan.title || 'Session plan')}`, `DESCRIPTION:${escapeText('Planned locally with AryamerX Financial Clock. Reference schedule; confirm your broker hours.')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
