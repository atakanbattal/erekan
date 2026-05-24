import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const portalDir = dirname(dirname(fileURLToPath(import.meta.url)));
const zipPath = join(portalDir, '..', 'portal.zip');

function loadEnvLocal() {
  const envPath = join(portalDir, '.env.local');
  if (!existsSync(envPath)) {
    console.warn('Uyarı: .env.local yok — build için NEXT_PUBLIC_* değişkenlerini ortamda tanımlayın.');
    return;
  }
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

console.log('1/3 Bağımlılıklar yükleniyor...');
execSync('npm ci', { cwd: portalDir, stdio: 'inherit' });

console.log('2/3 Production build alınıyor...');
loadEnvLocal();
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Hata: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli (.env.local veya ortam).');
  process.exit(1);
}
execSync('npm run build:next', { cwd: portalDir, stdio: 'inherit', env: process.env });

console.log('3/3 portal.zip oluşturuluyor...');
if (existsSync(zipPath)) rmSync(zipPath);

const excludes = [
  'node_modules/*',
  '.env',
  '.env.*',
  '.hostinger-deploy/*',
  '.turbo/*',
  '.next/cache/*',
  '.next/trace',
  '.next/trace-build',
  'tsconfig.tsbuildinfo',
  '.DS_Store',
  '*/.DS_Store',
]
  .map((p) => `-x "${p}"`)
  .join(' ');

execSync(`zip -r "${zipPath}" . ${excludes}`, { cwd: portalDir, stdio: 'inherit' });

const size = (statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`\nportal.zip hazır: ${zipPath} (${size} MB)`);
console.log('\nHostinger hPanel ayarları (varsayılan Next.js preset OK):');
console.log('  Install: npm ci --omit=dev  (veya npm ci)');
console.log('  Build:   npm run build       (ZIP içinde .next varsa otomatik atlanır)');
console.log('  Start:   otomatik — npm run start -- -p $PORT');
console.log('\nhPanel → portal.armaweld.com → Dağıtımlar → Yeni dağıtım → portal.zip yükle');
