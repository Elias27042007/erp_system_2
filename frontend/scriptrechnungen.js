
import { darf } from "./rechteCheck.js";
import { showToast } from "./alert.js";
//console.log("✅ scriptrechnungen.js GELADEN");


let aktuelleRechnung = null;
let ausAngebotId = null; // ✅ wenn Rechnung aus Angebot erstellt wird


//Datum formatieren
function formatYMD(value) {
  if (!value) return "-";

  // 1) Wenn bereits "YYYY-MM-DD" (z.B. aus Input-Feldern) -> direkt zurück
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // 2) Wenn ISO-String "YYYY-MM-DDT..." (z.B. 2026-01-04T23:00:00.000Z)
  //    -> als Date parsen und LOKALES Datum bauen (damit kein -1 Tag)
  if (typeof value === "string" && value.includes("T")) {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 3) Wenn es ein Date-Objekt ist -> ebenfalls lokal formatieren
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Fallback (sicher)
  return String(value).slice(0, 10);
}


let rechte = {
  darfAnsehen: false,
  darfHinzufuegen: false,
  darfBearbeiten: false,
  darfLoeschen: false
};

// ✅ Rechte + Initialisierung Rechnungen
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1) Rechte laden
    rechte = await pruefeRecht();
    console.log("RECHTE:", rechte);


    // 2) Darf ansehen?
    if (!rechte?.darfAnsehen) {
      showToast("Dafür hast du keine Rechte!","error");
      window.location.href = "/index.html";
      return;
    }

    // 3) Darf hinzufügen? -> Button ausblenden
    if (!rechte?.darfHinzufuegen) {
      const btn = document.getElementById("rechnungHinzufuegenBtn");
      if (btn) btn.style.display = "none";
    }

    // 4) Rechnungen laden
    //wait ladeRechnung();

    // 5) Modal via ?modal=add öffnen
    const params = new URLSearchParams(window.location.search);
    if (params.get("modal") === "add") {
      const modalEl = document.getElementById("rechnungenHinzufuegenModal");
      if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    }
  } catch (err) {
    console.error("Fehler beim Initialisieren (Rechte/Rechnungen):", err);
    showToast("Fehler beim Laden der Seite. Bitte neu laden oder später erneut versuchen.", "error");
  }
});


async function pruefeRecht() {
  return {
    darfHinzufuegen: await darf("rechnungen", "hinzufügen"),
    darfBearbeiten: await darf("rechnungen", "bearbeiten"),
    darfLoeschen: await darf("rechnungen", "löschen"),
    darfAnsehen: await darf("rechnungen", "ansehen"),
  };
}





const modalVerwaltenEl = document.getElementById("rechnungVerwalten");
const modalVerwalten = modalVerwaltenEl ? new bootstrap.Modal(modalVerwaltenEl) : null;

const modalBearbeiten = new bootstrap.Modal(document.getElementById("rechnungBearbeiten"));
const modalDetails = new bootstrap.Modal(document.getElementById("rechnungDetails"));
const modalLoeschen = new bootstrap.Modal(document.getElementById("rechnungLoeschen"));

const modalLoeschenEl = document.getElementById("rechnungLoeschen");

