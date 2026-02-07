import { showToast } from "./alert.js";
import { darf } from "./rechteCheck.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);

  const rechte = await pruefeRecht();

  if (!rechte.darfAnsehen) {
    alert("Dafür hast du keine Rechte!");
    window.location.href = "/index.html";
    return;
  }

    if(!rechte.darfHinzufuegen){
    const btn = document.getElementById("materialHinzufuegenBtn");
    if (btn) btn.style.display = "none";
  }

  if (params.get("modal") === "add") {
    const modalEl = document.getElementById("materialHinzufuegenModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }
});

async function pruefeRecht() {
  return {
    darfHinzufuegen: await darf("lager", "hinzufügen"),
    darfBearbeiten: await darf("lager", "bearbeiten"),
    darfLoeschen: await darf("lager", "löschen"),
    darfAnsehen: await darf("lager", "ansehen")
  };
}

// *********************************************************************
//  LAGER-SKRIPT – SAUBERE, STABILE UND OPTIMIERTE VERSION
//  (Alle ursprünglichen Kommentare sind erhalten oder sinnvoll einsortiert)
// *********************************************************************



let aktuellerArtikel = null;

/* =========================================================
   MATERIAL SPEICHERN (Modal: MaterialHinzufuegen)
   ========================================================= */
const materialSpeichernBtn = document.getElementById("materialSpeichernBtn");

if (materialSpeichernBtn) {
    materialSpeichernBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Werte aus dem Formular holen
        const bezeichnung = document.getElementById('bezeichnung').value.trim();
        const beschreibung = document.getElementById('beschreibung').value.trim();
        const einheit = document.getElementById('einheit').value.trim();
        const einkaufspreis = parseFloat(document.getElementById('einkaufspreis').value);
        const verkaufspreis = parseFloat(document.getElementById('verkaufspreis').value);
        const einkaufspreis_vorher_raw = document.getElementById('einkaufspreis_vorher').value;
        const einkaufspreis_vorher = einkaufspreis_vorher_raw === "" ? null : parseFloat(einkaufspreis_vorher_raw);
        const verkaufspreis_vorher_raw = document.getElementById('verkaufspreis_vorher').value;
        const verkaufspreis_vorher = verkaufspreis_vorher_raw === "" ? null : parseFloat(verkaufspreis_vorher_raw);
        const mwst_raw = document.getElementById('mwst_satz').value;
        const mwst_satz = mwst_raw === "" ? null : parseFloat(mwst_raw);
        const mindestbestand = parseInt(document.getElementById('mindestbestand').value);
        const lagerort = document.getElementById('lagerort').value.trim();


        // Pflichtfelder prüfen
        if (!bezeichnung || !Number.isFinite(einkaufspreis) || !Number.isFinite(verkaufspreis)) {
            showToast("❌ Bitte Bezeichnung, Einkaufspreis und Verkaufspreis ausfüllen.", "error");
            return; // ➜ NICHT speichern, Modal bleibt offen
        }


        try {
            const res = await fetch('/api/lager/material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bezeichnung,
                    beschreibung,
                    einheit,
                    einkaufspreis,
                    einkaufspreis_vorher,
                    verkaufspreis,
                    verkaufspreis_vorher,
                    mwst_satz,
                    mindestbestand,
                    lagerort
                })
            });

            const data = await res.json();
            //const meldung = document.getElementById('meldung');

            if (res.ok) {
                showToast(data.message || "✅ Material gespeichert.", "success");
  

                // Formular leeren
                document.getElementById('bezeichnung').value = "";
                document.getElementById('beschreibung').value = "";
                document.getElementById('einheit').value = "";
                document.getElementById('einkaufspreis').value = "";
                document.getElementById('einkaufspreis_vorher').value = "";
                document.getElementById('verkaufspreis').value = "";
                document.getElementById('verkaufspreis_vorher').value = "";
                document.getElementById('mwst_satz').value = "";
                document.getElementById('mindestbestand').value = 0;
                document.getElementById('lagerort').value = "";

                // Modal schließen
                const modalEl = document.getElementById("materialHinzufuegenModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                // Tabelle neu laden
                ladeArtikel();
            } else {
                showToast(data.message || "❌ Fehler beim Speichern.", "error");
            }
        } catch (err) {
            showToast("❌ Serverfehler: " + err.message, "error");
        }
    });
}

