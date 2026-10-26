/**
 * uhi-accessible.js - Accessible NOVA Urban Heat Island Web Dashboard
 * Segmented Colormaps (7 segments for temp & anom, 5 quintile segments for canopy),
 * Headings in #34495E, Temperature bar charts in #E74C3C, and floating About buttons.
 */

(function () {
  'use strict';

  // 7-segment Colormaps
  const REDS_7 = [[253, 216, 200], [252, 176, 148], [251, 132, 100], [246, 87, 62], [222, 42, 37], [181, 18, 24], [126, 5, 16]];
  const COOLWARM_7 = [[76, 102, 214], [124, 160, 249], [176, 203, 251], [220, 220, 221], [246, 189, 164], [238, 134, 105], [201, 59, 55]];
  // 5-quintile Canopy Colormap (YlGn)
  const YLGN_5 = [[241, 249, 180], [182, 224, 146], [98, 187, 110], [34, 131, 66], [0, 82, 46]];

  // Gradients for segmented legends
  const REDS_STEP_GRADIENT = "#fdd8c8 0.00%, #fdd8c8 14.29%, #fcb094 14.29%, #fcb094 28.57%, #fb8464 28.57%, #fb8464 42.86%, #f6573e 42.86%, #f6573e 57.14%, #de2a25 57.14%, #de2a25 71.43%, #b51218 71.43%, #b51218 85.71%, #7e0510 85.71%, #7e0510 100.00%";
  const COOLWARM_STEP_GRADIENT = "#4c66d6 0.00%, #4c66d6 14.29%, #7ca0f9 14.29%, #7ca0f9 28.57%, #b0cbfb 28.57%, #b0cbfb 42.86%, #dcdcdd 42.86%, #dcdcdd 57.14%, #f6bda4 57.14%, #f6bda4 71.43%, #ee8669 71.43%, #ee8669 85.71%, #c93b37 85.71%, #c93b37 100.00%";
  const YLGN_STEP_GRADIENT = "#f1f9b4 0.00%, #f1f9b4 20.00%, #b6e092 20.00%, #b6e092 40.00%, #62bb6e 40.00%, #62bb6e 60.00%, #228342 60.00%, #228342 80.00%, #00522e 80.00%, #00522e 100.00%";

  // Categorical spot colors
  const ACCESSIBLE_SPOTS = {
    '0': [226, 232, 240], // Not significant
    '1': [30, 64, 175],   // Cold Spot (Blue 800)
    '2': [185, 28, 28]    // Hot Spot (Red 700)
  };

  const ACCESSIBLE_PERSISTENCE = {
    '0': [226, 232, 240],
    '1': [148, 163, 184],
    '2': [147, 197, 253],
    '3': [59, 130, 246],
    '4': [30, 64, 175],
    '5': [252, 165, 165],
    '6': [239, 68, 68],
    '7': [185, 28, 28]
  };

  // UTM Zone 18N <-> WGS84 Transforms
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
    currentPeriod: 'af',
    currentVar: 'temp',
    selectedCellIndex: null,
    canvas: null,
    ctx: null,
    canvasWidth: 523,
    canvasHeight: 479
  };

  let elMap, elPopover, elSidePanel, elPeriodSelect, elVarSelect, elLegend, elLoading, elAnnouncer;
  let elAboutBtn, elAboutPanel, elAboutCloseBtn;
  let elOrgsBtn, elOrgsPanel, elOrgsCloseBtn;

  function announce(msg) {
    if (elAnnouncer) elAnnouncer.textContent = msg;
  }

  async function init() {
    elMap = document.getElementById('uhi-map');
    elPopover = document.getElementById('uhi-popover');
    elSidePanel = document.getElementById('uhi-side-panel');
    elPeriodSelect = document.getElementById('uhi-period-select');
    elVarSelect = document.getElementById('uhi-var-select');
    elLegend = document.getElementById('uhi-legend');
    elLoading = document.getElementById('uhi-loading');
    elAnnouncer = document.getElementById('uhi-status-announcer');

    elAboutBtn = document.getElementById('uhi-about-btn');
    elAboutPanel = document.getElementById('uhi-about-panel');
    elAboutCloseBtn = document.getElementById('uhi-about-close-btn');

    elOrgsBtn = document.getElementById('uhi-orgs-btn');
    elOrgsPanel = document.getElementById('uhi-orgs-panel');
    elOrgsCloseBtn = document.getElementById('uhi-orgs-close-btn');

    // Close button for details panel
    document.getElementById('uhi-close-btn').addEventListener('click', () => {
      closeSidePanel();
      announce('Details panel closed.');
    });

    // About Campaign toggle & close
    if (elAboutBtn) {
      elAboutBtn.addEventListener('click', toggleAboutPanel);
    }
    if (elAboutCloseBtn) {
      elAboutCloseBtn.addEventListener('click', () => {
        closeAboutPanel();
        announce('Campaign overview closed.');
      });
    }

    // About Organizations toggle & close
    if (elOrgsBtn) {
      elOrgsBtn.addEventListener('click', toggleOrgsPanel);
    }
    if (elOrgsCloseBtn) {
      elOrgsCloseBtn.addEventListener('click', () => {
        closeOrgsPanel();
        announce('Organizations panel closed.');
      });
    }

    // Escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAboutPanel();
        closeOrgsPanel();
        closeSidePanel();
      }
    });

    // Select change listeners
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
      announce(`Time period changed to ${elPeriodSelect.options[elPeriodSelect.selectedIndex].text}`);
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
      announce(`Data layer changed to ${elVarSelect.options[elVarSelect.selectedIndex].text}`);
    });

    // Offscreen Canvas
    state.canvas = document.createElement('canvas');
    state.canvas.width = state.canvasWidth;
    state.canvas.height = state.canvasHeight;
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

    // Load Data
    try {
      await loadAssets();
    } catch (err) {
      console.error('Initialization error:', err);
      return;
    }

    // Initialize Map with 100% Open, Free Light Basemap
    initMap();

    renderActiveLayer();
    updateLegend();

    if (elLoading) {
      elLoading.style.opacity = '0';
      setTimeout(() => { elLoading.style.display = 'none'; }, 300);
    }
    announce('Map and microclimate data ready.');
  }

  async function loadAssets() {
    try {
      const [manifestRes, countiesRes, mercRes, gridRes] = await Promise.all([
        fetch('data/manifest.json').then(r => r.json()),
        fetch('data/counties.geojson').then(r => r.json()).catch(() => null),
        fetch('data/mercator_map.bin').then(r => r.arrayBuffer()),
        fetch('data/grid_data.bin').then(r => r.arrayBuffer())
      ]);

      state.manifest = manifestRes;
      state.countiesGeoJSON = countiesRes;
      state.mercatorMap = new Int32Array(mercRes);

      const totalCells = state.manifest.grid.total_cells;
      const off = state.manifest.offsets;

      state.gridData.inside = new Uint8Array(gridRes, off.inside, totalCells);
      state.gridData.canopy = new Uint8Array(gridRes, off.canopy, totalCells);
      state.gridData.pers = new Uint8Array(gridRes, off.pers, totalCells);

      state.gridData.temp_am = new Int16Array(gridRes, off.temp_am, totalCells);
      state.gridData.temp_af = new Int16Array(gridRes, off.temp_af, totalCells);
      state.gridData.temp_pm = new Int16Array(gridRes, off.temp_pm, totalCells);

      state.gridData.anom_am = new Int16Array(gridRes, off.anom_am, totalCells);
      state.gridData.anom_af = new Int16Array(gridRes, off.anom_af, totalCells);
      state.gridData.anom_pm = new Int16Array(gridRes, off.anom_pm, totalCells);

      state.gridData.spot_am = new Uint8Array(gridRes, off.spot_am, totalCells);
      state.gridData.spot_af = new Uint8Array(gridRes, off.spot_af, totalCells);
      state.gridData.spot_pm = new Uint8Array(gridRes, off.spot_pm, totalCells);

      state.gridData.z_am = new Int8Array(gridRes, off.z_am, totalCells);
      state.gridData.z_af = new Int8Array(gridRes, off.z_af, totalCells);
      state.gridData.z_pm = new Int8Array(gridRes, off.z_pm, totalCells);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (elLoading) {
        elLoading.innerHTML = `<div style="color:#34495E; font-weight:800; padding:20px; text-align:center;">Failed to load data assets. Please ensure static files are present in web_dashboard/data/</div>`;
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

    L.control.zoom({ position: 'bottomright' }).addTo(state.map);

    // 1. Primary White / Light Grayscale Basemap (OpenStreetMap Grayscale via CSS)
    // 100% Free, NO API KEY NEEDED, full zoom levels up to 19, street-level detail
    const osmLight = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'uhi-tiles-light',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });

    // 2. Esri World Gray Canvas (Minimalist Muted Cartography)
    // 100% Free, NO API KEY NEEDED
    const esriGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    });

    // 3. OpenStreetMap Standard (Full Color)
    const osmColor = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });

    // Default to clean Light Grayscale OSM
    osmLight.addTo(state.map);

    const baseMaps = {
      "Light Street (Grayscale OSM)": osmLight,
      "Gray Canvas (Esri Minimal)": esriGray,
      "OpenStreetMap (Color)": osmColor
    };
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(state.map);

    // County boundary overlay
    if (state.countiesGeoJSON) {
      state.countiesLayer = L.geoJSON(state.countiesGeoJSON, {
        style: {
          color: '#34495E',
          weight: 1.6,
          opacity: 0.70,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '4, 4'
        },
        interactive: false
      }).addTo(state.map);
    }

    // Grid ImageOverlay
    const overlayBounds = state.manifest.mercator.overlay_bounds;
    state.overlayLayer = L.imageOverlay('', overlayBounds, {
      opacity: 0.90,
      interactive: false
    }).addTo(state.map);

    const container = document.querySelector('.uhi-main-area') || document.querySelector('.uhi-container');
    state.map.on('mousemove', (e) => {
      handleMapMouseMove(e, container);
    });

    state.map.on('mouseout', () => {
      elPopover.style.display = 'none';
      elMap.style.cursor = '';
    });

    state.map.on('click', (e) => {
      handleMapClick(e);
    });

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

    function tempToBarPct(val) {
      if (val === null) return 0;
      return Math.max(10, Math.min(100, Math.round(((val - 65.0) / 40.0) * 100)));
    }

    const pt = state.map.latLngToContainerPoint(e.latlng);
    let left = pt.x + 18;
    let top = pt.y + 18;
    const rect = container.getBoundingClientRect();
    if (left + 310 > rect.width) {
      left = pt.x - 315;
    }
    if (top + 180 > rect.height) {
      top = pt.y - 175;
    }

    elPopover.style.left = left + 'px';
    elPopover.style.top = top + 'px';
    elPopover.style.display = 'block';

    document.getElementById('uhi-pop-am').textContent = tAm;
    document.getElementById('uhi-pop-af').textContent = tAf;
    document.getElementById('uhi-pop-pm').textContent = tPm;

    // Mini bar charts in #E74C3C
    document.getElementById('uhi-pop-bar-am').style.width = tempToBarPct(vAm) + '%';
    document.getElementById('uhi-pop-bar-af').style.width = tempToBarPct(vAf) + '%';
    document.getElementById('uhi-pop-bar-pm').style.width = tempToBarPct(vPm) + '%';
  }

  function handleMapClick(e) {
    const cell = getCellAtLatLng(e.latlng.lat, e.latlng.lng);
    if (!cell) return;

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
      color: '#34495E',
      weight: 2.8,
      fillColor: '#34495E',
      fillOpacity: 0.20,
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

  function toggleAboutPanel() {
    if (!elAboutPanel) return;
    const willOpen = !elAboutPanel.classList.contains('open');
    if (willOpen) {
      closeOrgsPanel();
      elAboutPanel.classList.add('open');
      if (elAboutBtn) {
        elAboutBtn.classList.add('active');
        elAboutBtn.setAttribute('aria-expanded', 'true');
      }
      announce('Campaign overview opened.');
    } else {
      closeAboutPanel();
      announce('Campaign overview closed.');
    }
  }

  function openAboutPanel() {
    if (!elAboutPanel) return;
    closeOrgsPanel();
    elAboutPanel.classList.add('open');
    if (elAboutBtn) {
      elAboutBtn.classList.add('active');
      elAboutBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeAboutPanel() {
    if (!elAboutPanel) return;
    elAboutPanel.classList.remove('open');
    if (elAboutBtn) {
      elAboutBtn.classList.remove('active');
      elAboutBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleOrgsPanel() {
    if (!elOrgsPanel) return;
    const willOpen = !elOrgsPanel.classList.contains('open');
    if (willOpen) {
      closeAboutPanel();
      elOrgsPanel.classList.add('open');
      if (elOrgsBtn) {
        elOrgsBtn.classList.add('active');
        elOrgsBtn.setAttribute('aria-expanded', 'true');
      }
      announce('Organizations panel opened.');
    } else {
      closeOrgsPanel();
      announce('Organizations panel closed.');
    }
  }

  function openOrgsPanel() {
    if (!elOrgsPanel) return;
    closeAboutPanel();
    elOrgsPanel.classList.add('open');
    if (elOrgsBtn) {
      elOrgsBtn.classList.add('active');
      elOrgsBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeOrgsPanel() {
    if (!elOrgsPanel) return;
    elOrgsPanel.classList.remove('open');
    if (elOrgsBtn) {
      elOrgsBtn.classList.remove('active');
      elOrgsBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // Update Data Summary on Click
  function updateSidePanel(idx) {
    const stats = state.manifest.stats;
    const labels = state.manifest.labels;

    // 1. Tree Canopy Cover
    const canopyVal = state.gridData.canopy[idx];
    const canopyText = canopyVal === 255 ? 'No Data' : canopyVal + '%';
    document.getElementById('uhi-panel-canopy').textContent = canopyText;
    const canopyBar = document.getElementById('uhi-canopy-fill');
    const canopyProgress = document.getElementById('uhi-canopy-progress');
    if (canopyVal <= 100) {
      canopyBar.style.width = canopyVal + '%';
      if (canopyProgress) canopyProgress.setAttribute('aria-valuenow', canopyVal);
    } else {
      canopyBar.style.width = '0%';
      if (canopyProgress) canopyProgress.setAttribute('aria-valuenow', 0);
    }

    const meanCanopy = stats.canopy.mean;
    const canopyDiff = canopyVal !== 255 ? (canopyVal - meanCanopy).toFixed(1) : null;
    const diffText = canopyDiff !== null 
      ? (canopyDiff >= 0 ? `+${canopyDiff}% above regional mean (${meanCanopy}%)` : `${canopyDiff}% below regional mean (${meanCanopy}%)`)
      : '';
    document.getElementById('uhi-panel-canopy-sub').textContent = diffText;

    // 2. Diurnal Persistence Level
    const persVal = state.gridData.pers[idx];
    const persLabel = (persVal >= 0 && persVal < labels.persistence.length) ? labels.persistence[persVal] : 'Unknown';
    document.getElementById('uhi-panel-pers').textContent = persLabel;

    const persSubEl = document.getElementById('uhi-panel-pers-sub');
    if (persVal === 4) persSubEl.textContent = 'All-day thermal refuge: significantly cooler in morning, afternoon, and evening.';
    else if (persVal === 7) persSubEl.textContent = 'Severe heat island: significantly warmer across all 3 survey periods.';
    else if (persVal === 1) persSubEl.textContent = 'Opposing thermal behavior between daytime heating and nocturnal cooling.';
    else if (persVal >= 2 && persVal <= 3) persSubEl.textContent = `Consistently cooler during ${persVal - 1} period(s).`;
    else if (persVal >= 5 && persVal <= 6) persSubEl.textContent = `Elevated heat during ${persVal - 4} period(s).`;
    else persSubEl.textContent = 'Air temperatures within typical expected range (statistically baseline).';

    // 3. Diurnal Temperatures & Anomalies
    function formatPeriod(tempRaw, anomRaw, spotVal) {
      if (tempRaw === -32768) return { temp: '—', anom: '—', badge: '—' };
      const tempF = (tempRaw / 10.0).toFixed(1) + '°F';
      const anomF = (anomRaw / 100.0);
      const anomStr = (anomF >= 0 ? `+${anomF.toFixed(1)}°F` : `${anomF.toFixed(1)}°F`);
      let badge = 'Baseline';
      if (spotVal === 1) badge = 'Cold Spot';
      if (spotVal === 2) badge = 'Hot Spot';
      return { temp: tempF, anom: anomStr, badge };
    }

    const dAm = formatPeriod(state.gridData.temp_am[idx], state.gridData.anom_am[idx], state.gridData.spot_am[idx]);
    const dAf = formatPeriod(state.gridData.temp_af[idx], state.gridData.anom_af[idx], state.gridData.spot_af[idx]);
    const dPm = formatPeriod(state.gridData.temp_pm[idx], state.gridData.anom_pm[idx], state.gridData.spot_pm[idx]);

    document.getElementById('uhi-d-am-val').textContent = dAm.temp;
    document.getElementById('uhi-d-am-anom').textContent = dAm.anom;
    document.getElementById('uhi-d-am-tag').textContent = dAm.badge;

    document.getElementById('uhi-d-af-val').textContent = dAf.temp;
    document.getElementById('uhi-d-af-anom').textContent = dAf.anom;
    document.getElementById('uhi-d-af-tag').textContent = dAf.badge;

    document.getElementById('uhi-d-pm-val').textContent = dPm.temp;
    document.getElementById('uhi-d-pm-anom').textContent = dPm.anom;
    document.getElementById('uhi-d-pm-tag').textContent = dPm.badge;

    announce(`Cell selected: Tree canopy ${canopyText}, Afternoon ${dAf.temp}, Anomaly ${dAf.anom}.`);
  }

  // Canvas Layer Rendering (Segmented Colormaps)
  function renderActiveLayer() {
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    const imgData = state.ctx.createImageData(w, h);
    const data = imgData.data;
    const mercMap = state.mercatorMap;
    const totalPixels = w * h;

    const period = state.currentPeriod === 'diurnal' ? 'af' : state.currentPeriod;
    const activeVar = state.currentVar;
    const stats = state.manifest.stats;

    // 1. Temperature: 7 Segments (Reds)
    if (activeVar === 'temp') {
      const arr = state.gridData[`temp_${period}`];
      const pStat = stats[`temp_${period}`];
      const minVal = pStat.p2;
      const maxVal = pStat.p98;
      const lut = REDS_7; // 7 segments

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
        else if (norm >= 1) norm = 0.9999;
        const segIdx = Math.floor(norm * 7); // 0..6
        const rgb = lut[segIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 235;
      }
    }
    // 2. Anomaly: 7 Segments (coolwarm)
    else if (activeVar === 'anom') {
      const arr = state.gridData[`anom_${period}`];
      const limit = stats.anom.limit; // 6.0 deg F
      const lut = COOLWARM_7; // 7 segments

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
        else if (norm >= 1) norm = 0.9999;
        const segIdx = Math.floor(norm * 7); // 0..6
        const rgb = lut[segIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 235;
      }
    }
    // 3. Tree Canopy Cover: Quintiles (5 Segments)
    else if (activeVar === 'canopy') {
      const arr = state.gridData.canopy;
      const lut = YLGN_5; // 5 quintile segments (0-20, 20-40, 40-60, 60-80, 80-100%)

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const raw = arr[gIdx];
        if (raw === 255) {
          data[p * 4 + 3] = 0;
          continue;
        }
        let qIdx = Math.floor(raw / 20.0);
        if (qIdx > 4) qIdx = 4;
        const rgb = lut[qIdx];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = 235;
      }
    }
    // 4. Hot and Cold Spots
    else if (activeVar === 'spot') {
      const arr = state.gridData[`spot_${period}`];
      const spotColors = ACCESSIBLE_SPOTS;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const sVal = arr[gIdx];
        const rgb = spotColors[sVal.toString()] || [226, 232, 240];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = sVal === 0 ? 80 : 240;
      }
    }
    // 5. Diurnal Persistence
    else if (activeVar === 'pers') {
      const arr = state.gridData.pers;
      const persColors = ACCESSIBLE_PERSISTENCE;

      for (let p = 0; p < totalPixels; p++) {
        const gIdx = mercMap[p];
        if (gIdx < 0) {
          data[p * 4 + 3] = 0;
          continue;
        }
        const pVal = arr[gIdx];
        const rgb = persColors[pVal.toString()] || [226, 232, 240];
        data[p * 4] = rgb[0];
        data[p * 4 + 1] = rgb[1];
        data[p * 4 + 2] = rgb[2];
        data[p * 4 + 3] = pVal === 0 ? 70 : 240;
      }
    }

    state.ctx.putImageData(imgData, 0, 0);
    const dataUrl = state.canvas.toDataURL();
    state.overlayLayer.setUrl(dataUrl);
  }

  // Map Legend (Segmented)
  function updateLegend() {
    const activeVar = state.currentVar;
    const period = state.currentPeriod === 'diurnal' ? 'af' : state.currentPeriod;
    const stats = state.manifest.stats;

    let html = '';

    if (activeVar === 'temp') {
      const pStat = stats[`temp_${period}`];
      const periodLabel = period === 'am' ? 'Morning' : (period === 'af' ? 'Afternoon' : 'Evening');
      html = `
        <div class="uhi-legend-title">${periodLabel} Air Temperature (°F) &bull; 7 Segments</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, ${REDS_STEP_GRADIENT});"></div>
        <div class="uhi-legend-scale">
          <span>${pStat.p2.toFixed(1)}°F</span>
          <span>Mean ${pStat.mean.toFixed(1)}°F</span>
          <span>${pStat.p98.toFixed(1)}°F</span>
        </div>
      `;
    } else if (activeVar === 'anom') {
      html = `
        <div class="uhi-legend-title">Temperature Anomaly (°F) &bull; 7 Segments</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, ${COOLWARM_STEP_GRADIENT});"></div>
        <div class="uhi-legend-scale">
          <span>-6.0°F</span>
          <span>-2.6°F</span>
          <span>0.0°F</span>
          <span>+2.6°F</span>
          <span>+6.0°F</span>
        </div>
      `;
    } else if (activeVar === 'canopy') {
      html = `
        <div class="uhi-legend-title">Tree Canopy Cover &bull; Quintiles (5 Segments)</div>
        <div class="uhi-legend-bar" style="background: linear-gradient(to right, ${YLGN_STEP_GRADIENT});"></div>
        <div class="uhi-legend-scale">
          <span>0%</span>
          <span>20%</span>
          <span>40%</span>
          <span>60%</span>
          <span>80%</span>
          <span>100%</span>
        </div>
      `;
    } else if (activeVar === 'spot') {
      html = `
        <div class="uhi-legend-title">Temperature Hot &amp; Cold Spots</div>
        <div class="uhi-legend-items">
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #B91C1C;"></span>
            <span>Hot Spot (Significant Heat Cluster)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #1E40AF;"></span>
            <span>Cold Spot (Significant Cool Refuge)</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E2E8F0;"></span>
            <span>Not Significant (Baseline)</span>
          </div>
        </div>
      `;
    } else if (activeVar === 'pers') {
      html = `
        <div class="uhi-legend-title">Hot / Cold Spot Persistence</div>
        <div class="uhi-legend-items">
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #B91C1C;"></span>
            <span>Hot Spot &mdash; All 3 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #EF4444;"></span>
            <span>Hot Spot &mdash; 2 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #FCA5A5;"></span>
            <span>Hot Spot &mdash; 1 Period</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #1E40AF;"></span>
            <span>Cold Spot &mdash; All 3 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #3B82F6;"></span>
            <span>Cold Spot &mdash; 2 Periods</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #93C5FD;"></span>
            <span>Cold Spot &mdash; 1 Period</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #94A3B8;"></span>
            <span>Mixed Shift</span>
          </div>
          <div class="uhi-legend-item">
            <span class="uhi-legend-box" style="background: #E2E8F0;"></span>
            <span>Not Significant</span>
          </div>
        </div>
      `;
    }

    elLegend.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
