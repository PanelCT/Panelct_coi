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


// ELEMENTI DELLA PAGINA

const testoSessione =
  document.getElementById("sessioneCorrente");

const messaggio =
  document.getElementById("messaggioCapoPanel");

const pulsanteNuovaValutazione =
  document.getElementById("nuovaValutazione");

const pulsanteEsporta =
  document.getElementById("esportaExcel");


// MOSTRA I MESSAGGI NEL CAPO PANEL

function mostraMessaggio(
  testo,
  errore = false
) {
  messaggio.textContent = testo;

  messaggio.style.color = errore
    ? "#a32626"
    : "#315b35";
}


// CREA IL CODICE DELLA NUOVA VALUTAZIONE

function generaCodiceValutazione() {
  const data = new Date();

  const completaConZero = numero =>
    String(numero).padStart(2, "0");

  const anno =
    data.getFullYear();

  const mese =
    completaConZero(
      data.getMonth() + 1
    );

  const giorno =
    completaConZero(
      data.getDate()
    );

  const ore =
    completaConZero(
      data.getHours()
    );

  const minuti =
    completaConZero(
      data.getMinutes()
    );

  const secondi =
    completaConZero(
      data.getSeconds()
    );

  return (
    `PANEL-${anno}${mese}${giorno}-` +
    `${ore}${minuti}${secondi}`
  );
}


// RECUPERA LA VALUTAZIONE ATTIVA

async function recuperaValutazioneAttiva() {
  const {
    data,
    error
  } = await client
    .from("sessioni")
    .select(
      "id,codice_sessione,attiva"
    )
    .eq("attiva", true)
    .order(
      "id",
      { ascending: false }
    )
    .limit(1);

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  return data[0];
}


// AGGIORNA SESSIONE E NUMERO SCHEDE

