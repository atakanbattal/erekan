import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const deployDir = join(root, '.hostinger-deploy');
const standaloneDir = join(root, '.next/standalone');

if (!existsSync(standaloneDir)) {
  console.error('Missing .next/standalone. Run "next build" with output: "standalone" first.');
  process.exit(1);
}

if (existsSync(deployDir)) {
  rmSync(deployDir, { recursive: true, force: true });
}

cpSync(standaloneDir, deployDir, { recursive: true });
cpSync(join(root, '.next/static'), join(deployDir, '.next/static'), { recursive: true });

const publicDir = join(root, 'public');
if (existsSync(publicDir)) {
  cpSync(publicDir, join(deployDir, 'public'), { recursive: true });
}

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

writeFileSync(
  join(deployDir, 'HOSTINGER.txt'),
  `ArmaWeld Portal — standalone bundle (server.js zip kökünde)

hPanel → portal.armaweld.com → Dağıtımlar → Yeni dağıtım
"Yeni dosyaları yükleyin" seçin (önceki dosyaları DEĞİL).

Framework: Diğer / Other  (Next.js preset KULLANMAYIN)
Giriş dosyası: server.js
Install: BOŞ / kapalı  (node_modules zip içinde gelir)
Build: BOŞ / kapalı  (zaten derlenmiş)
Start: node server.js
Node.js: 20.x

Ortam değişkenleri (hPanel):
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

503 alıyorsanız:
- Install/Build adımlarını kapatın (npm ci node_modules siler)
- macOS zip yerine GitHub Actions "portal-linux-zip" artifact kullanın
- Start mutlaka "node server.js" olmalı
`,
);

console.log('Hostinger deploy bundle ready at .hostinger-deploy/');
