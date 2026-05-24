import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const portalDir = dirname(dirname(fileURLToPath(import.meta.url)));
const zipPath = join(portalDir, '..', 'portal.zip');
const stagingDir = join(portalDir, '.hostinger-zip-staging');

const SOURCE_EXCLUDES = new Set([
  'node_modules',
  '.next',
  '.hostinger-deploy',
  '.hostinger-zip-staging',
  '.env.local',
  '.git',
  '.netlify',
]);

function loadEnvLocal() {
  const envPath = join(portalDir, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function copyPortalSource(targetDir) {
  for (const entry of readdirSafe(portalDir)) {
    if (SOURCE_EXCLUDES.has(entry)) continue;
    cpSync(join(portalDir, entry), join(targetDir, entry), { recursive: true });
  }
}

function readdirSafe(dir) {
  return execSync(`ls -A "${dir}"`, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function writeHostingerPackageJson(targetDir) {
  const pkg = JSON.parse(readFileSync(join(portalDir, 'package.json'), 'utf8'));
  writeFileSync(
    join(targetDir, 'package.json'),
    `${JSON.stringify(
      {
        ...pkg,
        scripts: {
          ...pkg.scripts,
          build: 'npm run build:hostinger',
          start: 'node server.js',
        },
        engines: { node: '20.x' },
      },
      null,
      2,
    )}\n`,
  );
}

function writeHostingerServerBootstrap(targetDir) {
  writeFileSync(
    join(targetDir, 'server.js'),
    `'use strict';
const path = require('path');
require(path.join(__dirname, '.hostinger-deploy', 'server.js'));
`,
  );
}

function writeHostingerReadme(targetDir) {
  writeFileSync(
    join(targetDir, 'HOSTINGER.txt'),
    `ArmaWeld Portal — Hostinger ZIP (kaynak kod, Linux'ta derlenir)

hPanel → portal.armaweld.com → Dağıtımlar → Yeni dağıtım → portal.zip

ÖNEMLİ: "Yeni dosyaları yükleyin" seçin (önceki dosyaları DEĞİL).

Ayarlar:
  Framework: Diğer / Other  (Next.js preset KULLANMAYIN)
  Giriş dosyası: server.js
  Install: npm ci
  Build: npm run build
  Start: npm start
  Node.js: 20.x

Ortam değişkenleri (hPanel):
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY

Not: Bu zip macOS'te derlenmiş node_modules İÇERMEZ.
Hostinger build adımı Linux'ta standalone bundle oluşturur → 503 önlenir.
`,
  );
}

console.log('1/3 Portal kaynak dosyaları hazırlanıyor...');
if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
copyPortalSource(stagingDir);
writeHostingerPackageJson(stagingDir);
writeHostingerServerBootstrap(stagingDir);
writeHostingerReadme(stagingDir);

console.log('2/3 package-lock.json kopyalanıyor...');
if (!existsSync(join(stagingDir, 'package-lock.json'))) {
  console.error('package-lock.json bulunamadı.');
  process.exit(1);
}

console.log('3/3 portal.zip oluşturuluyor...');
if (existsSync(zipPath)) rmSync(zipPath);
execSync(`zip -r "${zipPath}" . -x ".DS_Store" "*/.DS_Store"`, {
  cwd: stagingDir,
  stdio: 'inherit',
});
rmSync(stagingDir, { recursive: true, force: true });

const size = (statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`\nportal.zip hazır: ${zipPath} (${size} MB)`);
console.log('\nHostinger hPanel ayarları (HOSTINGER.txt dosyasına bakın):');
console.log('  Framework: Diğer / Other');
console.log('  Install: npm ci');
console.log('  Build: npm run build');
console.log('  Start: npm start');
console.log('  Node.js: 20.x');
console.log('\nOrtam değişkenlerini hPanel\'de tanımlamayı unutmayın.');