async function aggiornaPannello() {
  try {
    const sessione =
      await recuperaValutazioneAttiva();

    if (!sessione) {
      testoSessione.textContent =
        "Nessuna valutazione attiva";

      mostraMessaggio("");

      return;
    }

    testoSessione.textContent =
      sessione.codice_sessione;

    const {
      count,
      error
    } = await client
      .from("valutazione")
      .select(
        "*",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "sessione_id",
        sessione.id
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    mostraMessaggio(
      "Schede ricevute: " +
      (count ?? 0)
    );

  } catch (errore) {
    testoSessione.textContent =
      "Errore nel caricamento";

    mostraMessaggio(
      "Errore: " +
      errore.message,
      true
    );
  }
}


// CREA UNA NUOVA VALUTAZIONE

async function creaNuovaValutazione() {
  const conferma = confirm(
    "Vuoi chiudere la valutazione attuale " +
    "e iniziarne una nuova?"
  );

  if (!conferma) {
    return;
  }

  pulsanteNuovaValutazione.disabled =
    true;

  pulsanteEsporta.disabled =
    true;

  mostraMessaggio(
    "Creazione della nuova valutazione..."
  );

  try {
    const {
      error: erroreChiusura
    } = await client
      .from("sessioni")
      .update({
        attiva: false
      })
      .eq(
        "attiva",
        true
      );

    if (erroreChiusura) {
      throw new Error(
        "Impossibile chiudere la " +
        "valutazione precedente: " +
        erroreChiusura.message
      );
    }

    const codice =
      generaCodiceValutazione();

    const {
      data,
      error
    } = await client
      .from("sessioni")
      .insert([
        {
          codice_sessione: codice,
          attiva: true
        }
      ])
      .select(
        "id,codice_sessione,attiva"
      )
      .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    testoSessione.textContent =
      data.codice_sessione;

    mostraMessaggio(
      "Nuova valutazione pronta. " +
      "Schede ricevute: 0"
    );

  } catch (errore) {
    mostraMessaggio(
      "Errore: " +
      errore.message,
      true
    );

    alert(
      "Errore: " +
      errore.message
    );

  } finally {
    pulsanteNuovaValutazione.disabled =
      false;

    pulsanteEsporta.disabled =
      false;
  }
}


// TROVA IL FOGLIO DATI NEL MODELLO EXCEL

async function trovaFoglioInput(zip) {
  const percorsoFoglio =
    "xl/worksheets/sheet1.xml";

  if (!zip.file(percorsoFoglio)) {
    throw new Error(
      "Nel modello Excel non trovo il foglio INPUT Data."
    );
  }

  return percorsoFoglio;
}


// CERCA O CREA UNA RIGA NEL FOGLIO EXCEL

function trovaONuovaRiga(
  xml,
  sheetData,
  numeroRiga
) {
  const righe =
    sheetData.getElementsByTagNameNS(
      "*",
      "row"
    );

  for (const riga of righe) {
    if (
      Number(
        riga.getAttribute("r")
      ) === numeroRiga
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

  sheetData.appendChild(
    nuovaRiga
  );

  return nuovaRiga;
}


// CERCA O CREA UNA CELLA

function trovaONuovaCella(
  xml,
  riga,
  riferimento
) {
  const celle =
    riga.getElementsByTagNameNS(
      "*",
      "c"
    );

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

  riga.appendChild(
    nuovaCella
  );

  return nuovaCella;
}


// SVUOTA UNA CELLA MANTENENDO LA FORMATTAZIONE

function svuotaCella(cella) {
  const nodi =
    Array.from(
      cella.childNodes
    );

  for (const nodo of nodi) {
    const nome =
      nodo.localName ||
      nodo.nodeName;

    if (
      nome === "v" ||
      nome === "is" ||
      nome === "f"
    ) {
      cella.removeChild(
        nodo
      );
    }
  }

  cella.removeAttribute(
    "t"
  );
}


// SCRIVE UN NUMERO NELLA CELLA

function impostaNumero(
  xml,
  sheetData,
  riferimento,
  valore
) {
  const numeroRiga =
    Number(
      riferimento.match(
        /\d+/
      )[0]
    );

  const riga =
    trovaONuovaRiga(
      xml,
      sheetData,
      numeroRiga
    );

  const cella =
    trovaONuovaCella(
      xml,
      riga,
      riferimento
    );

  svuotaCella(
    cella
  );

  const numero =
    Number(valore);

  const nodoValore =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "v"
    );

  nodoValore.textContent =
    Number.isFinite(numero)
      ? String(numero)
      : "0";

  cella.appendChild(
    nodoValore
  );
}


// SCRIVE UN TESTO NELLA CELLA

function impostaTesto(
  xml,
  sheetData,
  riferimento,
  valore
) {
  const numeroRiga =
    Number(
      riferimento.match(
        /\d+/
      )[0]
    );

  const riga =
    trovaONuovaRiga(
      xml,
      sheetData,
      numeroRiga
    );

  const cella =
    trovaONuovaCella(
      xml,
      riga,
      riferimento
    );

  svuotaCella(
    cella
  );

  const testo =
    valore === null ||
    valore === undefined
      ? ""
      : String(
          valore
        ).trim();

  if (!testo) {
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
    testo;

  nodoIs.appendChild(
    nodoTesto
  );

  cella.appendChild(
    nodoIs
  );
}


// PULISCE LE RIGHE DEL PRIMO CAMPIONE

function pulisciAreaDati(
  xml,
  sheetData
) {
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

    for (
      const colonna
      of colonneNumeriche
    ) {
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

      svuotaCella(cella);
    }
  }

  impostaNumero(
    xml,
    sheetData,
    "P7",
    0
  );

  impostaNumero(
    xml,
    sheetData,
    "P8",
    0
  );
}


// CONVERTE I DATI DELLA SCHEDA
// NEL FORMATO DEL MODELLO COI

function preparaValoriScheda(
  scheda
) {
  const nomeAltroDifetto =
    String(
      scheda.altro_difetto_nome ||
      ""
    )
      .trim()
      .toLowerCase();

  const intensitaAltroDifetto =
    Number(
      scheda.altro_difetto_intensita
    ) || 0;

  const oliveGelate =
    (
      nomeAltroDifetto.includes(
        "olive gelate"
      ) ||
      nomeAltroDifetto.includes(
        "legno umido"
      )
    )
      ? intensitaAltroDifetto
      : 0;

  const altroDifetto =
    oliveGelate > 0
      ? 0
      : intensitaAltroDifetto;

  const nomeCompleto =
    (
      `${scheda.nome || ""} ` +
      `${scheda.cognome || ""}`
    ).trim();

  return {
    assaggiatore:
      nomeCompleto ||
      String(
        scheda.assaggiatore ||
        ""
      ).trim(),

    riscaldo:
      Number(
        scheda.riscaldo
      ) || 0,

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
      Number(
        scheda.rancido
      ) || 0,

    altroDifetto:
      altroDifetto,

    fruttato:
      Number(
        scheda.fruttato
      ) || 0,

    amaro:
      Number(
        scheda.amaro
      ) || 0,

    piccante:
      Number(
        scheda.piccante
      ) || 0,

    tipoFruttato:
      String(
        scheda.tipo_fruttato ||
        ""
      )
        .trim()
        .toLowerCase()
  };
}


// FORZA EXCEL A RICALCOLARE
// FORMULE E GRAFICI ALL'APERTURA

async function forzaRicalcoloExcel(
  zip
) {
  const workbookFile =
    zip.file(
      "xl/workbook.xml"
    );

  if (!workbookFile) {
    return;
  }

  const workbookTesto =
    await workbookFile.async(
      "text"
    );

  const parser =
    new DOMParser();

  const workbookXml =
    parser.parseFromString(
      workbookTesto,
      "application/xml"
    );

  let calcPr =
    workbookXml
      .getElementsByTagNameNS(
        "*",
        "calcPr"
      )[0];

  if (!calcPr) {
    calcPr =
      workbookXml
        .createElementNS(
          "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "calcPr"
        );

    workbookXml
      .documentElement
      .appendChild(
        calcPr
      );
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
    new XMLSerializer()
      .serializeToString(
        workbookXml
      )
  );

  if (
    zip.file(
      "xl/calcChain.xml"
    )
  ) {
    zip.remove(
      "xl/calcChain.xml"
    );
  }
}
// ESPORTAZIONE AUTOMATICA EXCEL COI

async function esportaExcelCoi() {
  pulsanteEsporta.disabled = true;

  pulsanteNuovaValutazione.disabled =
    true;

  pulsanteEsporta.textContent =
    "PREPARAZIONE EXCEL...";

  mostraMessaggio(
    "Recupero delle schede..."
  );

  try {
    if (
      typeof JSZip === "undefined"
    ) {
      throw new Error(
        "La libreria necessaria per Excel " +
        "non è stata caricata."
      );
    }

    const sessione =
      await recuperaValutazioneAttiva();

    if (!sessione) {
      throw new Error(
        "Non risulta alcuna valutazione attiva."
      );
    }

    const {
      data: schede,
      error
    } = await client
      .from("valutazione")
      .select("*")
      .eq(
        "sessione_id",
        sessione.id
      )
      .order(
        "id",
        {
          ascending: true
        }
      );

    if (error) {
      throw new Error(
        "Errore lettura schede: " +
        error.message
      );
    }

    if (
      !schede ||
      schede.length === 0
    ) {
      throw new Error(
        "Non sono presenti schede " +
        "nella valutazione attiva."
      );
    }

    if (
      schede.length > 20
    ) {
      throw new Error(
        "Il modello Excel supporta " +
        "al massimo 20 assaggiatori " +
        "per campione."
      );
    }

    mostraMessaggio(
      "Caricamento del modello Excel..."
    );

    const urlModello =
      new URL(
        NOME_MODELLO_EXCEL,
        window.location.href
      );

    urlModello.searchParams.set(
      "v",
      String(
        Date.now()
      )
    );

    const risposta =
      await fetch(
        urlModello.href,
        {
          cache: "no-store"
        }
      );

    if (!risposta.ok) {
      throw new Error(
        "Non riesco a caricare " +
        NOME_MODELLO_EXCEL +
        ". Risposta del server: " +
        risposta.status +
        "."
      );
    }

    const buffer =
      await risposta.arrayBuffer();

    const zip =
      await JSZip.loadAsync(
        buffer
      );

    const percorsoFoglio =
      await trovaFoglioInput(
        zip
      );

    const fileFoglio =
      zip.file(
        percorsoFoglio
      );

    if (!fileFoglio) {
      throw new Error(
        "Il file interno del foglio dati " +
        "non esiste: " +
        percorsoFoglio
      );
    }

    const testoFoglio =
      await fileFoglio.async(
        "text"
      );

    const parser =
      new DOMParser();

    const xml =
      parser.parseFromString(
        testoFoglio,
        "application/xml"
      );

    if (
      xml.getElementsByTagName(
        "parsererror"
      ).length > 0
    ) {
      throw new Error(
        "Il foglio Excel non può essere " +
        "letto correttamente."
      );
    }

    const sheetData =
      xml.getElementsByTagNameNS(
        "*",
        "sheetData"
      )[0];

    if (!sheetData) {
      throw new Error(
        "Nel foglio dati manca " +
        "la sezione sheetData."
      );
    }

    pulisciAreaDati(
      xml,
      sheetData
    );

    let numeroVerdi = 0;
    let numeroMaturi = 0;
        schede.forEach(
      (scheda, indice) => {
        const riga =
          7 + indice;

        const valori =
          preparaValoriScheda(
            scheda
          );

        impostaTesto(
          xml,
          sheetData,
          `D${riga}`,
          valori.assaggiatore
        );

        impostaNumero(
          xml,
          sheetData,
          `E${riga}`,
          valori.riscaldo
        );

        impostaNumero(
          xml,
          sheetData,
          `F${riga}`,
          valori.muffa
        );

        impostaNumero(
          xml,
          sheetData,
          `G${riga}`,
          valori.avvinato
        );

        impostaNumero(
          xml,
          sheetData,
          `H${riga}`,
          valori.oliveGelate
        );

        impostaNumero(
          xml,
          sheetData,
          `I${riga}`,
          valori.rancido
        );

        impostaNumero(
          xml,
          sheetData,
          `J${riga}`,
          valori.altroDifetto
        );

        impostaNumero(
          xml,
          sheetData,
          `K${riga}`,
          valori.fruttato
        );

        impostaNumero(
          xml,
          sheetData,
          `L${riga}`,
          valori.amaro
        );

        impostaNumero(
          xml,
          sheetData,
          `M${riga}`,
          valori.piccante
        );

        if (
          valori.tipoFruttato ===
          "verde"
        ) {
          numeroVerdi++;
        }

        if (
          valori.tipoFruttato ===
          "maturo"
        ) {
          numeroMaturi++;
        }
      }
    );

    impostaNumero(
      xml,
      sheetData,
      "P7",
      numeroVerdi
    );

    impostaNumero(
      xml,
      sheetData,
      "P8",
      numeroMaturi
    );

    const serializer =
      new XMLSerializer();

    zip.file(
      percorsoFoglio,
      serializer.serializeToString(
        xml
      )
    );

    await forzaRicalcoloExcel(
      zip
    );

    mostraMessaggio(
      "Creazione del file Excel..."
    );

    const fileFinale =
      await zip.generateAsync({
        type: "blob",

        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        compression:
          "DEFLATE"
      });

    const codiciCampione =
      [
        ...new Set(
          schede
            .map(
              scheda =>
                String(
                  scheda.codice_campione ||
                  ""
                ).trim()
            )
            .filter(
              Boolean
            )
        )
      ];

    const etichettaCampione =
      codiciCampione.length === 1
        ? codiciCampione[0]
        : codiciCampione.length > 1
          ? "piu_campioni"
          : "campione";

    const nomePulito =
      etichettaCampione.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    const nomeFile =
      `PanelCT_${nomePulito}_` +
      `${sessione.codice_sessione}.xlsx`;

    const url =
      URL.createObjectURL(
        fileFinale
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      nomeFile;

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      5000
    );

    mostraMessaggio(
      "Excel creato correttamente con " +
      schede.length +
      " schede."
    );  } catch (errore) {
    console.error(
      errore
    );

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

    pulsanteNuovaValutazione.disabled =
      false;

    pulsanteEsporta.textContent =
      "📥 Esporta Excel COI";
  }
}


// COLLEGAMENTO DEI PULSANTI

pulsanteNuovaValutazione.addEventListener(
  "click",
  creaNuovaValutazione
);

pulsanteEsporta.addEventListener(
  "click",
  esportaExcelCoi
);


// CARICAMENTO INIZIALE

aggiornaPannello();


// AGGIORNAMENTO AUTOMATICO OGNI 15 SECONDI

setInterval(
  aggiornaPannello,
  15000
);
