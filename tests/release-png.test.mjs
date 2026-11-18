import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { crc32 } from 'node:zlib';
import { validateReleasePng } from '../scripts/release-png.mjs';

const load = path => readFileSync(new URL(`../${path}`, import.meta.url));
const icon = 'assets/icons/icon-128.png';

test('release PNG validation rejects the original oversized install icon and wrong declared sizes', () => {
  assert.throws(() => validateReleasePng(load('assets/logoamx.png'), 2500, 'original'), /decoded image budget/);
  assert.throws(() => validateReleasePng(load(icon), 48, icon), /expected 48 × 48/);
  assert.doesNotThrow(() => validateReleasePng(load(icon), 128, icon));
});

test('release PNG validation detects broken pixels even with a valid header and CRC', () => {
  const bytes = load(icon);
  for (let offset = 8; offset < bytes.length;) {
    const dataEnd = offset + 8 + bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      bytes[offset + 8] = 0;
      bytes.writeUInt32BE(crc32(bytes.subarray(offset + 4, dataEnd)), dataEnd);
      assert.throws(() => validateReleasePng(bytes, 128, icon), /invalid compressed PNG pixel data/);
      return;
    }
    offset = dataEnd + 4;
  }
  assert.fail('Test fixture has no IDAT chunk.');
});
