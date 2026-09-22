(function () {
  const gaugesEl = document.getElementById("gauges");
  const emptyEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("tdb-title");
  const exportBarEl = document.getElementById("export-bar");
  const exportBtn = document.getElementById("export-png");
  const exportStatusEl = document.getElementById("export-status");

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

  function setExportVisible(visible) {
    if (!exportBarEl) return;
    exportBarEl.hidden = !visible;
    if (!visible && exportStatusEl) {
      exportStatusEl.hidden = true;
      exportStatusEl.textContent = "";
    }
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
    setExportVisible(rows.length > 0);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!window.CompteurExport) return;
      exportBtn.disabled = true;
      if (exportStatusEl) {
        exportStatusEl.hidden = false;
        exportStatusEl.textContent = "Préparation de l’export…";
      }
      window.CompteurExport.exportAll(gaugesEl, {
        onProgress: function (current, total, title) {
          if (exportStatusEl) {
            exportStatusEl.textContent =
              "Export " + current + "/" + total + " — " + title;
          }
        },
      })
        .then(function (count) {
          if (exportStatusEl) {
            exportStatusEl.textContent =
              count + " PNG emballé" + (count > 1 ? "s" : "") + " dans le ZIP.";
          }
        })
        .catch(function (error) {
          if (exportStatusEl) {
            exportStatusEl.textContent =
              "Échec de l’export : " + (error && error.message ? error.message : error);
          }
        })
        .finally(function () {
          exportBtn.disabled = false;
        });
    });
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

  function showNotice(title, text) {
    emptyEl.hidden = false;
    titleEl.hidden = true;
    setExportVisible(false);
    emptyEl.querySelector(".fr-alert__title").textContent = title;
    emptyEl.querySelector("p:not(.fr-alert__title)").textContent = text;
  }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i += 1) {
      const candidate = arguments[i];
      if (candidate !== undefined && candidate !== null && candidate !== "") return candidate;
    }
    return undefined;
  }

  // Colonnes utilisables quand le mappage du widget n'est pas renseigné.
  function guessFields(record) {
    const keys = Object.keys(record || {}).filter(
      (key) => key !== "id" && !key.startsWith("gristHelper") && key !== "manualSort"
    );
    const byName = (pattern) => keys.find((key) => pattern.test(key));
    const nameKey = byName(/indicateur|libell|^nom/i) || keys[0];
    const valueKey =
      byName(/valeur|value|pourcent|taux/i) ||
      keys.find((key) => key !== nameKey && typeof record[key] === "number") ||
      keys[1];
    return {
      name: record[nameKey],
      value: record[valueKey],
      titre_tdb: record[byName(/titre_?tdb/i)],
      fix_largeur: record[byName(/fix_?largeur|largeur/i)],
    };
  }

  if (isGristWidget()) {
    window.grist.ready({
      requiredAccess: "read table",
      columns: [
        { name: "Indicateur", title: "Nom de l’indicateur", type: "Text,Choice,Any" },
        { name: "Valeur", title: "Valeur (0-100)", type: "Numeric,Int,Any" },
        { name: "titre_tdb", title: "titre_tdb (1re ligne)", type: "Text,Any", optional: true },
        { name: "fix_largeur", title: "fix_largeur (1re ligne)", type: "Text,Numeric,Int,Any", optional: true },
      ],
    });
    window.grist.onRecords(function (records) {
      const raw = records || [];
      let mapped = null;
      try {
        if (typeof window.grist.mapColumnNames === "function") {
          mapped = window.grist.mapColumnNames(raw);
        }
      } catch (error) {
        mapped = null;
      }
      const items = raw.map(function (record, index) {
        const m = (mapped && mapped[index]) || {};
        const guessed = guessFields(record);
        return {
          name: firstDefined(m.Indicateur, guessed.name),
          value: firstDefined(m.Valeur, guessed.value),
          titre_tdb: firstDefined(m.titre_tdb, guessed.titre_tdb),
          fix_largeur: firstDefined(m.fix_largeur, guessed.fix_largeur),
        };
      });
      setItems(items);
      if (!items.length) {
        showNotice(
          "Aucun indicateur",
          "La table doit contenir au moins une ligne : nom de l’indicateur et valeur de 0 à 100."
        );
      } else if (items.every((item) => firstDefined(item.name) === undefined)) {
        const columns = Object.keys(raw[0] || {}).join(", ") || "aucune";
        showNotice(
          "Colonne « nom » introuvable",
          `Mappez la colonne dans le panneau de droite (Column Mapping). Colonnes reçues : ${columns}.`
        );
      }
    });
    return;
  }

  loadPreview().catch(function () {
    emptyEl.hidden = false;
  });
})();
