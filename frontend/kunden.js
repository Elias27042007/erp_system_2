document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("modal") === "add") {
    const modalEl = document.getElementById("kundenhinzufuegen");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }
});







const modalVerwalten = new bootstrap.Modal(document.getElementById("kundenVerwalten"))
const modalBearbeiten = new bootstrap.Modal(document.getElementById("kundenBearbeitenModal"))
const modalDetail = new bootstrap.Modal(document.getElementById("kundenDetailsModal"))
const modalLoeschen = new bootstrap.Modal(document.getElementById("kundenLoeschenModal"))

document.getElementById("test").addEventListener("click", async()=>{
    modalVerwalten.show()

})

document.getElementById("kundenBearbeiten").addEventListener("click", async()=>{
    modalVerwalten.hide()
    modalBearbeiten.show()
})

document.getElementById("kundenDetails").addEventListener("click", async()=>{
    modalVerwalten.hide()
    modalDetail.show()
})

document.getElementById("kundenLoeschen1").addEventListener("click", async()=>{
    modalVerwalten.hide()
    modalLoeschen.show()
})
