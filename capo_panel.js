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


function generaCodiceValutazione() {
  const data = new Date();

  const anno = data.getFullYear();

  const mese = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const giorno = String(
    data.getDate()
  ).padStart(2, "0");

  const ore = String(
    data.getHours()
  ).padStart(2, "0");

  const minuti = String(
    data.getMinutes()
  ).padStart(2, "0");

  const secondi = String(
    data.getSeconds()
  ).padStart(2, "0");

  return (
    `PANEL-${anno}${mese}${giorno}-` +
    `${ore}${minuti}${secondi}`
  );
}


async function recuperaValutazioneAttiva() {
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
      "Valutazione attiva, ma non riesco a contare le schede: " +
      error.message,
      true
    );

    return;
  }

  mostraMessaggio(
    "Schede ricevute: " +
    (count ?? 0)
  );
}


async function mostraValutazioneAttiva() {
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

    await aggiornaConteggioSchede(
      sessione.id
    );

  } catch (errore) {
    testoSessione.textContent =
      "Errore nel caricamento";

    mostraMessaggio(
      "Errore lettura valutazione: " +
      errore.message,
      true
    );
  }
}


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
    const { error: erroreChiusura } =
      await client
        .from("sessioni")
        .update({
          attiva: false
        })
        .eq("attiva", true);

    if (erroreChiusura) {
      throw new Error(
        "Impossibile chiudere la valutazione precedente: " +
        erroreChiusura.message
      );
    }

    const codice =
      generaCodiceValutazione();

    const {
      data: nuovaValutazione,
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
      nuovaValutazione.codice_sessione;

    mostraMessaggio(
      "Nuova valutazione pronta. Schede ricevute: 0"
    );

  } catch (errore) {
    mostraMessaggio(
      "Errore: " + errore.message,
      true
    );

  } finally {
    pulsanteNuovaValutazione.disabled =
      false;

    pulsanteEsporta.disabled =
      false;
  }
}


/*
 * Individua il file XML interno corrispondente
 * al foglio "INPUT Data".
 */
async function trovaFoglioInput(zip) {
  const workbookFile =
    zip.file("xl/workbook.xml");

  const relazioniFile =
    zip.file(
      "xl/_rels/workbook.xml.rels"
    );

  if (!workbookFile || !relazioniFile) {
    throw new Error(
      "Il modello Excel non contiene la struttura prevista."
    );
  }

  const workbookTesto =
    await workbookFile.async("text");

  const relazioniTesto =
    await relazioniFile.async("text");

  const parser = new DOMParser();

  const workbookXml =
    parser.parseFromString(
      workbookTesto,
      "application/xml"
    );

  const relazioniXml =
    parser.parseFromString(
      relazioniTesto,
      "application/xml"
    );

  const fogli =
    workbookXml.getElementsByTagName(
      "sheet"
    );

  let relazioneId = null;

  for (const foglio of fogli) {
    if (
      foglio.getAttribute("name") ===
      "INPUT Data"
    ) {
      relazioneId =
        foglio.getAttribute("r:id") ||
        foglio.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "id"
        );

      break;
    }
  }

  if (!relazioneId) {
    throw new Error(
      'Non trovo il foglio "INPUT Data" nel modello.'
    );
  }

  const relazioni =
    relazioniXml.getElementsByTagName(
      "Relationship"
    );

  for (const relazione of relazioni) {
    if (
      relazione.getAttribute("Id") ===
      relazioneId
    ) {
      let percorso =
        relazione.getAttribute("Target");

      percorso =
        percorso.replace(/^\//, "");

      if (!percorso.startsWith("xl/")) {
        percorso = "xl/" + percorso;
      }

      return percorso;
    }
  }

  throw new Error(
    "Non riesco a individuare internamente il foglio INPUT Data."
  );
}


