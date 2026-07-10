const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";

const SUPABASE_KEY = "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";


const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


document.getElementById("nuovaSessione").onclick = async function () {

  let codice = "PANEL-" + new Date().toISOString().slice(0,10);


  const { error } = await client
    .from("sessioni")
    .insert([
      {
        codice_sessione: codice,
        attiva: true
      }
    ])
    .select();


  if (error) {
    alert("Errore API: " + error.message);
    return;
  }


  document.getElementById("sessioneCorrente").innerHTML =
    "Sessione attiva: " + codice;

};



document.getElementById("esportaExcel").onclick = function () {

  alert("Esportazione Excel in preparazione");

};



document.getElementById("visualizzaSchede").onclick = async function () {


  const { data: sessione, error: erroreSessione } = await client
    .from("sessioni")
    .select("id")
    .eq("attiva", true)
    .order("id", { ascending: false })
    .limit(1)
    .single();


  if (erroreSessione) {
    alert("Errore sessione: " + erroreSessione.message);
    return;
  }


  const { data, error } = await client
    .from("valutazione")
    .select("*")
    .eq("sessione_id", sessione.id);


  if (error) {
    alert("Errore: " + error.message);
    return;
  }


  alert("Schede ricevute: " + data.length);

}; 
