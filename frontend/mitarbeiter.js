
import { darf } from "./rechteCheck.js";
import { showToast } from "./alert.js";

document.addEventListener("DOMContentLoaded", async () => {
  const rechte = await pruefeRecht();

  if (!rechte.darfAnsehen) {
    alert("Dafür hast du keine Rechte!");
    window.location.href = "/index.html";
    return;
  }

    if(!rechte.darfHinzufuegen){
    const btn = document.getElementById("mitarbeiterHinzufuegenBtn");
    if (btn) btn.style.display = "none";
  }
  
  ladeMitarbeiter();
  const params = new URLSearchParams(window.location.search);

    if (params.get("modal") === "add") {
      const modalEl = document.getElementById("mitarbeiterHinzufuegen");
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  });


let aktuellerMitarbeiter = null;
let alterMitarbeiter = null;

const modalVerwalten = new bootstrap.Modal(document.getElementById("mitarbeiterVerwalten"))
const modalBearbeiten = new bootstrap.Modal(document.getElementById("mitarbeiterBearbeiten"))
const modalDetails = new bootstrap.Modal(document.getElementById("mitarbeiterDetails"))
const modalLoeschen = new bootstrap.Modal(document.getElementById("mitarbeiterLoeschen"))
const modalUrlaub = new bootstrap.Modal(document.getElementById("urlaubHinzufuegenModal"))
const modalKrank = new bootstrap.Modal(document.getElementById("krankenstandHinzufuegenModal"))

/*
document.getElementById("mitarbeiterDetailsBtn").addEventListener("click", async () =>{
  modalDetails.show();
});*/



document.getElementById("logoutBtn").addEventListener("click", async () => {
  const res = await fetch("/logout", {
    method: "POST"
  });
  

  const data = await res.json();


  if (data.success) {
    window.location.href = "/index.html";
  }

});





document.getElementById("mitarbeiterBearbeitenBtn").addEventListener("click", async () => {

  alterMitarbeiter = { ...aktuellerMitarbeiter }; // tiefe Kopie
  const rechte = await pruefeRecht();

  if(!rechte.darfBearbeiten){
    alert("Darfst du nicht!");
    return;
  }

  modalVerwalten.hide();
  console.log("Benutzername:", aktuellerMitarbeiter.benutzer_id);
  console.log("Ganzer Mitarbeiter:", aktuellerMitarbeiter);

  // Felder befüllen
  setTimeout(() => {
    document.getElementById("edit_vorname").value = aktuellerMitarbeiter.vorname;
    document.getElementById("edit_nachname").value = aktuellerMitarbeiter.nachname;
    document.getElementById("edit_stadt").value = aktuellerMitarbeiter.ort;
    document.getElementById("edit_postleitzahl").value = aktuellerMitarbeiter.plz;
    document.getElementById("edit_adresse").value = aktuellerMitarbeiter.adresse;
    document.getElementById("edit_email").value = aktuellerMitarbeiter.email;
    document.getElementById("edit_telefonnummer").value = aktuellerMitarbeiter.telefon;
    document.getElementById("edit_mitarbeiterRolle").value = aktuellerMitarbeiter.rolle_name;
    document.getElementById("edit_benutzername").value = aktuellerMitarbeiter.benutzername;

    modalBearbeiten.show();

  }, 250);

});

document.getElementById("mitarbeiterDetailsBtn").addEventListener("click", async()=>{
  const benutzer_id = aktuellerMitarbeiter.benutzer_id;
  const aktiv_btn = document.getElementById("aktiv");

  const res = await fetch("/mitarbeiter/checkaktiv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benutzer_id })
  });
  const data = await res.json(); 



  setTimeout(()=>{
  modalVerwalten.hide()
    document.getElementById("detailName").textContent = aktuellerMitarbeiter.vorname + " " + aktuellerMitarbeiter.nachname;
    document.getElementById("detailRolle").textContent = aktuellerMitarbeiter.rolle_name;
    document.getElementById("detailVersicherungsnummer").textContent = aktuellerMitarbeiter.vs_nummer;
    document.getElementById("detailIban").textContent = aktuellerMitarbeiter.iban;
    document.getElementById("detailErstellt").textContent = aktuellerMitarbeiter.erstellt_am;

    document.getElementById("detailStrasse").textContent = aktuellerMitarbeiter.adresse;
    document.getElementById("detailPlz").textContent = aktuellerMitarbeiter.plz;
    document.getElementById("detailOrt").textContent = aktuellerMitarbeiter.ort;

    document.getElementById("detailEmail").textContent = aktuellerMitarbeiter.email;
    document.getElementById("detailTelefon").textContent = aktuellerMitarbeiter.telefon;

    ladeUrlaubMitarbeiter();
    ladeKrankenstandMitarbeiter();

    if(data.aktiv == "1"){
      aktiv_btn.textContent = "aktiv";
    } else {
      aktiv_btn.textContent = "gesperrt";
    }

  modalDetails.show()
  },250)



})

