// public/scriptkunden.js
import { showToast } from "./alert.js";


let modalVerwalten = null;
let modalBearbeiten = null;
let modalDetail = null;
let modalService = null;
let modalLoeschen = null;


let kunden = [];              // Cache (wie bei Lager/Rechnungen)
let aktuellerKunde = null;    // falls du später "Verwalten" per Zeilenklick brauchst

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Optional: Modal automatisch öffnen via ?modal=add
  const params = new URLSearchParams(window.location.search);
  if (params.get("modal") === "add") {
    const modalEl = document.getElementById("kundenhinzufuegen");
    if (modalEl) new bootstrap.Modal(modalEl).show();
  }

  // ✅ Events (Suche)
  const sucheForm = document.getElementById("kundenSucheForm");
  const sucheInput = document.getElementById("kundenSucheInput");

  if (sucheForm && sucheInput) {
    sucheForm.addEventListener("submit", (e) => {
      e.preventDefault();
      ladeKunden(sucheInput.value.trim());
    });

    // "Live" Suche ähnlich wie oft genutzt: nach Tippen laden (debounced light)
    let t = null;
    sucheInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => ladeKunden(sucheInput.value.trim()), 250);
    });

    
  }

  // ✅ Modals initialisieren (wie bei dir)
  initModals();

  //Kundenart Firma/privat
  initKundenArtToggle();
  //Hinzufügen resetten
  resetKundenAddModal();
  // ✅ Initial: alle Kunden laden
  ladeKunden("");

  // ✅ Service-Modal Input beim Laden immer leeren (gegen Browser-Restore)
  resetKundenServiceModal();
});

window.addEventListener("pageshow", (e) => {
  // ✅ auch wenn der Browser die Seite aus dem Cache wiederherstellt (Back/Forward)
  resetKundenServiceModal();
});

