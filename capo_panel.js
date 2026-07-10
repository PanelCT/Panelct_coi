document.getElementById("nuovaSessione").addEventListener("click", () => {
  const id = "PANEL-" + new Date().toISOString().slice(0, 10);
  localStorage.setItem("sessioneCorrente", id);
  document.getElementById("sessioneCorrente").textContent =
    "Sessione attiva: " + id;
});

const s = localStorage.getItem("sessioneCorrente");
if (s) {
  document.getElementById("sessioneCorrente").textContent =
    "Sessione attiva: " + s;
}
