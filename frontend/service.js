const modalService = new bootstrap.Modal(document.getElementById("serviceEintragen")) 
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
    })

    document.getElementById("logout").addEventListener("click", async () => {
  const res = await fetch("/logout", {
    method: "POST"
  });
  

  const data = await res.json();


  if (data.success) {
    window.location.href = "/index.html";
  }

});

