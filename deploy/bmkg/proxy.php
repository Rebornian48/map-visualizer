<?php
/*
 * BMKG proxy — adds CORS header so the map-visualizer frontend (different
 * origin) can fetch data from three BMKG hosts:
 *   - data.bmkg.go.id  (h=data): gempa JSON/XML
 *   - www.bmkg.go.id   (h=www):  peringatan dini cuaca (RSS + CAP)
 *   - api.bmkg.go.id   (h=api):  prakiraan cuaca per adm4
 * Upload to: public_html/bmkg/proxy.php.
 * Endpoint:  https://rebornian48.my.id/bmkg/proxy.php?h=<host>&p=<path>[&q=<query>].
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$hosts = [
          'data'  => 'data.bmkg.go.id',
          'www'   => 'www.bmkg.go.id',
          'api'   => 'api.bmkg.go.id',
          'magma' => 'magma.esdm.go.id',
         ];

// Whitelist: [host, path-regex, response Content-Type, cache seconds].
// Each row is validated independently; only matching (h, p) combos pass.
$whitelist = [
              // Gempa (data.bmkg.go.id)
              ['data', '#^DataMKG/TEWS/(autogempa|gempaterkini|gempadirasakan)\.json$#', 'application/json', 300],
              ['data', '#^DataMKG/TEWS/(autogempa|gempaterkini|gempadirasakan)\.xml$#',  'application/xml',  300],
              // CAP nowcast (www.bmkg.go.id): the RSS feed + individual CAP alerts
              ['www',  '#^alerts/nowcast/id/rss\.xml$#',                                 'application/rss+xml', 300],
              ['www',  '#^alerts/nowcast/id/[A-Za-z0-9]+_alert\.xml$#',                  'application/xml',  600],
              // Prakiraan cuaca (api.bmkg.go.id) — the query string is passed through
              ['api',  '#^publik/prakiraan-cuaca$#',                                     'application/json', 600],
              // MAGMA Indonesia (PVMBG) — homepage HTML embeds `var markersGunungApi`
              // as inline JS; the client extracts it. Cache 5 min because status can
              // change on new VONA / level updates.
              ['magma', '#^$#',                                                          'text/html; charset=UTF-8', 300],
             ];

$h = $_GET['h'] ?? '';
$p = $_GET['p'] ?? '';
$q = $_GET['q'] ?? '';

if (array_key_exists($h, $hosts) === false) {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('unknown host');
}

$matched = null;
foreach ($whitelist as $row) {
    if ($row[0] !== $h) continue;
    if (preg_match($row[1], $p) === 1) {
        $matched = $row;
        break;
    }
}

if ($matched === null) {
    http_response_code(404);
    header('Content-Type: text/plain');
    exit('path not allowed');
}

// Only allow a query string for hosts that expect one — currently just the
// cuaca API. Restrict to a safe key=value shape so no arbitrary payload can
// be smuggled through.
$queryPart = '';
if ($q !== '') {
    if ($h !== 'api' || preg_match('#^[A-Za-z0-9_]+=[A-Za-z0-9._-]+$#', $q) !== 1) {
        http_response_code(400);
        header('Content-Type: text/plain');
        exit('query not allowed');
    }
    $queryPart = '?'.$q;
}

$url = 'https://'.$hosts[$h].'/'.$p.$queryPart;

// MAGMA (magma.esdm.go.id) rejects unknown user agents with a fast 502.
// Impersonate a real browser for that host; the other BMKG endpoints don't
// care and accept our proxy's own UA fine.
$isMagma = $h === 'magma';
$ua = $isMagma
    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    : 'map-visualizer-bmkg-proxy/1.0';

$opts = [
         CURLOPT_RETURNTRANSFER => true,
         CURLOPT_FOLLOWLOCATION => true,
         CURLOPT_TIMEOUT        => $isMagma ? 90 : 60,
         CURLOPT_CONNECTTIMEOUT => 10,
         CURLOPT_USERAGENT      => $ua,
         CURLOPT_HTTPHEADER     => $isMagma
             ? ['Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language: id,en;q=0.8']
             : [],
        ];

$ch = curl_init($url);
curl_setopt_array($ch, $opts);
$body = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($body === false || $code === 0) {
    http_response_code(502);
    header('Content-Type: text/plain');
    exit('upstream error: '.$err);
}

http_response_code($code);
header('Content-Type: '.$matched[2]);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age='.$matched[3]);
header('Content-Length: '.strlen($body));

// Stream via fwrite (not echo) so the response body is emitted as bytes
// bound to a whitelisted, non-HTML Content-Type — never interpreted as HTML.
$out = fopen('php://output', 'wb');
fwrite($out, $body);
fclose($out);
