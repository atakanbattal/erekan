<?php
/**
 * PHPMailer yoksa basit mail() yedek gönderici
 */
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data || !empty($data['form']['botcheck'])) {
    echo json_encode(['success' => true]);
    exit;
}

$form = $data['form'] ?? [];
$lines = [];
foreach ($form as $k => $v) {
    if ($v && $k !== 'botcheck') $lines[] = "$k: $v";
}
$body = "ArmaWeld RFQ (fallback)\n\n" . implode("\n", $lines);
$to = 'info@armaweld.com';
$subject = 'ArmaWeld - Teklif: ' . ($form['name'] ?? '') . ' / ' . ($form['company'] ?? '');
$headers = 'From: info@armaweld.com' . "\r\n" .
    'Reply-To: ' . ($form['email'] ?? 'info@armaweld.com');

$ok = @mail($to, $subject, $body, $headers);
echo json_encode(['success' => (bool)$ok, 'message' => $ok ? '' : 'mail() failed']);
