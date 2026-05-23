<?php
/**
 * ArmaWeld — Form Mailer (PHPMailer + Hostinger SMTP)
 * JSON body alır, HTML e-posta gönderir (dosya ekleriyle birlikte)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://armaweld.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── PHPMailer (Hostinger'da varsayılan olarak yüklü) ─────────
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Hostinger shared hosting'de PHPMailer genellikle bu yollarda bulunur
$pmPaths = [
    __DIR__ . '/phpmailer/src/PHPMailer.php',
    '/usr/share/php/phpmailer/src/PHPMailer.php',
];
$pmFound = false;
foreach ($pmPaths as $p) {
    if (file_exists($p)) {
        require $p;
        require str_replace('PHPMailer.php', 'SMTP.php', $p);
        require str_replace('PHPMailer.php', 'Exception.php', $p);
        $pmFound = true;
        break;
    }
}

if (!$pmFound) {
    // PHPMailer bulunamazsa eski mail() yöntemine düş
    require_once __DIR__ . '/mail_fallback.php';
    exit;
}

// ── İstek gövdesi ────────────────────────────────────────────
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Gecersiz JSON']);
    exit;
}

$form = $data['form'] ?? [];
$files = $data['files'] ?? [];

// Honeypot
if (!empty($form['botcheck'])) {
    echo json_encode(['success' => true]);
    exit;
}

// ── Etiketler ────────────────────────────────────────────────
$LABELS = [
    'svc' => 'Hizmet',
    'name' => 'Ad Soyad',
    'company' => 'Firma',
    'email' => 'E-Posta',
    'tel' => 'Telefon',
    'role' => 'Rol',
    'loc' => 'Lokasyon',
    'qty' => 'Adet',
    'weight' => 'Agirlik (kg)',
    'mat' => 'Malzeme',
    'deadline' => 'Termin',
    'budget' => 'Butce',
    'desc' => 'Aciklama',
];

$SVC = [
    'imalat' => 'Kaynakli Imalat',
    'yapisal' => 'Yapisal Celik',
    'kap' => 'Basinçli Kap',
    'montaj' => 'Saha Montaj',
    'ndt' => 'NDT / Muayene',
    'diger' => 'Diger',
];

$SKIP = ['botcheck', 'access_key', 'subject', 'from_name', 'redirect'];

// ── HTML e-posta gövdesi ─────────────────────────────────────
$rows = '';
foreach ($form as $key => $val) {
    if (!$val || in_array($key, $SKIP))
        continue;
    $label = $LABELS[$key] ?? $key;
    if ($key === 'svc')
        $val = $SVC[$val] ?? $val;
    $rows .= '<tr>
      <td style="padding:10px 14px;background:#f6f6f6;border-bottom:1px solid #e6e6e6;font-family:monospace;font-size:11px;text-transform:uppercase;color:#666;width:200px;vertical-align:top;">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e6e6e6;color:#111;white-space:pre-wrap;">'
        . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '</td>
    </tr>';
}

if (count($files) > 0) {
    $items = '';
    foreach ($files as $f) {
        $nm = htmlspecialchars($f['name'] ?? 'dosya', ENT_QUOTES, 'UTF-8');
        $items .= '<li style="margin:4px 0;font-family:monospace;">' . $nm . '</li>';
    }
    $rows .= '<tr>
      <td style="padding:10px 14px;background:#f6f6f6;border-bottom:1px solid #e6e6e6;font-family:monospace;font-size:11px;text-transform:uppercase;color:#666;width:200px;vertical-align:top;">Ekli Dosyalar (' . count($files) . ')</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e6e6e6;color:#111;">
        <ul style="margin:0;padding-left:18px;">' . $items . '</ul>
        <div style="margin-top:6px;font-size:11px;color:#888;">Dosyalar bu e-postanin ekleridir.</div>
      </td>
    </tr>';
}

$htmlBody = '<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><title>ArmaWeld - Teklif</title></head>
<body style="margin:0;padding:24px;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #ddd;">
    <div style="padding:24px;border-bottom:2px solid #e85d04;">
      <div style="font-family:monospace;font-size:11px;color:#666;letter-spacing:.2em;text-transform:uppercase;">ArmaWeld - RFQ</div>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Yeni Teklif Talebi</h1>
    </div>
    <table style="width:100%;border-collapse:collapse;">' . $rows . '</table>
    <div style="padding:16px 24px;background:#fafafa;font-size:11px;color:#888;font-family:monospace;">
      Bu mesaj armaweld.com iletisim formundan otomatik gonderildi.
    </div>
  </div>
</body>
</html>';

// ── SMTP Ayarları (config/mail.config.php — git dışı) ─────────
$configPath = __DIR__ . '/config/mail.config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Mail yapilandirmasi eksik']);
    exit;
}
$cfg = require $configPath;
$SMTP_HOST = $cfg['smtp_host'] ?? 'smtp.hostinger.com';
$SMTP_PORT = (int)($cfg['smtp_port'] ?? 465);
$SMTP_USER = $cfg['smtp_user'] ?? '';
$SMTP_PASS = $cfg['smtp_pass'] ?? '';
$MAIL_FROM = $cfg['mail_from'] ?? $SMTP_USER;
$MAIL_TO   = $cfg['mail_to'] ?? $SMTP_USER;

if (!$SMTP_USER || !$SMTP_PASS || $SMTP_PASS === 'BURAYA_SIFRE') {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'SMTP kimlik bilgileri yapilandirilmamis']);
    exit;
}

// ── PHPMailer gönderimi ───────────────────────────────────────
$nameVal = $form['name'] ?? '';
$compVal = $form['company'] ?? '';
$replyTo = filter_var($form['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $form['email'] : '';

try {
    $mail = new PHPMailer(true);

    // SMTP
    $mail->isSMTP();
    $mail->Host = $SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = $SMTP_USER;
    $mail->Password = $SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;  // SSL port 465
    $mail->Port = $SMTP_PORT;
    $mail->CharSet = 'UTF-8';

    // Gönderen / alıcı
    $mail->setFrom($MAIL_FROM, 'ArmaWeld');
    $mail->addAddress($MAIL_TO);
    if ($replyTo)
        $mail->addReplyTo($replyTo);

    // Konu
    $mail->Subject = 'ArmaWeld - Teklif: ' . $nameVal . ' / ' . $compVal;

    // İçerik
    $mail->isHTML(true);
    $mail->Body = $htmlBody;
    $mail->AltBody = strip_tags($htmlBody);

    // Ekler (base64 → binary)
    foreach ($files as $f) {
        if (empty($f['content']) || empty($f['name']))
            continue;
        $fn = preg_replace('/[^\w.\-]/', '_', $f['name']);
        $binary = base64_decode($f['content']);
        $mail->addStringAttachment($binary, $fn);
    }

    $mail->send();

    // Otomatik onay e-postası (müşteriye)
    if ($replyTo) {
      $auto = new PHPMailer(true);
      $auto->isSMTP();
      $auto->Host = $SMTP_HOST;
      $auto->SMTPAuth = true;
      $auto->Username = $SMTP_USER;
      $auto->Password = $SMTP_PASS;
      $auto->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
      $auto->Port = $SMTP_PORT;
      $auto->CharSet = 'UTF-8';
      $auto->setFrom($MAIL_FROM, 'ArmaWeld');
      $auto->addAddress($replyTo, $nameVal);
      $auto->Subject = 'ArmaWeld — Teklif talebiniz alındı';
      $autoBody = '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">'
        . '<h2 style="color:#111;">Talebiniz alındı</h2>'
        . '<p>Sayın ' . htmlspecialchars($nameVal, ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>Teklif formunuz başarıyla iletildi. Proje mühendisimiz en geç <strong>48 saat</strong> içinde size dönüş yapacaktır.</p>'
        . '<p style="font-size:13px;color:#666;">ArmaWeld · Fevziçakmak Mah. 10758. Sk. No: 25/H · Karatay / Konya</p>'
        . '</div>';
      $auto->isHTML(true);
      $auto->Body = $autoBody;
      $auto->AltBody = strip_tags($autoBody);
      try { $auto->send(); } catch (Exception $ignored) {}
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $mail->ErrorInfo]);
}
