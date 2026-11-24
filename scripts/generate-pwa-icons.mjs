import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });

// Minimal pure-Node PNG generator for emerald + gold Muslim Blast PWA icons
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderIconPNG(size, maskable = false) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  const safeScale = maskable ? 0.72 : 0.88;
  const outerR = (size / 2) * safeScale;
  const innerR = outerR * 0.84;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Base emerald gradient (#064E3B to #022C22)
      const t = (x + y) / (2 * size);
      let r = Math.round(6 * (1 - t) + 2 * t);
      let g = Math.round(78 * (1 - t) + 44 * t);
      let b = Math.round(59 * (1 - t) + 34 * t);

      // Gold medallion ring (#F5C542)
      if (dist <= outerR && dist >= innerR) {
        r = 245;
        g = 197;
        b = 66;
      }

      // Inner bright emerald disc (#0A6C50)
      if (dist < innerR) {
        r = 10;
        g = 102;
        b = 76;
      }

      // Crescent moon (gold)
      const moonOuter = Math.hypot(dx + size * 0.02, dy);
      const moonInner = Math.hypot(dx - size * 0.06, dy + size * 0.01);
      if (moonOuter < innerR * 0.56 && moonInner > innerR * 0.44) {
        r = 245;
        g = 197;
        b = 66;
      }

      // 8-point geometric star accent (gold)
      const sx = dx - size * 0.08;
      const sy = dy + size * 0.02;
      const starRadius = innerR * 0.24;
      if (
        (Math.abs(sx) < starRadius && Math.abs(sy) < starRadius) &&
        (Math.abs(sx) + Math.abs(sy) < starRadius * 1.35 ||
          Math.max(Math.abs(sx), Math.abs(sy)) < starRadius * 0.72)
      ) {
        r = 255;
        g = 224;
        b = 125;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderIconPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderIconPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderIconPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderIconPNG(180, false));
console.log('Generated PWA PNG icons in public/');
