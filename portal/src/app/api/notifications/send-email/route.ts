import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const { to, subject, body, link, notificationId } = await request.json();

  if (!to || !subject) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? 'ArmaWeld Portal <portal@armaweld.com>';

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#1a1a1a">${subject}</h2>
            <p style="color:#444;line-height:1.6">${body ?? ''}</p>
            ${link ? `<p><a href="${link}" style="color:#ff7a1a;font-weight:bold">Portala Git →</a></p>` : ''}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:12px">ArmaWeld Müşteri Portalı</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return NextResponse.json({ error: 'Email failed' }, { status: 500 });
    }
  }

  if (notificationId) {
    const admin = createAdminClient();
    await admin
      .from('portal_notifications')
      .update({ email_sent: true })
      .eq('id', notificationId);
  }

  return NextResponse.json({ ok: true, sent: !!resendKey });
}
