<?php
// Opentransum CDN proxy — adds CORS header so the map-visualizer
// frontend (different origin) can fetch data files.
// Upload to: public_html/otsum/proxy.php
// Endpoint:  https://rebornian48.my.id/otsum/proxy.php?f=<filename>

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$allow = [
    'transsemarang.json',
    'metrojabartrans.json',
    'buslistrikmedan.json',
    'transkotaradja.json',
    'transpakuan.json',
    'mitradarat.json',
    'krl_lines.geojson',
    'lrt_mrt_lines.geojson',
    'rails.kml',
    'file_gtfs.zip',
];

$file = basename($_GET['f'] ?? '');
if (!in_array($file, $allow, true)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    exit('unknown file');
}

$url = 'https://cdn.opentransum.randspace0.com/transport-data/' . $file;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT      => 'map-visualizer-proxy/1.0',
]);
$body  = curl_exec($ch);
$err   = curl_error($ch);
$ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/octet-stream';
$code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false || $code === 0) {
    http_response_code(502);
    header('Content-Type: text/plain');
    exit('upstream error: ' . $err);
}

http_response_code($code);
header('Content-Type: ' . $ctype);
header('Cache-Control: public, max-age=3600');
header('Content-Length: ' . strlen($body));
echo $body;