if (modalLoeschenEl) {
  modalLoeschenEl.addEventListener("hidden.bs.modal", () => {
    const el = document.getElementById("loeschenRechnungsnummer");
    if (el) el.textContent = "";
  });
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


//pdf in details
const detailPdfBtn = document.getElementById("detailPdfBtn");


const rechnungAusAngebotBtn = document.getElementById("rechnungAusAngebotBtn");

if (modalVerwaltenEl && rechnungAusAngebotBtn) {
  modalVerwaltenEl.addEventListener("show.bs.modal", () => {
    const typ = String(aktuelleRechnung?.typ ?? "").trim().toLowerCase();
    rechnungAusAngebotBtn.classList.toggle("d-none", typ !== "angebot");
  });

  modalVerwaltenEl.addEventListener("hidden.bs.modal", () => {
    rechnungAusAngebotBtn.classList.add("d-none");
  });
}





document.getElementById("rechnungBearbeitenBtn").addEventListener("click", () => {
  if (!aktuelleRechnung) return;
  modalVerwalten.hide();
  setTimeout(() => modalBearbeiten.show(), 200);
});

document.getElementById("rechnungDetailsBtn").addEventListener("click", () => {
  if (!aktuelleRechnung) return;
  modalVerwalten.hide();
  setTimeout(() => modalDetails.show(), 200);
});

const loeschenNummerEl = document.getElementById("loeschenRechnungsnummer");
document.getElementById("rechnungLoeschenBtn").addEventListener("click", () => {
  if (!aktuelleRechnung) return;
  if (loeschenNummerEl) {
    loeschenNummerEl.textContent =
      aktuelleRechnung.rechnungsnummer || "—";
  }
  modalVerwalten.hide();
  setTimeout(() => modalLoeschen.show(), 200);
});





async function speichereRechnung(mitPdf = false) {
  if (!rechte.darfHinzufuegen) {
    showToast("Keine Berechtigung: Rechnung hinzufügen", "error");
    return;
  }

  const typ = document.getElementById("angebotsTyp").value;
  const kundeText = document.getElementById("kunde").value;
  const kundeId = document.getElementById("kunde_id").value;
  const bemerkung1 = document.getElementById("bemerkung1").value;
  const bemerkung_anzeigen1 = document.getElementById("bemerkung_anzeigen1")?.checked ? 1 : 0;
  const datum = document.getElementById("datum").value;
  const faellig = document.getElementById("datumfaellig").value;
  const bemerkung = document.getElementById("bemerkung").value;
  const bemerkung_anzeigen = document.getElementById("bemerkung_anzeigen")?.checked ? 1 : 0;
  const skonto_hinzufuegen = document.getElementById("skonto_hinzufuegen")?.checked ? 1 : 0;
  const skonto = skonto_hinzufuegen ? Number(document.getElementById("skonto")?.value) : null;
  const skonto_tage = skonto_hinzufuegen ? Number(document.getElementById("skonto_tage")?.value) : null;



  // ✅ Status-Regel: Angebot immer "entwurf", Rechnung darf wählen
  const status = (typ === "rechnung")
    ? document.getElementById("status").value
    : "entwurf";

  if (!typ || !kundeId || !datum || !faellig || positions.length === 0) {
    showToast("Bitte alle Pflichtfelder ausfüllen (Typ, Kunde, Artikel, Datum, Fälligkeitsdatum).", "error");
    return;
  }

  const positionen = positions.map((p, idx) => ({
    pos: idx + 1,
    artikel_id: p.artikel_id ?? null,
    beschreibung: p.bezeichnung,
    menge: p.menge,
    einzelpreis: p.bauseits ? 0 : p.preis,
    bauseits: p.bauseits ? 1 : 0,
    mwst_satz: p.mwst_satz ?? 20
  }));

  //const netto = positionen.reduce((sum, p) => sum + (p.menge * p.einzelpreis), 0);
  const netto = positionen.reduce((sum, p) => sum + (Number(p.menge) * Number(p.einzelpreis ?? 0)), 0);
  const mwst_prozent = 20;
  const mwst = netto * (mwst_prozent / 100);
  const brutto = netto + mwst;

  const savePayload = {
    typ,
    kunde_id: Number(kundeId),
    bemerkung1: bemerkung1 || null,
    bemerkung_anzeigen1,
    datum,
    faellig_am: faellig || null,
    bemerkung: bemerkung || null,
    bemerkung_anzeigen,
    skonto_hinzufuegen,
    skonto: skonto_hinzufuegen ? skonto : null,
    skonto_tage: skonto_hinzufuegen ? skonto_tage : null,
    status,
    summen: { netto, mwst, brutto, mwst_prozent },
    positionen,
    // ✅ nur wenn es wirklich aus Angebot kommt
    aus_angebot_id: (typ === "rechnung" && ausAngebotId) ? ausAngebotId : null
  };

  // 1) In DB speichern
  const saveRes = await fetch("/api/rechnungen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(savePayload)
  });

  if (!saveRes.ok) {
    const err = await saveRes.json().catch(() => ({}));
    showToast("Fehler beim Speichern: " + (err.message || saveRes.statusText), "error");
    return;
  }

  const saved = await saveRes.json(); // { id, rechnungsnummer }

  // 2) OPTIONAL: PDF erzeugen
  if (mitPdf) {
    // ✅ Rechnung direkt nochmal "voll" aus DB laden (inkl. bemerkung_anzeigen)
    const fullRes = await fetch(`/api/rechnungen/${saved.id}`);
    const full = await fullRes.json();
    if (!fullRes.ok) {
      showToast("❌ Konnte Rechnung für PDF nicht laden: " + (full.message || fullRes.statusText), "error");
      return;
    }

    const r = full.rechnung;
    const pos = full.positionen || [];

    const netto = Number(r.netto_summe ?? 0);
    const brutto = Number(r.brutto_summe ?? 0);
    const mwst = Number(r.mwst_summe ?? 0);
    const mwst_prozent = netto > 0 ? Math.round((mwst / netto) * 100) : 20;

    const pdfPayload = {
      firma: {
        name: "Bergermayer InstallationsgmbH",
        strasse: "Seefeld 267",
        plz: "2062",
        ort: "Seefeld-Kadolz",
        telefon: "+43 2943 2053",
        fax: "+43 2943 20534",
        email: "gwh.bergermayer@aon.at",
        iban: "AT00 0000 0000 0000",
        bic: "BICCODE"
      },
      kunde: {
        // name ist egal – server lädt Kunde sowieso aus DB via kunde_id nach
        name: r.kunde_anzeige || "",
        kunde_id: Number(r.kunde_id)
      },
      rechnung: {
        id: Number(r.id), // ✅ optional, aber gut
        typ: r.typ,
        nummer: r.nummer,
        rechnungsnummer: r.rechnungsnummer,
        bemerkung1: r.bemerkung1 || "",
        bemerkung_anzeigen1: Number(r.bemerkung_anzeigen1 ?? 0), 
        datum: formatYMD(r.datum),
        faellig: formatYMD(r.faellig_am),
        bemerkung: r.bemerkung || "",
        bemerkung_anzeigen: Number(r.bemerkung_anzeigen ?? 0), // ✅ DAS ist wichtig
        skonto_hinzufuegen: Number(r.skonto_hinzufuegen ?? 0),
        skonto: r.skonto ?? null,
        skonto_tage: r.skonto_tage ?? null,
        kunde_id: Number(r.kunde_id)
      },
      positionen: pos.map(p => {
        const menge = Number(p.menge ?? 0);
        const einzelpreis = Number(p.einzelpreis ?? 0);
        return {
          bezeichnung: p.artikel_bezeichnung || p.beschreibung || "",
          menge,
          einzelpreis,
          bauseits: Number(p.bauseits ?? 0),   // ✅ hinzufügen
          gesamt: menge * einzelpreis
        };
      }),
      summen: { netto, mwst_prozent, mwst, brutto }
    };

    const pdfRes = await fetch("/api/rechnungen/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pdfPayload)
    });

    if (!pdfRes.ok) {
      const err = await pdfRes.json().catch(() => ({}));
      showToast("❌ PDF Fehler: " + (err.message || pdfRes.statusText), "error");
      return;
    }

    const blob = await pdfRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(r.rechnungsnummer || "dokument").replace(/[^\w\-]/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }


  // Tabelle neu laden
  ladeRechnung();

  // Modal schließen
  const modalEl = document.getElementById("rechnungenHinzufuegenModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  // Formular leeren
  resetRechnungsModal();
}

document.getElementById("rechnungenSpeichernBtn")
  .addEventListener("click", () => speichereRechnung(false));

document.getElementById("rechnungenSpeichernPdfBtn")
  .addEventListener("click", () => speichereRechnung(true));





/* =========================================================
   TABELLE: Rechnungen LADEN UND DARSTELLEN
   ========================================================= */
async function ladeRechnung(suchtext = "") {
    try {
        const res = await fetch(`/api/rechnungen?suche=${encodeURIComponent(suchtext)}`);
        const daten = await res.json();
        zeigeRechnung(daten);
    } catch (error) {
        console.error("Fehler beim Laden der Rechnungen:", error);
    }
}

function zeigeRechnung(daten) {
    const tabelle = document.getElementById("rechnungsBody");
    tabelle.innerHTML = "";

    if (!daten.length) {
        tabelle.innerHTML = `<tr><td colspan="10" class="text-center">Keine Rechnungen gefunden</td></tr>`;
        return;
    }

    daten.forEach(rechnung => {
      //console.log("Row erstellt", rechnung.id);

        const tr = document.createElement("tr");

        tr.dataset.rechnung = JSON.stringify(rechnung);

        /*
        tr.innerHTML = `
            <td>${rechnung.typ}</td>
            <td>${rechnung.rechnungsnummer}</td>
            <td>${rechnung.datum}</td>
            <td>${rechnung.faellig_am}</td>
            <td>${rechnung.status}</td>
            <td>${rechnung.netto_summe} €</td>
            <td>${rechnung.mwst_summe} €</td>
            <td>${rechnung.brutto_summe} €</td>
            <td>${rechnung.bemerkung || ""}</td>
            <td>${rechnung.erstellt_von}</td>
        `;
        */

        /*
        tr.innerHTML = `
            <td>${rechnung.typ}</td>
            <td>${rechnung.rechnungsnummer}</td>
            <td>${rechnung.datum}</td>
            <td>${rechnung.faellig_am}</td>
            <td>${rechnung.netto_summe} €</td>
            <td>${rechnung.brutto_summe} €</td>
        `;
        */

        tr.innerHTML = `
            <td>${rechnung.typ}</td>
            <td>${rechnung.rechnungsnummer}</td>
            <td>${rechnung.status || "-"}</td>
            <td>${formatYMD(rechnung.datum)}</td>
            <td>${formatYMD(rechnung.faellig_am)}</td>
            <td>${rechnung.netto_summe} €</td>
            <td>${rechnung.brutto_summe} €</td>
        `;



        tr.addEventListener("dblclick", () => {
            aktuelleRechnung = JSON.parse(tr.dataset.rechnung);
            //console.log("typ RAW:", aktuelleRechnung.typ);
            //console.log("typ normalized:", String(aktuelleRechnung?.typ ?? "").trim().toLowerCase());

            // ✅ Button korrekt ein-/ausblenden
            if (rechnungAusAngebotBtn) {
              const typ = String(aktuelleRechnung?.typ ?? "").trim().toLowerCase();
              rechnungAusAngebotBtn.classList.toggle("d-none", typ !== "angebot");
            }



            if (!modalVerwalten) {
                console.warn("Modal #rechnungVerwalten nicht gefunden.");
                return;
            }

            modalVerwalten.show();
        });



        tabelle.appendChild(tr);
    });
}


/* ===============================================
   SUCHFELD für Rechnungen
   =============================================== */
const suchfeld = document.getElementById("suchfeldRechnung");
let timer;

if (suchfeld) {
    suchfeld.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            ladeRechnung(suchfeld.value.trim());
        }, 300); // debounce für 300ms
    });
}

