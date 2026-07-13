const SUPABASE_URL =
  "https://wxgkjaobfvwwcgywtwfe.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_y7VLZqRuOhdFATOyxGf5lw_hZiTmOh7";

const NOME_MODELLO_EXCEL =
  "COI_CALC_IT_PanelCT.xlsx";

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
      "Sessione attiva, ma non riesco a contare le schede: " +
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
        "Vuoi chiudere la valutazione attuale " +
        "e iniziarne una nuova?"
      )
      : (
        "Vuoi creare una nuova sessione? " +
        "Le precedenti verranno disattivate."
      );

  if (!confirm(testoConferma)) {
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
        "Impossibile chiudere la sessione precedente: " +
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
        ? "Nuova valutazione pronta. Schede ricevute: 0"
        : "Nuova sessione creata. Schede ricevute: 0"
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


/*
 * Cerca nel file Excel il percorso XML
 * corrispondente al foglio "INPUT Data".
 */
async function trovaPercorsoFoglioInput(zip) {
  const workbookXmlText =
    await zip.file("xl/workbook.xml").async("text");

  const relsXmlText =
    await zip
      .file("xl/_rels/workbook.xml.rels")
      .async("text");

  const parser = new DOMParser();

  const workbookXml = parser.parseFromString(
    workbookXmlText,
    "application/xml"
  );

  const relsXml = parser.parseFromString(
    relsXmlText,
    "application/xml"
  );

  const fogli =
    workbookXml.getElementsByTagName("sheet");

  let relazioneId = null;

  for (const foglio of fogli) {
    if (
      foglio.getAttribute("name") ===
      "INPUT Data"
    ) {
      relazioneId =
        foglio.getAttribute(
          "r:id"
        ) ||
        foglio.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "id"
        );

      break;
    }
  }

  if (!relazioneId) {
    throw new Error(
      'Nel modello non trovo il foglio "INPUT Data".'
    );
  }

  const relazioni =
    relsXml.getElementsByTagName(
      "Relationship"
    );

  for (const relazione of relazioni) {
    if (
      relazione.getAttribute("Id") ===
      relazioneId
    ) {
      let percorso =
        relazione.getAttribute("Target");

      percorso = percorso.replace(
        /^\//,
        ""
      );

      if (!percorso.startsWith("xl/")) {
        percorso = "xl/" + percorso;
      }

      return percorso;
    }
  }

  throw new Error(
    "Non riesco a individuare il file interno del foglio INPUT Data."
  );
}


function trovaONuovaRiga(
  xml,
  sheetData,
  numeroRiga
) {
  const righe =
    sheetData.getElementsByTagName("row");

  for (const riga of righe) {
    if (
      Number(riga.getAttribute("r")) ===
      numeroRiga
    ) {
      return riga;
    }
  }

  const nuovaRiga =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "row"
    );

  nuovaRiga.setAttribute(
    "r",
    String(numeroRiga)
  );

  sheetData.appendChild(nuovaRiga);

  return nuovaRiga;
}


function trovaONuovaCella(
  xml,
  riga,
  riferimento
) {
  const celle =
    riga.getElementsByTagName("c");

  for (const cella of celle) {
    if (
      cella.getAttribute("r") ===
      riferimento
    ) {
      return cella;
    }
  }

  const nuovaCella =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "c"
    );

  nuovaCella.setAttribute(
    "r",
    riferimento
  );

  riga.appendChild(nuovaCella);

  return nuovaCella;
}


function eliminaContenutoCella(cella) {
  const nodiDaEliminare = [];

  for (const nodo of cella.childNodes) {
    if (
      nodo.nodeName === "v" ||
      nodo.nodeName === "is" ||
      nodo.nodeName === "f"
    ) {
      nodiDaEliminare.push(nodo);
    }
  }

  nodiDaEliminare.forEach(
    nodo => nodo.remove()
  );

  cella.removeAttribute("t");
}


function impostaNumero(
  xml,
  sheetData,
  riferimento,
  valore
) {
  const numeroRiga =
    Number(
      riferimento.match(/\d+/)[0]
    );

  const riga = trovaONuovaRiga(
    xml,
    sheetData,
    numeroRiga
  );

  const cella = trovaONuovaCella(
    xml,
    riga,
    riferimento
  );

  eliminaContenutoCella(cella);

  const nodoValore =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "v"
    );

  nodoValore.textContent =
    String(
      Number.isFinite(Number(valore))
        ? Number(valore)
        : 0
    );

  cella.appendChild(nodoValore);
}


