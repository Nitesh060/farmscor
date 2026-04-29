# 🌾 FarmScore — Agricultural Suitability Index

A live, browser-based tool that fetches **real satellite data** and computes a **FarmScore (150–250)** for any location on Earth.

**[▶ Live Demo on GitHub Pages](#)** ← replace with your URL after deploying

---

## What It Does

Click any point on the map (or type coordinates) → the app fetches 4 years of actual satellite data → computes the FarmScore using the weighted formula from the report.

---

## Data Sources

All data is fetched live from **NASA POWER API** — free, no API key, browser-callable.

| FarmScore Parameter | NASA POWER Code | Original Source |
|---|---|---|
| 🌊 Groundwater | `GWETROOT` | NASA GLDAS root-zone soil wetness |
| 🌿 NDVI (vegetation) | `EVPTRNS` (proxy) | Sentinel-2 via plant transpiration |
| 💧 NDMI (moisture) | `EVPTRNS` (proxy) | Sentinel-2 via plant transpiration |
| 🌧 Rainfall | `PRECTOTCORR` | CHIRPS-corrected precipitation |
| 🌡 Temperature | `T2M` | MODIS LST / MERRA-2 |

- Period: **August–October**, averaged over **2020–2023**
- API docs: https://power.larc.nasa.gov/docs/services/api/

---

## Score Formula

```
WeightedAvg = (10×GW + 30×NDVI + 25×NDMI + 10×RainfallScore + 25×TempScore) / 100 × 10
FinalScore  = round(WeightedAvg) + 150
```

| Component | Weight | Score Function |
|---|---|---|
| Groundwater (GW) | 10% | `GWETROOT × 100` |
| NDVI | 30% | `(EVPTRNS / 5.0) × 100` |
| NDMI | 25% | `(EVPTRNS / 7.0) × 100` |
| Rainfall | 10% | `100 − 100×\|50 − P×10\| / 50` |
| Temperature | 25% | `100 − 100×\|40 − T\| / 40` |

---

## Project Structure

```
farmscore/
├── index.html          ← Main page (GitHub Pages entry point)
├── css/
│   └── style.css       ← All styling
├── js/
│   ├── api.js          ← NASA POWER API client
│   ├── score.js        ← FarmScore formula engine
│   ├── ui.js           ← DOM rendering helpers
│   └── app.js          ← Map init + pipeline orchestration
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto-deploy to GitHub Pages
```

---

## Deploy to GitHub Pages (3 steps)

### Step 1 — Create a new GitHub repository

1. Go to https://github.com/new
2. Name it `farmscore` (or anything you like)
3. Set visibility to **Public**
4. Click **Create repository**

### Step 2 — Upload all files

**Option A — GitHub web UI (easiest):**
1. Open your new repo
2. Click **Add file → Upload files**
3. Drag the entire `farmscore/` folder contents
4. Commit to `main`

**Option B — Git command line:**
```bash
cd farmscore/
git init
git add .
git commit -m "Initial FarmScore deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/farmscore.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main` / Folder: `/ (root)`
4. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/farmscore/
```
(takes ~1–2 minutes to deploy)

---

## Local Development

No build step needed — it's plain HTML/CSS/JS.

```bash
# Option 1: Python
python -m http.server 8080

# Option 2: Node
npx serve .

# Option 3: VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open http://localhost:8080

---

## Notes

- NASA POWER has a free rate limit. For high-volume usage, consider caching results.
- NDVI/NDMI are derived from plant transpiration (`EVPTRNS`) as a proxy since direct Sentinel-2 access requires a Google Earth Engine account. The proxy is physically sound: higher transpiration correlates strongly with greenness and moisture.
- The tool works globally for agricultural regions. It may return limited data over open ocean, permanent ice, or extreme desert.