document.getElementById("mitarbeiterLoeschenBtn").addEventListener("click", async()=> {
  modalVerwalten.hide()
  setTimeout(()=>{

    document.getElementById("mitarbeiterNameLoeschen").textContent = aktuellerMitarbeiter.vorname + aktuellerMitarbeiter.nachname
    modalLoeschen.show()
  }, 250)
})


document.getElementById("mitarbeiterSpeichernBtn").addEventListener("click", async () => {
    const vorname = document.getElementById("vorname").value;
    const nachname = document.getElementById("nachname").value;
    const stadt = document.getElementById("stadt").value;
    const postleitzahl = document.getElementById("postleitzahl").value;
    const strasse = document.getElementById("adresse").value;
    //const hausnummer = document.getElementById("hausnummer").value;
    const vs_nummer = document.getElementById("versicherungsnummer").value;
    const iban = document.getElementById("iban").value;
    const email = document.getElementById("email").value;
    const telefonnummer = document.getElementById("telefonnummer").value;
    const rolle_id = document.getElementById("mitarbeiterRolle").value;
    const benutzername = document.getElementById("benutzername").value;
    const passwort = document.getElementById("passwort").value;
    const passwortWh = document.getElementById("passwortWh").value

    console.log(vs_nummer)

    if(vorname.trim() === "" || nachname.trim() === "" || rolle_id.trim() === "" || benutzername.trim() === "" || passwort.trim() === "" || passwortWh.trim() === "") {
        showToast("Pflichtfelder beachten!", "warning")
    } else {
      if(passwort == passwortWh){
        const res = await fetch("/mitarbeiter/hinzufuegen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vorname, nachname, stadt, postleitzahl, strasse,  email, telefonnummer, rolle_id, benutzername, passwort, iban, vs_nummer }),
        });

        const data = await res.json();

        if (data.success) {
          ladeMitarbeiter();
          showToast(data.message, "success");
        } else {
          showToast(data.message, "error");
        }
      } else {
        showToast("Passwörter stimmen nicht überein!", "error");
      }
    }
});

document.getElementById("urlaubSpeichernBtn").addEventListener("click", async () => {
  const urlaubStart = document.getElementById("urlaubStart").value;
  const urlaubEnde = document.getElementById("urlaubEnde").value;
  const urlaubBemerkung = document.getElementById("bemerkungUrlaub").value;

  const mitarbeiter_id = aktuellerMitarbeiter.id;

  const res = await fetch("/mitarbeiter/urlaub/hinzufuegen", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urlaubStart, urlaubEnde, urlaubBemerkung, mitarbeiter_id }),
  });

  const data = await res.json();

  if (data.success) {
    showToast(data.message, "success")
  } else {
    showToast(data.message, "error")
  }
});

document.getElementById("krankenstandSpeichernBtn").addEventListener("click", async () => {
  const krankenstandStart = document.getElementById("krankenstandStart").value;
  const krankenstandEnde = document.getElementById("krankenstandEnde").value;
  const krankenstandBemerkung = document.getElementById("krankenstandBemerkung").value;

  const mitarbeiter_id = aktuellerMitarbeiter.id;

  const res = await fetch("/mitarbeiter/krankenstand/hinzufuegen", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ krankenstandStart, krankenstandEnde, krankenstandBemerkung, mitarbeiter_id }),
  });

  const data = await res.json();

  if (data.success) {
    showToast(data.message, "success")
  } else {
    showToast(data.message, "error")
  }
});

