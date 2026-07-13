async function trovaFoglioInput(zip) {
  const workbookFile = zip.file("xl/workbook.xml");
  const relazioniFile = zip.file(
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

  const workbookXml = parser.parseFromString(
    workbookTesto,
    "application/xml"
  );

  const relazioniXml = parser.parseFromString(
    relazioniTesto,
    "application/xml"
  );

  const fogli = workbookXml.getElementsByTagNameNS(
    "*",
    "sheet"
  );

  let relazioneId = null;

  for (const foglio of fogli) {
    const nomeFoglio =
      (foglio.getAttribute("name") || "")
        .trim()
        .toLowerCase();

    if (
      nomeFoglio === "input data" ||
      nomeFoglio === "dati input" ||
      nomeFoglio === "dati panel"
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
      'Non trovo il foglio dati nel modello Excel.'
    );
  }

  const relazioni =
    relazioniXml.getElementsByTagNameNS(
      "*",
      "Relationship"
    );

  for (const relazione of relazioni) {
    if (
      relazione.getAttribute("Id") === relazioneId
    ) {
      let percorso =
        relazione.getAttribute("Target");

      if (!percorso) {
        break;
      }

      percorso = percorso.replace(/\\/g, "/");

      if (percorso.startsWith("/xl/")) {
        percorso = percorso.substring(1);
      } else if (
        percorso.startsWith("xl/")
      ) {
        // È già corretto.
      } else if (
        percorso.startsWith("../")
      ) {
        percorso =
          percorso.replace(/^(\.\.\/)+/, "");
      } else {
        percorso = "xl/" + percorso;
      }

      if (!zip.file(percorso)) {
        throw new Error(
          "Percorso interno del foglio non valido: " +
          percorso
        );
      }

      return percorso;
    }
  }

  throw new Error(
    "Ho trovato il foglio dati, ma non il suo collegamento interno."
  );
}
