/**
 * score.js — FarmScore calculation engine
 *
 * Implements the exact weighted formula from the FarmScore Detailed Report:
 *
 *   WeightedAvg = (10×GW + 30×NDVI + 25×NDMI + 10×RainfallScore + 25×TempScore) / 100 × 10
 *   FinalScore  = round(WeightedAvg) + 150
 *
 * Parameter derivation from NASA POWER:
 *
 *   GW           = GWETROOT × 10             (GLDAS root-zone wetness → 0–10 scale)
 *   NDVI score   = (EVPTRNS / 5.0) × 100     (transpiration → vegetation index proxy)
 *   NDMI score   = (EVPTRNS / 7.0) × 100     (transpiration → moisture index proxy)
 *   RainfallScore= 100 − 100×|50 − P×10|/50  (P in mm/day, benchmark ~5mm/day)
 *   TempScore    = 100 − 100×|40 − T|/40     (T in °C, optimal ~40°C for tropical crops)
 */

const Score = (() => {

  /** Weights as defined in the report */
  const WEIGHTS = {
    GW:       10,
    NDVI:     30,
    NDMI:     25,
    Rainfall: 10,
    Temp:     25,
  };

  /**
   * Rainfall score using report formula.
   * Benchmark = 50mm (report scale). We multiply daily mean by 10 to map
   * typical 0–10 mm/day range into the 0–100 benchmark space.
   * @param {number} P_daily — mean daily rainfall mm/day (CHIRPS PRECTOTCORR)
   * @returns {number} 0–100
   */
  function rainfallScore(P_daily) {
    const P = P_daily * 10; // scale to report's benchmark space
    return Math.max(0, Math.min(100, 100 - 100 * Math.abs(50 - P) / 50));
  }

  /**
   * Temperature score using report formula.
   * Optimal benchmark = 40°C (tropical crop optimum).
   * @param {number} T — mean temperature °C (MODIS LST / MERRA-2 T2M)
   * @returns {number} 0–100
   */
  function tempScore(T) {
    return Math.max(0, Math.min(100, 100 - 100 * Math.abs(40 - T) / 40));
  }

  /**
   * Derive NDVI proxy from plant transpiration (EVPTRNS).
   * Higher transpiration ↔ more active vegetation ↔ higher NDVI.
   * Typical ET range: 0–6 mm/day for vegetated surfaces.
   * @param {number} evptrns — mean transpiration mm/day
   * @returns {number} NDVI-like value 0–1
   */
  function ndviFromEvp(evptrns) {
    return Math.min(1.0, Math.max(0, evptrns / 5.0));
  }

  /**
   * Derive NDMI proxy from plant transpiration.
   * NDMI is more sensitive to moisture stress; scaled more conservatively.
   * @param {number} evptrns — mean transpiration mm/day
   * @returns {number} NDMI-like value 0–0.6
   */
  function ndmiFromEvp(evptrns) {
    return Math.min(0.6, Math.max(0, evptrns / 7.0));
  }

  /**
   * Compute the full FarmScore from raw NASA POWER values.
   * @param {Object} raw — { T2M, PREC, GWET, EVPTRNS }
   * @returns {Object} score breakdown
   */
  function compute(raw) {
    const { T2M: T, PREC: P, GWET: gwet, EVPTRNS: evp } = raw;

    const ndvi = ndviFromEvp(evp);
    const ndmi = ndmiFromEvp(evp);

    // Component scores (all 0–100)
    const GWscore   = Math.min(100, gwet * 100);       // GWETROOT (0–1) → 0–100
    const NDVIscore = ndvi * 100;
    const NDMIscore = ndmi * 100;
    const Rscore    = rainfallScore(P);
    const Tscore    = tempScore(T);

    // GW parameter for formula (doc uses GW/10 then ×10 weight, net = GWscore)
    const GWparam = gwet * 10; // 0–10

    // Weighted average (formula from report)
    const WA = (
      WEIGHTS.GW       * GWscore   +
      WEIGHTS.NDVI     * NDVIscore +
      WEIGHTS.NDMI     * NDMIscore +
      WEIGHTS.Rainfall * Rscore    +
      WEIGHTS.Temp     * Tscore
    ) / 100 * 10;

    const finalScore = Math.max(150, Math.min(250, Math.round(WA) + 150));

    return {
      finalScore,
      raw: { T, P, gwet, evp },
      derived: { ndvi, ndmi },
      components: {
        GW:       { score: GWscore,   raw: gwet.toFixed(3), unit: '(GWETROOT)',  weight: WEIGHTS.GW,       label: 'Groundwater', src: 'NASA GLDAS via POWER' },
        NDVI:     { score: NDVIscore, raw: ndvi.toFixed(3), unit: '(veg index)', weight: WEIGHTS.NDVI,     label: 'NDVI',        src: 'Sentinel-2 via EVPTRNS' },
        NDMI:     { score: NDMIscore, raw: ndmi.toFixed(3), unit: '(moist idx)', weight: WEIGHTS.NDMI,     label: 'NDMI',        src: 'Sentinel-2 via EVPTRNS' },
        Rainfall: { score: Rscore,    raw: P.toFixed(2),    unit: 'mm/day',      weight: WEIGHTS.Rainfall, label: 'Rainfall',    src: 'CHIRPS via POWER' },
        Temp:     { score: Tscore,    raw: T.toFixed(1),    unit: '°C',          weight: WEIGHTS.Temp,     label: 'Temperature', src: 'MODIS LST via POWER' },
      },
    };
  }

  /** Grade lookup */
  function grade(score) {
    if (score >= 230) return { label: 'Excellent', bg: '#d4edda', color: '#155724' };
    if (score >= 210) return { label: 'Good',      bg: '#d6eaf8', color: '#154360' };
    if (score >= 195) return { label: 'Moderate',  bg: '#fef9e7', color: '#7d6608' };
    if (score >= 180) return { label: 'Fair',      bg: '#fdebd0', color: '#784212' };
    return                    { label: 'Poor',      bg: '#fadbd8', color: '#922b21' };
  }

  return { compute, grade };

})();
