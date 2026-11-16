<?php
// legitbiz.xyz contact endpoint -- replaces EmailJS.
// POST JSON {email?, message, website(honeypot)} -> mails cam@legitbiz.xyz.
declare(strict_types=1);

const TO          = 'cam@legitbiz.xyz';
const FROM        = 'noreply@legitbiz.xyz';
const MAX_MSG     = 5000;
const MIN_GAP_SEC = 60;   // per IP
const MAX_PER_DAY = 5;    // per IP
const ORIGINS     = ['https://legitbiz.xyz', 'https://www.legitbiz.xyz'];

header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(int $code, array $body): never {
    http_response_code($code);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'method']);

// Same-origin only (browsers always send Origin on cross-site/fetch POSTs).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!in_array($origin, ORIGINS, true)) out(403, ['ok' => false, 'error' => 'origin']);

$raw = file_get_contents('php://input', false, null, 0, 20000);
$in  = json_decode($raw ?: '', true);
if (!is_array($in)) out(400, ['ok' => false, 'error' => 'body']);

// Honeypot: real UI never fills this. Pretend success so bots don't adapt.
if (!empty($in['website'])) out(200, ['ok' => true]);

$message = trim((string)($in['message'] ?? ''));
$email   = trim((string)($in['email'] ?? ''));
if ($message === '' || mb_strlen($message) > MAX_MSG) out(400, ['ok' => false, 'error' => 'message']);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) out(400, ['ok' => false, 'error' => 'email']);

// Rate limit: hashed IP, state kept outside the webroot.
$dir = dirname(__DIR__, 2) . '/tmp/legitbiz-contact';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$ip   = $_SERVER['REMOTE_ADDR'] ?? '0';
$file = $dir . '/' . hash('sha256', $ip . '|legitbiz') . '.json';
$fh   = fopen($file, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $now   = time();
    $state = json_decode(stream_get_contents($fh) ?: '[]', true) ?: [];
    $state = array_values(array_filter($state, fn($t) => $t > $now - 86400));
    if (($state && $now - end($state) < MIN_GAP_SEC) || count($state) >= MAX_PER_DAY) {
        flock($fh, LOCK_UN); fclose($fh);
        out(429, ['ok' => false, 'error' => 'rate']);
    }
    $state[] = $now;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($state));
    flock($fh, LOCK_UN); fclose($fh);
}

$clean = fn(string $s) => str_replace(["\r", "\n"], ' ', $s);
$headers = [
    'From: legitbiz contact <' . FROM . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: legitbiz-contact',
];
if ($email !== '') $headers[] = 'Reply-To: ' . $clean($email);

$subject = '[legitbiz] contact' . ($email !== '' ? ' from ' . $clean($email) : '');
$body = "From: " . ($email ?: '(no email given)') . "\n"
      . "IP: $ip\n"
      . "Time: " . date('c') . "\n\n"
      . $message . "\n";

$sent = mail(TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), '-f' . FROM);
out($sent ? 200 : 500, ['ok' => $sent]);
