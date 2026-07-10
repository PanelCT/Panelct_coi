const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";
const SUPABASE_KEY = "INSERISCI_LA_TUA_CHIAVE";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

document.getElementById("nuovaSessione").onclick = async function() {

  let codice = "PANEL-" + new Date().toISOString().slice(0,10);

  const { error } = await client
    .from("sessioni")
    .insert([
      {
        codice_sessione: codice,
        attiva: true
      }
    ]);

  if (error) {
    alert("Errore: " + error.message);
    return;
  }

  document.getElementById("sessioneCorrente").innerHTML =
    "Sessione attiva: " + codice;
};
