import { crc32, inflateSync } from 'node:zlib';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const decodedByteBudget = 16 * 1024 * 1024 - 1024;

export function validateReleasePng(bytes, size, file) {
  const fail = reason => { throw new Error(`${file}: ${reason}`); };
  if (!bytes.subarray(0, 8).equals(signature)) fail('invalid PNG signature');

  let rowLength = 0, offset = 8, hasEnd = false, hasColorSpace = false;
  const compressed = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail('truncated PNG chunk');
    const length = bytes.readUInt32BE(offset);
    const end = offset + 8 + length;
    if (end + 4 > bytes.length) fail('truncated PNG chunk data');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, end);
    if (crc32(bytes.subarray(offset + 4, end)) !== bytes.readUInt32BE(end)) fail(`invalid ${type} checksum`);

    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) fail('missing or invalid PNG header');
      const width = data.readUInt32BE(0), height = data.readUInt32BE(4);
      if (width * height * 4 > decodedByteBudget) fail('exceeds the decoded image budget for Chrome installation');
      if (width !== size || height !== size) fail(`expected ${size} × ${size}; got ${width} × ${height}`);
      if (data[8] !== 8 || ![2, 6].includes(data[9]) || data[10] || data[11] || data[12]) {
        fail('expected 8-bit RGB/RGBA without interlacing');
      }
      rowLength = 1 + width * (data[9] === 6 ? 4 : 3);
    } else if (type === 'sRGB') {
      if (hasColorSpace || compressed.length || length !== 1 || data[0] > 3) fail('invalid sRGB chunk');
      hasColorSpace = true;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      if (length || end + 4 !== bytes.length) fail('invalid PNG ending');
      hasEnd = true;
    } else {
      fail(`unexpected ${type} chunk in release icon`);
    }
    offset = end + 4;
  }

  if (!hasEnd || !compressed.length) fail('missing PNG pixel data or ending');
  const stream = Buffer.concat(compressed);
  const expectedBytes = size * rowLength;
  let decoded;
  try {
    decoded = inflateSync(stream, { maxOutputLength: expectedBytes, info: true });
  } catch {
    fail('invalid compressed PNG pixel data');
  }
  if (decoded.engine.bytesWritten !== stream.length || decoded.buffer.length !== expectedBytes) {
    fail('incorrect PNG pixel data length');
  }
  for (let row = 0; row < size; row++) {
    if (decoded.buffer[row * rowLength] > 4) fail('invalid PNG row filter');
  }
}
