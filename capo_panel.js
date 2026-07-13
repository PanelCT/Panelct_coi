alert("Capo Panel JS caricato");

const SUPABASE_URL =
  "https://wxgkjaobfvwwcgywtwfe.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";

const client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const testoSessione =
  document.getElementById("sessioneCorrente");

const messaggio =
  document.getElementById("messaggioCapoPanel");

const pulsanteNuovaSessione =
  document.getElementById("nuovaSessione");

const pulsanteNuovaValutazione =
  document.getElementById("nuovaValutazione");

const pulsanteEsporta =
  document.getElementById("esportaExcel");


function mostraMessaggio(testo, errore = false) {
  messaggio.textContent = testo;
  messaggio.style.color = errore
    ? "#a32626"
    : "#315b35";
}


function generaCodiceSessione() {
  const adesso = new Date();

  const anno = adesso.getFullYear();

  const mese = String(
    adesso.getMonth() + 1
  ).padStart(2, "0");

  const giorno = String(
    adesso.getDate()
  ).padStart(2, "0");

  const ore = String(
    adesso.getHours()
  ).padStart(2, "0");

  const minuti = String(
    adesso.getMinutes()
  ).padStart(2, "0");

  const secondi = String(
    adesso.getSeconds()
  ).padStart(2, "0");

  return (
    `PANEL-${anno}${mese}${giorno}-` +
    `${ore}${minuti}${secondi}`
  );
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


async function aggiornaConteggioSchede(
  sessioneId
) {
  const { count, error } = await client
    .from("valutazione")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("sessione_id", sessioneId);

  if (error) {
    mostraMessaggio(
      "Sessione attiva, ma non riesco " +
      "a contare le schede: " +
      error.message,
      true
    );

    return;
  }

  mostraMessaggio(
    "Schede ricevute nella sessione corrente: " +
    (count ?? 0)
  );
}


async function mostraSessioneAttiva() {
  try {
    const sessione =
      await recuperaSessioneAttiva();

    if (!sessione) {
      testoSessione.textContent =
        "Nessuna sessione attiva";

      mostraMessaggio("");

      return;
    }

    testoSessione.textContent =
      sessione.codice_sessione;

    await aggiornaConteggioSchede(
      sessione.id
    );

  } catch (errore) {
    testoSessione.textContent =
      "Errore nel caricamento";

    mostraMessaggio(
      "Errore lettura sessione: " +
      errore.message,
      true
    );
  }
}


async function creaNuovaSessione(
  tipoOperazione
) {
  const testoConferma =
    tipoOperazione === "valutazione"
      ? (
        "Vuoi chiudere la valutazione " +
        "attuale e iniziarne una nuova?"
      )
      : (
        "Vuoi creare una nuova sessione? " +
        "Le precedenti verranno disattivate."
      );

  const conferma = confirm(testoConferma);

  if (!conferma) {
    return;
  }

  pulsanteNuovaSessione.disabled = true;
  pulsanteNuovaValutazione.disabled = true;

  mostraMessaggio(
    "Creazione della nuova sessione..."
  );

  try {
    const { error: erroreChiusura } =
      await client
        .from("sessioni")
        .update({
          attiva: false
        })
        .eq("attiva", true);

    if (erroreChiusura) {
      throw new Error(
        "Impossibile disattivare le " +
        "sessioni precedenti: " +
        erroreChiusura.message
      );
    }

    const codice = generaCodiceSessione();

    const {
      data: nuovaSessione,
      error: erroreCreazione
    } = await client
      .from("sessioni")
      .insert([
        {
          codice_sessione: codice,
          attiva: true
        }
      ])
      .select(
        "id, codice_sessione, attiva"
      )
      .single();

    if (erroreCreazione) {
      throw new Error(
        erroreCreazione.message
      );
    }

    testoSessione.textContent =
      nuovaSessione.codice_sessione;

    mostraMessaggio(
      tipoOperazione === "valutazione"
        ? (
          "Nuova valutazione pronta. " +
          "Schede ricevute: 0"
        )
        : (
          "Nuova sessione creata. " +
          "Schede ricevute: 0"
        )
    );

  } catch (errore) {
    mostraMessaggio(
      "Errore: " + errore.message,
      true
    );

  } finally {
    pulsanteNuovaSessione.disabled =
      false;

    pulsanteNuovaValutazione.disabled =
      false;
  }
}


function valoreCsv(valore) {
  if (
    valore === null ||
    valore === undefined
  ) {
    return "";
  }

  const testo = String(valore)
    .replaceAll('"', '""');

  return `"${testo}"`;
}


async function esportaSessioneCorrente() {
  pulsanteEsporta.disabled = true;

  pulsanteEsporta.textContent =
    "ESPORTAZIONE IN CORSO...";

  try {
    const sessione =
      await recuperaSessioneAttiva();

    if (!sessione) {
      alert(
        "Non risulta alcuna sessione attiva."
      );

      return;
    }

    const { data, error } = await client
      .from("valutazione")
      .select("*")
      .eq(
        "sessione_id",
        sessione.id
      )
      .order(
        "id",
        { ascending: true }
      );

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      alert(
        "Non sono ancora presenti schede " +
        "nella sessione attiva."
      );

      return;
    }

    const colonne = [
      "codice_campione",
      "nome",
      "cognome",
      "riscaldo",
      "muffa_umidita",
      "avvinato_inacetito",
      "rancido",
      "altro_difetto_nome",
      "altro_difetto_intensita",
      "fruttato",
      "tipo_fruttato",
      "amaro",
      "piccante",
      "note",
      "sessione_id"
    ];

    const intestazioniItaliane = [
      "Codice campione",
      "Nome",
      "Cognome",
      "Riscaldo / Morchia",
      "Muffa - Umidità - Terra",
      "Avvinato - Inacetito / Acido - Agro",
      "Rancido",
      "Altro difetto",
      "Intensità altro difetto",
      "Fruttato",
      "Tipo di fruttato",
      "Amaro",
      "Piccante",
      "Note",
      "ID sessione"
    ];

    const righe = [];

    righe.push(
      intestazioniItaliane
        .map(valoreCsv)
        .join(";")
    );

    data.forEach(scheda => {
      const riga = colonne.map(
        colonna =>
          valoreCsv(scheda[colonna])
      );

      righe.push(
        riga.join(";")
      );
    });

    const contenutoCsv =
      "\uFEFF" + righe.join("\n");

    const blob = new Blob(
      [contenutoCsv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

    const link =
      document.createElement("a");

    const url =
      URL.createObjectURL(blob);

    link.href = url;

    link.download =
      sessione.codice_sessione +
      "-schede.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    mostraMessaggio(
      "Esportate " +
      data.length +
      " schede della sessione corrente."
    );

  } catch (errore) {
    mostraMessaggio(
      "Errore esportazione: " +
      errore.message,
      true
    );

  } finally {
    pulsanteEsporta.disabled = false;

    pulsanteEsporta.textContent =
      "📥 Esporta Excel COI";
  }
}


pulsanteNuovaSessione.addEventListener(
  "click",
  () => creaNuovaSessione(
    "sessione"
  )
);

pulsanteNuovaValutazione.addEventListener(
  "click",
  () => creaNuovaSessione(
    "valutazione"
  )
);

pulsanteEsporta.addEventListener(
  "click",
  esportaSessioneCorrente
);


// Carica subito la sessione attiva
mostraSessioneAttiva();


// Aggiorna il conteggio ogni 15 secondi
setInterval(
  mostraSessioneAttiva,
  15000
);