document.getElementById("urlaubHinzufuegen").addEventListener("click", ()=>{
  modalVerwalten.hide()
  setTimeout(()=>{

    modalUrlaub.show()

  },250)
})

document.getElementById("krankheitstageHinzufuegen").addEventListener("click", ()=>{
  modalVerwalten.hide()
  setTimeout(()=>{

    modalKrank.show()

  },250)
})






async function ladeMitarbeiter() {
  try {
    const res = await fetch("/mitarbeiter/laden");
    if (!res.ok) throw new Error("Fehler beim Laden der Mitarbeiter");

    const { mitarbeiter, anzahl } = await res.json();

    const tabelle = document.querySelector("#mitarbeitertabelle tbody");
    tabelle.innerHTML = "";

    mitarbeiter.forEach(m => {
      const zeile = document.createElement("tr");

      zeile.innerHTML = `
        <td>${m.vorname}</td>
        <td>${m.nachname}</td>
        <td>${m.adresse}</td>
        <td>${m.plz}</td>
        <td>${m.ort}</td>
        <td>${m.email}</td>
        <td>${m.telefon}</td>
        <td>${m.rolle_name}</td>
        <td>${formatDatum(m.erstellt_am)}</td>
      `;

      zeile.dataset.mitarbeiter = JSON.stringify(m);

      zeile.addEventListener("dblclick", async () => {
        aktuellerMitarbeiter = JSON.parse(zeile.dataset.mitarbeiter);
        const rechte = await pruefeRecht();

        // Darf er überhaupt in das Verwalten-Modal?
      if (!rechte.darfBearbeiten && !rechte.darfLoeschen) {
          showToast("Du hast keine Berechtigung für diesen Bereich!", "error");
          return;
      }


      // Modal öffnen
      modalVerwalten.show();

      });

      tabelle.appendChild(zeile);

      aktiviereSuche();

    });
  } catch (err) {
    console.error("Fehler beim Laden:", err);
  }
}

async function ladeUrlaubMitarbeiter(){
  try {
    const mitarbeiterId = aktuellerMitarbeiter.id;
    const res = await fetch("/mitarbeiter/ladeurlaub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mitarbeiterId })
    });
    if (!res.ok) throw new Error("Fehler beim Laden der Urlaube");
    const urlaubListe = await res.json();

    const tabelle = document.querySelector("#urlaubtabelle tbody");
    tabelle.innerHTML = "";
    
    urlaubListe.forEach(m => console.log(m));

    urlaubListe.forEach(m => {
      const zeile = document.createElement("tr");

      zeile.innerHTML = `
        <td>${formatDatum(m.startdatum)}</td>
        <td>${formatDatum(m.enddatum)}</td>
        <td>${m.bemerkung}</td>
      `;
      zeile.dataset.mitarbeiter = JSON.stringify(m);

      tabelle.appendChild(zeile);
    });
  } catch (err) {
    console.error("Fehler beim Laden:", err);
  }
}

async function ladeKrankenstandMitarbeiter(){
  try {
    const mitarbeiterId = aktuellerMitarbeiter.id;
    const res = await fetch("/mitarbeiter/ladekrankenstand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mitarbeiterId })
    });
    if (!res.ok) throw new Error("Fehler beim Laden der Krankenstände");
    const krankenstandListe = await res.json();

    const tabelle = document.querySelector("#krankenstandtabelle tbody");
    tabelle.innerHTML = "";
    
    krankenstandListe.forEach(m => console.log(m));

    krankenstandListe.forEach(m => {
      const zeile = document.createElement("tr");

      zeile.innerHTML = `
        <td>${formatDatum(m.startdatum)}</td>
        <td>${formatDatum(m.enddatum)}</td>
        <td>${m.bemerkung}</td>
      `;
      zeile.dataset.mitarbeiter = JSON.stringify(m);

      tabelle.appendChild(zeile);
    });
  } catch (err) {
    console.error("Fehler beim Laden:", err);
  }
}

