const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";
const SUPABASE_KEY = "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

document.querySelector("button").addEventListener("click", async () => {

const dati = {
  codice_campione: document.getElementById("campione").value,
  nome: document.getElementById("nome").value,
  cognome: document.getElementById("cognome").value,

  fruttato: document.getElementById("fruttato").value,
  amaro: document.getElementById("amaro").value,
  piccante: document.getElementById("piccante").value,

  riscaldo: document.getElementById("riscaldo").value,
  muffa_umidita: document.getElementById("muffa").value,
  morchia: document.getElementById("morchia").value,
  avvinato_inacetito: document.getElementById("avvinato").value,
  metallico: document.getElementById("metallico").value,
  rancido: document.getElementById("rancido").value,

  note: document.getElementById("note").value
};

const { error } = await client
.from("Valutazione_olio")
.insert([dati]);

if(error){
 alert("Errore: " + error.message);
}else{
 alert("Scheda inviata correttamente!");
}

});
