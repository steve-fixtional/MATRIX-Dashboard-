import sharp from 'sharp';
import fs from 'fs';

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#09090b" rx="112" />
  <path d="M150 150 L362 150 L362 362 L150 362 Z" fill="none" stroke="#22d3ee" stroke-width="48" />
  <path d="M225 225 L287 225 L287 287 L225 287 Z" fill="#22d3ee" />
</svg>
`;

fs.writeFileSync('public/icon.svg', svg);

sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile('public/pwa-192x192.png');

sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile('public/pwa-512x512.png');

const svgMaskable = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#09090b" />
  <g transform="scale(0.8) translate(64, 64)">
    <path d="M150 150 L362 150 L362 362 L150 362 Z" fill="none" stroke="#22d3ee" stroke-width="48" />
    <path d="M225 225 L287 225 L287 287 L225 287 Z" fill="#22d3ee" />
  </g>
</svg>
`;

sharp(Buffer.from(svgMaskable))
  .resize(512, 512)
  .png()
  .toFile('public/pwa-maskable-512x512.png');

sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');
