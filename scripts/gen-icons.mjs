// PWA 아이콘(192x192, 512x512)을 외부 의존성 없이 생성하는 스크립트입니다.
// Node 내장 zlib만 사용해 단색 PNG를 직접 바이트로 작성합니다.
// 이미 파일이 존재하면 덮어쓰지 않고 스킵합니다(멱등).

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// 아이콘 색상(iOS 블루)
const BG = { r: 0x00, g: 0x7a, b: 0xff };
// 내부 "말풍선" 영역 색(흰색에 가까움) - 간단한 디자인을 위해 가운데 사각형만
const FG = { r: 0xff, g: 0xff, b: 0xff };

// CRC32 테이블 생성 (PNG 청크 CRC 계산용)
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// PNG 청크 작성: 길이(4) + 타입(4) + 데이터(n) + CRC(4)
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// 단색 배경 + 가운데 흰색 원형(정사각형 근사) 그리기
function makePng(size) {
  // PNG 시그니처
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 너비/높이/비트뎁스8/컬러타입2(RGB)/압축0/필터0/인터레이스0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // 픽셀 데이터: 각 행 앞에 필터 바이트(0x00) + RGB 바이트들
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(rowLen * size);

  // 가운데에 살짝 작은 흰 원(근사) - 단순히 중앙 정사각형으로 대체하면 너무 밋밋해서
  // 거리 기반 원형 마스크 사용
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= radius * radius;
      const color = inCircle ? FG : BG;
      const off = rowStart + 1 + x * 3;
      raw[off] = color.r;
      raw[off + 1] = color.g;
      raw[off + 2] = color.b;
    }
  }

  const idat = deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ]);
}

function main() {
  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const targets = [
    { size: 192, file: 'icon-192.png' },
    { size: 512, file: 'icon-512.png' },
  ];

  for (const { size, file } of targets) {
    const path = join(PUBLIC_DIR, file);
    if (existsSync(path)) {
      console.log(`[gen-icons] skip ${file} (이미 존재)`);
      continue;
    }
    const png = makePng(size);
    writeFileSync(path, png);
    console.log(`[gen-icons] ${file} 생성 (${png.length} bytes)`);
  }
}

main();
