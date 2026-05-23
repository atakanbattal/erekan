import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'demo-pdfs');

function escapePdf(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createPdf(title, lines) {
  const contentLines = [
    'BT',
    '/F1 16 Tf',
    '50 780 Td',
    `(${escapePdf(title)}) Tj`,
    '0 -28 Td',
    '/F1 11 Tf',
  ];

  for (const line of lines) {
    contentLines.push(`(${escapePdf(line)}) Tj`);
    contentLines.push('0 -18 Td');
  }
  contentLines.push('ET');

  const stream = contentLines.join('\n');
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj + '\n';
  }

  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

const docs = {
  wpqr: {
    title: 'WPQR — Kaynak Proseduru Onay Raporu',
    lines: [
      'ArmaWeld Kaynak Muhendisligi',
      'Standart: EN ISO 15614-1',
      'Malzeme grubu: S355J2 / G3Si1',
      'Kaynak pozisyonu: PA, PB',
      'Sonuc: ONAYLANDI',
      'Imza: Kaynak Muhendisi — ArmaWeld QA',
    ],
  },
  wps: {
    title: 'WPS — Kaynak Proseduru Spesifikasyonu',
    lines: [
      'ArmaWeld Uretim',
      'Proses: MAG (135)',
      'Onay: EN ISO 15609-1',
      'On mil: 1.2 mm — Koruyucu gaz: M21',
      'PrecIsIsitma: 80 C (gerektiginde)',
      'Gecerli is emri ile birlikte kullanilir.',
    ],
  },
  mtc: {
    title: 'Malzeme Test Sertifikasi (MTC)',
    lines: [
      'EN 10204 Tip 3.1 Muayene Sertifikasi',
      'Malzeme: S355J2+N / Strenx700',
      'Heat No: kayitli lot numarasi',
      'Kimyasal analiz ve mekanik test: UYGUN',
      'Tedarikci sertifikasi ile eslesmistir.',
      'ArmaWeld Girdi Kalite Onayi',
    ],
  },
  incoming: {
    title: 'Giris Kontrol Muayene Raporu',
    lines: [
      'ArmaWeld Kalite Kontrol',
      'Gorsel muayene: KABUL',
      'Sertifika uyumu: EN 10204 3.1 — UYGUN',
      'Olculer ve etiketleme: UYGUN',
      'Depoya kabul edilmistir.',
    ],
  },
  dimension: {
    title: 'Boyut Kontrol Raporu',
    lines: [
      'ArmaWeld Olcum & Kalite',
      'Referans: Teknik resim rev.',
      'Tolerans sinifi: ISO 13920-BE',
      'Olculen parca adedi: lot bazli',
      'Sonuc: KABUL',
    ],
  },
  welder: {
    title: 'Kaynakci Yeterlilik Belgesi',
    lines: [
      'EN ISO 9606-1',
      'Kaynakci: sertifikali personel',
      'Proses: MAG 135 — Malzeme: FM1',
      'Pozisyon: PA / PB / PF',
      'Gecerlilik: periyodik yenileme',
    ],
  },
  ndt: {
    title: 'NDT Muayene Raporu',
    lines: [
      'ArmaWeld NDT Laboratuvari',
      'Yontem: VT + MT (EN ISO 17638)',
      'Kabul kriteri: ISO 5817 — B sinifi',
      'Sonuc: KABUL',
      'Rapor No: demo kayit',
    ],
  },
  coating: {
    title: 'Boya / Yuzey Islem Raporu',
    lines: [
      'ArmaWeld Yuzey Islem',
      'Astar + son kat uygulamasi',
      'Kuru film kalinligi olcumu: UYGUN',
      'Yuzey hazirligi: Sa 2.5',
      'Sonuc: KABUL',
    ],
  },
  shipping: {
    title: 'Sevkiyat & Irsaliye Ozeti',
    lines: [
      'ArmaWeld Lojistik',
      'Paketleme: ahşap sandik / koruma',
      'Sevk adresi: musteri teslim noktasi',
      'Eksiksiz sevkiyat onaylandi.',
    ],
  },
  ce: {
    title: 'CE / Declaration of Performance (DoP)',
    lines: [
      'EN 1090-1 EXC2',
      'Performans beyani ozeti',
      'Uretim kontrolu: ArmaWeld FPC',
      'Teknik dosya paketi ile teslim.',
    ],
  },
  general: {
    title: 'Genel Teknik Dosya',
    lines: [
      'ArmaWeld Portal — Demo Belgesi',
      'Musteri ile paylasilan genel dosya.',
      'Proje ozeti ve ek referanslar.',
    ],
  },
};

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const [key, spec] of Object.entries(docs)) {
  const buf = createPdf(spec.title, spec.lines);
  fs.writeFileSync(path.join(outDir, `${key}.pdf`), buf);
}

console.log(`Generated ${Object.keys(docs).length} demo PDFs in ${outDir}`);