function formatDatum(datumString) {
  if (!datumString) return ""; // Falls leer oder null

  const datum = new Date(datumString);

  // Datum in deutsches Format umwandeln (TT.MM.JJJJ)
  const tag = String(datum.getDate()).padStart(2, "0");
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  const jahr = datum.getFullYear();

  return `${tag}.${monat}.${jahr}`;
}


async function pruefeRecht() {
  return {
    darfHinzufuegen: await darf("mitarbeiter", "hinzufügen"),
    darfBearbeiten: await darf("mitarbeiter", "bearbeiten"),
    darfLoeschen: await darf("mitarbeiter", "löschen"),
    darfAnsehen: await darf("mitarbeiter", "ansehen")
  };
}


function aktiviereSuche() {
  const input = document.getElementById("suche");

  input.addEventListener("input", () => {
    const suchbegriff = input.value.toLowerCase();
    const zeilen = document.querySelectorAll("#mitarbeitertabelle tbody tr");

    zeilen.forEach(zeile => {
      const text = zeile.textContent.toLowerCase();
      zeile.style.display = text.includes(suchbegriff) ? "" : "none";
    });
  });
}

document.getElementById("mitarbeiterLoeschenBtn2").addEventListener("click", async() =>{
  const mitarbeiterId = aktuellerMitarbeiter.id;

  console.log(mitarbeiterId)

  const res = await fetch("/mitarbeiter/loeschen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mitarbeiterId })
  });

  const data = await res.json();

  if (data.success) {
    ladeMitarbeiter();
    showToast(data.message, "success")
  } else {
    showToast(data.message, "error")
  }

})




/*
document.querySelectorAll("#mitarbeitertabelle tbody tr").forEach(row =>{
  row.addEventListener("dbclick", ()=>{
    const modal = new bootstrap.Modal(document.getElementById("mitarbeiterBearbeiten"));
    modal.show();
  });
});*/


document.getElementById("mitarbeiterBearbeitenSpeichernBtn").addEventListener("click", async () => {
  const vorname = document.getElementById("edit_vorname").value;
  const nachname = document.getElementById("edit_nachname").value;
  const adresse = document.getElementById("edit_adresse").value;
  const stadt = document.getElementById("edit_stadt").value;
  const plz = document.getElementById("edit_postleitzahl").value;
  const email = document.getElementById("edit_email").value;
  const tel = document.getElementById("edit_telefonnummer").value;
  //const rolle = document.getElementById("edit_mitarbeiterRolle").value;
  let rolle = document.getElementById("edit_mitarbeiterRolle").value;
  const benutzername = document.getElementById("edit_benutzername").value;
  const passwort = document.getElementById("edit_passwort").value;
  const passwortWh = document.getElementById("edit_passwortWh").value;
  const mitarbeiterId = aktuellerMitarbeiter.id;

  if(rolle == "admin"){
    rolle = 1;
  } else if(rolle == "lager"){
    rolle = 3;
  } else if(rolle == "mitarbeiter"){
    rolle = 4;
  } else {
    rolle = 2;
  }


  

  //console.log(vorname, nachname, adresse, stadt, plz, email, tel, rolle, benutzername, passwort, passwortWh)
  
  if(passwort == passwortWh){
    const res = await fetch("/mitarbeiter/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorname, nachname, adresse, stadt, plz, email, tel, rolle, benutzername, passwort, mitarbeiterId })
    });

    const data = await res.json();

    if (data.success) {
      ladeMitarbeiter();
    } else {
      showToast(data.message, "error")
    }
  } else {
    showToast("Passwörter stimmen nicht überein", "error")
  }

});


document.getElementById("aktiv").addEventListener("click", async () => {
  const benutzer_id = aktuellerMitarbeiter.benutzer_id;
  const aktiv_btn = document.getElementById("aktiv");

  const res = await fetch("/mitarbeiter/updateaktiv", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benutzer_id })
  });

  const data = await res.json(); 

  if(data.success){
    showToast(data.message, "success");
    if(data.aktiv == "1"){
      aktiv_btn.textContent = "aktiv";

    } else {
      aktiv_btn.textContent = "gesperrt";
    }
  }
});

