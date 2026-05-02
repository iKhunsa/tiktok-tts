'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function size(p) {
  try {
    const s = fs.statSync(p);
    if (s.isDirectory()) return '(dir)';
    const mb = (s.size / 1024 / 1024).toFixed(1);
    return mb + ' MB';
  } catch { return '?'; }
}

// 1. Clean dist/
console.log('Limpiando dist/...');
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST);

// 2. Compile with pkg
console.log('Compilando con @yao-pkg/pkg (descarga Node 18 runtime la primera vez)...');
execSync('npx pkg . --compress GZip', { stdio: 'inherit', cwd: ROOT });

// 3. Rename output if needed (pkg names it after "name" in package.json)
const possibleNames = ['tiktok-live-tts.exe', 'tiktok-live-tts-win.exe', 'server.exe'];
for (const name of possibleNames) {
  const src = path.join(DIST, name);
  if (fs.existsSync(src)) {
    fs.renameSync(src, path.join(DIST, 'TikTokTTS.exe'));
    console.log(`  Renombrado: ${name} → TikTokTTS.exe`);
    break;
  }
}

// 4. Copy real-FS assets next to the .exe
const copies = [
  ['gifts',            'gifts'],
  ['public',           'public'],
  ['asset',            'asset'],
  ['blocked-words.md', 'blocked-words.md'],
  ['tray-icon.ico',    'tray-icon.ico'],
];

console.log('Copiando assets...');
for (const [src, dest] of copies) {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(DIST, dest);
  if (!fs.existsSync(srcPath)) {
    console.log(`  SKIP (no existe): ${src}`);
    continue;
  }
  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
  console.log(`  ✓ ${src} → dist/${dest}  ${size(destPath)}`);
}

// 5. Create uploads directory
fs.mkdirSync(path.join(DIST, 'public', 'uploads'), { recursive: true });

// 6. Summary
console.log('\n──────────────────────────────');
console.log('dist/ listo:');
for (const entry of fs.readdirSync(DIST)) {
  const full = path.join(DIST, entry);
  console.log(`  ${entry.padEnd(24)} ${size(full)}`);
}
console.log('\n✓ Build completado. Abre Inno Setup y compila installer.iss para crear TikTokTTS-Setup.exe');
