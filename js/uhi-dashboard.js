/**
 * uhi-dashboard.js - Interactive NOVA Urban Heat Island Web Dashboard
 * Ultra-lightweight, zero-build, vanilla JavaScript Leaflet application.
 * Adheres strictly to GEMINI.md design standards.
 */

(function () {
  'use strict';

  // Constants & Projections (WGS84 Ellipsoid <-> UTM Zone 18N)
  const A = 6378137.0;
  const F = 1.0 / 298.257223563;
  const K0 = 0.9996;
  const LON0 = -75.0 * Math.PI / 180.0;
  const E2 = 2 * F - F * F;
  const E_PRIME2 = E2 / (1.0 - E2);
  const E1 = (1.0 - Math.sqrt(1.0 - E2)) / (1.0 + Math.sqrt(1.0 - E2));

  function wgs84ToUtm18(lat, lon) {
    const phi = lat * Math.PI / 180.0;
    const lam = lon * Math.PI / 180.0;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);

    const N = A / Math.sqrt(1.0 - E2 * sinPhi * sinPhi);
    const T = tanPhi * tanPhi;
    const C = E_PRIME2 * cosPhi * cosPhi;
    const delLam = (lam - LON0) * cosPhi;

    const M = A * (
      (1.0 - E2 / 4.0 - 3.0 * E2 * E2 / 64.0 - 5.0 * Math.pow(E2, 3) / 256.0) * phi
      - (3.0 * E2 / 8.0 + 3.0 * E2 * E2 / 32.0 + 45.0 * Math.pow(E2, 3) / 1024.0) * Math.sin(2.0 * phi)
      + (15.0 * E2 * E2 / 256.0 + 45.0 * Math.pow(E2, 3) / 1024.0) * Math.sin(4.0 * phi)
      - (35.0 * Math.pow(E2, 3) / 3072.0) * Math.sin(6.0 * phi)
    );

    const x = 500000.0 + K0 * N * (
      delLam + (1.0 - T + C) * Math.pow(delLam, 3) / 6.0
      + (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * E_PRIME2) * Math.pow(delLam, 5) / 120.0
    );

    const y = K0 * (
      M + N * tanPhi * (
        delLam * delLam / 2.0
        + (5.0 - T + 9.0 * C + 4.0 * C * C) * Math.pow(delLam, 4) / 24.0
        + (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * E_PRIME2) * Math.pow(delLam, 6) / 720.0
      )
    );

    return { x, y };
  }

  function utm18ToWgs84(x, y) {
    const xAdj = x - 500000.0;
    const M = y / K0;
    const mu = M / (A * (1.0 - E2 / 4.0 - 3.0 * E2 * E2 / 64.0 - 5.0 * Math.pow(E2, 3) / 256.0));

    const phi1 = mu
      + (3.0 * E1 / 2.0 - 27.0 * Math.pow(E1, 3) / 32.0) * Math.sin(2.0 * mu)
      + (21.0 * E1 * E1 / 16.0 - 55.0 * Math.pow(E1, 4) / 32.0) * Math.sin(4.0 * mu)
      + (151.0 * Math.pow(E1, 3) / 96.0) * Math.sin(6.0 * mu)
      + (1097.0 * Math.pow(E1, 4) / 512.0) * Math.sin(8.0 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);

    const N1 = A / Math.sqrt(1.0 - E2 * sinPhi1 * sinPhi1);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = E_PRIME2 * cosPhi1 * cosPhi1;
    const R1 = A * (1.0 - E2) / Math.pow(1.0 - E2 * sinPhi1 * sinPhi1, 1.5);
    const D = xAdj / (N1 * K0);

    const lat = phi1 - (N1 * tanPhi1 / R1) * (
      D * D / 2.0
      - (5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * E_PRIME2) * Math.pow(D, 4) / 24.0
      + (61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * E_PRIME2 - 3.0 * C1 * C1) * Math.pow(D, 6) / 720.0
    );

    const lon = LON0 + (
      D
      - (1.0 + 2.0 * T1 + C1) * Math.pow(D, 3) / 6.0
      + (5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * E_PRIME2 + 24.0 * T1 * T1) * Math.pow(D, 5) / 120.0
    ) / cosPhi1;

    return { lat: lat * 180.0 / Math.PI, lon: lon * 180.0 / Math.PI };
  }

  // Application State
  const state = {
    manifest: null,
    mercatorMap: null,
    gridData: {},
    map: null,
    overlayLayer: null,
    countiesLayer: null,
    highlightLayer: null,
    currentPeriod: 'af', // 'am' | 'af' | 'pm' | 'diurnal'
    currentVar: 'temp',  // 'temp' | 'anom' | 'spot' | 'canopy' | 'pers'
    selectedCellIndex: null,
    canvas: null,
    ctx: null,
    canvasWidth: 523,
    canvasHeight: 479
  };

  // DOM Elements
  let elMap, elPopover, elSidePanel, elPeriodSelect, elVarSelect, elLegend, elLoading;

  async function init() {
    elMap = document.getElementById('uhi-map');
    elPopover = document.getElementById('uhi-popover');
    elSidePanel = document.getElementById('uhi-side-panel');
    elPeriodSelect = document.getElementById('uhi-period-select');
    elVarSelect = document.getElementById('uhi-var-select');
    elLegend = document.getElementById('uhi-legend');
    elLoading = document.getElementById('uhi-loading');

    // Setup close button on side panel
    document.getElementById('uhi-close-btn').addEventListener('click', () => {
      closeSidePanel();
    });

    // Setup event listeners on controls
    elPeriodSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      state.currentPeriod = val;
      if (val === 'diurnal') {
        elVarSelect.value = 'pers';
        state.currentVar = 'pers';
      } else if (state.currentVar === 'pers') {
        elVarSelect.value = 'temp';
        state.currentVar = 'temp';
      }
      renderActiveLayer();
      updateLegend();
      if (state.selectedCellIndex !== null) {
        updateSidePanel(state.selectedCellIndex);
      }
    });

    elVarSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      state.currentVar = val;
      if (val === 'pers' && state.currentPeriod !== 'diurnal') {
        elPeriodSelect.value = 'diurnal';
        state.currentPeriod = 'diurnal';
      } else if (val !== 'pers' && state.currentPeriod === 'diurnal') {
        elPeriodSelect.value = 'af';
        state.currentPeriod = 'af';
      }
      renderActiveLayer();
      updateLegend();
    });

    // Offscreen Canvas for instant projection rendering
    state.canvas = document.createElement('canvas');
    state.canvas.width = state.canvasWidth;
    state.canvas.height = state.canvasHeight;
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

    // Load Data
    await loadData();

    // Initialize Map
    initMap();

    // Render Initial Map Layer
    renderActiveLayer();
    updateLegend();

    // Hide Loading Screen
    if (elLoading) {
      elLoading.style.opacity = '0';
      setTimeout(() => { elLoading.style.display = 'none'; }, 300);
    }
  }

  async function loadData() {
    const basePath = 'data/';
    try {
      const [manifestRes, mercatorRes, gridRes, countiesRes] = await Promise.all([
        fetch(basePath + 'manifest.json').then(r => r.json()),
        fetch(basePath + 'mercator_map.bin').then(r => r.arrayBuffer()),
        fetch(basePath + 'grid_data.bin').then(r => r.arrayBuffer()),
        fetch(basePath + 'counties.geojson').then(r => r.json())
      ]);

      state.manifest = manifestRes;
      state.mercatorMap = new Int32Array(mercatorRes);
      state.countiesGeoJSON = countiesRes;

      // Extract typed arrays from packed grid_data.bin using manifest offsets
      const totalCells = state.manifest.grid.total_cells;
      const off = state.manifest.offsets;

      state.gridData.inside = new Uint8Array(gridRes, off.inside, totalCells);
      state.gridData.temp_am = new Int16Array(gridRes, off.temp_am, totalCells);
      state.gridData.temp_af = new Int16Array(gridRes, off.temp_af, totalCells);
      state.gridData.temp_pm = new Int16Array(gridRes, off.temp_pm, totalCells);

      state.gridData.anom_am = new Int16Array(gridRes, off.anom_am, totalCells);
      state.gridData.anom_af = new Int16Array(gridRes, off.anom_af, totalCells);
      state.gridData.anom_pm = new Int16Array(gridRes, off.anom_pm, totalCells);

      state.gridData.canopy = new Uint8Array(gridRes, off.canopy, totalCells);

      state.gridData.spot_am = new Uint8Array(gridRes, off.spot_am, totalCells);
      state.gridData.spot_af = new Uint8Array(gridRes, off.spot_af, totalCells);
      state.gridData.spot_pm = new Uint8Array(gridRes, off.spot_pm, totalCells);

      state.gridData.pers = new Uint8Array(gridRes, off.pers, totalCells);

      state.gridData.z_am = new Int8Array(gridRes, off.z_am, totalCells);
      state.gridData.z_af = new Int8Array(gridRes, off.z_af, totalCells);
      state.gridData.z_pm = new Int8Array(gridRes, off.z_pm, totalCells);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (elLoading) {
        elLoading.innerHTML = `<div style="color:#E74C3C; font-weight:700;">Failed to load data assets. Please ensure static files are present in web_dashboard/data/</div>`;
      }
      throw err;
    }
  }

  function initMap() {
    const center = state.manifest.mercator.center;
    state.map = L.map('uhi-map', {
      center: [center[0], center[1]],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true
    });

    // Zoom control at bottom right to stay clean
    L.control.zoom({ position: 'bottomright' }).addTo(state.map);

    // OpenStreetMap standard open basemap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    // County boundary overlay
    if (state.countiesGeoJSON) {
      state.countiesLayer = L.geoJSON(state.countiesGeoJSON, {
        style: {
          color: '#4B5563',
          weight: 1.2,
          opacity: 0.65,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '3, 4'
        },
        interactive: false
      }).addTo(state.map);
    }

    // Grid ImageOverlay
    const overlayBounds = state.manifest.mercator.overlay_bounds;
    state.overlayLayer = L.imageOverlay('', overlayBounds, {
      opacity: 0.88,
      interactive: false
    }).addTo(state.map);

    // Mouse movement interaction (Hover Popover)
    const container = document.querySelector('.uhi-main-area') || document.querySelector('.uhi-container');
    state.map.on('mousemove', (e) => {
      handleMapMouseMove(e, container);
    });

    state.map.on('mouseout', () => {
      elPopover.style.display = 'none';
      elMap.style.cursor = '';
    });

    // Map Click Interaction (Side Detail Panel)
    state.map.on('click', (e) => {
      handleMapClick(e);
    });

    // Ensure Leaflet dimensions stay synchronized with layout
    window.addEventListener('resize', () => {
      if (state.map) state.map.invalidateSize();
    });
    setTimeout(() => {
      if (state.map) state.map.invalidateSize();
    }, 150);
  }

  function getCellAtLatLng(lat, lon) {
    const utm = wgs84ToUtm18(lat, lon);
    const bounds = state.manifest.grid.utm_bounds;
    const cellSize = state.manifest.grid.cell_size;
    const ncols = state.manifest.grid.ncols;
    const nrows = state.manifest.grid.nrows;

    const col = Math.floor((utm.x - bounds[0]) / cellSize);
    const row = Math.floor((bounds[3] - utm.y) / cellSize);

    if (col < 0 || col >= ncols || row < 0 || row >= nrows) {
      return null;
    }

    const cellIdx = row * ncols + col;
    if (state.gridData.inside[cellIdx] !== 1) {
      return null;
    }

    return { row, col, cellIdx, utm };
  }

  function handleMapMouseMove(e, container) {
    const cell = getCellAtLatLng(e.latlng.lat, e.latlng.lng);
    if (!cell) {
      elPopover.style.display = 'none';
      elMap.style.cursor = '';
      return;
    }

    elMap.style.cursor = 'pointer';

    const idx = cell.cellIdx;
    const rawAm = state.gridData.temp_am[idx];
    const rawAf = state.gridData.temp_af[idx];
    const rawPm = state.gridData.temp_pm[idx];

    const vAm = rawAm === -32768 ? null : rawAm / 10.0;
    const vAf = rawAf === -32768 ? null : rawAf / 10.0;
    const vPm = rawPm === -32768 ? null : rawPm / 10.0;

    const tAm = vAm !== null ? vAm.toFixed(1) + '°F' : '—';
    const tAf = vAf !== null ? vAf.toFixed(1) + '°F' : '—';
    const tPm = vPm !== null ? vPm.toFixed(1) + '°F' : '—';

    // Scale temperatures across realistic range (65°F to 105°F) for visible mini-bar comparison
    function tempToBarPct(val) {
      if (val === null) return 0;
      return Math.max(10, Math.min(100, Math.round(((val - 65.0) / 40.0) * 100)));
    }

    // Position popover safely inside container
    const pt = state.map.latLngToContainerPoint(e.latlng);
    let left = pt.x + 16;
    let top = pt.y + 16;
    const rect = container.getBoundingClientRect();
    if (left + 280 > rect.width) {
      left = pt.x - 290;
    }
    if (top + 170 > rect.height) {
      top = pt.y - 160;
    }

    elPopover.style.left = left + 'px';
    elPopover.style.top = top + 'px';
    elPopover.style.display = 'block';

    document.getElementById('uhi-pop-am').textContent = tAm;
    document.getElementById('uhi-pop-af').textContent = tAf;
    document.getElementById('uhi-pop-pm').textContent = tPm;

    document.getElementById('uhi-pop-bar-am').style.width = tempToBarPct(vAm) + '%';
    document.getElementById('uhi-pop-bar-af').style.width = tempToBarPct(vAf) + '%';
    document.getElementById('uhi-pop-bar-pm').style.width = tempToBarPct(vPm) + '%';
  }

  function handleMapClick(e) {
    const cell = getCellAtLatLng(e.latlng.lat, e.latlng.lng);
    if (!cell) {
      return;
    }

    state.selectedCellIndex = cell.cellIdx;
    highlightCell(cell.row, cell.col);
    updateSidePanel(cell.cellIdx);
    openSidePanel();
  }

  function highlightCell(row, col) {
    if (state.highlightLayer) {
      state.map.removeLayer(state.highlightLayer);
      state.highlightLayer = null;
    }

    const bounds = state.manifest.grid.utm_bounds;
    const cellSize = state.manifest.grid.cell_size;

    const x0 = bounds[0] + col * cellSize;
    const x1 = x0 + cellSize;
    const y1 = bounds[3] - row * cellSize;
    const y0 = y1 - cellSize;

    const p0 = utm18ToWgs84(x0, y0);
    const p1 = utm18ToWgs84(x1, y0);
    const p2 = utm18ToWgs84(x1, y1);
    const p3 = utm18ToWgs84(x0, y1);

    const latlngs = [
      [p0.lat, p0.lon],
      [p1.lat, p1.lon],
      [p2.lat, p2.lon],
      [p3.lat, p3.lon]
    ];

    state.highlightLayer = L.polygon(latlngs, {
      color: '#1F2937',
      weight: 2.5,
      fillColor: '#1F2937',
      fillOpacity: 0.25,
      interactive: false
    }).addTo(state.map);
  }

  function openSidePanel() {
    elSidePanel.classList.add('open');
  }

  function closeSidePanel() {
    elSidePanel.classList.remove('open');
    if (state.highlightLayer) {
      state.map.removeLayer(state.highlightLayer);
      state.highlightLayer = null;
    }
    state.selectedCellIndex = null;
  }

  function updateSidePanel(idx) {
    const stats = state.manifest.stats;
    const labels = state.manifest.labels;
    const colors = state.manifest.colors;

    // 1. Tree Canopy Cover
    const canopyVal = state.gridData.canopy[idx];
    const canopyText = canopyVal === 255 ? 'No Data' : canopyVal + '%';
    document.getElementById('uhi-panel-canopy').textContent = canopyText;
    const canopyBar = document.getElementById('uhi-canopy-fill');
    if (canopyVal <= 100) {
      canopyBar.style.width = canopyVal + '%';
      canopyBar.style.background = '#15803D';
    } else {
      canopyBar.style.width = '0%';
    }

    const meanCanopy = stats.canopy.mean;
    const canopyDiff = canopyVal !== 255 ? (canopyVal - meanCanopy).toFixed(1) : null;
    const diffText = canopyDiff !== null 
      ? (canopyDiff >= 0 ? `+${canopyDiff}% above regional mean (${meanCanopy}%)` : `${canopyDiff}% below regional mean (${meanCanopy}%)`)
      : '';
    document.getElementById('uhi-panel-canopy-sub').textContent = diffText;

    // 2. Hot / Cold Spot Persistence
    const persVal = state.gridData.pers[idx];
    const persLabel = (persVal >= 0 && persVal < labels.persistence.length) ? labels.persistence[persVal] : 'Unknown';
    const persColorRgb = colors.persistence[persVal.toString()] || [127, 140, 141];
    const persColorHex = `rgb(${persColorRgb[0]}, ${persColorRgb[1]}, ${persColorRgb[2]})`;

    const badgeEl = document.getElementById('uhi-panel-pers');
    badgeEl.textContent = persLabel;
    badgeEl.style.color = (persVal === 0 || persVal === 1) ? '#1F2937' : persColorHex;

    const persSubEl = document.getElementById('uhi-panel-pers-sub');
    if (persVal === 4) persSubEl.textContent = 'All-day thermal refuge: significantly cooler in morning, afternoon, and evening.';
    else if (persVal === 7) persSubEl.textContent = 'Severe heat island: significantly warmer across all 3 survey periods.';
    else if (persVal === 1) persSubEl.textContent = 'Opposing thermal behavior between daytime heating and nocturnal cooling.';
    else if (persVal >= 2 && persVal <= 3) persSubEl.textContent = `Consistently cooler during ${persVal - 1} period(s).`;
    else if (persVal >= 5 && persVal <= 6) persSubEl.textContent = `Elevated heat during ${persVal - 4} period(s).`;
    else persSubEl.textContent = 'Air temperatures within typical expected range (statistically baseline).';

    // 3. Diurnal Temperatures & Anomalies
    function formatPeriod(tempRaw, anomRaw, spotVal) {
      if (tempRaw === -32768) return { temp: '—', anom: '—', badge: '' };
      const tempF = (tempRaw / 10.0).toFixed(1) + '°F';
      const anomF = (anomRaw / 100.0);
      const anomStr = (anomF >= 0 ? `+${anomF.toFixed(1)}°F` : `${anomF.toFixed(1)}°F`);
      let badge = 'Neutral';
      let badgeColor = '#7F8C8D';
      if (spotVal === 1) { badge = 'Cold Spot'; badgeColor = '#2980B9'; }
      if (spotVal === 2) { badge = 'Hot Spot'; badgeColor = '#E74C3C'; }
      return { temp: tempF, anom: anomStr, badge, badgeColor };
    }

    const dAm = formatPeriod(state.gridData.temp_am[idx], state.gridData.anom_am[idx], state.gridData.spot_am[idx]);
    const dAf = formatPeriod(state.gridData.temp_af[idx], state.gridData.anom_af[idx], state.gridData.spot_af[idx]);
    const dPm = formatPeriod(state.gridData.temp_pm[idx], state.gridData.anom_pm[idx], state.gridData.spot_pm[idx]);

    document.getElementById('uhi-d-am-val').textContent = dAm.temp;
    document.getElementById('uhi-d-am-anom').textContent = dAm.anom;
    document.getElementById('uhi-d-am-tag').textContent = dAm.badge;
    document.getElementById('uhi-d-am-tag').style.color = dAm.badgeColor;

    document.getElementById('uhi-d-af-val').textContent = dAf.temp;
    document.getElementById('uhi-d-af-anom').textContent = dAf.anom;
    document.getElementById('uhi-d-af-tag').textContent = dAf.badge;
    document.getElementById('uhi-d-af-tag').style.color = dAf.badgeColor;

    document.getElementById('uhi-d-pm-val').textContent = dPm.temp;
    document.getElementById('uhi-d-pm-anom').textContent = dPm.anom;
    document.getElementById('uhi-d-pm-tag').textContent = dPm.badge;
    document.getElementById('uhi-d-pm-tag').style.color = dPm.badgeColor;
  }

  // Map Layer Canvas Renderer
  function renderActiveLayer() {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const imgData = state.ctx.createImageData(w, h);
    const data = imgData.data;
    const mercMap = state.mercatorMap;
    const totalPixels = w * h;

    const period = state.currentPeriod === 'diurnal' ? 'af' : state.currentPeriod;
    const activeVar = state.currentVar;

    const colors = state.manifest.colors;
    const stats = state.manifest.stats;

    // Prepare active array and color mapping function
    if (activeVar === 'temp') {
      const arr = state.gridData[`temp_${period}`];
      const pStat = stats[`temp_${period}`];
      const minVal = pStat.p2;
      const maxVal = pStat.p98;
      const lut = colors.temp_lut;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const raw = arr[gIdx];
        if (raw === -32768) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const val = raw / 10.0;
        let norm = (val - minVal) / (maxVal - minVal);
        if (norm < 0) norm = 0;
        else if (norm > 1) norm = 1;
        const lutIdx = Math.floor(norm * 255);
        const rgb = lut[lutIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 230;
      }
    } else if (activeVar === 'anom') {
      const arr = state.gridData[`anom_${period}`];
      const limit = stats.anom.limit; // 6.0 deg F
      const lut = colors.anom_lut;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const raw = arr[gIdx];
        if (raw === -32768) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const val = raw / 100.0;
        let norm = (val + limit) / (2 * limit);
        if (norm < 0) norm = 0;
        else if (norm > 1) norm = 1;
        const lutIdx = Math.floor(norm * 255);
        const rgb = lut[lutIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 230;
      }
    } else if (activeVar === 'spot') {
      const arr = state.gridData[`spot_${period}`];
      const spotColors = colors.spots;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const sVal = arr[gIdx];
        if (sVal === 255) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const rgb = spotColors[sVal.toString()] || [229, 231, 235];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = sVal === 0 ? 90 : 235; // subtle for not-sig
      }
    } else if (activeVar === 'pers') {
      const arr = state.gridData.pers;
      const persColors = colors.persistence;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const pVal = arr[gIdx];
        if (pVal === 255) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const rgb = persColors[pVal.toString()] || [229, 231, 235];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = pVal === 0 ? 80 : 235;
      }
    } else if (activeVar === 'canopy') {
      const arr = state.gridData.canopy;
      const lut = colors.canopy_lut;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const cVal = arr[gIdx];
        if (cVal === 255) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const norm = cVal / 100.0;
        const lutIdx = Math.floor(norm * 255);
        const rgb = lut[lutIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 230;
      }
    }

    state.ctx.putImageData(imgData, 0, 0);
    const dataUrl = state.canvas.toDataURL();
    state.overlayLayer.setUrl(dataUrl);
  }

  function updateLegend() {
    const activeVar = state.currentVar;
    const period = state.currentPeriod === 'diurnal' ? 'af' : state.currentPeriod;
    const stats = state.manifest.stats;

    let html = '';

    if (activeVar === 'temp') {
      const pStat = stats[`temp_${period}`];
      const periodLabel = period === 'am' ? 'Morning' : (period === 'af' ? 'Afternoon' : 'Evening');
      html = `
        <div class="uhi-legend-title">${periodLabel} Air Temperature (°F)</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, #ffffb2, #fed976, #feb24c, #fd8d3c, #f03b20, #bd0026);"></div>
        <div class="uhi-legend-scale">
          <span>${pStat.p2.toFixed(1)}°F</span>
          <span>Mean ${pStat.mean.toFixed(1)}°F</span>
          <span>${pStat.p98.toFixed(1)}°F</span>
        </div>
      `;
    } else if (activeVar === 'anom') {
      html = `
        <div class="uhi-legend-title">Temperature Anomaly vs Regional Mean</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, #2b83ba, #abdda4, #ffffbf, #fdae61, #d7191c);"></div>
        <div class="uhi-legend-scale">
          <span>-6.0°F (Cooler)</span>
          <span>0.0°F</span>
          <span>+6.0°F (Warmer)</span>
        </div>
      `;
    } else if (activeVar === 'spot') {
      html = `
        <div class="uhi-legend-title">Temperature Hot and Cold Spots</div>
        <div class="uhi-legend-items">
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E74C3C;"></span>
            <span>Hot Spot (Significant Heat Cluster)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #2980B9;"></span>
            <span>Cold Spot (Significant Cool Refuge)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E5E7EB; border: 1px solid #CBD5E1;"></span>
            <span>Not Significant (Baseline)</span>
          </div>
        </div>
      `;
    } else if (activeVar === 'pers') {
      html = `
        <div class="uhi-legend-title">Hot / Cold Spot Persistence</div>
        <div class="uhi-legend-items">
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E74C3C;"></span>
            <span>Hot Spot — All 3 Periods (Severe Island)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #F1948A;"></span>
            <span>Hot Spot — 2 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #FADBD8;"></span>
            <span>Hot Spot — 1 Period</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #2980B9;"></span>
            <span>Cold Spot — All 3 Periods (Refuge)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #85C1E9;"></span>
            <span>Cold Spot — 2 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #CBD5E1;"></span>
            <span>Mixed Shift (Warm & Cool)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E5E7EB; border: 1px solid #CBD5E1;"></span>
            <span>Not Significant</span>
          </div>
        </div>
      `;
    } else if (activeVar === 'canopy') {
      html = `
        <div class="uhi-legend-title">Tree Canopy Cover Percentage</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, #ffffe5, #d9f0a3, #78c679, #238443, #004529);"></div>
        <div class="uhi-legend-scale">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      `;
    }

    elLegend.innerHTML = html;
  }

  // Self Initialization on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