function initModals() {
  const modalVerwaltenEl = document.getElementById("kundenVerwalten");
  const modalBearbeitenEl = document.getElementById("kundenBearbeitenModal");
  const modalDetailEl = document.getElementById("kundenDetailsModal");
  const modalServiceEl = document.getElementById("kundenServiceModal"); // ✅ richtig
  const modalLoeschenEl = document.getElementById("kundenLoeschenModal");

  modalVerwalten = modalVerwaltenEl ? new bootstrap.Modal(modalVerwaltenEl) : null;
  modalBearbeiten = modalBearbeitenEl ? new bootstrap.Modal(modalBearbeitenEl) : null;
  modalDetail = modalDetailEl ? new bootstrap.Modal(modalDetailEl) : null;
  modalService = modalServiceEl ? new bootstrap.Modal(modalServiceEl) : null; // ✅ richtig
  modalLoeschen = modalLoeschenEl ? new bootstrap.Modal(modalLoeschenEl) : null;

  // Buttons im Verwalten-Modal
  const btnBearbeiten = document.getElementById("kundenBearbeiten");
  const btnDetails = document.getElementById("kundenDetails");
  const btnService = document.getElementById("kundenService");
  const btnLoeschen1 = document.getElementById("kundenLoeschen1");

  if (btnBearbeiten && modalVerwalten && modalBearbeiten) {
    btnBearbeiten.addEventListener("click", () => {
      if (!aktuellerKunde) return;

      kundenBearbeitenFill(aktuellerKunde);

      modalVerwalten.hide();
      setTimeout(() => modalBearbeiten.show(), 150);
    });
  }

  const btnEditSave = document.getElementById("kBearbeitenSpeichern");
  if (btnEditSave) {
    btnEditSave.addEventListener("click", kundenBearbeitenSpeichern);
  }

  // ✅ DETAILS
  if (btnDetails && modalVerwaltenEl && modalDetailEl) {
    btnDetails.addEventListener("click", () => {
      if (!aktuellerKunde) return;

      kundenDetailsRender(aktuellerKunde);

      const onHidden = () => {
        modalVerwaltenEl.removeEventListener("hidden.bs.modal", onHidden);
        bootstrap.Modal.getOrCreateInstance(modalDetailEl).show();
      };

      modalVerwaltenEl.addEventListener("hidden.bs.modal", onHidden);
      bootstrap.Modal.getOrCreateInstance(modalVerwaltenEl).hide();
    });
  }

  // ✅ SERVICE (NEU integriert)
  if (btnService && modalVerwaltenEl && modalServiceEl) {
    btnService.addEventListener("click", () => {
      if (!aktuellerKunde) return;

      // optional: falls du was ins Service-Modal vorbefüllen willst
      // kundenServiceFill(aktuellerKunde);  // <- nur wenn du so eine Funktion hast

      const onHidden = () => {
        modalVerwaltenEl.removeEventListener("hidden.bs.modal", onHidden);
        bootstrap.Modal.getOrCreateInstance(modalServiceEl).show();
      };

      modalVerwaltenEl.addEventListener("hidden.bs.modal", onHidden);
      bootstrap.Modal.getOrCreateInstance(modalVerwaltenEl).hide();
    });
  }

  const btnServiceSpeichern = document.getElementById("kServiceSpeichern");
  if (btnServiceSpeichern) {
    btnServiceSpeichern.addEventListener("click", kundenServiceSpeichern);
  }

  if (modalVerwaltenEl) {
    modalVerwaltenEl.addEventListener("show.bs.modal", () => {
      updateVerwaltenButtons(aktuellerKunde);
    });
  }



  // ✅ LÖSCHEN
  if (btnLoeschen1 && modalVerwaltenEl && modalLoeschenEl) {
    btnLoeschen1.addEventListener("click", () => {
      if (!aktuellerKunde) return;

      const nameEl = document.getElementById("kundenLoeschName");
      if (nameEl) {
        const label =
          (aktuellerKunde.firma && aktuellerKunde.firma.trim()) ||
          `${aktuellerKunde.vorname ?? ""} ${aktuellerKunde.nachname ?? ""}`.trim() ||
          `ID ${aktuellerKunde.id}`;
        nameEl.textContent = label;
      }

      const onHidden = () => {
        modalVerwaltenEl.removeEventListener("hidden.bs.modal", onHidden);
        bootstrap.Modal.getOrCreateInstance(modalLoeschenEl).show();
      };

      modalVerwaltenEl.addEventListener("hidden.bs.modal", onHidden);
      bootstrap.Modal.getOrCreateInstance(modalVerwaltenEl).hide();
    });
  }

  const btnSpeichern = document.getElementById("kundenSpeichernBtn");
  if (btnSpeichern) {
    btnSpeichern.addEventListener("click", kundenSpeichern);
  }

  const btnLoeschenBestaetigen = document.getElementById("kundenLoeschen2");
  if (btnLoeschenBestaetigen) {
    btnLoeschenBestaetigen.addEventListener("click", kundeLoeschenBestaetigen);
  }

  // ✅ Kunden-Hinzufügen Modal: immer resetten beim Schließen
  const addModalEl = document.getElementById("kundenhinzufuegen");
  if (addModalEl) {
    addModalEl.addEventListener("hidden.bs.modal", () => {
      resetKundenAddModal();
    });
  }

    // ✅ Service-Modal: immer resetten beim Schließen
  if (modalServiceEl) {
    modalServiceEl.addEventListener("hidden.bs.modal", () => {
      resetKundenServiceModal();
    });
  }

  const editLetzte = document.getElementById("edit_letzte_pruefung");
  const editIntervall = document.getElementById("edit_pruefungsintervall");

  if (editLetzte) editLetzte.addEventListener("input", updateNaechstePruefungLive);
  if (editIntervall) editIntervall.addEventListener("input", updateNaechstePruefungLive);


}


