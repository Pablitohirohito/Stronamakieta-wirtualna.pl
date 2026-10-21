<?php
// Formularz zapytania / umówienia prezentacji -> e-mail do biura.
// Odpowiada JSON-em (fetch z site.js) albo przekierowaniem (bez JavaScriptu).

const TO = 'biuro@designova.pl';
// home.pl wysyła z PHP tylko jako istniejąca skrzynka na koncie; SPF designova.pl obejmuje IP serwera.
const FROM = 'biuro@designova.pl';

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
$lang = in_array($_POST['jezyk'] ?? '', ['en', 'de'], true) ? $_POST['jezyk'] : 'pl';

function finish(bool $ok, bool $wantsJson, string $lang): void {
    if ($wantsJson) {
        http_response_code($ok ? 200 : 400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok]);
    } else {
        header('Location: ' . ($lang === 'pl' ? '/' : "/$lang/") . ($ok ? '?wyslano=1' : '?blad=1') . '#kontakt', true, 303);
    }
    exit;
}

function field(string $name, int $max = 300): string {
    $v = trim((string)($_POST[$name] ?? ''));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return mb_substr($v, 0, $max);
}

function line(string $v): string {
    return preg_replace('/[\r\n]+/', ' ', $v);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /', true, 303);
    exit;
}

// Pułapka na boty: ukryte pole musi zostać puste. Botowi udajemy sukces.
if (field('website') !== '') {
    finish(true, $wantsJson, $lang);
}

$typ = field('typ') === 'prezentacja' ? 'prezentacja' : 'wycena';
$imie = line(field('imie', 120));
$email = line(field('email', 160));
$dzien = field('termin_dzien', 10);
$godzina = field('termin_godzina', 5);

$valid = $imie !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL)
    && field('zgoda') === 'tak';
if ($typ === 'prezentacja') {
    $valid = $valid
        && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dzien)
        && preg_match('/^\d{1,2}:\d{2}$/', $godzina);
}
if (!$valid) {
    finish(false, $wantsJson, $lang);
}

$rows = [
    'Rodzaj' => $typ === 'prezentacja' ? 'Prezentacja online (15 min)' : 'Wycena',
    'Termin' => $typ === 'prezentacja' ? "$dzien, godz. $godzina" : '',
    'Imię i nazwisko' => $imie,
    'E-mail' => $email,
    'Telefon' => line(field('telefon', 40)),
    'Firma / inwestycja' => line(field('firma', 160)),
    'Pakiet' => line(field('pakiet', 40)),
    'Planowany start' => line(field('start', 40)),
    'Liczba budynków' => line(field('budynki', 6)),
    'Liczba lokali' => line(field('lokale', 6)),
    'Link do inwestycji' => line(field('link', 300)),
    'Wersja strony' => ['pl' => 'polska', 'en' => 'angielska', 'de' => 'niemiecka'][$lang],
];
$body = '';
foreach ($rows as $label => $value) {
    if ($value !== '') $body .= "$label: $value\n";
}
$msg = field('wiadomosc', 3000);
if ($msg !== '') $body .= "\nWiadomość:\n$msg\n";

$subject = ($typ === 'prezentacja' ? 'Prezentacja online' : 'Zapytanie o wycenę') . ' — ' . $imie;
$headers = implode("\r\n", [
    'From: Formularz Makieta-Wirtualna <' . FROM . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$sent = mail(TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . FROM);
finish($sent, $wantsJson, $lang);
