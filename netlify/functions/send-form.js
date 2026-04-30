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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const handler = async (event) => {
  // Wrap everything in a top-level try/catch so we ALWAYS return JSON, never HTML
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { success: false, message: 'Method not allowed' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return json(500, { success: false, message: 'RESEND_API_KEY not configured' });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { success: false, message: 'Invalid JSON body' });
    }

    const form  = payload.form  || {};
    const files = Array.isArray(payload.files) ? payload.files : [];

    // Honeypot
    if (form.botcheck) {
      return json(200, { success: true });
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

    // Ekli dosyaları HTML tablo satırına yaz (ek olarak zaten e-postada olacak)
    let filesHtml = '';
    if (files.length > 0) {
      const items = files.map((f, i) => {
        const safeName = escapeHtml(f.name || `dosya_${i+1}`);
        return `<li style="margin:4px 0;font-family:monospace;font-size:12px;color:#444;">${safeName}</li>`;
      }).join('');
      filesHtml = `
        <tr>
          <td style="padding:10px 14px;background:#f6f6f6;border-bottom:1px solid #e6e6e6;font-family:monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#666;width:200px;vertical-align:top;">Ekli Dosyalar (${files.length})</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e6e6e6;color:#111;">
            <ul style="margin:0;padding-left:18px;">${items}</ul>
            <div style="margin-top:6px;font-size:11px;color:#888;">Dosyalar bu e-postanın ekleri olarak gelmiştir.</div>
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
      files.forEach((f, i) => textRows.push(`${i+1}. ${f.name}`));
    }
    const text = textRows.join('\n');

    const resend = new Resend(apiKey);

    const recipient = process.env.MAIL_TO || 'battalatakan@outlook.com';
    const sender    = process.env.MAIL_FROM || 'ArmaWeld Web <onboarding@resend.dev>';

    // Email format kontrolü (tam doğrulama: domain + TLD)
    const isValidEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

    const emailPayload = {
      from: sender,
      to: [recipient],
      subject: `ArmaWeld — Teklif: ${form.name || ''} / ${form.company || ''}`.trim(),
      html,
      text,
    };
    if (isValidEmail(form.email)) emailPayload.replyTo = form.email.trim();

    // Dosyaları base64'ten Resend e-posta eki formatına çevir
    if (files.length > 0) {
      emailPayload.attachments = files
        .filter(f => f.name && f.content)
        .map(f => ({
          filename: f.name,
          content:  f.content,  // base64 string — Resend bunu direkt destekliyor
        }));
    }

    console.log('[send-form] payload received', {
      sender, recipient,
      formKeys: Object.keys(form),
      fileCount: files.length,
      subject: emailPayload.subject,
      replyTo: emailPayload.replyTo,
    });

    try {
      const result = await resend.emails.send(emailPayload);

      if (result.error) {
        console.error('[send-form] Resend error:', JSON.stringify(result.error));
        return json(502, {
          success: false,
          message: result.error.message || 'Resend error',
          error: result.error,
          debug: { sender, recipient, replyTo: emailPayload.replyTo },
        });
      }

      console.log('[send-form] sent ok, id:', result.data?.id);
      return json(200, { success: true, id: result.data?.id });

    } catch (err) {
      console.error('[send-form] Resend exception:', err.message, err.stack);
      return json(500, { success: false, message: err.message || 'Send failed' });
    }

  } catch (fatalErr) {
    // Top-level catch: ensure we NEVER return HTML
    console.error('[send-form] FATAL:', fatalErr?.message, fatalErr?.stack);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Internal server error: ' + (fatalErr?.message || 'unknown') }),
    };
  }
};
