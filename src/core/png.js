import zlib from 'node:zlib';

// A minimal, dependency-free PNG codec. The studio renders its own artifacts
// offline, so it needs to write (and read back, for the visual audit) real PNG
// bytes without pulling in an image library. 8-bit truecolor (RGB), filter 0.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// pixels: Buffer of length width*height*3 (RGB, row-major).
export function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Reads back a PNG produced by encodePng (filter 0, truecolor RGB) and returns
// simple perceptual statistics used by the offline visual audit.
export function decodePngStats(fileBuffer) {
  if (!fileBuffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Not a PNG file.');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatParts = [];
  while (offset < fileBuffer.length) {
    const length = fileBuffer.readUInt32BE(offset);
    const type = fileBuffer.toString('ascii', offset + 4, offset + 8);
    const data = fileBuffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const raw = zlib.inflateSync(Buffer.concat(idatParts));
  const stride = width * 3;
  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);
  let sum = 0;
  let sumSq = 0;
  let i = 0;
  for (let y = 0; y < height; y += 1) {
    let rowBase = y * (stride + 1) + 1; // skip the per-row filter byte (0)
    for (let x = 0; x < width; x += 1) {
      const l = 0.299 * raw[rowBase] + 0.587 * raw[rowBase + 1] + 0.114 * raw[rowBase + 2];
      rowBase += 3;
      luma[i] = l;
      i += 1;
      sum += l;
      sumSq += l * l;
    }
  }
  const mean = sum / pixelCount;
  const variance = Math.max(0, sumSq / pixelCount - mean * mean);
  // "Visual silence": fraction of the frame that sits close to the mean tone —
  // the uneventful field around the few events (the form, the seam, the edges).
  let quiet = 0;
  for (let n = 0; n < pixelCount; n += 1) {
    if (Math.abs(luma[n] - mean) < 18) quiet += 1;
  }
  return {
    width,
    height,
    meanLuma: mean / 255,
    contrast: Math.sqrt(variance) / 128,
    quietFraction: quiet / pixelCount
  };
}
