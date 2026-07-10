const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";
const SUPABASE_KEY = "LA_TUA_PUBLISHABLE_KEY";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


document.getElementById("nuovaSessione").onclick = async function() {

  let codice = "PANEL-" + new Date().toISOString().slice(0,10);

  const { data, error } = await client
    .from("sessioni")
    .insert([
      {
        codice_sessione: codice,
        attiva: true
      }
    ])
    .select();

  if (error) {
    alert("Errore Supabase: " + error.message);
    return;
  }

  document.getElementById("sessioneCorrente").innerHTML =
    "Sessione attiva: " + codice;

};


document.getElementById("esportaExcel").onclick = function() {

  alert("Esportazione Excel: funzione in preparazione");

};
