/**
 * ui.js — DOM rendering helpers for FarmScore
 */

const UI = (() => {

  const COLORS = ['#2d6a4f', '#1a7a3c', '#0f6e56', '#186e8f', '#5a3e8b'];
  const CIRC   = 326.7; // svg circle circumference (r=52)

  /** Show/hide elements */
  function show(id) { document.getElementById(id).style.display = ''; }
  function hide(id) { document.getElementById(id).style.display = 'none'; }

  /** Step progress indicators */
  function stepSet(id, state) {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (state) el.classList.add(state);
  }

  function stepsShow()  { document.getElementById('steps').style.display = 'flex'; }
  function stepsHide()  { document.getElementById('steps').style.display = 'none'; }

  /** Button loading state */
  function btnLoading(text) {
    document.getElementById('calcbtn').disabled = true;
    document.getElementById('btntxt').textContent = text;
    document.getElementById('spin').style.display = 'block';
  }

  function btnReady() {
    document.getElementById('calcbtn').disabled = false;
    document.getElementById('btntxt').textContent = 'Calculate FarmScore';
    document.getElementById('spin').style.display = 'none';
  }

  /** Error box */
  function showError(msg) {
    const el = document.getElementById('errbox');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function clearError() {
    document.getElementById('errbox').style.display = 'none';
  }

  /** Animate the score ring */
  function animateRing(score) {
    const pct    = (score - 150) / 100;           // 150–250 → 0–1
    const offset = CIRC * (1 - Math.max(0, Math.min(1, pct)));
    const hue    = Math.round(pct * 120);          // red→green
    const arc    = document.getElementById('arc');
    arc.setAttribute('stroke-dashoffset', offset);
    arc.setAttribute('stroke', `hsl(${hue}, 55%, 38%)`);
  }

  /** Render full result panel */
  function renderResult(result, lat, lng) {
    const { finalScore, components } = result;
    const g = Score.grade(finalScore);

    // Score ring
    document.getElementById('fscore').textContent = finalScore;
    animateRing(finalScore);

    // Grade pill
    const pill = document.getElementById('gpill');
    pill.textContent     = g.label;
    pill.style.background = g.bg;
    pill.style.color      = g.color;

    // Coordinates
    document.getElementById('cdisp').textContent =
      `${parseFloat(lat).toFixed(4)}°N  ${parseFloat(lng).toFixed(4)}°E`;

    // Parameter cards
    const keys = Object.keys(components);
    document.getElementById('pgrid').innerHTML = keys.map((k, i) => {
      const c   = components[k];
      const pct = Math.min(100, Math.max(0, c.score));
      return `
        <div class="pc">
          <div class="pn">${c.label}</div>
          <div class="pv">
            ${c.raw}
            <span style="font-size:.6rem;font-weight:400;color:var(--muted)">${c.unit}</span>
          </div>
          <div class="ps">Score: ${c.score.toFixed(1)} &nbsp;·&nbsp; w=${c.weight}%</div>
          <div class="mbar">
            <div class="mbf" style="width:${pct}%;background:${COLORS[i]}"></div>
          </div>
          <div class="api-tag">${c.src}</div>
        </div>`;
    }).join('');

    // Weight bars
    document.getElementById('wbars').innerHTML = keys.map((k, i) => {
      const c    = components[k];
      const contrib = (c.score * c.weight / 100).toFixed(1);
      return `
        <div class="wrow">
          <span class="wlabel">${c.label.split(' ')[0]}</span>
          <div class="wbar">
            <div class="wbi" style="width:${Math.min(100, c.score)}%;background:${COLORS[i]}"></div>
          </div>
          <span class="wval">${contrib}</span>
        </div>`;
    }).join('');

    document.getElementById('result').style.display = 'block';
  }

  return {
    show, hide,
    stepSet, stepsShow, stepsHide,
    btnLoading, btnReady,
    showError, clearError,
    renderResult,
  };

})();
