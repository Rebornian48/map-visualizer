<?php
/*
 * Opentransum CDN proxy — adds CORS header so the map-visualizer
 * frontend (different origin) can fetch data files.
 * Upload to: public_html/otsum/proxy.php.
 * Endpoint:  https://rebornian48.my.id/otsum/proxy.php?f=<filename>.
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$allow = [
          'transsemarang.json'    => 'application/json',
          'metrojabartrans.json'  => 'application/json',
          'buslistrikmedan.json'  => 'application/json',
          'transkotaradja.json'   => 'application/json',
          'transpakuan.json'      => 'application/json',
          'mitradarat.json'       => 'application/json',
          'krl_lines.geojson'     => 'application/geo+json',
          'lrt_mrt_lines.geojson' => 'application/geo+json',
          'rails.kml'             => 'application/vnd.google-earth.kml+xml',
          'file_gtfs.zip'         => 'application/zip',
         ];

$file = basename(($_GET['f'] ?? ''));
if (array_key_exists($file, $allow) === false) {
    http_response_code(404);
    header('Content-Type: text/plain');
    exit('unknown file');
}

$url = 'https://cdn.opentransum.randspace0.com/transport-data/'.$file;

$opts = [
         CURLOPT_RETURNTRANSFER => true,
         CURLOPT_FOLLOWLOCATION => true,
         CURLOPT_TIMEOUT        => 60,
         CURLOPT_CONNECTTIMEOUT => 10,
         CURLOPT_USERAGENT      => 'map-visualizer-proxy/1.0',
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
header('Content-Type: '.$allow[$file]);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=3600');
header('Content-Length: '.strlen($body));

// Stream via fwrite (not echo) so the response body is emitted as bytes
// bound to a whitelisted, non-HTML Content-Type — never interpreted as HTML.
$out = fopen('php://output', 'wb');
fwrite($out, $body);
fclose($out);