function initKundenArtToggle() {
  const optFirma = document.getElementById("option1");   // Unternehmen
  const optPrivat = document.getElementById("option2");  // Privatkunde

  if (!optFirma || !optPrivat) return;

  // Standard: nichts ausgewählt -> beide sichtbar ODER du setzt Standard auf Unternehmen
  // Ich setze Standard auf Unternehmen (optional):
  if (!optFirma.checked && !optPrivat.checked) optFirma.checked = true;

  const apply = () => {
    const isFirma = optFirma.checked;

    const wrapFirma = document.getElementById("wrapFirma");
    const wrapPrivat = document.getElementById("wrapPrivat");

    const wrapKontakt = document.getElementById("wrapKontakt");
    const kontaktEl = document.getElementById("kontakt");

    if (wrapKontakt) wrapKontakt.style.display = isFirma ? "" : "none";
    if (kontaktEl) {
      kontaktEl.disabled = !isFirma;
      if (!isFirma) kontaktEl.value = "";
    }


    const firmaEl = document.getElementById("firma");
    const vornameEl = document.getElementById("vorname");
    const nachnameEl = document.getElementById("nachname");

    if (wrapFirma) wrapFirma.style.display = isFirma ? "" : "none";
    if (wrapPrivat) wrapPrivat.style.display = isFirma ? "none" : "";



    // deaktivieren + leeren, damit nur eine Variante möglich ist
    if (firmaEl) {
      firmaEl.disabled = !isFirma;
      if (!isFirma) firmaEl.value = "";
    }

    if (vornameEl) {
      vornameEl.disabled = isFirma;
      if (isFirma) vornameEl.value = "";
    }

    if (nachnameEl) {
      nachnameEl.disabled = isFirma;
      if (isFirma) nachnameEl.value = "";
    }
  };

  optFirma.addEventListener("change", apply);
  optPrivat.addEventListener("change", apply);

  apply(); // initial anwenden
}


async function kundenSpeichern() {
  try {
    // ✅ hier LET statt CONST, weil wir je nach kundenArt Felder "hart" leeren
    let firma = document.getElementById("firma")?.value.trim() || "";
    let vorname = document.getElementById("vorname")?.value.trim() || "";
    let nachname = document.getElementById("nachname")?.value.trim() || "";

    const kontakt = document.getElementById("kontakt")?.value.trim() || "";
    const adresse = document.getElementById("adresse")?.value.trim() || "";
    const plz = document.getElementById("plz")?.value.trim() || "";
    const ort = document.getElementById("ort")?.value.trim() || "";
    const mail = document.getElementById("mail")?.value.trim() || "";
    const telefon = document.getElementById("telefon")?.value.trim() || "";
    const notizen = document.getElementById("notizen")?.value.trim() || "";
    const heizung = document.getElementById("heizung")?.value.trim() || "";
    const heizung_datum = document.getElementById("heizung_datum")?.value.trim() || "";
    const pruefungsintervall = document.getElementById("pruefungsintervall")?.value.trim() || "";
    const letzte_pruefung = document.getElementById("letzte_pruefung")?.value.trim() || "";



    const kundenArt = document.querySelector('input[name="kundenArt"]:checked')?.value;

    if (!kundenArt) {
      showToast("Bitte wählen: Unternehmen oder Privatkunde.", "error");
      return;
    }

    // ✅ Validierung + "nur eines" erzwingen
    if (kundenArt === "Firma") {
      if (!firma) {
        showToast("Bitte einen Firmennamen angeben.", "error");
        return;
      }
      // nur Firma erlauben
      vorname = "";
      nachname = "";
    } else if (kundenArt === "privat") {
      if (!vorname || !nachname) {
        showToast("Bitte Vorname und Nachname angeben.", "error");
        return;
      }
      // nur Privat erlauben
      firma = "";
    }

    const payload = {
      kundenArt,
      firma,
      vorname,
      nachname,
      kontakt,
      adresse,
      plz,
      ort,
      mail,
      telefon,
      notizen,
      heizung,
      heizung_datum,
      pruefungsintervall,
      letzte_pruefung
    };

    const res = await fetch("/api/kunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast(data?.message || "Fehler beim Speichern des Kunden.", "error");
      return;
    }

    //erfolgsmeldung für anzeige
    const label =
      (firma && firma.trim()) ||
      `${vorname} ${nachname}`.trim() ||
      "Kunde";

    showToast(`Kunde ${label} wurde erfolgreich hinzugefügt.`, "success");


    // ✅ Modal schließen
    const modalEl = document.getElementById("kundenhinzufuegen");
    const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    m.hide();

    // ❌ NICHT mehr hier leeren!
    // => Das macht dein hidden.bs.modal -> resetKundenAddModal()

    // ✅ Tabelle neu laden
    const sucheInput = document.getElementById("kundenSucheInput");
    const suche = sucheInput ? sucheInput.value.trim() : "";
    ladeKunden(suche);

  } catch (err) {
    console.error("❌ kundenSpeichern Fehler:", err);
    showToast("Unerwarteter Fehler beim Speichern.", "error");
  }
}




