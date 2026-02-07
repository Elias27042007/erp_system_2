import { showToast } from "./alert.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Index JS geladen");

  const msg = sessionStorage.getItem("toastMsg");
  const type = sessionStorage.getItem("toastType");

  if (msg) {
    showToast(msg, type);
    sessionStorage.removeItem("toastMsg");
    sessionStorage.removeItem("toastType");
  }

  // Mitarbeiter
  const mitarbeiter_lbl = document.getElementById("mitarbeiter");
  const mitRes = await fetch("/mitarbeiter/laden");
  const mitData = await mitRes.json();
  mitarbeiter_lbl.textContent = mitData.anzahl;

  // Abwesende Mitarbeiter (heute)
  const abwesend_lbl = document.getElementById("mitarbeiter_abwesend");
  const abwRes = await fetch("/mitarbeiter/abwesend");
  const abwData = await abwRes.json();

  abwesend_lbl.textContent = abwData.anzahl_abwesend ?? 0;


  // Kunden
  const kunden_lbl_privat = document.getElementById("kunden_privat");
  const kunden_lbl_firma = document.getElementById("kunden_firma");
  const kunden_lbl_gesamt = document.getElementById("kunden_gesamt");
  const kundenRes = await fetch("/api/kunden/laden");
  const kundenData = await kundenRes.json();
  kunden_lbl_privat.textContent = kundenData.privat;
  kunden_lbl_firma.textContent = kundenData.firma;
  //kunden_lbl_gesamt.textContent = kundenData.gesamt;

  //Rechnungen
  const rechnungen_lbl = document.getElementById("rechnungen");
  const angebote_lbl = document.getElementById("angebote");
  const rechnung_angobote_ges_lbl = document.getElementById("rechnung_angebot_ges");
  const rechnungenRes = await fetch("api/rechnungen/laden");
  const rechnungenData = await rechnungenRes.json();
  rechnungen_lbl.textContent = rechnungenData.rechnungen;
  angebote_lbl.textContent = rechnungenData.angebote;
  //rechnung_angobote_ges_lbl.textContent = rechnungenData.gesamt;

  //Service
  const faellig_lbl = document.getElementById("faellig");
  const bald_faellig_lbl = document.getElementById("bald_faellig");
  const service_ges_lbl = document.getElementById("service_gesamt");
  const serviceRes = await fetch("api/service/laden");
  const serviceData = await serviceRes.json();
  faellig_lbl.textContent = serviceData.faellig;
  bald_faellig_lbl.textContent = serviceData.bald_faellig;
  //service_ges_lbl.textContent = serviceData.gesamt;




  // Umsatz
  try {
    const umsatzRes = await fetch("/stats/umsatz-monate?months=6");
    if (!umsatzRes.ok) {
      const text = await umsatzRes.text();
      throw new Error(`HTTP ${umsatzRes.status}: ${text}`);
    }

    const umsatzDaten = await umsatzRes.json();
    if (!Array.isArray(umsatzDaten)) {
      throw new Error("Backend hat kein Array geliefert: " + JSON.stringify(umsatzDaten));
    }

    fuelleUmsatzListe(umsatzDaten);
    erstelleUmsatzChart(umsatzDaten);
  } catch (err) {
    console.error("Umsatzdaten konnten nicht geladen werden", err);
  }
});

async function ladeUmsatzMonate(monate = 6) {
  const res = await fetch(`/stats/umsatz-monate?months=${monate}`);
  if (!res.ok) throw new Error("Umsatzdaten konnten nicht geladen werden");
  return await res.json();
}

function fuelleUmsatzListe(daten) {
  const liste = document.getElementById("umsatzListe");
  liste.innerHTML = "";

  daten.forEach(e => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between";

    li.innerHTML = `
      <span>${formatMonat(e.monat)}</span>
      <strong>${Number(e.umsatz).toLocaleString("de-DE")} €</strong>
    `;

    liste.appendChild(li);
  });
}

function erstelleUmsatzChart(daten) {
  const ctx = document.getElementById("umsatzChart");

  const labels = daten.map(d => formatMonat(d.monat));
  const values = daten.map(d => d.umsatz);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Netto-Umsatz (€)",
        data: values
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => v.toLocaleString("de-DE") + " €"
          }
        }
      }
    }
  });
}
function formatMonat(monatString) {
  const [jahr, monat] = monatString.split("-");
  const d = new Date(jahr, monat - 1);

  return d.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric"
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



