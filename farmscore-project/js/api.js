/**
 * api.js — NASA POWER API client
 *
 * All four data sources from the FarmScore report are accessed through
 * NASA POWER (power.larc.nasa.gov/api), which aggregates:
 *
 *   Parameter      NASA POWER code   Original source
 *   ─────────────────────────────────────────────────
 *   Temperature    T2M               MERRA-2 / MODIS LST surface temp proxy
 *   Rainfall       PRECTOTCORR       CHIRPS-corrected precipitation (mm/day)
 *   Groundwater    GWETROOT          GLDAS root-zone soil wetness (0–1)
 *   Vegetation     EVPTRNS           Plant transpiration → NDVI/NDMI proxy
 *
 * No API key required. Free. CORS-enabled for browser use.
 * Docs: https://power.larc.nasa.gov/docs/services/api/
 */

const API = (() => {

  const BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

  const PARAMS = [
    'T2M',          // Temperature at 2m (°C)         — MODIS LST / MERRA-2
    'PRECTOTCORR',  // CHIRPS-corrected rainfall       — CHIRPS dataset
    'GWETROOT',     // Root-zone soil wetness (0-1)    — GLDAS model
    'EVPTRNS',      // Plant transpiration (mm/day)    — Vegetation proxy
  ].join(',');

  /**
   * Fetch one Aug-Oct season from NASA POWER for a lat/lng point.
   */
  async function fetchYear(lat, lng, year) {
    const url = new URL(BASE_URL);
    url.searchParams.set('parameters', PARAMS);
    url.searchParams.set('community',  'AG');
    url.searchParams.set('longitude',  lng);
    url.searchParams.set('latitude',   lat);
    url.searchParams.set('start',      `${year}0801`);
    url.searchParams.set('end',        `${year}1031`);
    url.searchParams.set('format',     'JSON');

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(
        `NASA POWER API returned HTTP ${res.status} for year ${year}. ` +
        `Please try again — the server may be temporarily busy.`
      );
    }

    const json = await res.json();

    if (!json?.properties?.parameter) {
      throw new Error(
        `Unexpected response from NASA POWER for ${year}. ` +
        `The API may be temporarily unavailable.`
      );
    }

    return json.properties.parameter;
  }

  /**
   * Compute mean of valid values in a NASA POWER daily parameter object.
   * POWER encodes missing data as -999.
   */
  function seasonalMean(paramObj) {
    const vals = Object.values(paramObj).filter(v => v !== null && v > -998);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /**
   * Aggregate an array of per-year POWER objects into 4-year seasonal means.
   */
  function aggregate(yearDataArray) {
    const acc = { T2M: [], PREC: [], GWET: [], EVPTRNS: [] };

    for (const d of yearDataArray) {
      const t = seasonalMean(d.T2M);
      const p = seasonalMean(d.PRECTOTCORR);
      const g = seasonalMean(d.GWETROOT);
      const e = seasonalMean(d.EVPTRNS);
      if (t !== null) acc.T2M.push(t);
      if (p !== null) acc.PREC.push(p);
      if (g !== null) acc.GWET.push(g);
      if (e !== null) acc.EVPTRNS.push(e);
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const result = {
      T2M:     avg(acc.T2M),
      PREC:    avg(acc.PREC),
      GWET:    avg(acc.GWET),
      EVPTRNS: avg(acc.EVPTRNS),
    };

    if (Object.values(result).some(v => v === null)) {
      throw new Error(
        'Some satellite parameters returned no valid data for this location. ' +
        'This can occur over open ocean or ice. Try a location in an agricultural region.'
      );
    }

    return result;
  }

  return { fetchYear, aggregate };

})();