/* =========================================================
   Laden + Rendern (Logik wie Lager/Rechnungen)
   GET /api/kunden?suche=
   ========================================================= */
async function ladeKunden(suche = "") {
  try {
    const url = suche
      ? `/api/kunden?suche=${encodeURIComponent(suche)}`
      : `/api/kunden`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    kunden = await res.json();
    renderKundenTabelle(kunden);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Kunden:", err);
    renderKundenTabelle([]); // Tabelle leeren bei Fehler
  }
}

function renderKundenTabelle(rows) {
  const tbody = document.querySelector("#kundenTabelle tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" class="text-center text-muted py-4">Keine Kunden gefunden</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const k of rows) {
    const tr = document.createElement("tr");

    // Deine API liefert aktuell: id, firma, vorname, nachname, plz, ort
    // In der Tabelle hast du aber mehr Spalten (Kontakt, Adresse, Email, Telefon).
    // => Wir füllen das, was da ist, und den Rest mit "-".
    tr.innerHTML = `
      <td>${escapeHtml(k.firma ?? "-")}</td>
      <td>${escapeHtml(k.vorname ?? "-")}</td>
      <td>${escapeHtml(k.nachname ?? "-")}</td>
      <td>${escapeHtml(k.kontakt ?? "-")}</td>
      <td>${escapeHtml(k.adresse ?? "-")}</td>
      <td>${escapeHtml(k.plz ?? "-")}</td>
      <td>${escapeHtml(k.ort ?? "-")}</td>
      <td>${escapeHtml(k.mail ?? "-")}</td>
      <td>${escapeHtml(k.telefon ?? "-")}</td>
    `;


    // ✅ Wie bei Lager/Rechnungen: Zeile klickbar machen (für später "Verwalten")
    tr.style.cursor = "pointer";
    tr.addEventListener("dblclick", () => {
     aktuellerKunde = k;      // ✅ aktueller Kunde als Objekt merken
     console.log(aktuellerKunde)
     updateVerwaltenButtons(aktuellerKunde); // ✅ hier
     if (modalVerwalten) modalVerwalten.show();  // ✅ gleiche Instanz verwenden
    });

    /* alt...
    tr.addEventListener("dblclick", () => {
      aktuellerKunde = k;

      // Optional: Direkt das "Verwalten" Modal öffnen (wenn du willst)
      new bootstrap.Modal(document.getElementById("kundenVerwalten")).show();

      // Aktuell machen wir nur visuelles Highlight (optional)
      //markiereAktiveZeile(tr);
    });
    */

    tbody.appendChild(tr);
  }
}

function markiereAktiveZeile(tr) {
  const tbody = tr.closest("tbody");
  if (!tbody) return;

  [...tbody.querySelectorAll("tr")].forEach(r => r.classList.remove("table-primary"));
  tr.classList.add("table-primary");
}