ladeRechnung();


document.getElementById("kunde").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("kundenAuswahlModal"));
    modal.show();
    ladeKunden(); // Kundenliste laden
});


async function ladeKunden(suchtext = "") {
    try {
        const res = await fetch(`/api/kunden?suche=${encodeURIComponent(suchtext)}`);
        const daten = await res.json();
        zeigeKunden(daten);
    } catch (err) {
        console.error("❌ Fehler beim Laden der Kunden:", err);
    }
}


function zeigeKunden(kunden) {
    const body = document.getElementById("kundenTabelle");
    body.innerHTML = "";

    if (!kunden.length) {
        body.innerHTML = `<tr><td colspan="5" class="text-center">Keine Kunden gefunden</td></tr>`;
        return;
    }

    kunden.forEach(k => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${k.firma}</td>
            <td>${k.vorname}</td>
            <td>${k.nachname}</td>
            <td>${k.plz}</td>
            <td>${k.ort}</td>
        `;

        // Kunde auswählen per Doppelklick
        tr.addEventListener("dblclick", () => {
            document.getElementById("kunde").value = `${k.firma} (${k.vorname} ${k.nachname})`;
            document.getElementById("kunde_id").value = k.id; // ✅ wichtig
            document.getElementById("kundenAuswahlModal").querySelector(".btn-close").click();
        });


        body.appendChild(tr);
    });
}


const kundenSuchfeld = document.getElementById("kundenSuchfeld");
let kundenSuchTimer;

kundenSuchfeld.addEventListener("input", () => {
    clearTimeout(kundenSuchTimer);
    kundenSuchTimer = setTimeout(() => {
        ladeKunden(kundenSuchfeld.value.trim());
    }, 300);
});



let positions = []; // ausgewählte Artikel

async function ladeArtikel(suche = "") {
    const res = await fetch(`/api/lager/search?suche=${encodeURIComponent(suche)}`);
    const daten = await res.json();

    const tbody = document.getElementById("artikelListe");
    tbody.innerHTML = "";

    daten.forEach(a => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${a.nummer}</td>
            <td>${a.bezeichnung}</td>
            <td>${a.verkaufspreis} €</td>
            <td><input type="number" min="1" value="1" class="form-control mengeInput" style="width: 80px;"></td>
            <td><button class="btn btn-primary btn-sm">Hinzufügen</button></td>
        `;

        const mengeInput = tr.querySelector(".mengeInput");
        const btnAdd = tr.querySelector("button");

        /*
        btnAdd.addEventListener("click", () => {
            const menge = parseInt(mengeInput.value);

                // 🔍 prüfen ob Artikel schon existiert
                const vorhandenerArtikel = positions.find(
                    p => p.nummer === a.nummer
                );

                if (vorhandenerArtikel) {
                    // ➕ Menge addieren
                    vorhandenerArtikel.menge += menge;
                    vorhandenerArtikel.gesamt =
                        vorhandenerArtikel.menge * vorhandenerArtikel.preis;
                } else {
                    // ➕ Neuer Artikel
                    const preis = Number(a.verkaufspreis);

                    positions.push({
                        artikel_id: a.id,          // ✅ wenn /api/lager/search das liefert
                        mwst_satz: a.mwst_satz,    // ✅ wenn verfügbar
                        nummer: a.nummer,
                        bezeichnung: a.bezeichnung,
                        preis: Number(a.verkaufspreis),
                        menge: parseInt(mengeInput.value),
                        gesamt: Number(a.verkaufspreis) * parseInt(mengeInput.value)
                    });
                }
            zeigePositionen();
        });
        */

        btnAdd.addEventListener("click", () => {
            const menge = parseInt(mengeInput.value, 10);
            if (!menge || menge < 1) return;

            // a = der Artikel aus der Zeile (dein "daten.forEach(a => ...)")
            window.__addArtikelToPositions(a, menge);
        });



        tbody.appendChild(tr);
    });
}

document.getElementById("artikelsuche").addEventListener("input", (e) => {
    ladeArtikel(e.target.value);
});

ladeArtikel();


