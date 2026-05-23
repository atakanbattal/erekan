# ArmaWeld Müşteri Portalı

Kaynaklı imalat siparişlerinin izlenebilirlik, belge teslimi ve durum takibi için müşteri portalı.

## Özellikler

### Müşteri Tarafı
- E-posta/şifre ile güvenli giriş
- Aktif siparişlerin listesi ve durum özeti
- 7 aşamalı izlenebilirlik zaman çizelgesi (malzeme girişinden sevkiyata)
- Her aşamada operatör, ısı numarası, WPS ve tarih bilgisi
- PDF ve görsel belge indirme (WPS, MTC, NDT raporu, vb.)
- Aktivite günlüğü

### Admin Tarafı (ArmaWeld)
- Müşteri hesabı oluşturma
- Sipariş/iş emri oluşturma (JOB-A142 formatında)
- 7 aşamalı üretim sürecini güncelleme
- Operatör atama ve not ekleme
- PDF/görsel belge yükleme (müşteriye görünür/gizli)
- Sipariş durumu yönetimi (üretimde, tamamlandı, sevk edildi...)

## Kurulum

### 1. Bağımlılıklar

Proje kökünden (ana site + portal birlikte):

```bash
npm install
cd portal && npm install && cd ..
```

### 2. Ortam Değişkenleri

`portal/.env.local` dosyasını oluşturun (`.env.local.example` referans alın):

```
NEXT_PUBLIC_SUPABASE_URL=https://lxsklhqeaisypldfymxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Supabase Dashboard > Settings > API
```

Service role key, admin panelinden müşteri hesabı oluşturmak için gereklidir.

### 3. Geliştirme (doğru adresler)

**Ana site ve portal ayrı portlarda çalışır:**

```bash
npm run dev
```

| Adres | Ne açılır |
|-------|-----------|
| http://localhost:3000 | **Ana web sitesi** (armaweld.com) |
| http://localhost:3001 | **Müşteri portalı** |

Sadece portal geliştirmek için:

```bash
npm run dev:portal
```

Sadece ana site önizlemek için:

```bash
npm run dev:site
```

### 4. İlk Admin Hesabı

Portal çalışırken tarayıcıda http://localhost:3001/setup adresine gidin ve ilk admin hesabınızı oluşturun.

## Production

| Ortam | Ana site | Portal |
|-------|----------|--------|
| Canlı | https://www.armaweld.com | https://portal.armaweld.com |

Ana sitedeki portal linkleri production'da otomatik olarak `portal.armaweld.com` adresine yönlenir. Localhost'ta `localhost:3001` kullanılır.

## Supabase

- **Proje:** ArmaWeld Portal (`lxsklhqeaisypldfymxc`)
- **Bölge:** eu-central-1
- **Storage bucket:** `order-documents` (PDF, görsel)

## Üretim Aşamaları

| # | Kod | Aşama |
|---|-----|-------|
| 1 | SOP.REV.ENG | Mühendislik Onayı |
| 2 | MAT.INCOMING | Malzeme Giriş Kontrolü |
| 3 | CUT.FORM | Kesim & Şekillendirme |
| 4 | WELD.ACTIVE | Kaynak Üretimi |
| 5 | NDT.INSPECT | NDT Muayene |
| 6 | SURFACE.COAT | Yüzey İşlem / Boya |
| 7 | SHIP.DOSSIER | Sevkiyat & Dosya Teslimi |