function updateVerwaltenButtons(k) {
  const btnService = document.getElementById("kundenService");
  if (!btnService) return;

  const hasHeizung = String(k?.heizung ?? "").trim() !== "";

  const intervallRaw = k?.pruefungsintervall;
  const intervall = parseInt(String(intervallRaw ?? "").trim(), 10);
  const hasIntervall = Number.isFinite(intervall) && intervall > 0;

  const show = hasHeizung && hasIntervall;

  // ✅ Bootstrap-way: d-none (display:none !important)
  btnService.classList.toggle("d-none", !show);
}




function kundenBearbeitenFill(k) {
  // ✅ 1) Entscheiden: Firma oder Privat?
  const firmaVal = (k.firma ?? "").trim();
  const istFirma = firmaVal !== "";

  const wrapEditKontakt = document.getElementById("wrapEditKontakt");
  const kontaktEl = document.getElementById("edit_kontakt");

  if (wrapEditKontakt) wrapEditKontakt.style.display = istFirma ? "" : "none";
  if (kontaktEl) {
    kontaktEl.disabled = !istFirma;
    if (!istFirma) kontaktEl.value = "";
  }

  if (istFirma && kontaktEl) {
    kontaktEl.value = k.kontakt ?? "";
  }



  // ✅ 2) Wrapper + Inputs holen
  const wrapFirma = document.getElementById("wrapEditFirma");
  const wrapPrivat = document.getElementById("wrapEditPrivat");

  const firmaEl = document.getElementById("edit_Firma");
  const vornameEl = document.getElementById("edit_Vorname");
  const nachnameEl = document.getElementById("edit_Nachname");

  // ✅ 3) Anzeigen/Verstecken
  if (wrapFirma) wrapFirma.style.display = istFirma ? "" : "none";
  if (wrapPrivat) wrapPrivat.style.display = istFirma ? "none" : "";

  // ✅ 4) Deaktivieren + Leeren (damit man nur das vorhandene ändern kann)
  if (firmaEl) {
    firmaEl.disabled = !istFirma;
    if (!istFirma) firmaEl.value = "";
  }
  if (vornameEl) {
    vornameEl.disabled = istFirma;
    if (istFirma) vornameEl.value = "";
  }
  if (nachnameEl) {
    nachnameEl.disabled = istFirma;
    if (istFirma) nachnameEl.value = "";
  }

  // ✅ 5) Jetzt Werte setzen (nur für die passende Variante)
  if (istFirma) {
    if (firmaEl) firmaEl.value = firmaVal;
  } else {
    if (vornameEl) vornameEl.value = k.vorname ?? "";
    if (nachnameEl) nachnameEl.value = k.nachname ?? "";
  }

  // ✅ 6) Rest wie bisher
  //const kontaktEl = document.getElementById("edit_kontakt");
  if (kontaktEl) kontaktEl.value = k.kontakt ?? "";

  const adresseEl = document.getElementById("edit_adresse");
  if (adresseEl) adresseEl.value = k.adresse ?? "";

  const plzEl = document.getElementById("edit_plz");
  if (plzEl) plzEl.value = k.plz ?? "";

  const ortEl = document.getElementById("edit_ort");
  if (ortEl) ortEl.value = k.ort ?? "";

  const mailEl = document.getElementById("edit_mail");
  if (mailEl) mailEl.value = k.mail ?? "";

  const telEl = document.getElementById("edit_telefon");
  if (telEl) telEl.value = k.telefon ?? "";

  const notizEl = document.getElementById("edit_notizen");
  if (notizEl) notizEl.value = k.notizen ?? "";

  const heizungEl = document.getElementById("edit_heizung");
  if (heizungEl) heizungEl.value = k.heizung ?? "";

  const heizung_datumEl = document.getElementById("edit_heizung_datum");
  if (heizung_datumEl) heizung_datumEl.value = toDateInputValue(k.heizung_datum);

  const pruefungsintervallEl = document.getElementById("edit_pruefungsintervall");
  if (pruefungsintervallEl) pruefungsintervallEl.value = k.pruefungsintervall ?? "";

  const vorletzte_pruefung_El = document.getElementById("edit_vorletzte_pruefung");
  if (vorletzte_pruefung_El) vorletzte_pruefung_El.value = toDateInputValue(k.vorletzte_pruefung);

  const letzte_pruefung_El = document.getElementById("edit_letzte_pruefung");
  if (letzte_pruefung_El) letzte_pruefung_El.value = toDateInputValue(k.letzte_pruefung);

  const naechste_pruefung_El = document.getElementById("edit_naechste_pruefung");
  if (naechste_pruefung_El) naechste_pruefung_El.value = toDateInputValue(k.naechste_pruefung);

  updateNaechstePruefungLive();

}