function impostaTesto(
  xml,
  sheetData,
  riferimento,
  valore
) {
  const numeroRiga =
    Number(
      riferimento.match(/\d+/)[0]
    );

  const riga = trovaONuovaRiga(
    xml,
    sheetData,
    numeroRiga
  );

  const cella = trovaONuovaCella(
    xml,
    riga,
    riferimento
  );

  eliminaContenutoCella(cella);

  if (
    valore === null ||
    valore === undefined ||
    String(valore).trim() === ""
  ) {
    return;
  }

  cella.setAttribute(
    "t",
    "inlineStr"
  );

  const nodoIs =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "is"
    );

  const nodoTesto =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "t"
    );

  nodoTesto.textContent =
    String(valore);

  nodoIs.appendChild(nodoTesto);
  cella.appendChild(nodoIs);
}


function pulisciAreaAssaggiatori(
  xml,
  sheetData
) {
  /*
   * Il primo campione del modello utilizza
   * le righe da 7 a 26.
   */
  for (
    let riga = 7;
    riga <= 26;
    riga++
  ) {
    impostaTesto(
      xml,
      sheetData,
      `D${riga}`,
      ""
    );

    const colonneNumeriche = [
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M"
    ];

    colonneNumeriche.forEach(
      colonna => {
        const riferimento =
          `${colonna}${riga}`;

        const rigaXml =
          trovaONuovaRiga(
            xml,
            sheetData,
            riga
          );

        const cella =
          trovaONuovaCella(
            xml,
            rigaXml,
            riferimento
          );

        eliminaContenutoCella(
          cella
        );
      }
    );
  }
}


function preparaDatiExcel(
  scheda
) {
  const nomeAltroDifetto =
    (
      scheda.altro_difetto_nome ||
      ""
    ).toLowerCase();

  const intensitaAltro =
    Number(
      scheda.altro_difetto_intensita
    ) || 0;

  const oliveGelate =
    nomeAltroDifetto.includes(
      "olive gelate"
    ) ||
    nomeAltroDifetto.includes(
      "legno umido"
    )
      ? intensitaAltro
      : 0;

  const altroAttributoNegativo =
    oliveGelate > 0
      ? 0
      : intensitaAltro;

  return {
    assaggiatore:
      (
        `${scheda.nome || ""} ` +
        `${scheda.cognome || ""}`
      ).trim(),

    riscaldo:
      Number(scheda.riscaldo) || 0,

    muffa:
      Number(
        scheda.muffa_umidita
      ) || 0,

    avvinato:
      Number(
        scheda.avvinato_inacetito
      ) || 0,

    oliveGelate:
      oliveGelate,

    rancido:
      Number(scheda.rancido) || 0,

    altro:
      altroAttributoNegativo,

    fruttato:
      Number(scheda.fruttato) || 0,

    amaro:
      Number(scheda.amaro) || 0,

    piccante:
      Number(scheda.piccante) || 0,

    tipoFruttato:
      scheda.tipo_fruttato || ""
  };
}


