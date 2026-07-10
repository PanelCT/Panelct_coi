document.getElementById("nuovaSessione").onclick = function() {

  let id = "PANEL-" + new Date().toISOString().slice(0,10);

  document.getElementById("sessioneCorrente").innerHTML =
    "Sessione attiva: " + id;

  localStorage.setItem("sessioneCorrente", id);

};
