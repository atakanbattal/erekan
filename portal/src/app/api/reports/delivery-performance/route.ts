import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeDeliveryMetrics } from '@/lib/portal/delivery-metrics';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = (await supabase.rpc('get_customer_id')).data;
  if (!customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('company_name')
    .eq('id', customerId)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId);

  const { data: documents } = await supabase
    .from('order_documents')
    .select('id')
    .in('order_id', (orders ?? []).map((o) => o.id))
    .eq('is_visible_to_customer', true);

  const metrics = computeDeliveryMetrics(orders ?? [], documents?.length ?? 0);
  const now = new Date().toLocaleDateString('tr-TR');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Teslimat Performans Raporu — ${customer?.company_name ?? ''}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a}
  h1{font-size:24px;border-bottom:3px solid #ff7a1a;padding-bottom:12px}
  .meta{color:#666;font-size:14px;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}
  .card{border:1px solid #e5e5e5;border-radius:8px;padding:20px}
  .card h3{font-size:12px;text-transform:uppercase;color:#888;margin:0 0 8px}
  .card .val{font-size:28px;font-weight:800;color:#ff7a1a}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999}
  @media print{body{margin:20px}}
</style>
</head>
<body>
  <h1>ArmaWeld — Teslimat Performans Raporu</h1>
  <p class="meta">${customer?.company_name ?? ''} · ${now}</p>
  <div class="grid">
    <div class="card"><h3>Toplam Sipariş</h3><div class="val">${metrics.totalOrders}</div></div>
    <div class="card"><h3>Zamanında Teslimat</h3><div class="val">${metrics.onTimeRate}%</div></div>
    <div class="card"><h3>Ort. Üretim İlerlemesi</h3><div class="val">${metrics.avgProgress}%</div></div>
    <div class="card"><h3>Paylaşılan Belge</h3><div class="val">${metrics.documentCount}</div></div>
    <div class="card"><h3>Aktif Sipariş</h3><div class="val">${metrics.activeOrders}</div></div>
    <div class="card"><h3>Yaklaşan Teslimat</h3><div class="val">${metrics.upcomingDeliveries}</div></div>
  </div>
  <div class="footer">ArmaWeld Kaynaklı İmalat · portal.armaweld.com · Bu rapor otomatik oluşturulmuştur.</div>
  <script>window.onload=()=>window.print()</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="armaweld-delivery-report.html"`,
    },
  });
}