function trovaONuovaRiga(
  xml,
  sheetData,
  numeroRiga
) {
  const righe =
    sheetData.getElementsByTagName(
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

  riga.appendChild(
    nuovaCella
  );

  return nuovaCella;
}


function svuotaCella(cella) {
  const daEliminare = [];

  for (const nodo of cella.childNodes) {
    if (
      nodo.nodeName === "v" ||
      nodo.nodeName === "is" ||
      nodo.nodeName === "f"
    ) {
      daEliminare.push(nodo);
    }
  }

  daEliminare.forEach(
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
  const numeroRiga = Number(
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

  svuotaCella(cella);

  const nodoValore =
    xml.createElementNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "v"
    );

  const numero =
    Number(valore);

  nodoValore.textContent =
    Number.isFinite(numero)
      ? String(numero)
      : "0";

  cella.appendChild(
    nodoValore
  );
}


function impostaTesto(
  xml,
  sheetData,
  riferimento,
  valore
) {
  const numeroRiga = Number(
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

  svuotaCella(cella);

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

  nodoIs.appendChild(
    nodoTesto
  );

  cella.appendChild(
    nodoIs
  );
}


function pulisciRigheAssaggiatori(
  xml,
  sheetData
) {
  for (
    let numeroRiga = 7;
    numeroRiga <= 26;
    numeroRiga++
  ) {
    impostaTesto(
      xml,
      sheetData,
      `D${numeroRiga}`,
      ""
    );

    [
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M"
    ].forEach(colonna => {
      impostaNumero(
        xml,
        sheetData,
        `${colonna}${numeroRiga}`,
        0
      );
    });
  }
}


function preparaValoriScheda(
  scheda
) {
  const nomeAltro =
    String(
      scheda.altro_difetto_nome || ""
    ).toLowerCase();

  const intensitaAltro =
    Number(
      scheda.altro_difetto_intensita
    ) || 0;

  const oliveGelate =
    nomeAltro.includes(
      "olive gelate"
    ) ||
    nomeAltro.includes(
      "legno umido"
    )
      ? intensitaAltro
      : 0;

  const altroDifetto =
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

    oliveGelate,

    rancido:
      Number(scheda.rancido) || 0,

    altroDifetto,

    fruttato:
      Number(scheda.fruttato) || 0,

    amaro:
      Number(scheda.amaro) || 0,

    piccante:
      Number(scheda.piccante) || 0,

    tipoFruttato:
      String(
        scheda.tipo_fruttato || ""
      ).toLowerCase()
  };
}


async function esportaExcelCoi() {
  pulsanteEsporta.disabled =
    true;

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
        "La libreria Excel non è stata caricata."
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
        { ascending: true }
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
        "Non sono ancora presenti schede nella valutazione attiva."
      );
    }

    if (schede.length > 20) {
      throw new Error(
        "Il modello Excel supporta al massimo 20 assaggiatori per campione."
      );
    }

    mostraMessaggio(
      "Caricamento del modello Excel..."
    );

    const risposta =
      await fetch(
        `${NOME_MODELLO_EXCEL}?v=1`,
        {
          cache: "no-store"
        }
      );

    if (!risposta.ok) {
      throw new Error(
        "Non riesco a caricare il modello " +
        NOME_MODELLO_EXCEL +
        "."
      );
    }

    const arrayBuffer =
      await risposta.arrayBuffer();

    const zip =
      await JSZip.loadAsync(
        arrayBuffer
      );

    const percorsoFoglio =
      await trovaFoglioInput(zip);

    const foglioFile =
      zip.file(percorsoFoglio);

    if (!foglioFile) {
      throw new Error(
        "Il foglio INPUT Data non è disponibile."
      );
    }

    const foglioTesto =
      await foglioFile.async("text");

    const parser =
      new DOMParser();

    const xml =
      parser.parseFromString(
        foglioTesto,
        "application/xml"
      );

    if (
      xml.getElementsByTagName(
        "parsererror"
      ).length > 0
    ) {
      throw new Error(
        "Errore nella lettura del modello Excel."
      );
    }

    const sheetData =
      xml.getElementsByTagName(
        "sheetData"
      )[0];

    if (!sheetData) {
      throw new Error(
        "Nel foglio INPUT Data manca l'area dei dati."
      );
    }

    pulisciRigheAssaggiatori(
      xml,
      sheetData
    );

    let numeroVerdi = 0;
    let numeroMaturi = 0;

    schede.forEach(
      (scheda, indice) => {
        const numeroRiga =
          7 + indice;

        const valori =
          preparaValoriScheda(
            scheda
          );

        impostaTesto(
          xml,
          sheetData,
          `D${numeroRiga}`,
          valori.assaggiatore
        );

        impostaNumero(
          xml,
          sheetData,
          `E${numeroRiga}`,
          valori.riscaldo
        );

        impostaNumero(
          xml,
          sheetData,
          `F${numeroRiga}`,
          valori.muffa
        );

        impostaNumero(
          xml,
          sheetData,
          `G${numeroRiga}`,
          valori.avvinato
        );

        impostaNumero(
          xml,
          sheetData,
          `H${numeroRiga}`,
          valori.oliveGelate
        );

        impostaNumero(
          xml,
          sheetData,
          `I${numeroRiga}`,
          valori.rancido
        );

        impostaNumero(
          xml,
          sheetData,
          `J${numeroRiga}`,
          valori.altroDifetto
        );

        impostaNumero(
          xml,
          sheetData,
          `K${numeroRiga}`,
          valori.fruttato
        );

        impostaNumero(
          xml,
          sheetData,
          `L${numeroRiga}`,
          valori.amaro
        );

        impostaNumero(
          xml,
          sheetData,
          `M${numeroRiga}`,
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

    const workbookFile =
      zip.file("xl/workbook.xml");

    if (workbookFile) {
      const workbookTesto =
        await workbookFile.async("text");

      const workbookXml =
        parser.parseFromString(
          workbookTesto,
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
    }

    mostraMessaggio(
      "Creazione del file Excel..."
    );

    const fileFinale =
      await zip.generateAsync({
        type: "blob",

        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

    const codiceCampione =
      String(
        schede[0].codice_campione ||
        "campione"
      )
        .trim()
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

    const nomeFile =
      `PanelCT_${codiceCampione}_` +
      `${sessione.codice_sessione}.xlsx`;

    const url =
      URL.createObjectURL(
        fileFinale
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      nomeFile;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(url);
      },
      3000
    );

    mostraMessaggio(
      "Excel creato correttamente con " +
      schede.length +
      " schede."
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

    pulsanteNuovaValutazione.disabled =
      false;

    pulsanteEsporta.textContent =
      "📥 Esporta Excel COI";
  }
}


pulsanteNuovaValutazione.addEventListener(
  "click",
  creaNuovaValutazione
);

pulsanteEsporta.addEventListener(
  "click",
  esportaExcelCoi
);


mostraValutazioneAttiva();


setInterval(
  mostraValutazioneAttiva,
  15000
);
