/**
 * app.js — FarmScore main application
 * Initialises Leaflet map, wires events, orchestrates API -> Score -> UI pipeline.
 */

const FarmScore = (() => {

  /* ── Map setup ── */
  const map = L.map('map', { zoomControl: true }).setView([20.5, 78.9], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  const dotIcon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#2d6a4f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  let marker = null;

  function setMarker(lat, lng) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng], { icon: dotIcon }).addTo(map);
  }

  /* ── Map click → fill inputs ── */
  map.on('click', e => {
    document.getElementById('lat').value = e.latlng.lat.toFixed(5);
    document.getElementById('lng').value = e.latlng.lng.toFixed(5);
    setMarker(e.latlng.lat, e.latlng.lng);
  });

  /* ── Enter key shortcut ── */
  document.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });

  /* ── Main pipeline ── */
  async function run() {
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);

    UI.clearError();
    document.getElementById('result').style.display = 'none';

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      UI.showError('Please enter valid coordinates, or click a location on the map.');
      return;
    }

    setMarker(lat, lng);
    map.panTo([lat, lng]);

    UI.btnLoading('Connecting to NASA POWER…');
    UI.stepsShow();
    UI.stepSet('s1', 'active');
    UI.stepSet('s2', '');
    UI.stepSet('s3', '');

    try {
      // Step 1 — 2020 & 2021
      UI.btnLoading('Fetching 2020–2021 satellite data…');
      const [d2020, d2021] = await Promise.all([
        API.fetchYear(lat, lng, 2020),
        API.fetchYear(lat, lng, 2021),
      ]);
      UI.stepSet('s1', 'done');
      UI.stepSet('s2', 'active');

      // Step 2 — 2022 & 2023
      UI.btnLoading('Fetching 2022–2023 satellite data…');
      const [d2022, d2023] = await Promise.all([
        API.fetchYear(lat, lng, 2022),
        API.fetchYear(lat, lng, 2023),
      ]);
      UI.stepSet('s2', 'done');
      UI.stepSet('s3', 'active');

      // Step 3 — compute
      UI.btnLoading('Computing 4-year FarmScore…');
      const raw    = API.aggregate([d2020, d2021, d2022, d2023]);
      const result = Score.compute(raw);

      UI.stepSet('s3', 'done');
      UI.renderResult(result, lat, lng);

      const g = Score.grade(result.finalScore);
      marker.bindPopup(
        `<b>FarmScore: ${result.finalScore}</b><br>${g.label}<br>
         <small>${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</small>`,
        { closeButton: false }
      ).openPopup();

    } catch (err) {
      UI.showError('⚠ ' + err.message);
      UI.stepsHide();
    } finally {
      UI.btnReady();
    }
  }

  return { run };

})();
