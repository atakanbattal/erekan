import { createClient } from '@/lib/supabase/client';

export async function uploadAftermarketFile(
  customerId: string,
  folder: string,
  file: File
): Promise<{ path: string; name: string }> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${customerId}/${folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from('aftermarket-files').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw new Error(error.message);
  return { path, name: file.name };
}

export async function getAftermarketFileUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from('aftermarket-files').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
