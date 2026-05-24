import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (existsSync('.next/BUILD_ID')) {
  console.log('Prebuilt .next found — skipping server build.');
  process.exit(0);
}

console.log('Running next build...');
execSync('next build', { stdio: 'inherit' });