function zeigePositionen() {
    const container = document.getElementById("positionsListe");

    if (positions.length === 0) {
        container.innerHTML = "<p class='text-muted'>Noch keine Artikel ausgewählt.</p>";
        return;
    }

    let html = `
        <table class="table table-bordered mt-3 align-middle">
            <thead class="table-light">
                <tr>
                    <th>Artikel</th>
                    <th style="width: 120px;">Menge</th>
                    <th>Einzelpreis</th>
                    <th>Gesamt</th>
                    <th style="width: 60px;"></th>
                </tr>
            </thead>
            <tbody>
    `;

    positions.forEach((p, index) => {

      const istStunden = String(p.einheit || "").toLowerCase().includes("stund");
      const step = istStunden ? "0.25" : "1";
      const min = istStunden ? "0.25" : "1";
        html += `
            <tr>
                <td>${p.bezeichnung}</td>

                <!-- ✏️ MENGE -->
                <td>
                    <input 
                      type="number"
                      min="${min}"
                      step="${step}"
                      value="${p.menge}"
                      class="form-control form-control-sm"
                      onchange="updateMenge(${index}, this.value)"
                    >
                </td>

                <td>
                  <div class="d-flex gap-2 align-items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value="${p.preis === null ? "" : Number(p.preis).toFixed(2)}"
                      class="form-control form-control-sm"
                      style="width: 120px;"
                      onchange="updatePreis(${index}, this.value)"
                      ${p.bauseits ? "disabled" : ""}
                    >

                    <!-- Originalpreis -->
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      title="Originalpreis"
                      onclick="resetPreis(${index})"
                    >
                      ↺
                    </button>

                    <!-- Bauseits -->
                    <button
                      type="button"
                      class="btn btn-sm ${p.bauseits ? "btn-warning" : "btn-outline-secondary"}"
                      title="bauseits"
                      onclick="setBauseits(${index})"
                    >
                      bv
                    </button>

                    
                  </div>
                </td>


                <td>${p.gesamt.toFixed(2)} €</td>

                <!-- 🗑️ LÖSCHEN -->
                <td class="text-center">
                    <button 
                        class="btn btn-sm btn-danger"
                        onclick="removePosition(${index})"
                    >
                        ✕
                    </button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

/*
function updateMenge(index, neueMenge) {
    const menge = parseInt(neueMenge);

    if (isNaN(menge) || menge < 1) {
        return;
    }

    positions[index].menge = menge;
    positions[index].gesamt = menge * positions[index].preis;

    zeigePositionen();
}


function removePosition(index) {
    positions.splice(index, 1);
    zeigePositionen();
}
    */

window.updateMenge = function (index, neueMenge) {
  const p = positions[index];
  if (!p) return;

  const istStunden = String(p.einheit || "").toLowerCase().includes("stund");

  let menge = istStunden ? Number(String(neueMenge).replace(",", ".")) : parseInt(neueMenge, 10);
  if (!Number.isFinite(menge) || menge <= 0) return;

  // Stück erzwingen
  if (!istStunden) menge = Math.round(menge);

  p.menge = menge;

  const preis = Number(p.preis ?? 0);
  p.gesamt = menge * preis;

  zeigePositionen();
};


window.removePosition = function (index) {
  positions.splice(index, 1);
  zeigePositionen();
};


window.updatePreis = function (index, neuerPreis) {
  let preis = Number(String(neuerPreis).replace(",", "."));
  if (isNaN(preis) || preis < 0) return;

  positions[index].bauseits = false;   // ✅
  positions[index].preis = preis;
  positions[index].gesamt = preis * positions[index].menge;

  zeigePositionen();
};


async function fetchOriginalPreisFromDB(artikel_id) {
  if (!artikel_id) return null;

  const res = await fetch(`/api/lager/preis/${artikel_id}`);
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const preis = Number(data?.verkaufspreis);
  return Number.isFinite(preis) ? preis : null;
}




window.resetPreis = async function (index) {
  const p = positions[index];
  if (!p) return;

  const dbPreis = await fetchOriginalPreisFromDB(p.artikel_id);

  if (dbPreis == null) {
    showToast("Originalpreis konnte nicht geladen werden (Artikel-ID fehlt oder Route liefert nichts).", "error");
    return;
  }

  // 🔄 bauseits zurücksetzen
  p.bauseits = false;

  p.preis = dbPreis;
  p.gesamt = p.menge * p.preis;
  zeigePositionen();
};

window.setBauseits = async function (index) {
  const p = positions[index];
  if (!p) return;

  p.bauseits = !p.bauseits;

  if (p.bauseits) {
    p.preis = 0;
  } else {
    // zurück auf original (oder DB Preis)
    p.preis = Number(p.preis_original ?? p.preis ?? 0);
  }

  p.gesamt = Number(p.menge ?? 0) * Number(p.preis ?? 0);
  zeigePositionen();
};


window.setEditBauseits = async function (index) {
  const p = editPositions[index];
  if (!p) return;

  p.bauseits = !p.bauseits;

  if (p.bauseits) {
    p.preis = 0;
  } else {
    p.preis = Number(p.preis_original ?? p.preis ?? 0);
  }

  p.gesamt = Number(p.menge ?? 0) * Number(p.preis ?? 0);
  zeigeEditPositionen();
};








// ✅ Status nur bei Rechnung anzeigen
const typSelect = document.getElementById("angebotsTyp");
const statusWrap = document.getElementById("statusWrap");
const statusSelect = document.getElementById("status");

function syncStatusUI() {
  const typ = typSelect.value;

  if (typ === "rechnung") {
    statusWrap.style.display = "";
  } else {
    statusWrap.style.display = "none";
    statusSelect.value = "entwurf";
  }
}

if (typSelect && statusWrap && statusSelect) {
  typSelect.addEventListener("change", syncStatusUI);
  syncStatusUI();
}


// ---------------------------
// Skonto UI (ADD)
// ---------------------------
const skontoFlagEl = document.getElementById("skonto_hinzufuegen");
const skontoWrap = document.getElementById("skontoWrap");
const skontoEl = document.getElementById("skonto");
const skontoTageEl = document.getElementById("skonto_tage");

function syncSkontoUI() {
  if (!skontoFlagEl || !skontoWrap) return;

  const an = skontoFlagEl.checked;
  skontoWrap.style.display = an ? "" : "none";

  // Wenn ausgeschaltet -> Felder leeren (werden als NULL gespeichert)
  if (!an) {
    if (skontoEl) skontoEl.value = "3";
    if (skontoTageEl) skontoTageEl.value = "14";
  }
}

if (skontoFlagEl) {
  skontoFlagEl.addEventListener("change", syncSkontoUI);
  syncSkontoUI();
}

// ---------------------------
// Skonto UI (EDIT)
// ---------------------------
const editSkontoFlagEl = document.getElementById("edit_skonto_hinzufuegen");
const editSkontoWrap = document.getElementById("edit_skontoWrap");
const editSkontoEl = document.getElementById("edit_skonto");
const editSkontoTageEl = document.getElementById("edit_skonto_tage");

function syncEditSkontoUI() {
  if (!editSkontoFlagEl || !editSkontoWrap) return;

  const an = editSkontoFlagEl.checked;
  editSkontoWrap.style.display = an ? "" : "none";

  if (!an) {
    if (editSkontoEl) editSkontoEl.value = "";
    if (editSkontoTageEl) editSkontoTageEl.value = "";
  }
}

if (editSkontoFlagEl) {
  editSkontoFlagEl.addEventListener("change", syncEditSkontoUI);
  syncEditSkontoUI();
}





document.getElementById("zurueckZurRechnungBtn").addEventListener("click", () => {
  const artikelModalEl = document.getElementById("artikelModal");
  const artikelModal = bootstrap.Modal.getInstance(artikelModalEl) || new bootstrap.Modal(artikelModalEl);

  artikelModal.hide();

  artikelModalEl.addEventListener("hidden.bs.modal", () => {
    if (artikelPickMode === "edit") {
      // zurück ins Edit-Modal
      modalBearbeiten.show();
    } else {
      // zurück ins Add-Modal
      const addEl = document.getElementById("rechnungenHinzufuegenModal");
      const addModal = bootstrap.Modal.getInstance(addEl) || new bootstrap.Modal(addEl);
      addModal.show();
    }
  }, { once: true });
});


function resetRechnungsModal() {
  // Formularfelder
  document.getElementById("angebotsTyp").value = "";
  document.getElementById("kunde").value = "";
  document.getElementById("kunde_id").value = "";
  document.getElementById("datum").value = "";
  document.getElementById("datumfaellig").value = "";
  document.getElementById("bemerkung").value = "";
  document.getElementById("bemerkung1").value = "";
    // ✅ Status reset + UI synchronisieren
  const statusSelect = document.getElementById("status");
  if (statusSelect) statusSelect.value = "entwurf";
  if (typeof syncStatusUI === "function") syncStatusUI();

  //bemerkung anzeigen
  /*
  const bemerkungCheck = document.getElementById("bemerkung_anzeigen");
  if (bemerkungCheck) bemerkungCheck.checked = false;
  */

  const b1 = document.getElementById("bemerkung_anzeigen1");
  if (b1) b1.checked = false;

  const b = document.getElementById("bemerkung_anzeigen");
  if (b) b.checked = false;

  const s = document.getElementById("skonto_hinzufuegen");
  if (s) s.checked = false;

  if (skontoEl) skontoEl.value = "3";
  if (skontoTageEl) skontoTageEl.value = "14";
  syncSkontoUI();




  // Positionen zurücksetzen
  positions = [];
  zeigePositionen();

  // Optional: Fokus setzen
  document.getElementById("angebotsTyp").focus();
  //**
  //ausAngebotId = null; // ✅ reset

}

const rechnungsModalEl = document.getElementById("rechnungenHinzufuegenModal");

if (rechnungsModalEl) {
  rechnungsModalEl.addEventListener("hidden.bs.modal", (e) => {
    // 1) Nur reagieren, wenn dieses Modal selbst betroffen ist
    if (e.target !== rechnungsModalEl) return;

    // 2) Wenn noch irgendein anderes Modal offen ist (z.B. Kunden/Artikel),
    //    dann NICHT resetten (weil es nur ein Wechsel war).
    if (document.querySelector(".modal.show")) return;

    resetRechnungsModal();
  });
}



window.addEventListener("DOMContentLoaded", resetRechnungsModal);
window.addEventListener("pageshow", resetRechnungsModal);


// =========================================================
// RECHNUNG VERWALTEN: Bearbeiten / Details / Löschen
// (analog zu Lager, aber für Rechnungen + Positionen)
// =========================================================

let aktuelleRechnungVoll = null;    // hier speichern wir die "voll geladenen" Daten (inkl. Positionen)
let editPositions = [];             // Positionen im Edit-Modal (getrennt von "positions" im Add-Modal)

// ---- Helper: Rechnung komplett laden (inkl. Positionen + Kunde)
async function ladeRechnungVoll(id) {
  const res = await fetch(`/api/rechnungen/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Fehler beim Laden der Rechnung");
  return data; // { rechnung: {...}, positionen: [...] }
}

// ---- Für Rechnung aus angebot erstellen

if (rechnungAusAngebotBtn) {
  rechnungAusAngebotBtn.addEventListener("click", async () => {
    if (!aktuelleRechnung || !aktuelleRechnung.id) return;

    try {
      // 1) Angebot inkl. Positionen laden
      const full = await ladeRechnungVoll(aktuelleRechnung.id);
      const r = full.rechnung;

      // 2) Add-Modal resetten
      resetRechnungsModal();

      // ✅ WICHTIG: NACH dem Reset setzen!
      ausAngebotId = aktuelleRechnung.id;

      // 3) Typ fix auf "rechnung"
      document.getElementById("angebotsTyp").value = "rechnung";
      syncStatusUI();

      const statusEl = document.getElementById("status");
      if (statusEl) statusEl.value = "entwurf";

      // 4) Kunde übernehmen
      document.getElementById("kunde").value = r.kunde_anzeige || "";
      document.getElementById("kunde_id").value = r.kunde_id || "";

      // 5) Datum/Fällig/Bemerkung übernehmen
      document.getElementById("bemerkung1").value = r.bemerkung1 || "";
      document.getElementById("datum").value = r.datum ? formatYMD(r.datum) : "";
      document.getElementById("datumfaellig").value = r.faellig_am ? formatYMD(r.faellig_am) : "";
      document.getElementById("bemerkung").value = r.bemerkung || "";

      // 6) Positionen übernehmen
      positions = (full.positionen || []).map(p => {
        const preis = Number(p.einzelpreis ?? 0);
        const menge = Number(p.menge ?? 0);
        const bez = p.artikel_bezeichnung || p.beschreibung || "";

        return {
          artikel_id: p.artikel_id ?? null,
          mwst_satz: p.mwst_satz ?? 20,
          bezeichnung: bez,
          einheit: p.einheit ?? p.artikel_einheit ?? "Stück",   // ✅ HINZUFÜGEN
          preis_original: preis, // ✅ wichtig
          preis: preis,

          menge,
          gesamt: preis * menge,
          bauseits: Number(p.bauseits ?? 0) === 1   // ✅ NEU
        };
      });


      zeigePositionen();

      // 7) Modals umschalten
      modalVerwalten.hide();
      const addModalEl = document.getElementById("rechnungenHinzufuegenModal");
      const addModal = new bootstrap.Modal(addModalEl);
      setTimeout(() => addModal.show(), 200);

    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  });
}





// ---- Details: Positionen im Details-Modal anzeigen
function renderDetailPositionen(positionen) {
  const body = document.getElementById("detailPositionenBody");
  if (!body) return;

  body.innerHTML = "";

  if (!positionen || positionen.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Keine Positionen vorhanden</td></tr>`;
    return;
  }

  positionen.forEach(p => {
    const menge = Number(p.menge ?? 0);
    const ep = Number(p.einzelpreis ?? 0);
    const gesamt = menge * ep;

    // wenn dein JOIN die Felder liefert:
    const artikelText =
      (p.artikel_nummer || p.artikel_bezeichnung)
        ? `${p.artikel_nummer ?? ""} ${p.artikel_bezeichnung ? "- " + p.artikel_bezeichnung : ""}`.trim()
        : (p.beschreibung ?? "");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.pos ?? ""}</td>
      <td>${artikelText}</td>
      <td>${menge}</td>
      <td>${ep.toFixed(2)} €</td>
      <td>${gesamt.toFixed(2)} €</td>
    `;
    body.appendChild(tr);
  });
}


// ---- Helper: Edit-Positionen anzeigen
function zeigeEditPositionen() {
  const container = document.getElementById("edit_positionsListe");
  if (!container) return;

  if (editPositions.length === 0) {
    container.innerHTML = "<p class='text-muted'>Noch keine Artikel ausgewählt.</p>";
    return;
  }

  let html = `
    <table class="table table-bordered mt-3 align-middle">
      <thead class="table-light">
        <tr>
          <th>Artikel</th>
          <th style="width: 120px;">Menge</th>
          <th>Einzelpreis</th>
          <th>Gesamt</th>
          <th style="width: 60px;"></th>
        </tr>
      </thead>
      <tbody>
  `;

  editPositions.forEach((p, index) => {

      const istStunden = String(p.einheit || "").toLowerCase().includes("stund");
      const step = istStunden ? "0.25" : "1";
      const min = istStunden ? "0.25" : "1";

      html += `
      <tr>
        <td>${p.bezeichnung}</td>
        
        <td>
          ${
            istStunden
              ? `<input
                  type="text"
                  inputmode="decimal"
                  value="${p.menge_raw ?? String(p.menge).replace(".", ",")}"
                  class="form-control form-control-sm"
                  oninput="updateEditMengeRaw(${index}, this.value)"
                  onblur="commitEditMenge(${index})"
                />`
              : `<input
                      type="text"
                      inputmode="decimal"
                      value="${p.menge_raw ?? String(p.menge).replace(".", ",")}"
                      class="form-control form-control-sm"
                      oninput="updateEditMengeRaw(${index}, this.value)"
                      onblur="commitEditMenge(${index})"
                  />`

          }
        </td>

        <td>
          <div class="d-flex gap-2 align-items-center">
            <input
              type="number"
              step="0.01"
              min="0"
              value="${Number(p.preis).toFixed(2)}"
              class="form-control form-control-sm"
              style="width: 120px;"
              onchange="updateEditPreis(${index}, this.value)"
              ${p.bauseits ? "disabled" : ""}

            >
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              title="Originalpreis"
              onclick="resetEditPreis(${index})"
            >
              ↺
            </button>

            <!-- Bauseits -->
            <button
              type="button"
              class="btn btn-sm ${p.bauseits ? "btn-warning" : "btn-outline-secondary"}"
              title="bauseits"
              onclick="setEditBauseits(${index})"
            >
              bv
            </button>
          </div>
        </td>

        <td>${Number(p.gesamt).toFixed(2)} €</td>
        <td class="text-center">
          <button class="btn btn-sm btn-danger" onclick="removeEditPosition(${index})">✕</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// Globale Funktionen (weil inline onchange/onclick)
window.updateEditMenge = function (index, neueMenge) {
  const p = editPositions[index];
  if (!p) return;

  const istStunden = String(p.einheit || "").toLowerCase().includes("stund");

  let menge = istStunden
    ? Number(String(neueMenge).trim().replace(",", "."))
    : parseInt(neueMenge, 10);

  if (!Number.isFinite(menge) || menge <= 0) return;
  if (!istStunden) menge = Math.trunc(menge);

  p.menge = menge;
  p.gesamt = menge * Number(p.preis ?? 0);

  zeigeEditPositionen(); // ✅ jetzt okay, weil es nur beim blur feuert
};





window.removeEditPosition = function (index) {
  editPositions.splice(index, 1);
  zeigeEditPositionen();
};

window.updateEditPreis = function (index, neuerPreis) {
  let preis = Number(String(neuerPreis).replace(",", "."));
  if (isNaN(preis) || preis < 0) return;

  editPositions[index].bauseits = false; // ✅
  editPositions[index].preis = preis;
  editPositions[index].gesamt = preis * editPositions[index].menge;

  zeigeEditPositionen();
};


window.resetEditPreis = async function (index) {
  const p = editPositions[index];
  if (!p) return;

  const dbPreis = await fetchOriginalPreisFromDB(p.artikel_id);

  if (dbPreis == null) {
    showToast("Originalpreis konnte nicht geladen werden (Artikel-ID fehlt oder Route liefert nichts).", "error");
    return;
  }

  p.bauseits = false;
  p.preis = dbPreis;
  p.gesamt = p.menge * p.preis;
  zeigeEditPositionen();
};


window.updateEditMengeRaw = function (index, value) {
  // erlaubt: Ziffern, Komma, Punkt
  value = String(value).replace(/[^\d.,]/g, "");
  editPositions[index].menge_raw = value;
}


window.commitEditMenge = function (index) {
  const p = editPositions[index];
  if (!p) return;

  const raw = (p.menge_raw ?? "").trim();
  let menge = Number(raw.replace(",", "."));

  if (!Number.isFinite(menge) || menge <= 0) return;

  const einheitTxt = String(p.einheit || "").toLowerCase();
  const istStunden = /stund|std|\bh\b/.test(einheitTxt);

  if (!istStunden) menge = Math.trunc(menge); // Stück erzwingen

  p.menge = menge;

  // Anzeige stabil im Komma-Format
  p.menge_raw = String(menge).replace(".", ",");

  p.gesamt = menge * Number(p.preis ?? 0);

  zeigeEditPositionen();
}









// ---- Status UI im Edit (wie Add)
const editTypSelect = document.getElementById("edit_typ");
const editStatusWrap = document.getElementById("edit_statusWrap");
const editStatusSelect = document.getElementById("edit_status");

function syncEditStatusUI() {
  if (!editTypSelect || !editStatusWrap || !editStatusSelect) return;

  const typ = editTypSelect.value;
  if (typ === "rechnung") {
    editStatusWrap.style.display = "";
  } else {
    editStatusWrap.style.display = "none";
    editStatusSelect.value = "entwurf";
  }
}

if (editTypSelect) {
  editTypSelect.addEventListener("change", syncEditStatusUI);
  syncEditStatusUI();
}

// =========================================================
// BUTTONS IM VERWALTEN MODAL
// =========================================================
const verwaltenBearbeitenBtn = document.getElementById("rechnungBearbeitenBtn");
const verwaltenDetailsBtn = document.getElementById("rechnungDetailsBtn");
const verwaltenLoeschenBtn = document.getElementById("rechnungLoeschenBtn");

// --- Bearbeiten öffnen
if (verwaltenBearbeitenBtn) {
  verwaltenBearbeitenBtn.addEventListener("click", async () => {
    if (!rechte.darfBearbeiten) {
      showToast("Keine Berechtigung: Rechnung bearbeiten", "error");
      return;
    }
    if (!aktuelleRechnung || !aktuelleRechnung.id) return;
    
    try {
      // Voll laden
      const full = await ladeRechnungVoll(aktuelleRechnung.id);
      aktuelleRechnungVoll = full;

      // Edit-Felder füllen
      const r = full.rechnung;

      document.getElementById("edit_typ").value = r.typ || "";
      document.getElementById("edit_kunde").value = r.kunde_anzeige || "";
      document.getElementById("edit_kunde_id").value = r.kunde_id || "";
      document.getElementById("edit_bemerkung1").value = r.bemerkung1 || "";
      document.getElementById("edit_datum").value = r.datum ? formatYMD(r.datum) : "";
      document.getElementById("edit_datumfaellig").value = r.faellig_am ? formatYMD(r.faellig_am) : "";
      document.getElementById("edit_bemerkung").value = r.bemerkung || "";
      //document.getElementById("edit_ersteller").value = r.erstellt_von ?? "";
      const editErstellerEl = document.getElementById("edit_ersteller");
      if (editErstellerEl) editErstellerEl.value = r.erstellt_von ?? "";

      const b1Anz = Number(r.bemerkung_anzeigen1 ?? 0) === 1;
      const b1El = document.getElementById("edit_bemerkung_anzeigen1");
      if (b1El) b1El.checked = b1Anz;

      const bAnz = Number(r.bemerkung_anzeigen ?? 0) === 1;
      const bEl = document.getElementById("edit_bemerkung_anzeigen");
      if (bEl) bEl.checked = bAnz;

      const sAnz = Number(r.skonto_hinzufuegen ?? 0) === 1;
      if (editSkontoFlagEl) editSkontoFlagEl.checked = sAnz;
      if (editSkontoEl) editSkontoEl.value = (r.skonto ?? "");
      if (editSkontoTageEl) editSkontoTageEl.value = (r.skonto_tage ?? "");
      syncEditSkontoUI();


      // Status-Regel: Angebot immer entwurf
      const statusFinal = (r.typ === "angebot") ? "entwurf" : (r.status || "entwurf");
      if (editStatusSelect) editStatusSelect.value = statusFinal;

      // Edit-Positionen setzen
      editPositions = (full.positionen || []).map(p => {
        const preis = Number(p.einzelpreis ?? 0);
        const menge = Number(p.menge ?? 0);

        return {
          artikel_id: p.artikel_id ?? null,
          mwst_satz: p.mwst_satz ?? 20,
          bezeichnung: p.artikel_bezeichnung || p.beschreibung || "",

          // ✅ DAS fehlt dir sehr wahrscheinlich:
          einheit: p.einheit ?? p.artikel_einheit ?? "Stück",

          preis_original: preis,
          preis: preis,

          menge,
          menge_raw: String(menge).replace(".", ","), // ✅ NEU
          gesamt: preis * menge,
          bauseits: Number(p.bauseits ?? 0) === 1
        };
      });


      zeigeEditPositionen();
      syncEditStatusUI();

      // Modals umschalten (wie Lager)
      modalVerwalten.hide();
      setTimeout(() => modalBearbeiten.show(), 200);

    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  });
}

// --- Details öffnen
if (verwaltenDetailsBtn) {
  verwaltenDetailsBtn.addEventListener("click", async () => {
    if (!aktuelleRechnung || !aktuelleRechnung.id) return;

    try {
      const full = await ladeRechnungVoll(aktuelleRechnung.id);
      aktuelleRechnungVoll = full;

      const r = full.rechnung;
      if (detailPdfBtn) detailPdfBtn.dataset.rechnungId = String(r.id || "");
      renderDetailPositionen(full.positionen);

      document.getElementById("detailRechnungsnummer").textContent = r.rechnungsnummer || "-";
      document.getElementById("detailTyp").textContent = r.typ || "-";
      document.getElementById("detailStatus").textContent = r.status || "entwurf";

      document.getElementById("detailBemerkung1").textContent = r.bemerkung1 || "-";
      // Bemerkung1 anzeigen (0/1)
      const bemerkung1Flag = Number(r.bemerkung_anzeigen1 ?? 0);
      const bemerkung1Text = bemerkung1Flag === 1 ? "Ja" : "Nein";
      const elBemAnz1 = document.getElementById("detailBemerkungAnzeigen1");
      if (elBemAnz1) elBemAnz1.textContent = bemerkung1Text;

      document.getElementById("detailKunde").textContent = r.kunde_anzeige || "-";
      document.getElementById("detailBemerkung").textContent = r.bemerkung || "-";
      // Bemerkung anzeigen (0/1)
      const bemerkungFlag = Number(r.bemerkung_anzeigen ?? 0);
      const bemerkungText = bemerkungFlag === 1 ? "Ja" : "Nein";
      const elBemAnz = document.getElementById("detailBemerkungAnzeigen");
      if (elBemAnz) elBemAnz.textContent = bemerkungText;

      // Skonto (nur wenn aktiv)
      const skontoFlag = Number(r.skonto_hinzufuegen ?? 0);
      const elSkonto = document.getElementById("detailSkonto");

      if (elSkonto) {
        if (skontoFlag === 1) {
          const prozent = Number(r.skonto ?? 0);
          const tage = Number(r.skonto_tage ?? 0);
          elSkonto.textContent = `${prozent}% / ${tage} Tage`;
        } else {
          elSkonto.textContent = "Nein";
        }
      }
      document.getElementById("detailDatum").textContent = r.datum ? formatYMD(r.datum) : "-";
      document.getElementById("detailFaellig").textContent = r.faellig_am ? formatYMD(r.faellig_am) : "-";
      document.getElementById("detailNetto").textContent = (r.netto_summe ?? 0) + " €";
      document.getElementById("detailBrutto").textContent = (r.brutto_summe ?? 0) + " €";

      modalVerwalten.hide();
      setTimeout(() => modalDetails.show(), 200);

    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  });
}

if (detailPdfBtn) {
  detailPdfBtn.addEventListener("click", async () => {
    const id = Number(detailPdfBtn.dataset.rechnungId);
    if (!id) return showToast("❌ Keine ID für PDF gefunden.", "error");

    try {
      // 1) Voll aus DB laden (rechnung + positionen)
      const full = await ladeRechnungVoll(id);
      const r = full.rechnung;
      const pos = full.positionen || [];

      // 2) Summen aus DB verwenden (keine Neuberechnung nötig)
      const netto = Number(r.netto_summe ?? 0);
      const brutto = Number(r.brutto_summe ?? 0);
      const mwst = Number(r.mwst_summe ?? 0);

      // wenn du mwst_prozent nicht speicherst:
      const mwst_prozent = netto > 0 ? Math.round((mwst / netto) * 100) : 20;

      // 3) Payload bauen für /api/rechnungen/pdf
      const pdfPayload = {
        firma: {
          name: "Bergermayer InstallationsgmbH",
          strasse: "Seefeld 267",
          plz: "2062",
          ort: "Seefeld-Kadolz",
          telefon: "+43 2943 2053",
          fax: "+43 2943 20534",
          email: "gwh.bergermayer@aon.at",
          iban: "AT00 0000 0000 0000",
          bic: "BICCODE"
        },
        kunde: {
          name: r.kunde_anzeige || "",
          kunde_id: Number(r.kunde_id)
        },
        rechnung: {
          typ: r.typ,
          titel: (String(r.typ).toLowerCase() === "angebot") ? "Angebot" : "Rechnung",
          nummer: r.nummer,
          rechnungsnummer: r.rechnungsnummer,
          bemerkung1: r.bemerkung1 || "",
          bemerkung_anzeigen1: Number(r.bemerkung_anzeigen1 ?? 0),
          datum: formatYMD(r.datum),
          faellig: formatYMD(r.faellig_am),
          bemerkung: r.bemerkung || "",
          bemerkung_anzeigen: Number(r.bemerkung_anzeigen ?? 0),
          skonto_hinzufuegen: Number(r.skonto_hinzufuegen ?? 0),
          skonto: r.skonto ?? null,
          skonto_tage: r.skonto_tage ?? null,
          kunde_id: Number(r.kunde_id)
        },
        positionen: pos.map(p => {
          const menge = Number(p.menge ?? 0);
          const einzelpreis = Number(p.einzelpreis ?? 0);
          return {
            bezeichnung: p.artikel_bezeichnung || p.beschreibung || "",
            menge,
            einzelpreis,
            bauseits: Number(p.bauseits ?? 0),   // ✅ hinzufügen
            gesamt: menge * einzelpreis
          };
        }),
        summen: { netto, mwst_prozent, mwst, brutto }
      };

      // 4) PDF erzeugen lassen
      const pdfRes = await fetch("/api/rechnungen/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload)
      });

      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({}));
        return showToast("❌ PDF Fehler: " + (err.message || pdfRes.statusText), "error");
      }

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safeName = (r.rechnungsnummer || "dokument").replace(/[^\w\-]/g, "_");
      a.download = `${safeName}.pdf`;

      a.click();
      URL.revokeObjectURL(url);

    } catch (e) {
      showToast("❌ PDF konnte nicht erstellt werden: " + e.message, "error");
    }
  });
}




// --- Löschen öffnen
if (verwaltenLoeschenBtn) {
  verwaltenLoeschenBtn.addEventListener("click", () => {
    if (!rechte.darfLoeschen) {
      showToast("Keine Berechtigung: Rechnung löschen", "error");
      return;
    }

    if (!aktuelleRechnung || !aktuelleRechnung.id) return;
    modalVerwalten.hide();
    setTimeout(() => modalLoeschen.show(), 200);
  });
}

// =========================================================
// LÖSCHEN BESTÄTIGEN (Button im Lösch-Modal)
// =========================================================
const rechnungLoeschenBtn2 = document.getElementById("rechnungLoeschenBtn2");

if (rechnungLoeschenBtn2) {
  rechnungLoeschenBtn2.addEventListener("click", async () => {
    if (!rechte.darfLoeschen) {
      showToast("Keine Berechtigung: Rechnung löschen", "error");
      return;
    }

    if (!aktuelleRechnung || !aktuelleRechnung.id) return;

    try {
      const res = await fetch(`/api/rechnungen/${aktuelleRechnung.id}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("❌ " + (data.message || res.statusText), "error");
        return;
      }

      modalLoeschen.hide();
      aktuelleRechnung = null;
      aktuelleRechnungVoll = null;

      ladeRechnung(); // Tabelle neu laden
      showToast(data.message || "✅ Rechnung gelöscht.", "success");

    } catch (err) {
      showToast("❌ Serverfehler beim Löschen: " + err.message, "error");
    }
  });
}

