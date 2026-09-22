(function () {
  const gaugesEl = document.getElementById("gauges");
  const emptyEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("tdb-title");

  function parseWidth(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "100%";
    if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
    return s;
  }

  function setLayout(items) {
    const first = items[0] || {};
    const title = String(first.titre_tdb ?? "").trim();
    titleEl.hidden = !title;
    titleEl.textContent = title;
    if (title) document.title = title;
    gaugesEl.style.setProperty("--box-width", parseWidth(first.fix_largeur));
  }

  function setItems(items) {
    const rows = (items || [])
      .map((item) => ({
        name: String(item.name ?? "").trim() || "Sans nom",
        value: window.CompteurGauge.clamp(item.value),
        titre_tdb: item.titre_tdb,
        fix_largeur: item.fix_largeur,
      }))
      .filter((item) => item.name);
    emptyEl.hidden = rows.length > 0;
    setLayout(rows);
    window.CompteurGauge.render(gaugesEl, rows);
  }

  function splitCsvLine(line, sep) {
    return line.split(sep).map((part) => part.trim().replace(/^"|"$/g, ""));
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const headers = splitCsvLine(lines[0], sep);
    return lines.slice(1).map((line) => {
      const parts = splitCsvLine(line, sep);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = parts[index] ?? "";
      });
      return {
        name: row.Indicateur || row[headers[0]],
        value: String(row.Valeur ?? row[headers[1]] ?? "").replace(",", "."),
        titre_tdb: row.titre_tdb,
        fix_largeur: row.fix_largeur,
      };
    });
  }

  async function loadPreview() {
    const response = await fetch("data/exemple.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV d’exemple introuvable");
    setItems(parseCsv(await response.text()));
  }

  function isGristWidget() {
    try {
      return window.self !== window.top && window.grist && typeof window.grist.ready === "function";
    } catch (error) {
      return Boolean(window.grist && typeof window.grist.ready === "function");
    }
  }

  if (isGristWidget()) {
    window.grist.ready({
      requiredAccess: "read table",
      columns: [
        { name: "Indicateur", title: "Nom de l’indicateur" },
        { name: "Valeur", title: "Valeur (0-100)", type: "Numeric" },
        { name: "titre_tdb", title: "titre_tdb (1re ligne)", optional: true },
        { name: "fix_largeur", title: "fix_largeur (1re ligne)", optional: true },
      ],
    });
    window.grist.onRecords(function (records) {
      const items = (records || []).map((row) => ({
        name: row.Indicateur,
        value: row.Valeur,
        titre_tdb: row.titre_tdb,
        fix_largeur: row.fix_largeur,
      }));
      setItems(items);
      if (!items.length) {
        emptyEl.hidden = false;
        titleEl.hidden = true;
        emptyEl.querySelector(".fr-alert__title").textContent = "Aucun indicateur";
        emptyEl.querySelector("p").textContent =
          "La table doit contenir au moins une ligne : nom de l’indicateur et valeur de 0 à 100.";
      }
    });
    return;
  }

  loadPreview().catch(function () {
    emptyEl.hidden = false;
  });
})();
