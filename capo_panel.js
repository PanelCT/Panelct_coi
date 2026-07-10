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




document.getElementById("esportaExcel").onclick = async function () {


  const { data, error } = await client
    .from("valutazione")
    .select("*");


  if (error) {
    alert("Errore esportazione: " + error.message);
    return;
  }


  if (!data || data.length === 0) {
    alert("Nessuna scheda da esportare");
    return;
  }



  let csv = "";


  const intestazioni = Object.keys(data[0]);


  csv += intestazioni.join(";") + "\n";



  data.forEach(riga => {

    csv += intestazioni.map(colonna =>
      riga[colonna] ?? ""
    ).join(";") + "\n";

  });



  const blob = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8;" }
  );


  const link = document.createElement("a");


  link.href = URL.createObjectURL(blob);


  link.download = "schede_panelct.csv";


  link.click();

};
