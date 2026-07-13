alert("Capo Panel JS caricato");

const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";
const SUPABASE_KEY = "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const testoSessione = document.getElementById("sessioneCorrente");
const messaggio = document.getElementById("messaggioCapoPanel");

const pulsanteNuovaSessione =
  document.getElementById("nuovaSessione");

const pulsanteNuovaValutazione =
  document.getElementById("nuovaValutazione");

const pulsanteEsporta =
  document.getElementById("esportaExcel");


function mostraMessaggio(testo, errore = false) {
  messaggio.textContent = testo;
  messaggio.style.color = errore ? "#a32626" : "#315b35";
}


function generaCodiceSessione() {
  const adesso = new Date();

  const anno = adesso.getFullYear();
  const mese = String(adesso.getMonth() + 1).padStart(2, "0");
  const giorno = String(adesso.getDate()).padStart(2, "0");
  const ore = String(adesso.getHours()).padStart(2, "0");
  const minuti = String(adesso.getMinutes()).padStart(2, "0");
  const secondi = String(adesso.getSeconds()).padStart(2, "0");

  return `PANEL-${anno}${mese}${giorno}-${ore}${minuti}${secondi}`;
}


async function recuperaSessioneAttiva() {
  const { data, error } = await client
    .from("sessioni")
    .select("id, codice_sessione, attiva")
    .eq("attiva", true)
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}


async function aggiornaConteggioSchede(sessioneId) {
  const { count, error } = await client
    .from("valutazione")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("sessione_id", sessioneId);

  if (error) {
    mostraMessaggio(
      "Sessione attiva, ma non riesco a contare le schede: " +
      error.message,
      true
    );
    return;
  }

  mostraMessaggio(
    `Schede ricevute nella sessione corrente: ${count ?? 0}`
  );
}


async function mostraSessioneAttiva() {
  try {
    const sessione = await recuperaSessioneAttiva();

    if (!sessione) {
      testoSessione.textContent = "Nessuna sessione attiva";
      mostraMessaggio("");
      return
