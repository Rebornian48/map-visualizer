import L from "leaflet";

// Shared L.divIcon factories so overlays can render textbook-style
// pictograms (triangle for volcano, bus/train glyph for transit) instead
// of generic circles.
//
// Each returns an L.divIcon anchored at its centre so the marker sits
// exactly on its coordinate. Callers pass explicit size and colour so
// per-marker scaling (elevation / status level / brand colour) stays a
// caller concern.

function svgDivIcon({ svg, size, className = "" }) {
  return L.divIcon({
    html: svg,
    className: `map-icon ${className}`.trim(),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function triangleIcon({ size = 16, fill, stroke = "#ffffff", strokeWidth = 1.5, fillOpacity = 0.85 }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">
    <polygon points="12,3 22,20 2,20" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
  </svg>`;
  return svgDivIcon({ svg, size, className: "triangle-icon" });
}

export function busIcon({ size = 18, color = "#00ccaa" }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
    <rect x="4" y="3" width="16" height="14" rx="2" fill="${color}" stroke="#fff" stroke-width="1.2" />
    <rect x="6" y="5" width="3.5" height="3" fill="#ffffff" opacity="0.9" />
    <rect x="10.25" y="5" width="3.5" height="3" fill="#ffffff" opacity="0.9" />
    <rect x="14.5" y="5" width="3.5" height="3" fill="#ffffff" opacity="0.9" />
    <line x1="4" y1="12" x2="20" y2="12" stroke="#fff" stroke-width="1" opacity="0.6" />
    <circle cx="8" cy="18" r="1.6" fill="#222" stroke="#fff" stroke-width="0.5" />
    <circle cx="16" cy="18" r="1.6" fill="#222" stroke="#fff" stroke-width="0.5" />
  </svg>`;
  return svgDivIcon({ svg, size, className: "bus-icon" });
}

export function trainIcon({ size = 18, color = "#ffcc00" }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
    <rect x="6" y="3" width="12" height="15" rx="3" fill="${color}" stroke="#333" stroke-width="1" />
    <rect x="8" y="5" width="8" height="5" fill="#ffffff" opacity="0.92" />
    <line x1="6" y1="13" x2="18" y2="13" stroke="#333" stroke-width="0.9" />
    <circle cx="9" cy="18" r="1.3" fill="#222" />
    <circle cx="15" cy="18" r="1.3" fill="#222" />
    <line x1="4" y1="21" x2="8" y2="21" stroke="#666" stroke-width="1.4" />
    <line x1="16" y1="21" x2="20" y2="21" stroke="#666" stroke-width="1.4" />
  </svg>`;
  return svgDivIcon({ svg, size, className: "train-icon" });
}
