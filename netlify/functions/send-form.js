import { Resend } from 'resend';

const FIELD_LABELS = {
  svc:      'Hizmet',
  name:     'Ad Soyad',
  company:  'Firma',
  email:    'E-Posta',
  tel:      'Telefon',
  role:     'Rol',
  loc:      'Lokasyon',
  qty:      'Adet',
  weight:   'Ağırlık (kg)',
  mat:      'Malzeme',
  deadline: 'Termin',
  budget:   'Bütçe',
  desc:     'Açıklama',
  kvkk:     'KVKK Onayı',
  nda:      'NDA Talebi',
  newsletter: 'Bülten Aboneliği',
};

const SVC_LABELS = {
  imalat:  'Kaynaklı İmalat',
  yapisal: 'Yapısal Çelik',
  kap:     'Basınçlı Kap',
  montaj:  'Saha Montaj',
  ndt:     'NDT / Muayene',
  diger:   'Diğer',
};

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'RESEND_API_KEY not configured' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid JSON' }) };
  }

  const form  = payload.form  || {};
  const files = Array.isArray(payload.files) ? payload.files : [];

  // Honeypot
  if (form.botcheck) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  // Form alanlarını HTML tabloya çevir
  const rows = [];
  for (const [key, raw] of Object.entries(form)) {
    if (!raw || key === 'botcheck' || key === 'access_key' || key === 'subject' || key === 'from_name' || key === 'redirect') continue;
    const label = FIELD_LABELS[key] || key;
    let value = raw;
    if (key === 'svc') value = SVC_LABELS[raw] || raw;
    rows.push(`
      <tr>
        <td style="padding:10px 14px;background:#f6f6f6;border-bottom:1px solid #e6e6e6;font-family:monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#666;width:200px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e6e6e6;color:#111;white-space:pre-wrap;">${escapeHtml(value)}</td>
      </tr>`);
  }

  // Dosyaları HTML link listesine çevir
  let filesHtml = '';
  if (files.length > 0) {
    const items = files.map((f, i) => {
      const safeName = escapeHtml(f.name || `dosya_${i+1}`);
      const safeUrl  = escapeHtml(f.url  || '#');
      return `<li style="margin:6px 0;"><a href="${safeUrl}" style="color:#e85d04;text-decoration:underline;font-weight:600;" target="_blank" rel="noopener">${safeName}</a></li>`;
    }).join('');
    filesHtml = `
      <tr>
        <td style="padding:10px 14px;background:#f6f6f6;border-bottom:1px solid #e6e6e6;font-family:monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#666;width:200px;vertical-align:top;">Ekli Dosyalar (${files.length})</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e6e6e6;">
          <ul style="margin:0;padding-left:18px;">${items}</ul>
        </td>
      </tr>`;
  }

  const html = `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><title>ArmaWeld — Yeni Teklif Talebi</title></head>
<body style="margin:0;padding:24px;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #ddd;">
    <div style="padding:24px;border-bottom:2px solid #e85d04;">
      <div style="font-family:monospace;font-size:11px;color:#666;letter-spacing:.2em;text-transform:uppercase;">ArmaWeld — RFQ</div>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Yeni Teklif Talebi</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${rows.join('')}
      ${filesHtml}
    </table>
    <div style="padding:16px 24px;background:#fafafa;font-size:11px;color:#888;font-family:monospace;">
      Bu mesaj armaweld.com iletişim formundan otomatik gönderildi.
    </div>
  </div>
</body>
</html>`;

  // Plain-text fallback
  const textRows = [];
  for (const [key, raw] of Object.entries(form)) {
    if (!raw || key === 'botcheck' || key === 'access_key' || key === 'subject' || key === 'from_name' || key === 'redirect') continue;
    const label = FIELD_LABELS[key] || key;
    let value = raw;
    if (key === 'svc') value = SVC_LABELS[raw] || raw;
    textRows.push(`${label}: ${value}`);
  }
  if (files.length > 0) {
    textRows.push('', `Ekli Dosyalar (${files.length}):`);
    files.forEach((f, i) => {
      textRows.push(`${i+1}. ${f.name}`);
      textRows.push(`   ${f.url}`);
    });
  }
  const text = textRows.join('\n');

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: 'ArmaWeld Web <onboarding@resend.dev>',
      to: ['info@armaweld.com'],
      reply_to: form.email || undefined,
      subject: `ArmaWeld — Teklif: ${form.name || ''} / ${form.company || ''}`.trim(),
      html,
      text,
    });

    if (result.error) {
      return { statusCode: 502, body: JSON.stringify({ success: false, message: result.error.message || 'Resend error' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: result.data?.id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message || 'Send failed' }),
    };
  }
};
