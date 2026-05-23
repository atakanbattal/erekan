import { cpSync, existsSync, rmSync } from 'node:fs';
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

console.log('Hostinger deploy bundle ready at .hostinger-deploy/');