/* =========================================================
   WARENEINGANG / -AUSGANG BUCHEN
   ========================================================= */
const buchenBtn = document.getElementById("artieklbewegungBuchenBtn");

if (buchenBtn) {
    buchenBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        //const meldung = document.getElementById("meldung1");

        const menge = Number(document.getElementById("menge_eingang")?.value);
        const lagerort = document.getElementById("lagerortAuswaehlern")?.value ?? null;
        const bemerkung = document.getElementById("bemerkung_eingang")?.value ?? null;

        let typ = null;
        if (document.getElementById("option1")?.checked) typ = "wareneingang";
        if (document.getElementById("option2")?.checked) typ = "warenausgang";

        // Basisvalidierung
        if (!typ) {
            //meldung.textContent = "❌ Bitte Wareneingang oder Warenausgang auswählen.";
            //meldung.style.color = "red";
            //Toast
            showToast("❌ Bitte Wareneingang oder Warenausgang auswählen.", "error");
            return;
        }
        if (!aktuellerArtikel) {
            //meldung.textContent = "❌ Kein Artikel ausgewählt.";
            //meldung.style.color = "red";
            //Toast
            showToast("❌ Kein Artikel ausgewählt.", "error")
            return;
        }
        if (!Number.isFinite(menge) || menge <= 0) {
            //meldung.textContent = "❌ Ungültige Menge (> 0 erforderlich).";
            //meldung.style.color = "red";
            // Toast
            showToast("❌ Ungültige Menge (> 0 erforderlich).", "error")
            return;
        }

        try {
            const response = await fetch('/api/lager/bewegung', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    artikel_id: aktuellerArtikel.id, // Artikel-ID aus DB!
                    menge,
                    lagerort: lagerort || null,
                    bemerkung: bemerkung || null,
                    typ
                })
            });

            const data = await response.json();

            if (response.ok) {
                //meldung.textContent = "✅ " + (data.message || "Buchung erfolgreich.");
                //meldung.style.color = "green";
                //Meldung auf Bewegungs Modal --> nicht unbedingt notwendig weil dann ja eh da toast is
                showToast(data.message || `✅ Warenbewegung für ${artikelInfo} erfolgreich gebucht.`, "success");
                //showToast(data.message, "success")

                ladeArtikel();
                modalWarenewegung.hide();

                // Felder zurücksetzen
                // document.getElementById("menge_eingang").value = "";
                // document.getElementById("lagerortAuswaehlern").value = "";
                // document.getElementById("bemerkung_eingang").value = "";
                // Radiobuttons zurücksetzen
                // document.getElementById("option1").checked = false;
                // document.getElementById("option2").checked = false;

                //zurücksetzen mit reset
                resetWarenbewegungForm();
                

            } else {
                // meldung.textContent = "❌ " + (data.message || "Fehler bei der Buchung.");
                // meldung.style.color = "red";
                showToast(data.message || `❌ Fehler bei der Buchung (${artikelInfo}).`, "error");
            }
        } catch (err) {
            // meldung.textContent = "❌ Server nicht erreichbar.";
            // meldung.style.color = "red";
            console.error("❌ Server nicht erreichbar:", err);
            showToast("❌ Server nicht erreichbar.", "error");
        }
    });
}

/* =========================================================
   TABELLE: ARTIKEL LADEN UND DARSTELLEN
   ========================================================= */
async function ladeArtikel(suchtext = '') {
    try {
        const res = await fetch(`/api/lager?suche=${encodeURIComponent(suchtext)}`);
        const daten = await res.json();
        zeigeArtikel(daten);
    } catch (error) {
        console.error('Fehler beim Laden der Artikel:', error);
    }
}

