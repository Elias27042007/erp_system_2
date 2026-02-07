// public/scriptservice.js
import { showToast } from "./alert.js";

let modalService = null;

let kunden = [];
let aktuellerKunde = null;

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Modal-Instanz erst nach DOM laden
  const modalEl = document.getElementById("serviceEintragen");
  if (modalEl) modalService = new bootstrap.Modal(modalEl);

  // ✅ Events
  const sucheInput = document.getElementById("suche");
  if (sucheInput) {
    let t = null;
    sucheInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => ladeServiceListe(sucheInput.value), 250);
    });
  }

  const btnSpeichern = document.getElementById("kServiceSpeichern");
  if (btnSpeichern) {
    btnSpeichern.addEventListener("click", serviceSpeichern);
  }

  // ✅ Initial laden
  ladeServiceListe("");
});

/* =========================================================
   Helpers
   ========================================================= */
function escapeHtml(value) {
  const s = String(value ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function kundenDisplayName(k) {
  const firma = (k.firma ?? "").trim();
  const v = (k.vorname ?? "").trim();
  const n = (k.nachname ?? "").trim();

  if (firma) return firma;
  const full = `${v} ${n}`.trim();
  return full || `Kunde #${k.id ?? "?"}`;
}

function parseLocalDate(dateStr) {
  const s = String(dateStr ?? "").trim();
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function addMonths(dateObj, months) {
  const d = new Date(dateObj);
  const day = d.getDate();

  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  d.setHours(0, 0, 0, 0);

  return d;
}

function formatDateAT(dateObj) {
  if (!dateObj) return "-";
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* =========================================================
   Laden + Filtern
   - zeigt nur: überfällig ODER innerhalb 1 Monat
   ========================================================= */
async function ladeServiceListe(suche = "") {
  try {
    const url = `/api/kunden?suche=${encodeURIComponent(suche)}`;
    const res = await fetch(url);

    if (!res.ok) {
      showToast("Fehler beim Laden der Kunden", "error");
      return;
    }

    const rows = await res.json();
    kunden = Array.isArray(rows) ? rows : [];

    const today = startOfToday();
    const oneMonth = addMonths(today, 1);

    // ✅ nur die, die ein naechste_pruefung haben UND (überfällig oder in 1 Monat fällig)
    const gefiltert = kunden.filter((k) => {
      const due = parseLocalDate(k.naechste_pruefung);
      if (!due) return false;
      return due < today || due <= oneMonth;
    });

    // ✅ sort: überfällig zuerst, dann nach Datum (nächstes zuerst), dann Name
    gefiltert.sort((a, b) => {
      const today = startOfToday();

      // 1) Statusgruppe: rot (0) → orange (1)
      const da = parseLocalDate(a.naechste_pruefung);
      const db = parseLocalDate(b.naechste_pruefung);

      const aGroup = da && da < today ? 0 : 1;  // rot oder orange
      const bGroup = db && db < today ? 0 : 1;
      if (aGroup !== bGroup) return aGroup - bGroup;

      // 2) Kundentyp: privat (0) → firma (1)
      const aIsFirma = String(a.firma ?? "").trim() !== "";
      const bIsFirma = String(b.firma ?? "").trim() !== "";
      if (aIsFirma !== bIsFirma) return (aIsFirma ? 1 : 0) - (bIsFirma ? 1 : 0);

      // 3) Alphabetisch: privat nach Nachname/Vorname, firma nach Firmenname
      if (!aIsFirma && !bIsFirma) {
        const an = String(a.nachname ?? "").trim();
        const bn = String(b.nachname ?? "").trim();
        const cmpN = an.localeCompare(bn, "de", { sensitivity: "base" });
        if (cmpN !== 0) return cmpN;

        const av = String(a.vorname ?? "").trim();
        const bv = String(b.vorname ?? "").trim();
        return av.localeCompare(bv, "de", { sensitivity: "base" });
      }

      const af = String(a.firma ?? "").trim();
      const bf = String(b.firma ?? "").trim();
      return af.localeCompare(bf, "de", { sensitivity: "base" });
    });


    renderServiceTabelle(gefiltert);
  } catch (err) {
    console.error(err);
    showToast("Netzwerkfehler beim Laden", "error");
  }
}

/* =========================================================
   Render
   ========================================================= */
function renderServiceTabelle(rows) {
  const tbody = document.querySelector("#serviceTabelle tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" class="text-center text-muted py-4">Keine anstehenden Services gefunden</td>`;
    tbody.appendChild(tr);
    return;
  }

  const today = startOfToday();
  const oneMonth = addMonths(today, 1);

  for (const k of rows) {
    const tr = document.createElement("tr");

    // ✅ farbliche Markierung wie bei Kunden
    const due = parseLocalDate(k.naechste_pruefung);
    if (due) {
      if (due < today) tr.classList.add("table-danger");
      else if (due <= oneMonth) tr.classList.add("table-warning");
    }

    tr.innerHTML = `
      <td>${escapeHtml(k.firma ?? "-")}</td>
      <td>${escapeHtml(k.vorname ?? "-")}</td>
      <td>${escapeHtml(k.nachname ?? "-")}</td>
      <td>${escapeHtml(k.kontakt ?? "-")}</td>
      <td>${escapeHtml(k.adresse ?? "-")}</td>
      <td>${escapeHtml(k.plz ?? "-")}</td>
      <td>${escapeHtml(k.ort ?? "-")}</td>
      <td>${escapeHtml(k.letzte_pruefung ?? "-")}</td>
      <td>${escapeHtml(k.naechste_pruefung ?? "-")}</td>
    `;
    

    // ✅ Doppelklick: Service-Modal öffnen
    tr.style.cursor = "pointer";
    tr.title = `Doppelklick: Service eintragen (${kundenDisplayName(k)})`;

    tr.addEventListener("dblclick", () => {
      aktuellerKunde = k;

      // Datum-Feld leeren
      const input = document.getElementById("service_datum");
      if (input) input.value = "";

      // Optional: Titel im Modal dynamisch
      const title = document.querySelector("#serviceEintragen .modal-title");
      if (title) title.textContent = `Heizungs Service eintragen – ${kundenDisplayName(k)}`;

      if (modalService) modalService.show();
    });

    tbody.appendChild(tr);
  }
}

/* =========================================================
   Service speichern (PUT /api/kunden/:id/service)
   ========================================================= */
async function serviceSpeichern() {
  if (!aktuellerKunde?.id) {
    showToast("Bitte zuerst einen Kunden auswählen (Doppelklick)", "error");
    return;
  }

  const input = document.getElementById("service_datum");
  const service_datum = String(input?.value ?? "").trim();

  if (!service_datum) {
    showToast("Bitte ein Service-Datum auswählen.", "error");
    return;
  }

  try {
    const res = await fetch(`/api/kunden/${aktuellerKunde.id}/service`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_datum }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast(data?.message || "Fehler beim Speichern des Services", "error");
      return;
    }

    // ✅ Erfolgsmeldung mit Name + neuem Datum
    const name = kundenDisplayName(aktuellerKunde);
    showToast(`Service für ${name} gespeichert (Datum: ${service_datum}).`, "success");

    // ✅ Modal schließen
    if (modalService) modalService.hide();

    // ✅ Liste neu laden (damit Farben/Sortierung/Filter stimmt)
    const suche = document.getElementById("suche")?.value ?? "";
    await ladeServiceListe(suche);
  } catch (err) {
    console.error(err);
    showToast("Netzwerkfehler beim Speichern", "error");
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const res = await fetch("/logout", {
    method: "POST"
  });
  

  const data = await res.json();


  if (data.success) {
    window.location.href = "/index.html";
  }

});