async function kundenBearbeitenSpeichern() {
  try {
    if (!aktuellerKunde?.id) return;

    const payload = {
      firma: document.getElementById("edit_Firma")?.value.trim() || "",
      vorname: document.getElementById("edit_Vorname")?.value.trim() || "",
      nachname: document.getElementById("edit_Nachname")?.value.trim() || "",
      kontakt: document.getElementById("edit_kontakt")?.value.trim() || "",
      adresse: document.getElementById("edit_adresse")?.value.trim() || "",
      plz: document.getElementById("edit_plz")?.value.trim() || "",
      ort: document.getElementById("edit_ort")?.value.trim() || "",
      mail: document.getElementById("edit_mail")?.value.trim() || "",
      telefon: document.getElementById("edit_telefon")?.value.trim() || "",
      notizen: document.getElementById("edit_notizen")?.value.trim() || "",
      heizung: document.getElementById("edit_heizung")?.value.trim() || "",
      heizung_datum: document.getElementById("edit_heizung_datum")?.value.trim() || "",
      pruefungsintervall: document.getElementById("edit_pruefungsintervall")?.value.trim() || "",
      vorletzte_pruefung: document.getElementById("edit_vorletzte_pruefung")?.value.trim() || "",
      letzte_pruefung: document.getElementById("edit_letzte_pruefung")?.value.trim() || "",
      naechste_pruefung: document.getElementById("edit_naechste_pruefung")?.value.trim() || "",
    };

    if (!payload.firma) {
      payload.kontakt = "";
    }


    // ✅ Entscheidung fix an "ursprünglicher Kundentyp" koppeln
    const istFirma = ((aktuellerKunde?.firma ?? "").trim() !== "");

    if (istFirma) {
      payload.vorname = "";
      payload.nachname = "";
    } else {
      payload.firma = "";
    }

    // ✅ Minimalregel
    if (!payload.firma && (!payload.vorname || !payload.nachname)) {
      showToast("Bitte entweder eine Firma oder Vorname + Nachname angeben.", "error");
      return;
    }

    const res = await fetch(`/api/kunden/${aktuellerKunde.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data?.message || "Fehler beim Speichern der Änderungen.", "error");
      return;
    }

    //erfolg beim ändern
    const label =
      (payload.firma && payload.firma.trim()) ||
      `${payload.vorname} ${payload.nachname}`.trim() ||
      "Kunde";

    showToast(`Kunde ${label} wurde erfolgreich bearbeitet.`, "success");


    aktuellerKunde = { ...aktuellerKunde, ...payload };

    const sucheInput = document.getElementById("kundenSucheInput");
    const suche = sucheInput ? sucheInput.value.trim() : "";
    await ladeKunden(suche);

    const modalEl = document.getElementById("kundenBearbeitenModal");
    (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();

  } catch (err) {
    console.error("❌ kundenBearbeitenSpeichern Fehler:", err);
    showToast("Unerwarteter Fehler beim Speichern.", "error");
  }
}


async function kundenServiceSpeichern() {
  try {
    if (!aktuellerKunde?.id) return;

    const label =
      (aktuellerKunde.firma && aktuellerKunde.firma.trim()) ||
      `${aktuellerKunde.vorname ?? ""} ${aktuellerKunde.nachname ?? ""}`.trim() ||
      "Kunde";

    const serviceDatum = document.getElementById("service_datum")?.value.trim() || "";
    if (!serviceDatum) {
      showToast("Bitte ein Servicedatum auswählen.", "error");
      return;
    }

    const res = await fetch(`/api/kunden/${aktuellerKunde.id}/service`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_datum: serviceDatum }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data?.message || "Fehler beim Speichern des Services.", "error");
      return;
    }

    showToast(`Neues Service für ${label} wurde erfolgreich eingetragen.`, "success");

    // ...


    // optional: lokales Objekt updaten
    aktuellerKunde = {
      ...aktuellerKunde,
      letzte_pruefung: data.letzte_pruefung ?? serviceDatum,
      naechste_pruefung: data.naechste_pruefung ?? aktuellerKunde.naechste_pruefung,
      // vorletzte_pruefung bekommst du im Update sowieso durch reload
    };

    // Tabelle neu laden
    const sucheInput = document.getElementById("kundenSucheInput");
    const suche = sucheInput ? sucheInput.value.trim() : "";
    await ladeKunden(suche);

    // Modal schließen
    const modalEl = document.getElementById("kundenServiceModal");
    (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();

  } catch (err) {
    console.error("❌ kundenServiceSpeichern Fehler:", err);
    showToast("Unerwarteter Fehler beim Speichern des Services.", "error");
  }
}





async function kundeLoeschenBestaetigen() {
  try {
    if (!aktuellerKunde?.id) return;

    const res = await fetch(`/api/kunden/${aktuellerKunde.id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    const label =
      (aktuellerKunde.firma && aktuellerKunde.firma.trim()) ||
      `${aktuellerKunde.vorname ?? ""} ${aktuellerKunde.nachname ?? ""}`.trim() ||
      "Kunde";

    if (!res.ok) {
      showToast(data?.message || "Fehler beim Löschen des Kunden.", "error");
      return;
    }

    showToast(`Kunde ${label} wurde erfolgreich gelöscht.`, "success");

// danach erst:
aktuellerKunde = null;


    // ✅ Auswahl zurücksetzen
    aktuellerKunde = null;

    // ✅ Tabelle neu laden (mit aktueller Suche, wie bei den anderen Seiten)
    const sucheInput = document.getElementById("kundenSucheInput");
    const suche = sucheInput ? sucheInput.value.trim() : "";
    ladeKunden(suche);
  } catch (err) {
    console.error("❌ kundeLoeschenBestaetigen Fehler:", err);
    showToast("Unerwarteter Fehler beim Löschen.", "error");
  }
}


function kundenDetailsRender(k) {
  // Titelzeilen
  const firma = (k.firma ?? "").trim();
  const vorname = (k.vorname ?? "").trim();
  const nachname = (k.nachname ?? "").trim();
  const name = `${vorname} ${nachname}`.trim();

  const firmaEl = document.getElementById("detailFirma");
  const nameEl = document.getElementById("detailName");

  // ✅ Nur anzeigen was es gibt (kein "-")
  if (firmaEl) {
    if (firma) {
      firmaEl.textContent = firma;
      firmaEl.style.display = "";
    } else {
      firmaEl.textContent = "";
      firmaEl.style.display = "none";
    }
  }

  if (nameEl) {
    if (name) {
      nameEl.textContent = name;
      nameEl.style.display = "";
    } else {
      nameEl.textContent = "";
      nameEl.style.display = "none";
    }
  }

  setText("detailNotizen", (k.notizen ?? "").trim () || "-")

  // --- Rest bleibt wie bisher ---
  setText("detailAdresse", (k.adresse ?? "").trim() || "-");
  setText("detailPlz", (k.plz ?? "").trim() || "-");
  setText("detailOrt", (k.ort ?? "").trim() || "-");

  //Kontakt nur bei firma
  //setText("detailKontakt", (k.kontakt ?? "").trim() || "-");
  const kontaktBlock = document.getElementById("detailKontakt")?.closest("p");
  if (firma) {
    setText("detailKontakt", (k.kontakt ?? "").trim() || "-");
    if (kontaktBlock) kontaktBlock.style.display = "";
  } else {
    if (kontaktBlock) kontaktBlock.style.display = "none";
  }

  setText("detailEmail", (k.mail ?? "").trim() || "-");
  setText("detailTelefon", (k.telefon ?? "").trim() || "-");

  setText("detailHeizung", (k.heizung ?? "").trim() || "-");
  setText("detailEinbauDatum", formatDateAT(k.heizung_datum));
  setText("detailVorletztePruefung", formatDateAT(k.vorletzte_pruefung));
  setText("detailLetztePruefung", formatDateAT(k.letzte_pruefung));

  const intervall = k.pruefungsintervall ?? null;
  setText("detailIntervall", intervall !== null && intervall !== "" ? `${intervall} Monate` : "-");

  const naechste = k.naechste_pruefung ?? calcNextInspection(k.letzte_pruefung, intervall);
  setText("detailNaechstePruefung", formatDateAT(naechste));
}


// --- kleine Helfer ---

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "-";
}

function formatDateAT(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value); // falls es schon ein String ist
  return d.toLocaleDateString("de-AT");
}





