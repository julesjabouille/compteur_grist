(function (global) {
  const SCALE = 2;
  const PAD = 24;
  const WIDTH = 520;
  const SVG_W = 400;
  const SVG_H = 230;
  const COLORS = {
    paper: "#ffffff",
    ink: "#161616",
    muted: "#666666",
    navy: "#000091",
  };

  function slugify(text) {
    return (
      String(text || "compteur")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 60) || "compteur"
    );
  }

  function uniqueName(base, used) {
    let name = base + ".png";
    let n = 2;
    while (used.has(name)) {
      name = base + "-" + n + ".png";
      n += 1;
    }
    used.add(name);
    return name;
  }

  function inlineSvgStyles(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(SVG_W));
    clone.setAttribute("height", String(SVG_H));
    if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", "0 0 " + SVG_W + " " + SVG_H);

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = [
      ".gauge__track{fill:none;stroke:#eee;stroke-width:18;stroke-linecap:butt}",
      ".gauge__arc{fill:none;stroke-width:18;stroke-linecap:butt}",
      ".gauge__tick{stroke:#3a3a3a;stroke-width:2}",
      ".gauge__tick--major{stroke-width:3}",
      ".gauge__label{fill:" + COLORS.muted + ";font-size:13px;font-family:Marianne,arial,sans-serif;text-anchor:middle}",
      ".gauge__needle{fill:" + COLORS.navy + "}",
      ".gauge__hub{fill:#fff;stroke:" + COLORS.navy + ";stroke-width:4}",
      ".gauge__caption{fill:" + COLORS.navy + ";font-size:22px;font-weight:700;font-family:Marianne,arial,sans-serif;font-variant-numeric:tabular-nums;text-anchor:middle}",
    ].join("");
    clone.insertBefore(style, clone.firstChild);
    return clone;
  }

  function loadSvgImage(svgEl) {
    const xml = new XMLSerializer().serializeToString(inlineSvgStyles(svgEl));
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de rasteriser le SVG"));
      };
      img.src = url;
    });
  }

  async function cardToPngBlob(card) {
    const title = (card.querySelector(".gauge-row__title")?.textContent || "Compteur").trim();
    const svg = card.querySelector("svg.gauge");
    if (!svg) throw new Error("SVG manquant pour « " + title + " »");

    const img = await loadSvgImage(svg);
    const chartW = WIDTH - PAD * 2;
    const chartH = (chartW * SVG_H) / SVG_W;
    const titleH = 36;
    const height = PAD + titleH + chartH + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, WIDTH, height);

    ctx.fillStyle = COLORS.ink;
    ctx.font = "bold 20px Marianne, arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(title, WIDTH / 2, PAD, WIDTH - PAD * 2);

    ctx.drawImage(img, PAD, PAD + titleH, chartW, chartH);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("Échec conversion PNG"));
      }, "image/png");
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function exportAll(container, options) {
    const opts = options || {};
    const cards = Array.from((container || document).querySelectorAll(".gauge-row")).filter(
      function (card) {
        return card.querySelector("svg.gauge");
      }
    );
    if (!cards.length) throw new Error("Aucun compteur à exporter");
    if (typeof global.JSZip !== "function") throw new Error("JSZip introuvable");

    const zip = new global.JSZip();
    const used = new Set();
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const title = (
        card.querySelector(".gauge-row__title")?.textContent ||
        "compteur-" + (i + 1)
      ).trim();
      if (opts.onProgress) opts.onProgress(i + 1, cards.length, title);
      const blob = await cardToPngBlob(card);
      zip.file(uniqueName(slugify(title), used), blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(zipBlob, "compteurs-" + stamp + ".zip");
    return cards.length;
  }

  global.CompteurExport = { exportAll, slugify };
})(window);