function zeigeArtikel(daten) {
    const tabelle = document.getElementById('artikelBody');
    tabelle.innerHTML = '';

    if (!daten.length) {
        tabelle.innerHTML = `<tr><td colspan="6">Keine Artikel gefunden</td></tr>`;
        return;
    }

    daten.forEach(artikel => {
        const tr = document.createElement('tr');
        tr.dataset.artikel = JSON.stringify(artikel);
        tr.innerHTML = `
            <td>${artikel.nummer}</td>
            <td>${artikel.bezeichnung}</td>
            <td>${artikel.einheit}</td>
            <td>${Number(artikel.einkaufspreis).toFixed(2)} €</td>
            <td>${Number(artikel.verkaufspreis).toFixed(2)} €</td>
            <td>${artikel.bestand ?? 0}</td>
        `;

        /*
        tr.addEventListener("dblclick", () => {
            aktuellerArtikel = JSON.parse(tr.dataset.artikel);
            modalVerwalten.show();
        });
        */

        tr.addEventListener("dblclick", async () => {
            const art = JSON.parse(tr.dataset.artikel);   // artikel wirklich aus Reihe holen
            const nummer = art.nummer;

            console.log("AUFGERUFENE URL:", `/api/lager/${nummer}`);

            try {
                const res = await fetch(`/api/lager/${nummer}`);
                const datenAlsText = await res.text();  // für Debug
                console.log("Antwort vom Server:", datenAlsText);

                const daten = JSON.parse(datenAlsText);
                const rechte = await pruefeRecht();
                if (res.ok) {
                    if(rechte.darfBearbeiten || rechte.darfLoeschen){
                        aktuellerArtikel = daten;
                        modalVerwalten.show();
                    }
                } else {
                    // alert("Fehler: " + daten.message);
                    showToast("❌ " + (daten.message || "Fehler beim Laden des Artikels."), "error");

                }
            } catch (err) {
                console.error("❌ Fehler beim Laden des Artikels:", err);
            }
        });



        tabelle.appendChild(tr);
    });
}

/* =========================================================
   SUCHFELD
   ========================================================= */
const suchfeld = document.getElementById('suchfeld');
let timer;

if (suchfeld) {
    suchfeld.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => ladeArtikel(e.target.value.trim()), 300);
    });
}

/* =========================================================
   MODALS
   ========================================================= */
const modalVerwalten = new bootstrap.Modal(document.getElementById("artikelVerwalten"));
const modalBearbeiten = new bootstrap.Modal(document.getElementById("artikelBearbeiten"));
const modalWarenewegung = new bootstrap.Modal(document.getElementById("warenbewegungModal"));
const modalLoeschen = new bootstrap.Modal(document.getElementById("artikelLoeschen"));
const modalDetails = new bootstrap.Modal(document.getElementById("artikelDetails"));

/* =========================================================
   MATERIAL BEARBEITEN
   ========================================================= */
const materialBearbeitenBtn = document.getElementById("materialBearbeitenBtn");

if (materialBearbeitenBtn) {
    materialBearbeitenBtn.addEventListener("click", async () => {
        const rechte = await pruefeRecht();
        if(!rechte.darfBearbeiten){
            showToast("Darfst du nicht!", "error")
            return;
        }

        modalVerwalten.hide();

        setTimeout(() => {
            document.getElementById("editBezeichnung").value = aktuellerArtikel.bezeichnung;
            document.getElementById("editBeschreibung").value = aktuellerArtikel.beschreibung;
            document.getElementById("edit_einheit").value = aktuellerArtikel.einheit;
            document.getElementById("editEinkaufspreis").value = aktuellerArtikel.einkaufspreis;
            document.getElementById("editEinkaufspreis_vorher").value = aktuellerArtikel.einkaufspreis_vorher ?? "";
            document.getElementById("editVerkaufspreis").value = aktuellerArtikel.verkaufspreis;
            document.getElementById("editVerkaufspreis_vorher").value = aktuellerArtikel.verkaufspreis_vorher ?? "";
            document.getElementById("editMwst_satz").value = aktuellerArtikel.mwst_satz;
            document.getElementById("editMindestbestand").value = aktuellerArtikel.mindestbestand ?? 0;
            document.getElementById("editLagerort").value = aktuellerArtikel.lagerort;

            modalBearbeiten.show();
        }, 250);
    });
}

