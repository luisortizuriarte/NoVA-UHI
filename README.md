# Northern Virginia Urban Heat Island & Tree Canopy Web Dashboard

An interactive, lightweight, zero-build web dashboard designed to explore the high-resolution (100m) mobile microclimate campaign data across Northern Virginia.

## Features

- **Interactive Microclimate Map**:
  - Seamless pan, zoom, and inspection powered by Leaflet and OpenStreetMap basemaps (open API, no key required).
  - Dropdown selector for survey periods: **Morning (AM: 6–7 AM)**, **Afternoon (AF: 3–4 PM)**, **Evening (PM: 7–8 PM)**, and **Diurnal Summary**.
  - Dropdown selector for thematic layers:
    - **Air Temperature (°F)** (continuous thermal gradient).
    - **Temperature Anomaly (°F)** (deviation from regional spatial mean).
    - **Temperature Hot & Cold Spots** (statistically significant spatial clusters).
    - **Diurnal Persistence Level** (multi-period classification).
    - **Tree Canopy Cover (%)** (high-resolution canopy metrics).
- **Hover Popover**:
  - Instantaneous hover tooltip over any 100m grid cell displaying diurnal temperatures across all three survey periods (AM, AF, PM) with color coding matching project standards.
- **Side Detail Panel**:
  - Click on any survey cell to highlight its footprint and slide open an analytical inspection panel:
    - **Tree Canopy Cover (%)** with a dynamic visual gauge and comparison to the regional baseline ($50.2\%$).
    - **Diurnal Persistence Level** badge and ecological/heat exposure interpretation.
    - **Diurnal Temperatures & Anomalies Grid** showing exact observed temperature, departure from spatial mean, and spot classification.
- **Visual Design Standard Compliance**:
  - Follows `GEMINI.md` presentation standards: **Figtree** typography, `#2980B9` (AM), `#F39C12` (AF), `#E74C3C` (PM), `#ECF0F1` rounded card backgrounds, and de-cluttered Tufte layout.
- **High Performance & Lightweight**:
  - Zero framework dependencies (no React, Vue, or Webpack required).
  - Compact binary typed arrays (`grid_data.bin` ~3 MB, `mercator_map.bin` ~1 MB) allow instant loading and offscreen canvas repainting in under 5 milliseconds.

---

## Directory Structure

```
web_dashboard/
├── index.html               # Main standalone application page
├── embed_example.html       # Responsive iframe embedding demonstration
├── README.md                # Documentation and embedding guide
├── css/
│   └── uhi-dashboard.css    # Clean, modern styles adhering to GEMINI.md
├── js/
│   └── uhi-dashboard.js     # Analytical projection and interactive logic
└── data/
    ├── manifest.json        # Grid dimensions, bounds, stats, and color LUTs
    ├── grid_data.bin        # Packed typed arrays for all 144,438 grid cells
    ├── mercator_map.bin     # Precomputed EPSG:3857 canvas projection lookup table
    └── counties.geojson     # Simplified NOVA county boundary outlines
```

---

## How to Run Locally

Because the dashboard loads typed binary arrays and GeoJSON via `fetch`, it must be served via HTTP:

```bash
# From within the repository root or web_dashboard directory:
python -m http.server 8000 --directory web_dashboard
```

Then open your browser to:
```
http://localhost:8000/
```

Or view the embedding preview:
```
http://localhost:8000/embed_example.html
```

---

## How to Embed in an External Website or CMS

### Option 1: Standard Iframe (Recommended for WordPress, Squarespace, Webflow, Hugo)

Upload the `web_dashboard` directory to your web server or hosting service (e.g. GitHub Pages, Netlify, Vercel, S3, or your institution's web server) and place this responsive embed tag:

```html
<iframe 
  src="https://yourdomain.org/web_dashboard/index.html" 
  width="100%" 
  height="720" 
  style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; min-height: 600px;"
  title="Northern Virginia Urban Heat Island Dashboard"
  loading="lazy">
</iframe>
```

### Option 2: Full Screen / Dedicated Standalone Page

Directly link visitors to `web_dashboard/index.html`, which fills the viewport responsively across desktop, tablet, and mobile devices.

