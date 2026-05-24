import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const portalDir = dirname(dirname(fileURLToPath(import.meta.url)));
const deployDir = join(portalDir, '.hostinger-deploy');
const zipPath = join(portalDir, '..', 'portal.zip');

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

console.log('1/4 Bağımlılıklar yükleniyor...');
execSync('npm ci', { cwd: portalDir, stdio: 'inherit' });

console.log('2/4 Production build alınıyor...');
loadEnvLocal();
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Hata: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli (.env.local).');
  process.exit(1);
}
execSync('next build', { cwd: portalDir, stdio: 'inherit', env: process.env });

console.log('3/4 Standalone bundle hazırlanıyor...');
execSync('node scripts/prepare-hostinger.mjs', { cwd: portalDir, stdio: 'inherit' });

writeFileSync(
  join(deployDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'portal',
      private: true,
      scripts: {
        build: 'echo "pre-built standalone bundle"',
        start: 'node server.js',
      },
      engines: { node: '20.x' },
    },
    null,
    2,
  )}\n`,
);

console.log('4/4 portal.zip oluşturuluyor...');
if (existsSync(zipPath)) rmSync(zipPath);

execSync(`zip -r "${zipPath}" . -x ".DS_Store" "*/.DS_Store"`, {
  cwd: deployDir,
  stdio: 'inherit',
});

const size = (statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`\nportal.zip hazır: ${zipPath} (${size} MB)`);
console.log('Zip kökünde: server.js, package.json, node_modules/, .next/');
console.log('\nHostinger hPanel — ÖNEMLİ:');
console.log('  1. "Yeni dosyaları yükleyin" seçin (Önceki dosyaları DEĞİL)');
console.log('  2. portal.zip yükleyin');
console.log('  3. Framework: Diğer / Other  (Next.js preset DEĞİL)');
console.log('  4. Giriş dosyası: server.js');
console.log('  5. Install: BOŞ / kapalı  (node_modules zip içinde)');
console.log('  6. Build: BOŞ / kapalı');
console.log('  7. Start: node server.js');
console.log('  8. Node.js: 20.x');
console.log('\nLinux zip için: GitHub Actions → Build portal.zip (Linux) → portal-linux-zip artifact');
console.log('\nOrtam değişkenleri: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
