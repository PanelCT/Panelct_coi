const SUPABASE_URL = "https://wxgkjaobfvwwcgywtwfe.supabase.co";
const SUPABASE_KEY = "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const pulsanteInvio = document.getElementById("inviaScheda");

pulsanteInvio.addEventListener("click", async () => {
  const nome = document.getElementById("nome").value.trim();
  const cognome = document.getElementById("cognome").value.trim();
  const codiceCampione = document.getElementById("campione").value.trim();

  const tipoFruttatoSelezionato = document.querySelector(
    'input[name="tipo_fruttato"]:checked'
  );

  const altroDifettoNome =
    document.getElementById("altro_difetto_nome").value;

  const altroDifettoIntensita = Number(
    document.getElementById("altro_difetto_intensita").value
  );

  if (!nome || !cognome || !codiceCampione) {
    alert("Inserisci nome, cognome e codice del campione.");
    return;
  }

  if (
    Number(document.getElementById("fruttato").value) > 0 &&
    !tipoFruttatoSelezionato
  ) {
    alert("Indica se il fruttato è verde oppure maturo.");
    return;
  }

  if (altroDifettoNome && altroDifettoIntensita === 0) {
    alert("Indica l’intensità dell’altro difetto selezionato.");
    return;
  }

  pulsanteInvio.disabled = true;
  pulsanteInvio.textContent = "INVIO IN CORSO...";

  try {
    const {
      data: sessione,
      error: erroreSessione
    } = await client
      .from("sessioni")
      .select("id")
      .eq("attiva", true)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (erroreSessione || !sessione) {
      alert("Non risulta alcuna sessione attiva.");
      return;
    }

    const metallico =
      altroDifettoNome === "Metallico"
        ? altroDifettoIntensita
        : 0;

    const dati = {
      sessione_id: sessione.id,

      codice_campione: codiceCampione,
      nome: nome,
      cognome: cognome,
      assaggiatore: `${nome} ${cognome}`,

      // Difetti principali, nello stesso ordine della scheda COI
      riscaldo: Number(
        document.getElementById("riscaldo").value
      ),

      muffa_umidita: Number(
        document.getElementById("muffa").value
      ),

      avvinato_inacetito: Number(
        document.getElementById("avvinato").value
      ),

      rancido: Number(
        document.getElementById("rancido").value
      ),

      // Morchia è ora compresa nella voce Riscaldo/Morchia
      morchia: 0,

      // Metallico è gestito nel menu Altri difetti
      metallico: metallico,

      altro_difetto_nome: altroDifettoNome || null,
      altro_difetto_intensita:
        altroDifettoNome ? altroDifettoIntensita : 0,

      // Attributi positivi
      fruttato: Number(
        document.getElementById("fruttato").value
      ),

      tipo_fruttato: tipoFruttatoSelezionato
        ? tipoFruttatoSelezionato.value
        : null,

      amaro: Number(
        document.getElementById("amaro").value
      ),

      piccante: Number(
        document.getElementById("piccante").value
      ),

      note: document.getElementById("note").value.trim()
    };

    const { error } = await client
      .from("valutazione")
      .insert([dati]);

    if (error) {
      alert("Errore durante l’invio: " + error.message);
      return;
    }

    alert("Scheda inviata correttamente!");

    // Azzera i valori per una nuova compilazione
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.value = 0;
      slider.dispatchEvent(new Event("input"));
    });

    document
      .querySelectorAll('input[name="tipo_fruttato"]')
      .forEach(radio => {
        radio.checked = false;
      });

    document.getElementById("altro_difetto_nome").value = "";
    document.getElementById("note").value = "";

  } catch (errore) {
    alert("Errore imprevisto: " + errore.message);
  } finally {
    pulsanteInvio.disabled = false;
    pulsanteInvio.textContent = "INVIA SCHEDA";
  }
});
