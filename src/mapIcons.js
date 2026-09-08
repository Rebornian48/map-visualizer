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

export function planeIcon({ size = 18, color = "#1e88e5" }) {
  // Filled paper-plane silhouette so an airport symbol reads at a glance
  // even at small size. Slight rotation so it looks like it's taking off
  // to the upper-right (matches the textbook glyph).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">
    <g transform="rotate(-30 12 12)">
      <path d="M2 12l20-8-8 20-3-8-9-4z" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M10 14l4-4" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7" />
    </g>
  </svg>`;
  return svgDivIcon({ svg, size, className: "plane-icon" });
}

export function anchorIcon({ size = 18, color = "#0288d1" }) {
  // Textbook glyph for a sea port — a filled anchor. White stroke keeps it
  // legible against dark satellite basemaps and coloured harbour polygons.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">
    <g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="4.5" r="1.8" fill="#ffffff" />
      <line x1="12" y1="6.3" x2="12" y2="20.5" />
      <line x1="8.5" y1="10" x2="15.5" y2="10" />
      <path d="M4 15c1.5 3.5 4.7 5.5 8 5.5s6.5-2 8-5.5" />
      <polyline points="4,15 4.2,12.6 6.4,13.6" fill="${color}" />
      <polyline points="20,15 19.8,12.6 17.6,13.6" fill="${color}" />
    </g>
  </svg>`;
  return svgDivIcon({ svg, size, className: "anchor-icon" });
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