async function esportaExcelCoi() {
  pulsanteEsporta.disabled = true;

  pulsanteEsporta.textContent =
    "PREPARAZIONE EXCEL...";

  mostraMessaggio(
    "Recupero delle schede della sessione..."
  );

  try {
    if (typeof JSZip === "undefined") {
      throw new Error(
        "La libreria Excel non è stata caricata."
      );
    }

    const sessione =
      await recuperaSessioneAttiva();

    if (!sessione) {
      throw new Error(
        "Non risulta alcuna sessione attiva."
      );
    }

    const { data: schede, error } =
      await client
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
      throw new Error(
        "Errore lettura valutazioni: " +
        error.message
      );
    }

    if (
      !schede ||
      schede.length === 0
    ) {
      throw new Error(
        "Non sono presenti schede nella sessione attiva."
      );
    }

    if (schede.length > 20) {
      throw new Error(
        "Il primo blocco del modello Excel può contenere massimo 20 assaggiatori."
      );
    }

    mostraMessaggio(
      "Caricamento del modello Excel..."
    );

    const rispostaModello =
      await fetch(
        `${NOME_MODELLO_EXCEL}?v=1`,
        {
          cache: "no-store"
        }
      );

    if (!rispostaModello.ok) {
      throw new Error(
        "Non riesco a scaricare il modello " +
        NOME_MODELLO_EXCEL +
        ". Controlla che il nome del file su GitHub sia esatto."
      );
    }

    const modelloArrayBuffer =
      await rispostaModello.arrayBuffer();

    const zip =
      await JSZip.loadAsync(
        modelloArrayBuffer
      );

    const percorsoFoglio =
      await trovaPercorsoFoglioInput(
        zip
      );

    const fileFoglio =
      zip.file(percorsoFoglio);

    if (!fileFoglio) {
      throw new Error(
        "Il foglio INPUT Data non è presente nel file Excel."
      );
    }

    const xmlFoglioTesto =
      await fileFoglio.async("text");

    const parser =
      new DOMParser();

    const xmlFoglio =
      parser.parseFromString(
        xmlFoglioTesto,
        "application/xml"
      );

    const erroreXml =
      xmlFoglio.getElementsByTagName(
        "parsererror"
      );

    if (erroreXml.length > 0) {
      throw new Error(
        "Errore nella lettura interna del modello Excel."
      );
    }

    const sheetData =
      xmlFoglio.getElementsByTagName(
        "sheetData"
      )[0];

    if (!sheetData) {
      throw new Error(
        "Il foglio INPUT Data non contiene l'area dati prevista."
      );
    }

    pulisciAreaAssaggiatori(
      xmlFoglio,
      sheetData
    );

    let verdi = 0;
    let maturi = 0;

    schede.forEach(
      (scheda, indice) => {
        const riga = 7 + indice;

        const dati =
          preparaDatiExcel(
            scheda
          );

        impostaTesto(
          xmlFoglio,
          sheetData,
          `D${riga}`,
          dati.assaggiatore
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `E${riga}`,
          dati.riscaldo
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `F${riga}`,
          dati.muffa
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `G${riga}`,
          dati.avvinato
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `H${riga}`,
          dati.oliveGelate
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `I${riga}`,
          dati.rancido
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `J${riga}`,
          dati.altro
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `K${riga}`,
          dati.fruttato
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `L${riga}`,
          dati.amaro
        );

        impostaNumero(
          xmlFoglio,
          sheetData,
          `M${riga}`,
          dati.piccante
        );

        if (
          dati.tipoFruttato
            .toLowerCase() ===
          "verde"
        ) {
          verdi++;
        }

        if (
          dati.tipoFruttato
            .toLowerCase() ===
          "maturo"
        ) {
          maturi++;
        }
      }
    );

    /*
     * Nel modello:
     * P7 = numero di fruttati verdi
     * P8 = numero di fruttati maturi
     */
    impostaNumero(
      xmlFoglio,
      sheetData,
      "P7",
      verdi
    );

    impostaNumero(
      xmlFoglio,
      sheetData,
      "P8",
      maturi
    );

    const serializer =
      new XMLSerializer();

    const nuovoXmlFoglio =
      serializer.serializeToString(
        xmlFoglio
      );

    zip.file(
      percorsoFoglio,
      nuovoXmlFoglio
    );

    /*
     * Forza Excel a ricalcolare formule
     * e grafici quando il file viene aperto.
     */
    const workbookXmlText =
      await zip
        .file("xl/workbook.xml")
        .async("text");

    const workbookXml =
      parser.parseFromString(
        workbookXmlText,
        "application/xml"
      );

    let calcPr =
      workbookXml.getElementsByTagName(
        "calcPr"
      )[0];

    if (!calcPr) {
      calcPr =
        workbookXml.createElementNS(
          "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "calcPr"
        );

      workbookXml.documentElement
        .appendChild(calcPr);
    }

    calcPr.setAttribute(
      "calcMode",
      "auto"
    );

    calcPr.setAttribute(
      "fullCalcOnLoad",
      "1"
    );

    calcPr.setAttribute(
      "forceFullCalc",
      "1"
    );

    zip.file(
      "xl/workbook.xml",
      serializer.serializeToString(
        workbookXml
      )
    );

    mostraMessaggio(
      "Creazione del file Excel..."
    );

    const risultato =
      await zip.generateAsync({
        type: "blob",

        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

    const codiceCampione =
      schede[0].codice_campione ||
      "campione";

    const nomeFile =
      `PanelCT_${codiceCampione}_` +
      `${sessione.codice_sessione}.xlsx`;

    const url =
      URL.createObjectURL(
        risultato
      );

    const link =
      document.createElement("a");

    link.href = url;
    link.download = nomeFile;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      2000
    );

    mostraMessaggio(
      `Excel creato correttamente con ${schede.length} schede.`
    );

  } catch (errore) {
    mostraMessaggio(
      "Errore esportazione: " +
      errore.message,
      true
    );

    alert(
      "Errore esportazione: " +
      errore.message
    );

  } finally {
    pulsanteEsporta.disabled =
      false;

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
  esportaExcelCoi
);


mostraSessioneAttiva();


setInterval(
  mostraSessioneAttiva,
  15000
);
