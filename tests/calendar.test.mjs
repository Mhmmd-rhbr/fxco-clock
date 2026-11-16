import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalendar } from '../lib/calendar.js';
test('calendar export uses absolute UTC instants and stable event identities', () => {
  const result = createCalendar([{id:'plan-1',title:'London, New York; overlap',start:Date.parse('2026-11-16T13:30Z'),end:Date.parse('2026-11-16T14:30Z')}],0);
  assert.match(result,/DTSTART:20261116T133000Z\r\n/);
  assert.match(result,/UID:plan-1@financial-clock.aryamerx/);
  assert.match(result,/SUMMARY:London\\, New York\\; overlap/);
});
test('calendar blocks line injection and folds Persian at UTF-8 boundaries', () => {
  const result=createCalendar([{id:'x\r\nEND:VEVENT',title:'جلسه '.repeat(40)+'\r\nBEGIN:VEVENT',start:0,end:3600000}],0);
  assert.equal(result.match(/^BEGIN:VEVENT$/gm)?.length,1);
  for(const line of result.split('\r\n')) assert.ok(new TextEncoder().encode(line).length<=75);
  assert.ok(result.replace(/\r\n /g,'').includes('\\nBEGIN:VEVENT'));
});
test('calendar rejects reversed or invalid intervals',()=>{
  assert.throws(()=>createCalendar([{start:100,end:50}]));
  assert.throws(()=>createCalendar([{start:NaN,end:50}]));
});