// =========================================================
// EDIT: ARTIKEL HINZUFÜGEN (Artikel-Modal für Edit benutzen)
// -> wir unterscheiden, ob Add oder Edit geöffnet hat
// =========================================================
let artikelPickMode = "add"; // "add" oder "edit"

const openArtikelAdd = document.getElementById("artikelModalOpenAdd");
const openArtikelEdit = document.getElementById("artikelModalOpenEdit");

if (openArtikelAdd) {
  openArtikelAdd.addEventListener("click", () => {
    artikelPickMode = "add";

    // Add-Modal ausblenden → Artikel-Modal anzeigen
    const addEl = document.getElementById("rechnungenHinzufuegenModal");
    const artikelEl = document.getElementById("artikelModal");

    const addModal = bootstrap.Modal.getInstance(addEl) || new bootstrap.Modal(addEl);
    const artikelModal = bootstrap.Modal.getInstance(artikelEl) || new bootstrap.Modal(artikelEl);

    addModal.hide();
    artikelModal.show();
  });
}

if (openArtikelEdit) {
  openArtikelEdit.addEventListener("click", () => {
    artikelPickMode = "edit";

    // Edit-Modal ausblenden → Artikel-Modal anzeigen
    const artikelEl = document.getElementById("artikelModal");
    const artikelModal = bootstrap.Modal.getInstance(artikelEl) || new bootstrap.Modal(artikelEl);

    modalBearbeiten.hide();
    artikelModal.show();
  });
}


