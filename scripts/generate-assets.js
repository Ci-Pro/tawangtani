const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, pixelFn) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const o = rowStart + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [20, 83, 45, 255];
const LEAF = [74, 222, 128, 255];
const SOIL = [185, 138, 47, 255];

function tawangtaniPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / cx;
  const ny = (y - cy) / cy;

  const inLeaf = (() => {
    const lx = nx / 0.42;
    const ly = (ny + 0.28) / 0.55;
    if (lx * lx + ly * ly <= 1 && ny <= -0.05) return true;
    const rx = nx / 0.42;
    const ry = (ny + 0.28) / 0.55;
    if (rx * rx + ry * ry <= 1 && ny > -0.05) return false;
    return false;
  })();

  const stemTop = -0.15;
  const stemBottom = 0.62;
  const inStem =
    Math.abs(nx) < 0.035 && ny >= stemTop && ny <= stemBottom;

  const groundR = Math.hypot(nx / 0.75, (ny - 0.72) / 0.16);
  const inGround = groundR <= 1;

  if (inStem || inGround) return SOIL;
  if (inLeaf) return LEAF;
  return BG;
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon.png'), png(1024, 1024, tawangtaniPixel));
fs.writeFileSync(
  path.join(outDir, 'adaptive-icon.png'),
  png(1024, 1024, (x, y, w, h) => {
    const [r, g, b, a] = tawangtaniPixel(x, y, w, h);
    return a === 0 ? [20, 83, 45, 255] : [r, g, b, a];
  })
);
fs.writeFileSync(path.join(outDir, 'splash.png'), png(1284, 2778, tawangtaniPixel));
fs.writeFileSync(path.join(outDir, 'favicon.png'), png(48, 48, tawangtaniPixel));

console.log('Assets generated:', fs.readdirSync(outDir).join(', '));
