import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = env.ADMIN_EMAIL ?? 'info@armaweld.com';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in portal/.env.local');
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error('Missing ADMIN_PASSWORD in portal/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});

if (authError || !auth.session) {
  console.error('Admin login failed:', authError?.message);
  process.exit(1);
}

console.log('Signed in as admin for storage upload.');

const uploads = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'demo-upload-manifest.json'), 'utf8')
);

for (const item of uploads) {
  const local = path.join(__dirname, 'demo-pdfs', `${item.template}.pdf`);
  const body = fs.readFileSync(local);

  const { error } = await supabase.storage
    .from('order-documents')
    .upload(item.storagePath, body, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('Upload failed', item.storagePath, error.message);
    process.exit(1);
  }
  console.log('Uploaded', item.storagePath);
}

console.log(`Successfully uploaded ${uploads.length} demo documents.`);
