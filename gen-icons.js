const fs = require('fs');
const zlib = require('zlib');

function writePNG(size, filename) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);
  const r = 0xFF, g = 0x6B, b = 0x00;
  const radius = size * 0.195;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let inRect = true;
      if (x < radius && y < radius)
        inRect = Math.hypot(x - radius, y - radius) <= radius;
      else if (x > width - radius && y < radius)
        inRect = Math.hypot(x - (width - radius), y - radius) <= radius;
      else if (x < radius && y > height - radius)
        inRect = Math.hypot(x - radius, y - (height - radius)) <= radius;
      else if (x > width - radius && y > height - radius)
        inRect = Math.hypot(x - (width - radius), y - (height - radius)) <= radius;

      if (inRect) {
        const cx = x / width;
        const cy = y / height;
        let isShape = false;
        // body
        if (Math.pow((cx - 0.50) / 0.28, 2) + Math.pow((cy - 0.52) / 0.14, 2) < 1) isShape = true;
        // seat
        if (Math.pow((cx - 0.42) / 0.18, 2) + Math.pow((cy - 0.38) / 0.09, 2) < 1) isShape = true;
        // front fork
        if (cx > 0.68 && cx < 0.78 && cy > 0.44 && cy < 0.68) isShape = true;
        // handlebar
        if (cx > 0.60 && cx < 0.82 && cy > 0.36 && cy < 0.44) isShape = true;
        // rear wheel
        if (Math.pow((cx - 0.26) / 0.17, 2) + Math.pow((cy - 0.68) / 0.17, 2) < 1) isShape = true;
        // front wheel
        if (Math.pow((cx - 0.74) / 0.17, 2) + Math.pow((cy - 0.68) / 0.17, 2) < 1) isShape = true;
        // wheel cutouts
        if (Math.pow((cx - 0.26) / 0.09, 2) + Math.pow((cy - 0.68) / 0.09, 2) < 1) isShape = false;
        if (Math.pow((cx - 0.74) / 0.09, 2) + Math.pow((cy - 0.68) / 0.09, 2) < 1) isShape = false;

        if (isShape) {
          pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255; pixels[idx+3] = 255;
        } else {
          pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = 255;
        }
      }
      // else transparent (already 0)
    }
  }

  function crc32(buf) {
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const tBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, data])));
    return Buffer.concat([len, tBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(filename, png);
  console.log('OK: ' + filename + ' (' + size + 'x' + size + ', ' + png.length + ' bytes)');
}

writePNG(192, __dirname + '/icon-192.png');
writePNG(512, __dirname + '/icon-512.png');
