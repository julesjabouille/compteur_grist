(function (global) {
  const CX = 200;
  const CY = 180;
  const R = 130;

  function clamp(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }

  function polar(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: CX + radius * Math.cos(rad),
      y: CY - radius * Math.sin(rad),
    };
  }

  function arcPath(startDeg, endDeg, radius) {
    const start = polar(startDeg, radius);
    const end = polar(endDeg, radius);
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function ticks() {
    const marks = [];
    for (let v = 0; v <= 100; v += 10) {
      const angle = 180 - (v / 100) * 180;
      const outer = polar(angle, R + 2);
      const inner = polar(angle, v % 50 === 0 ? R - 20 : R - 12);
      const major = v % 50 === 0;
      marks.push(
        `<line class="gauge__tick${major ? " gauge__tick--major" : ""}" x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" />`
      );
      if (major) {
        const label = polar(angle, R - 36);
        marks.push(
          `<text class="gauge__label" x="${label.x.toFixed(1)}" y="${(label.y + 4).toFixed(1)}">${v}</text>`
        );
      }
    }
    return marks.join("");
  }

  function renderGaugeSvg(id, value) {
    const v = clamp(value);
    const rotation = ((v - 50) / 100) * 180;
    const gradientId = `arc-${id}`;
    return `
      <svg class="gauge" viewBox="0 0 400 230" role="img" aria-label="Compteur à ${v}">
        <defs>
          <linearGradient id="${gradientId}" x1="${(CX - R).toFixed(0)}" y1="${CY}" x2="${(CX + R).toFixed(0)}" y2="${CY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ce0500" />
            <stop offset="50%" stop-color="#fa7a35" />
            <stop offset="100%" stop-color="#18753c" />
          </linearGradient>
        </defs>
        <path class="gauge__track" d="${arcPath(180, 0, R)}" />
        <path class="gauge__arc" stroke="url(#${gradientId})" d="${arcPath(180, 0, R)}" />
        ${ticks()}
        <g transform="rotate(${rotation.toFixed(2)} ${CX} ${CY})">
          <polygon class="gauge__needle" points="${CX - 7},${CY} ${CX + 7},${CY} ${CX},${CY - R + 10}" />
        </g>
        <circle class="gauge__hub" cx="${CX}" cy="${CY}" r="10" />
        <text class="gauge__caption" x="${CX}" y="222">${formatValue(v)}&nbsp;%</text>
      </svg>
    `;
  }

  function rowHtml(item, index) {
    const v = clamp(item.value);
    const safeName = escapeHtml(item.name || `Indicateur ${index + 1}`);
    return `
      <article class="gauge-row">
        <h2 class="gauge-row__title">${safeName}</h2>
        ${renderGaugeSvg(index, v)}
      </article>
    `;
  }

  function formatValue(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(container, items) {
    container.innerHTML = items.length ? items.map((item, index) => rowHtml(item, index)).join("") : "";
  }

  global.CompteurGauge = { render, clamp };
})(window);