// Patch deine bestehende ladeArtikel()-Button-Logik:
// -> statt immer in "positions" pushen, je nach artikelPickMode in positions ODER editPositions
// Du hast den Codeblock "btnAdd.addEventListener('click', ...)" – ersetze NUR den inneren Teil durch:
window.__addArtikelToPositions = function (artikel, menge) {
  const target = (artikelPickMode === "edit") ? editPositions : positions;
  const vorhandener = target.find(p => p.artikel_id === artikel.id);
  const preis = Number(artikel.verkaufspreis);

  if (vorhandener) {
    vorhandener.menge = Number(vorhandener.menge) + Number(menge);
    vorhandener.gesamt = vorhandener.menge * Number(vorhandener.preis ?? 0);
  } else {
    target.push({
      artikel_id: artikel.id,
      mwst_satz: artikel.mwst_satz ?? 20,
      bezeichnung: artikel.bezeichnung,
      einheit: artikel.einheit ?? "Stück",   // ✅ NEU

      preis_original: preis,
      preis: preis,

      menge: Number(menge),
      gesamt: preis * Number(menge),

      bauseits: false
    });
  }

  if (artikelPickMode === "edit") zeigeEditPositionen();
  else zeigePositionen();
};


// =========================================================
// EDIT SPEICHERN (PUT)
// =========================================================
const rechnungBearbeitenSpeichernBtn = document.getElementById("rechnungBearbeitenSpeichernBtn");