function toDateInputValue(value) {
  if (!value) return "";

  // Wenn es schon ein String ist: immer nur den YYYY-MM-DD Teil nehmen
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }

  // Wenn es ein Date (oder date-like) ist:
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  // WICHTIG: lokale Komponenten verwenden (nicht UTC)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcNextInspection(letzte_pruefung, intervallMonate) {
  if (!letzte_pruefung) return null;

  const m = parseInt(intervallMonate, 10);
  if (!m || m <= 0) return null;

  const d = new Date(letzte_pruefung);
  if (isNaN(d.getTime())) return null;

  // Monat addieren (mit “Tages-Korrektur” für Monate ohne den Tag, z.B. 31.)
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + m);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));

  // ✅ als YYYY-MM-DD lokal zurückgeben (kein toISOString)
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addMonthsLocal(dateStr, months) {
  if (!dateStr) return "";
  const m = parseInt(months, 10);
  if (!m || m <= 0) return "";

  // wichtig: als lokales Datum parsen
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + m);

  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));

  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}


function updateNaechstePruefungLive() {
  const letzte = document.getElementById("edit_letzte_pruefung")?.value.trim() || "";
  const intervall = document.getElementById("edit_pruefungsintervall")?.value.trim() || "";
  const nextEl = document.getElementById("edit_naechste_pruefung");
  if (!nextEl) return;

  const next = addMonthsLocal(letzte, intervall);
  nextEl.value = next; // leer, wenn nicht berechenbar
}




function resetKundenAddModal() {
  // Radios: Standard Unternehmen
  const optFirma = document.getElementById("option1");
  const optPrivat = document.getElementById("option2");
  if (optFirma) optFirma.checked = false;
  if (optPrivat) optPrivat.checked = true;

  // alle Felder leeren
  const ids = [
    "firma", "vorname", "nachname", "kontakt", "adresse", "plz", "ort",
    "mail", "telefon", "notizen", "heizung", "heizung_datum",
    "pruefungsintervall", "letzte_pruefung"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // Sichtbarkeit/disabled korrekt setzen
  initKundenArtToggle();
}


function resetKundenServiceModal() {
  const el = document.getElementById("service_datum");
  if (el) el.value = "";
}






// Basic HTML escaping (wie oft bei Tabellen)
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