/* =========================================================
   MATERIAL BEARBEITUNG SPEICHERN
   ========================================================= */
const artikelBearbeitenSpeichernBtn = document.getElementById("artikelBearbeitenSpeichernBtn");

if (artikelBearbeitenSpeichernBtn) {
    artikelBearbeitenSpeichernBtn.addEventListener("click", async () => {

        if (!aktuellerArtikel || !aktuellerArtikel.id) {
            showToast("❌ Kein Artikel ausgewählt.", "error");
            return;
        }

        // Werte aus dem Formular holen
        const bezeichnung = document.getElementById("editBezeichnung").value.trim();
        const beschreibung = document.getElementById("editBeschreibung").value.trim();
        const einheit = document.getElementById("edit_einheit").value;
        const einkaufspreis = parseFloat(document.getElementById("editEinkaufspreis").value);
        const eiv = document.getElementById("editEinkaufspreis_vorher").value;
        const einkaufspreis_vorher = eiv === "" ? null : parseFloat(eiv);
        const verkaufspreis = parseFloat(document.getElementById("editVerkaufspreis").value);
        const vvv = document.getElementById("editVerkaufspreis_vorher").value;
        const verkaufspreis_vorher = vvv === "" ? null : parseFloat(vvv);
        const mwst_satz = parseFloat(document.getElementById("editMwst_satz").value);
        const mindestbestand = parseInt(document.getElementById("editMindestbestand").value);
        const lagerort = document.getElementById("editLagerort").value.trim();

        try {
            const res = await fetch(`/api/lager/update/${aktuellerArtikel.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bezeichnung,
                    beschreibung,
                    einheit,
                    einkaufspreis_vorher,
                    einkaufspreis,
                    verkaufspreis_vorher,
                    verkaufspreis,
                    mwst_satz,
                    mindestbestand,
                    lagerort
                })

            });

            const data = await res.json();
            /*
            const text = await res.text();
            console.log("Antwort-Rohtext (Update):", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("❌ Antwort war kein JSON!", text);
                alert("❌ Server hat keine gültige JSON-Antwort geliefert.");
                return;
            }
                */



            if (res.ok) {
                const artikelInfo = `${aktuellerArtikel.nummer} , "${aktuellerArtikel.bezeichnung}"`;

                modalBearbeiten.hide();
                ladeArtikel();

                showToast(
                `✏️ Artikel ${artikelInfo} wurde erfolgreich bearbeitet.`,
                "success"
                );
            } else {
                showToast(
                    data.message || "❌ Fehler beim Bearbeiten des Artikels.",
                    "error"
                );
            }
        } catch (err) {
            console.error("❌ Bearbeitungsfehler:", err);
            showToast(
                "❌ Serverfehler beim Aktualisieren des Artikels.",
                "error"
            );

        }
    });
}




/* =========================================================
   WARENBEWEGUNG MODAL
   ========================================================= */
const warenBtn = document.getElementById("warenbewegungBtn");

if (warenBtn) {
  warenBtn.addEventListener("click", async () => {
    const rechte = await pruefeRecht();
    if(!rechte.darfBearbeiten){
        showToast("Darfst du nicht!", "error");
        return;
    }
    if (!aktuellerArtikel) {
      showToast("❌ Kein Artikel ausgewählt.", "error");
      return;
    }

    // Anzeige füllen
    const infoEl = document.getElementById("wb_artikelInfo");
    if (infoEl) infoEl.textContent = `${aktuellerArtikel.nummer} – ${aktuellerArtikel.bezeichnung}`;

    const bestandEl = document.getElementById("wb_bestand");
    if (bestandEl) {
      const bestand = aktuellerArtikel.bestand ?? 0;
      const einheit = aktuellerArtikel.einheit ?? "";
      bestandEl.textContent = `${bestand} ${einheit}`.trim();
    }

    modalVerwalten.hide();
    setTimeout(() => modalWarenewegung.show(), 250);
  });
}


/* =========================================================
   ARTIKEL LÖSCHEN
   ========================================================= 
const artikelLoeschenBtn = document.getElementById("artikelLoeschenBtn");

if (artikelLoeschenBtn) {
    artikelLoeschenBtn.addEventListener("click", () => {
        modalVerwalten.hide();

        setTimeout(() => {
            document.getElementById("artikelBezeichnungLoeschen").textContent =
                aktuellerArtikel.bezeichnung;
            modalLoeschen.show();
        }, 250);
    });
}
    */



/* =========================================================
   ARTIKEL ENDGÜLTIG LÖSCHEN (im Bestätigungs-Modal)
   ========================================================= */
const artikelLoeschenOeffnenBtn = document.getElementById("artikelLoeschenBtn");

if (artikelLoeschenOeffnenBtn) {
    artikelLoeschenOeffnenBtn.addEventListener("click", async () => {
        const rechte = await pruefeRecht();

        if(!rechte.darfLoeschen){
            showToast("Darfst du nicht!", "error");
            return;
        }

        modalVerwalten.hide();

        setTimeout(() => {
            document.getElementById("artikelBezeichnungLoeschen").textContent =
                aktuellerArtikel.bezeichnung;

            modalLoeschen.show();
        }, 250);
    });
}


const artikelEndgueltigLoeschenBtn = document.getElementById("artikelEndgueltigLoeschenBtn");

if (artikelEndgueltigLoeschenBtn) {
  artikelEndgueltigLoeschenBtn.addEventListener("click", async () => {
    if (!aktuellerArtikel || !aktuellerArtikel.id) {
      showToast("❌ Kein gültiger Artikel ausgewählt.", "error");
      return;
    }

    const artikelInfo = `${aktuellerArtikel.nummer} , "${aktuellerArtikel.bezeichnung}"`;

    try {
      const res = await fetch(`/api/lager/delete/${aktuellerArtikel.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        modalLoeschen.hide();
        ladeArtikel();

        showToast(
          `🗑️ Artikel ${artikelInfo} wurde erfolgreich gelöscht.`,
          "success"
        );

        aktuellerArtikel = null;
      } else {
        showToast(data.message || "❌ Fehler beim Löschen.", "error");
      }
    } catch (err) {
      console.succes("❌ Fehler bei DELETE:", err);
      showToast("❌ Serverfehler beim Löschen.", "error");
    }
  });
}





/* =========================================================
   ARTIKEL DETAILS
   ========================================================= */
const artikelDetailsBtn = document.getElementById("artikelDetailsBtn");

if (artikelDetailsBtn) {
    artikelDetailsBtn.addEventListener("click", () => {
        modalVerwalten.hide();

        setTimeout(() => {
        document.getElementById("detailMaterialName").textContent = aktuellerArtikel.bezeichnung || "-";
        document.getElementById("detailBeschreibung").textContent = aktuellerArtikel.beschreibung || "-";
        document.getElementById("detailEinheit").textContent = aktuellerArtikel.einheit || "-";
        document.getElementById("detailEinkaufspreis").textContent = (aktuellerArtikel.einkaufspreis ?? 0) + " €";
        document.getElementById("detailEinkaufspreis_vorher").textContent = (aktuellerArtikel.einkaufspreis_vorher ?? 0) + " €";
        document.getElementById("detailVerkaufspreis").textContent = (aktuellerArtikel.verkaufspreis ?? 0) + " €";
        document.getElementById("detailVerkaufspreis_vorher").textContent = (aktuellerArtikel.verkaufspreis_vorher ?? 0) + " €";
        document.getElementById("detailMwst").textContent = (aktuellerArtikel.mwst_satz ?? 0) + " %";
        document.getElementById("detailMindestbestand").textContent = aktuellerArtikel.mindestbestand ?? "-";

        // ✅ NEU aus Datei 2 (aber stabiler)
        const bestandText = `${aktuellerArtikel.bestand ?? 0} ${aktuellerArtikel.einheit ?? ""}`.trim();
        const detailBestandEl = document.getElementById("detailBestand");
        if (detailBestandEl) detailBestandEl.textContent = bestandText;

        document.getElementById("detailLagerort").textContent = aktuellerArtikel.lagerort || "-";

        modalDetails.show();
        }, 250);

    });
}

/* =========================================================
   INITIAL LADEN DER ARTIKEL
   ========================================================= */
ladeArtikel();



/* =========================================================
   MATERIAL-HINZUFÜGEN-MODAL RESET
   ========================================================= */
function resetMaterialForm() {
  const form = document.getElementById("materialForm");
  if (form) form.reset(); // setzt alle Felder auf HTML-Defaults zurück

  // falls du Defaults per JS erzwingen willst:
  const mwst = document.getElementById("mwst_satz");
  if (mwst) mwst.value = 20;

  const mindest = document.getElementById("mindestbestand");
  if (mindest) mindest.value = 0;

  // falls select "einheit" wieder auf "nicht definiert" soll:
  const einheit = document.getElementById("einheit");
  if (einheit) einheit.value = "nicht definiert";
}

const materialModalEl = document.getElementById("materialHinzufuegenModal");
if (materialModalEl) {
  materialModalEl.addEventListener("hidden.bs.modal", resetMaterialForm);
}

/*
document.addEventListener("DOMContentLoaded", resetMaterialForm);
--> eig nicht nötig weil eh schon defer steht
*/

// Beim Refresh / Zurück-Cache (bfcache) Formular sicher leeren
window.addEventListener("pageshow", () => {
  // nach dem Browser-Restore drüberbügeln
  setTimeout(() => {
    resetMaterialForm();

    // optional: falls Modal beim Refresh offen war -> schließen
    const el = document.getElementById("materialHinzufuegenModal");
    if (el) {
      const inst = bootstrap.Modal.getInstance(el);
      if (inst) inst.hide();
    }
  }, 0);
});



function resetWarenbewegungForm() {
  // Eingabefelder zurücksetzen
  const menge = document.getElementById("menge_eingang");
  if (menge) menge.value = "";

  const lagerort = document.getElementById("lagerortAuswaehlern");
  if (lagerort) lagerort.value = "";

  const bemerkung = document.getElementById("bemerkung_eingang");
  if (bemerkung) bemerkung.value = "";

  // Radiobuttons zurücksetzen
  const opt1 = document.getElementById("option1");
  const opt2 = document.getElementById("option2");
  if (opt1) opt1.checked = false;
  if (opt2) opt2.checked = false;

  /*
  // Meldung im Modal leeren (falls du sie noch nutzt)
  const meldung = document.getElementById("meldung1");
  if (meldung) {
    meldung.textContent = "";
    meldung.style.color = "";
  }
    */

  // Anzeige oben im Modal zurücksetzen (optional)
  const infoEl = document.getElementById("wb_artikelInfo");
  if (infoEl) infoEl.textContent = "-";

  const bestandEl = document.getElementById("wb_bestand");
  if (bestandEl) bestandEl.textContent = "-";
}


const warenbewegungModalEl = document.getElementById("warenbewegungModal");
if (warenbewegungModalEl) {
  warenbewegungModalEl.addEventListener("hidden.bs.modal", () => {
    resetWarenbewegungForm();
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


document.addEventListener("DOMContentLoaded", () => {
  resetWarenbewegungForm();
});