if (rechnungBearbeitenSpeichernBtn) {
  rechnungBearbeitenSpeichernBtn.addEventListener("click", async () => {
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
      await new Promise(r => setTimeout(r, 0));
    }

    if (!rechte.darfBearbeiten) {
      showToast("Keine Berechtigung: Rechnung bearbeiten", "error");
      return;
    }

    if (!aktuelleRechnung || !aktuelleRechnung.id) return;

    const typ = document.getElementById("edit_typ").value;
    const kundeId = document.getElementById("edit_kunde_id").value;
    const bemerkung1 = document.getElementById("edit_bemerkung1").value;
    const bemerkung_anzeigen1 = document.getElementById("edit_bemerkung_anzeigen1")?.checked ? 1 : 0;
    const datum = document.getElementById("edit_datum").value;
    const faellig = document.getElementById("edit_datumfaellig").value;
    const bemerkung = document.getElementById("edit_bemerkung").value;
    const bemerkung_anzeigen = document.getElementById("edit_bemerkung_anzeigen")?.checked ? 1 : 0;
    const skonto_hinzufuegen = document.getElementById("edit_skonto_hinzufuegen")?.checked ? 1 : 0;
    const skonto = skonto_hinzufuegen ? Number(document.getElementById("edit_skonto")?.value) : null;
    const skonto_tage = skonto_hinzufuegen ? Number(document.getElementById("edit_skonto_tage")?.value) : null;

    const erstellt_von = document.getElementById("edit_ersteller")?.value || null;


    const status = (typ === "rechnung")
      ? (document.getElementById("edit_status")?.value || "entwurf")
      : "entwurf";

    if (!typ || !kundeId || !datum || editPositions.length === 0) {
      showToast("Bitte Pflichtfelder ausfüllen und mindestens eine Position haben.", "error");
      return;
    }

    const positionen = editPositions.map((p, idx) => ({
      pos: idx + 1,
      artikel_id: p.artikel_id ?? null,
      beschreibung: p.bezeichnung,

      // ✅ wichtig: immer numerisch machen
      menge: Number(String(p.menge).replace(",", ".")),

      einzelpreis: p.bauseits ? 0 : p.preis,
      bauseits: p.bauseits ? 1 : 0,
      mwst_satz: p.mwst_satz ?? 20
    }));


    //const netto = positionen.reduce((sum, p) => sum + (p.menge * p.einzelpreis), 0);
    const netto = positionen.reduce((sum, p) => sum + (Number(p.menge) * Number(p.einzelpreis ?? 0)), 0);
    const mwst_prozent = 20;
    const mwst = netto * (mwst_prozent / 100);
    const brutto = netto + mwst;

    const payload = {
      typ,
      kunde_id: Number(kundeId),
      bemerkung1: bemerkung1 || null,
      bemerkung_anzeigen1,
      datum,
      faellig_am: faellig || null,
      bemerkung: bemerkung || null,
      bemerkung_anzeigen,
      skonto_hinzufuegen,
      skonto: skonto_hinzufuegen ? skonto : null,
      skonto_tage: skonto_hinzufuegen ? skonto_tage : null,
      erstellt_von: erstellt_von ? Number(erstellt_von) : null,
      status,
      summen: { netto, mwst, brutto, mwst_prozent },
      positionen
    };

    try {
      const res = await fetch(`/api/rechnungen/${aktuelleRechnung.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("❌ " + (data.message || res.statusText), "error");
        return;
      }

      modalBearbeiten.hide();
      ladeRechnung();
      showToast("✅ Änderungen gespeichert!", "success");

    } catch (err) {
      showToast("❌ Serverfehler beim Speichern: " + err.message, "error");
    }
  });
}

// =========================================================
// KUNDE IM EDIT ÄNDERN (optional, aber deine HTML hat es)
// =========================================================
const editKundeInput = document.getElementById("edit_kunde");
if (editKundeInput) {
  editKundeInput.addEventListener("click", () => {
    const m = new bootstrap.Modal(document.getElementById("kundenAuswahlModalEdit"));
    m.show();
    ladeKundenEdit();
  });
}

async function ladeKundenEdit(suchtext = "") {
  const res = await fetch(`/api/kunden?suche=${encodeURIComponent(suchtext)}`);
  const daten = await res.json();
  const body = document.getElementById("kundenTabelleEdit");
  body.innerHTML = "";

  if (!daten.length) {
    body.innerHTML = `<tr><td colspan="5" class="text-center">Keine Kunden gefunden</td></tr>`;
    return;
  }

  daten.forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${k.firma}</td>
      <td>${k.vorname}</td>
      <td>${k.nachname}</td>
      <td>${k.plz}</td>
      <td>${k.ort}</td>
    `;
    tr.addEventListener("dblclick", () => {
      document.getElementById("edit_kunde").value = `${k.firma} (${k.vorname} ${k.nachname})`;
      document.getElementById("edit_kunde_id").value = k.id;
      document.getElementById("kundenAuswahlModalEdit").querySelector(".btn-close").click();
    });
    body.appendChild(tr);
  });
}

const kundenSuchfeldEdit = document.getElementById("kundenSuchfeldEdit");
let kundenSuchTimerEdit;
if (kundenSuchfeldEdit) {
  kundenSuchfeldEdit.addEventListener("input", () => {
    clearTimeout(kundenSuchTimerEdit);
    kundenSuchTimerEdit = setTimeout(() => {
      ladeKundenEdit(kundenSuchfeldEdit.value.trim());
    }, 300);
  });
}
