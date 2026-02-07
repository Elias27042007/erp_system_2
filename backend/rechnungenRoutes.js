import express from "express";
import PDFDocument from "pdfkit";
import db from "./db.js";


const router = express.Router();

function buildRechnungsnummer({ nummer, typ, kundennameClean }) {
  const typCode = typ === "rechnung" ? "REC" : "ANG";
  return `${nummer}_${typCode}_${kundennameClean}`;
}


function cleanKundenname(kundeRow) {
  let raw;

  if (kundeRow.firma && kundeRow.firma.trim()) {
    raw = kundeRow.firma;
  } else if (kundeRow.nachname || kundeRow.vorname) {
    const nach = (kundeRow.nachname || "").trim();
    const vor = (kundeRow.vorname || "").trim();
    raw = [nach, vor].filter(Boolean).join("-");
  } else {
    raw = "Kunde";
  }

  return raw
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "");
}

async function rebuildTypRechnungen(conn, typ) {
  const [rows] = await conn.execute(
    `SELECT r.id, r.kunde_id
     FROM rechnung r
     WHERE r.typ = ?
     ORDER BY (r.nummer < 0) ASC, r.nummer ASC, r.id ASC`,
    [typ]
  );

  // Schritt 1: nummern freimachen
  for (const r of rows) {
    await conn.execute(
      `UPDATE rechnung
      SET nummer = -id,
          rechnungsnummer = CONCAT('TMP_', id)
      WHERE id = ?`,
      [r.id]
    );
  }


  // Schritt 2: sauber neu vergeben
  for (let i = 0; i < rows.length; i++) {
    const id = rows[i].id;
    const nummer = i + 1;

    const [[kunde]] = await conn.execute(
      `SELECT firma, vorname, nachname
       FROM kunden
       WHERE id = ?
       LIMIT 1`,
      [rows[i].kunde_id]
    );

    const kundennameClean = cleanKundenname(kunde || {});
    const rechnungsnummer = buildRechnungsnummer({
      nummer,
      typ,
      kundennameClean
    });

    await conn.execute(
      `UPDATE rechnung
       SET nummer = ?, rechnungsnummer = ?
       WHERE id = ?`,
      [nummer, rechnungsnummer, id]
    );
  }
}




async function rebuildBeideTypen(conn) {
  await rebuildTypRechnungen(conn, "angebot");
  await rebuildTypRechnungen(conn, "rechnung");
}


router.get("/laden", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS gesamt,
        SUM(CASE WHEN typ = 'rechnung' THEN 1 ELSE 0 END) AS rechnungen,
        SUM(CASE WHEN typ = 'angebot' THEN 1 ELSE 0 END) AS angebote
      FROM rechnung;
    `);

    res.json({
      gesamt: rows[0].gesamt,
      rechnungen: rows[0].rechnungen,
      angebote: rows[0].angebote
    });
  } catch (err) {
    console.error("Fehler beim Laden der Rechnungsanzahl:", err);
    res.status(500).json({ error: "Fehler beim Laden der Rechnungsanzahl" });
  }
});

router.post("/pdf", async (req, res) => {
  try {
    const { firma, kunde, rechnung, positionen, summen } = req.body;

    // ✅ Kundendaten aus DB nachladen, wenn möglich
    let kundeDB = null;

    const kundeId =
      Number(rechnung?.kunde_id) ||
      Number(kunde?.id) ||
      Number(kunde?.kunde_id);

    if (Number.isInteger(kundeId) && kundeId > 0) {
      const [[k]] = await db.execute(
        `SELECT firma, vorname, nachname, adresse, plz, ort
         FROM kunden
         WHERE id = ?
         LIMIT 1`,
        [kundeId]
      );
      kundeDB = k || null;
    }

    // ✅ finaler Kunde (DB bevorzugt, fallback Payload)
    const kundeName =
      (kundeDB
        ? `${kundeDB.firma}${(kundeDB.vorname || kundeDB.nachname)
            ? ` (${kundeDB.vorname ?? ""} ${kundeDB.nachname ?? ""})`
            : ""}`.trim()
        : (kunde?.name ?? ""));

    const kundeAdresse = (kundeDB?.adresse ?? kunde?.adresse ?? "");
    const kundePlz = (kundeDB?.plz ?? kunde?.plz ?? "");
    const kundeOrt = (kundeDB?.ort ?? kunde?.ort ?? "");

    // ✅ Hier ist der entscheidende Punkt: kundeZeilen wird VORHER gebaut
    const istAngebot = String(rechnung?.typ || "").toLowerCase() === "angebot";
    const empfaengerTitel = istAngebot ? "Angebot an:" : "Rechnung an:";

    const kundeZeilen = [
      empfaengerTitel,
      kundeName,
      kundeAdresse,
      `${kundePlz} ${kundeOrt}`.trim()
    ].filter(line => line && line.trim() !== "").join("\n");

    const doc = new PDFDocument({ margin: 50 });

    const M = 50;
    const LEFT_X = 50;
    const LEFT_W = 260;      // linke Spalte für Bemerkungen, kollidiert nicht mit Summen rechts
    const RIGHT_X = 350;

    const pageBottom = () => doc.page.height - M;

    function ensureSpace(needed) {
      if (doc.y + needed > pageBottom()) {
        doc.addPage();
        doc.y = M;
      }
    }

    // bricht lange "Wörter" ohne Leerzeichen
    function breakLongWords(str, every = 35) {
      if (!str) return "";
      return String(str)
        .split(" ")
        .map(w => w.length > every ? w.replace(new RegExp(`(.{${every}})`, "g"), "$1 ") : w)
        .join(" ");
    }

    function writeLeftBlock(label, text) {
      if (!text) return;

      const t = breakLongWords(text, 35);

      if (label) {
        ensureSpace(20);
        doc.fontSize(11).text(label, LEFT_X, doc.y);
        doc.moveDown(0.2);
      }

      const h = doc.heightOfString(t, { width: LEFT_W });
      ensureSpace(h + 10);

      doc.fontSize(10).text(t, LEFT_X, doc.y, { width: LEFT_W });
      doc.moveDown(1);
    }



    function drawTableHeader() {
      ensureSpace(40);

      const y = doc.y;

      doc.fontSize(12).text("Pos", 50, y);
      doc.text("Beschreibung", 90, y);
      doc.text("Menge", 300, y);
      doc.text("Einzelpreis", 360, y);
      doc.text("Gesamt", 450, y);

      doc.moveTo(50, y + 20).lineTo(550, y + 20).stroke();

      doc.y = y + 30;
    }

    function drawRow(index, pos) {
      const menge = Number(pos.menge ?? 0);
      const bauseits = Number(pos.bauseits ?? 0) === 1;

      let epText;
      if (bauseits) epText = "bauseits vorhanden";
      else if (Number(pos.einzelpreis) === 0) epText = "kostenlos";
      else epText = `${Number(pos.einzelpreis ?? 0).toFixed(2)} €`;

      let gesText;

      if (bauseits) {
        gesText = "";              // nichts anzeigen
      } else if (Number(pos.einzelpreis) === 0) {
        gesText = "—";             // kostenlos → Strich
      } else {
        gesText = `${(menge * Number(pos.einzelpreis ?? 0)).toFixed(2)} €`;
      }

      // Wenn kaum Platz -> neue Seite + Tabellenkopf wiederholen
      if (doc.y + 30 > pageBottom()) {
        doc.addPage();
        doc.y = M;
        drawTableHeader();
      }

      const y = doc.y;

      doc.fontSize(11).text(String(index + 1), 50, y);
      doc.text(pos.bezeichnung || "", 90, y, { width: 200 });
      doc.text(String(menge), 300, y);
      doc.text(epText, 360, y);
      doc.text(gesText, 450, y);

      doc.moveTo(50, y + 20).lineTo(550, y + 20).stroke();
      doc.y = y + 25;
    }

    function drawSummenAt(summen, y) {
      const needed = 90;

      // Wenn der Summenblock an der gewünschten Y-Position nicht mehr passt, neue Seite
      if (y + needed > pageBottom()) {
        doc.addPage();
        y = M;
      }

      doc.fontSize(12).text("Nettosumme:", RIGHT_X, y);
      doc.text(`${Number(summen.netto).toFixed(2)} €`, 480, y, { align: "right" });

      doc.text(`MwSt (${summen.mwst_prozent}%):`, RIGHT_X, y + 20);
      doc.text(`${Number(summen.mwst).toFixed(2)} €`, 480, y + 20, { align: "right" });

      doc.fontSize(14).text("Gesamtbetrag:", RIGHT_X, y + 50);
      doc.text(`${Number(summen.brutto).toFixed(2)} €`, 480, y + 50, { align: "right" });

      return y + needed;
    }




    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=dokument.pdf");
    doc.pipe(res);

    // ---------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------
    doc
      .fontSize(20)
      .text(firma.name, 50, 50)
      .fontSize(10)
      .text(firma.strasse, 50, 75)
      .text(`${firma.plz} ${firma.ort}`, 50, 90)
      .text(`Telefon: ${firma.telefon}`, 50, 105)
      .text(`Fax: ${firma.fax}`, 50, 120)
      .text(`Email: ${firma.email}`, 50, 135)
      .text(`IBAN: ${firma.iban}`, 50, 150)
      .text(`BIC: ${firma.bic}`, 50, 165);

    doc.moveTo(50, 185).lineTo(550, 185).stroke();

    // ---------------------------------------------------------
    // TITEL
    // ---------------------------------------------------------
    doc.fontSize(18).text(istAngebot ? "Angebot" : "Rechnung", 50, 205);

    // ---------------------------------------------------------
    // RECHNUNGSINFO + KUNDE (Layout)
    // ---------------------------------------------------------
    const nummerY = 225; // höher
    const infoY = 255;   // Datum und Kunde gleiche Höhe

    const nummerLabel =
      String(rechnung?.typ || "").toLowerCase() === "angebot"
        ? "Angebotsnummer"
        : "Rechnungsnummer";

    doc.fontSize(12).text(
       `${nummerLabel}: ${rechnung?.nummer ?? ""}`,
      50,
      nummerY
    );


    doc.text(
      `Datum: ${rechnung?.datum || ""}
Fällig am: ${rechnung?.faellig || ""}`,
      50,
      infoY
    );

    // ✅ jetzt existiert kundeZeilen sicher
    doc.text(kundeZeilen, 300, infoY);



    // ---------------------------------------------------------
    // BEMERKUNG 1 VOR POSITIONEN
    // ---------------------------------------------------------

    /*
    const leftX = 50;
    const rightX = 350;     // rechte Spalte für Summen
    const leftWidth = 260;  // links, damit es nicht in Summen läuft

    let yCursor = infoY + 60;

    const b1Flag = Number(rechnung?.bemerkung_anzeigen1 ?? 0);
    if (b1Flag === 1 && rechnung?.bemerkung1) {
      const text1 = breakLongWords(rechnung.bemerkung1, 35);

      doc.fontSize(11).text("Bemerkung:", leftX, yCursor);
      yCursor += 15;

      doc.fontSize(10).text(text1, leftX, yCursor, { width: leftWidth });

      const h1 = doc.heightOfString(text1, { width: leftWidth });
      yCursor += h1 + 10;
    }

    // Tabelle startet unter Bemerkung 1
    const tableTop = yCursor + 10;
    */
   // Nach dem Kopfbereich: Cursor setzen, damit doc.y stimmt
    doc.y = infoY + 60;

    // BEMERKUNG 1 vor Positionen
    const b1Flag = Number(rechnung?.bemerkung_anzeigen1 ?? 0);
    if (b1Flag === 1 && rechnung?.bemerkung1) {
      writeLeftBlock("Bemerkung:", rechnung.bemerkung1);
    }

    // POSITIONEN
    drawTableHeader();
    (positionen || []).forEach((pos, index) => {
      drawRow(index, pos);
    });



    // ---------------------------------------------------------
    // POSITIONSTABELLE
    // ---------------------------------------------------------
    //const tableTop = 340;

    /*
    doc.fontSize(12).text("Pos", 50, tableTop);
    doc.text("Beschreibung", 90, tableTop);
    doc.text("Menge", 300, tableTop);
    doc.text("Einzelpreis", 360, tableTop);
    doc.text("Gesamt", 450, tableTop);

    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    let y = tableTop + 30;
    */

    /*
    (positionen || []).forEach((pos, index) => {
      // const menge = Number(pos.menge ?? 0);
      // const ep = Number(pos.einzelpreis ?? 0);
      // const ges = Number(pos.gesamt ?? (menge * ep));

      doc.fontSize(11).text(index + 1, 50, y);
      doc.text(pos.bezeichnung || "", 90, y);
      doc.text(String(menge), 300, y);
      // doc.text(`${ep.toFixed(2)} €`, 360, y);
      // doc.text(`${ges.toFixed(2)} €`, 450, y);
      const menge = Number(pos.menge ?? 0);
      const bauseits = Number(pos.bauseits ?? 0) === 1;

      // Anzeige-Text für Einzelpreis
      let einzelpreisText;

      if (bauseits) {
        einzelpreisText = "bauseits vorhanden";
      } else if (Number(pos.einzelpreis) === 0) {
        einzelpreisText = "kostenlos";
      } else {
        const ep = Number(pos.einzelpreis ?? 0);
        einzelpreisText = `${ep.toFixed(2)} €`;
      }

      let gesamtText;

      if (bauseits || Number(pos.einzelpreis) === 0) {
        gesamtText = "—";
      } else {
        const ep = Number(pos.einzelpreis ?? 0);
        const ges = menge * ep;
        gesamtText = `${ges.toFixed(2)} €`;
      }




      y += 25;
      doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    });
    */
    /*
    (positionen || []).forEach((pos, index) => {
      const menge = Number(pos.menge ?? 0);
      const bauseits = Number(pos.bauseits ?? 0) === 1;

      let einzelpreisText;
      if (bauseits) {
        einzelpreisText = "bauseits vorhanden";
      } else if (Number(pos.einzelpreis) === 0) {
        einzelpreisText = "kostenlos";
      } else {
        const ep = Number(pos.einzelpreis ?? 0);
        einzelpreisText = `${ep.toFixed(2)} €`;
      }

      let gesamtText;
      if (bauseits || Number(pos.einzelpreis) === 0) {
        gesamtText = "—";
      } else {
        const ep = Number(pos.einzelpreis ?? 0);
        gesamtText = `${(menge * ep).toFixed(2)} €`;
      }

      doc.fontSize(11).text(index + 1, 50, y);
      doc.text(pos.bezeichnung || "", 90, y);
      doc.text(String(menge), 300, y);
      doc.text(einzelpreisText, 360, y);
      doc.text(gesamtText, 450, y);

      y += 25;
      doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    });

    */


    // ---------------------------------------------------------
    // BEMERKUNG + SKONTO (links unter Positionen)
    // ---------------------------------------------------------
    /*
    const bemerkungAnzeigenFlag = Number(rechnung?.bemerkung_anzeigen ?? 0);

    const skontoFlag = Number(rechnung?.skonto_hinzufuegen ?? 0);

    // Defaults (falls nichts gesetzt)
    const skontoTage = skontoFlag === 1 ? Number(rechnung?.skonto_tage ?? 14) : null;
    const skontoProzent = skontoFlag === 1 ? Number(rechnung?.skonto ?? 3) : null;

    const bruttoWert = Number(summen?.brutto ?? 0);
    const skontoSumme = (skontoFlag === 1 && Number.isFinite(skontoProzent))
      ? bruttoWert * (1 - skontoProzent / 100)
      : null;

    // Start-Y links unter der Positionstabelle
    let infosY = y + 20;

    const b2Flag = Number(rechnung?.bemerkung_anzeigen ?? 0);
    if (b2Flag === 1 && rechnung?.bemerkung) {
      const text2 = breakLongWords(rechnung.bemerkung, 35);

      doc.fontSize(11).text("Bemerkung:", leftX, infosY);
      infosY += 15;

      doc.fontSize(10).text(text2, leftX, infosY, { width: leftWidth });

      const h2 = doc.heightOfString(text2, { width: leftWidth });
      infosY += h2 + 10;
    }



    if (skontoFlag === 1 && skontoSumme !== null) {
      const skontoText =
        `Bei Bezahlung binnen ${skontoTage} Tagen nach Rechnungslegung kann ein Skonto in der Höhe von ${skontoProzent}% in Abzug gebracht werden.`;

      doc.fontSize(10).text(skontoText, leftX, infosY, { width: leftWidth });
      const hs = doc.heightOfString(skontoText, { width: leftWidth });

      infosY += hs + 10;

      doc.fontSize(11).text(
        `${istAngebot ? "Angebotssumme" : "Rechnungsbetrag"} = ${skontoSumme.toFixed(2)} €`,
        leftX,
        infosY,
        { width: leftWidth }
      );

      infosY += 25;
    }





    // ---------------------------------------------------------
    // SUMMENBLOCK
    // ---------------------------------------------------------
    const sumY = y + 20;

    doc.fontSize(12)
      .text(`Nettosumme:`, 350, sumY)
      .text(`${Number(summen.netto).toFixed(2)} €`, 480, sumY, { align: "right" });

    doc.text(`MwSt (${summen.mwst_prozent}%):`, 350, sumY + 20)
      .text(`${Number(summen.mwst).toFixed(2)} €`, 480, sumY + 20, { align: "right" });

    doc.fontSize(14)
      .text(`Gesamtbetrag:`, 350, sumY + 50)
      .text(`${Number(summen.brutto).toFixed(2)} €`, 480, sumY + 50, { align: "right" });

      */


    // Nach Tabelle: links Bemerkung 2 und Skonto
    /*
    const b2Flag = Number(rechnung?.bemerkung_anzeigen ?? 0);
    if (b2Flag === 1 && rechnung?.bemerkung) {
      writeLeftBlock("Bemerkung:", rechnung.bemerkung);
    }

    const skontoFlag = Number(rechnung?.skonto_hinzufuegen ?? 0);
    const skontoTage = skontoFlag === 1 ? Number(rechnung?.skonto_tage ?? 14) : null;
    const skontoProzent = skontoFlag === 1 ? Number(rechnung?.skonto ?? 3) : null;

    const bruttoWert = Number(summen?.brutto ?? 0);
    const skontoSumme = (skontoFlag === 1 && Number.isFinite(skontoProzent))
      ? bruttoWert * (1 - skontoProzent / 100)
      : null;

    if (skontoFlag === 1 && skontoSumme !== null) {
      const skontoText =
        `Bei Bezahlung binnen ${skontoTage} Tagen nach Rechnungslegung kann ein Skonto in der Höhe von ${skontoProzent}% in Abzug gebracht werden.`;

      writeLeftBlock("", skontoText);

      doc.fontSize(11).text(
        `${istAngebot ? "Angebotssumme" : "Rechnungsbetrag"} = ${skontoSumme.toFixed(2)} €`,
        LEFT_X,
        doc.y,
        { width: LEFT_W }
      );
      doc.moveDown(1);
    }


    // Summen rechts, auf gleicher Höhe wie aktueller Cursor
    drawSummen(summen);
    doc.moveDown(2);
    */

    // 2-Spalten Bereich: links Text, rechts Summen
    const sectionStartY = doc.y;

    // Höhe links grob vorab berechnen, damit wir notfalls vorher umbrechen
    let leftNeed = 0;

    const b2Flag = Number(rechnung?.bemerkung_anzeigen ?? 0);
    if (b2Flag === 1 && rechnung?.bemerkung) {
      const t = breakLongWords(rechnung.bemerkung, 35);
      leftNeed += 20; // Label + Abstand
      leftNeed += doc.heightOfString(t, { width: LEFT_W }) + 10;
    }

    const skontoFlag = Number(rechnung?.skonto_hinzufuegen ?? 0);
    const skontoTage = skontoFlag === 1 ? Number(rechnung?.skonto_tage ?? 14) : null;
    const skontoProzent = skontoFlag === 1 ? Number(rechnung?.skonto ?? 3) : null;

    const bruttoWert = Number(summen?.brutto ?? 0);
    const skontoSumme = (skontoFlag === 1 && Number.isFinite(skontoProzent))
      ? bruttoWert * (1 - skontoProzent / 100)
      : null;

    if (skontoFlag === 1 && skontoSumme !== null) {
      const skontoText =
        `Bei Bezahlung binnen ${skontoTage} Tagen nach Rechnungslegung kann ein Skonto in der Höhe von ${skontoProzent}% in Abzug gebracht werden.`;
      const st = breakLongWords(skontoText, 35);

      leftNeed += doc.heightOfString(st, { width: LEFT_W }) + 10;
      leftNeed += 25; // Betrag-Zeile + Abstand
    }

    const rightNeed = 90; // Summenblock
    const sectionNeed = Math.max(leftNeed, rightNeed) + 40; // + Luft für Footer

    // Wenn der gesamte Bereich nicht mehr passt, Seite vorher wechseln
    if (sectionStartY + sectionNeed > pageBottom()) {
      doc.addPage();
      doc.y = M;
    }

    // Startpositionen für beide Spalten fixieren
    const y0 = doc.y;

    // Links schreiben, unabhängig von rechts
    doc.y = y0;

    if (b2Flag === 1 && rechnung?.bemerkung) {
      writeLeftBlock("Bemerkung:", rechnung.bemerkung);
    }

    if (skontoFlag === 1 && skontoSumme !== null) {
      const skontoText =
        `Bei Bezahlung binnen ${skontoTage} Tagen nach Rechnungslegung kann ein Skonto in der Höhe von ${skontoProzent}% in Abzug gebracht werden.`;

      writeLeftBlock("", skontoText);

      ensureSpace(25);
      doc.fontSize(11).text(
        `${istAngebot ? "Angebotssumme" : "Rechnungsbetrag"} = ${skontoSumme.toFixed(2)} €`,
        LEFT_X,
        doc.y,
        { width: LEFT_W }
      );
      doc.moveDown(1);
    }

    // Ende links merken
    const leftEndY = doc.y;

    // Rechts Summen an fixer Start-Y Position zeichnen
    const rightEndY = drawSummenAt(summen, y0);

    // Cursor für Footer unter den “tiefsten” Bereich setzen
    doc.y = Math.max(leftEndY, rightEndY);
    doc.moveDown(1);




    

    // ---------------------------------------------------------
    // FOOTER
    // ---------------------------------------------------------
    ensureSpace(30);
    doc.fontSize(10).text(
      "Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.\nVielen Dank für Ihr Vertrauen! Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.",
      50,
      doc.y,
      { align: "center" }
    );


    doc.end();

  } catch (err) {
    console.error("❌ Fehler beim Erstellen des PDFs:", err);
    if (!res.headersSent) {
      return res.status(500).json({ message: "PDF konnte nicht erstellt werden." });
    }
    // wenn headers schon gesendet wurden, kann man nicht mehr sauber JSON senden
    try { res.end(); } catch (_) {}
  }
});




router.post("/", async (req, res) => {
  const {
    typ,
    kunde_id,
    bemerkung1,
    bemerkung_anzeigen1,
    datum,
    faellig_am,
    bemerkung,
    bemerkung_anzeigen,
    skonto_hinzufuegen,
    skonto,
    skonto_tage,
    erstellt_von,
    status,
    summen,
    positionen
  } = req.body;

  if (!typ || !kunde_id || !datum || !Array.isArray(positionen) || positionen.length === 0) {
    return res.status(400).json({ message: "Pflichtfelder fehlen." });
  }

  const erlaubteStatus = new Set(["entwurf", "offen", "bezahlt", "storniert"]);
  const statusFinal = typ === "angebot" ? "entwurf" : (erlaubteStatus.has(status) ? status : "entwurf");

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[row]] = await conn.execute(
      `SELECT COALESCE(MAX(nummer), 0) + 1 AS nextNum
      FROM rechnung
      WHERE typ = ?
      FOR UPDATE`,
      [typ]
    );
    const nummer = Number(row.nextNum);


    const [r] = await conn.execute(
      `INSERT INTO rechnung
        (typ, nummer, kunde_id, datum, faellig_am, bemerkung_vor_pos, bem_vor_pos_anzeigen, status,
         netto_summe, mwst_summe, brutto_summe,
         bemerkung, bemerkung_anzeigen,
         skonto_hinzufuegen, skonto, skonto_tage,
         erstellt_von)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        typ,
        nummer,
        Number(kunde_id),
        datum,
        faellig_am ?? null,
        bemerkung1 ?? null,
        Number(bemerkung_anzeigen1 ?? 0),
        statusFinal,
        summen?.netto ?? 0,
        summen?.mwst ?? 0,
        summen?.brutto ?? 0,
        bemerkung ?? null,
        Number(bemerkung_anzeigen ?? 0),
        Number(skonto_hinzufuegen ?? 0),
        Number(skonto_hinzufuegen ?? 0) ? Number(skonto ?? null) : null,
        Number(skonto_hinzufuegen ?? 0) ? Number(skonto_tage ?? null) : null,
        erstellt_von ? Number(erstellt_von) : null
      ]
    );

    const rechnungId = r.insertId;

    const [[kunde]] = await conn.execute(`SELECT firma, vorname, nachname FROM kunden WHERE id = ?`, [Number(kunde_id)]);
    if (!kunde) throw new Error("Kunde nicht gefunden");

    /*
    const d = new Date(datum);
    const datumStr =
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
      */

    const [y,m,day] = String(datum).split("-");
    const datumStr = `${y}${m}${day}`;


    //const typCode = typ === "rechnung" ? "REC" : "ANG";

    /*
    const kundennameClean = String(kunde.firma || "Kunde")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "");
      */

    let kundennameRaw;

    if (kunde.firma && kunde.firma.trim()) {
      // Firmenkunde
      kundennameRaw = kunde.firma;
    } else if (kunde.nachname || kunde.vorname) {
      // Privatkunde
      const nach = (kunde.nachname || "").trim();
      const vor  = (kunde.vorname || "").trim();
      kundennameRaw = [nach, vor].filter(Boolean).join("-");
    } else {
      kundennameRaw = "Kunde";
    }

    const kundennameClean = kundennameRaw
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "");



    


      /*
    let rechnungsnummer;

    if (typ === "rechnung" && aus_angebot_id) {
      const [[ang]] = await conn.execute(
        `SELECT rechnungsnummer FROM rechnung WHERE id = ? AND typ = 'angebot' LIMIT 1`,
        [Number(aus_angebot_id)]
      );
      if (!ang?.rechnungsnummer) throw new Error("Ausgangs-Angebot nicht gefunden (aus_angebot_id ungültig).");

      const m = String(ang.rechnungsnummer).match(/(\d{8})/);
      if (!m) throw new Error("Konnte Datum aus Angebotsnummer nicht lesen.");

      const prefix = `${kundennameClean}-REC-aus-ANG-${m[1]}`;

      const [[maxRow]] = await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(rechnungsnummer, '-', -1) AS UNSIGNED)) AS maxSeq
         FROM rechnung
         WHERE rechnungsnummer LIKE ?`,
        [`${prefix}-%`]
      );

      const nextSeq = (maxRow?.maxSeq || 0) + 1;
      rechnungsnummer = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
    } else {
      const prefix = `${kundennameClean}-${typCode}-${datumStr}`;

      const [[maxRow]] = await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(rechnungsnummer, '-', -1) AS UNSIGNED)) AS maxSeq
         FROM rechnung
         WHERE kunde_id = ?
           AND typ = ?
           AND datum = ?
           AND rechnungsnummer LIKE ?`,
        [Number(kunde_id), typ, datum, `${prefix}-%`]
      );

      const nextSeq = (maxRow?.maxSeq || 0) + 1;
      rechnungsnummer = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
    }
      */
     const typCode = typ === "rechnung" ? "REC" : "ANG";

     /*
      let rechnungsnummer;
      if (typ === "rechnung") {
        //rechnungsnummer = `${typCode}-aus-ANG-${String(nummer).padStart()}`;
        rechnungsnummer = `${String(nummer).padStart()}_${typCode}-aus-ANG_${kundennameClean}`;
      } else {
        //rechnungsnummer = `${typCode}-${String(nummer).padStart(6, "0")}`;
        rechnungsnummer = `${String(nummer).padStart()}_${typCode}_${kundennameClean}`
      }
      */

      const rechnungsnummer = buildRechnungsnummer({
        nummer,
        typ,
        kundennameClean
      });


    await conn.execute(`UPDATE rechnung SET rechnungsnummer = ? WHERE id = ?`, [rechnungsnummer, rechnungId]);

    for (const p of positionen) {
      await conn.execute(
        `INSERT INTO rechnung_position
          (rechnung_id, pos, artikel_id, beschreibung, menge, einzelpreis, bauseits, mwst_satz)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rechnungId,
          p.pos,
          p.artikel_id ?? null,
          p.beschreibung,
          p.menge,
          p.einzelpreis,
          Number(p.bauseits ?? 0),
          p.mwst_satz ?? 20
        ]
      );
    }

    await conn.commit();
    return res.json({ id: rechnungId, rechnungsnummer });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error("❌ Fehler beim Speichern:", err);
    return res.status(500).json({ message: "Fehler beim Speichern der Rechnung.", error: err.message });
  } finally {
    conn.release();
  }
});









/* =========================================================
   GET /api/rechnungen  -> Rechnungsliste (Suche)
   ========================================================= */
router.get("/", async (req, res) => {
    const suche = req.query.suche || "";

    try {
        const [rows] = await db.execute(
          `SELECT 
              r.id,
              r.typ,
              r.nummer,
              r.rechnungsnummer,
              r.datum,
              r.faellig_am,
              r.bemerkung_vor_pos,
              r.bem_vor_pos_anzeigen,
              r.status,
              r.netto_summe,
              r.mwst_summe,
              r.brutto_summe,
              r.bemerkung,
              r.bemerkung_anzeigen,
              r.skonto_hinzufuegen,
              r.skonto,
              r.skonto_tage,
              r.erstellt_von
          FROM rechnung r
          WHERE 
              r.rechnungsnummer LIKE ?
              OR r.typ LIKE ?
              OR r.status LIKE ?
          ORDER BY
              CASE r.typ
                WHEN 'angebot' THEN 1
                WHEN 'rechnung' THEN 2
              END,
              r.nummer DESC`,
          [`%${suche}%`, `%${suche}%`, `%${suche}%`]
        );


        res.json(rows);
    } catch (err) {
        console.error("❌ SQL-Fehler:", err);
        res.status(500).json({ message: "Fehler beim Laden der Rechnungen" });
    }
});




/* =========================================================
   GET /api/lager/:nummer  -> vollständigen Artikel laden
   ========================================================= */
   /*
router.get('/:nummer', async (req, res) => {
  const artikelNummer = req.params.nummer;

  try {
    const [rows] = await db.execute(
      `SELECT 
         a.id,
         a.nummer,
         a.bezeichnung,
         a.beschreibung,
         a.einheit,
         a.einkaufspreis,
         a.verkaufspreis,
         a.mwst_satz,
         b.bestand,
         b.mindestbestand,
         b.lagerort
       FROM artikel a
       LEFT JOIN bestaende b ON a.id = b.artikel_id
       WHERE a.nummer = ?
       LIMIT 1`,
      [artikelNummer]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "❌ Artikel nicht gefunden." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Fehler beim Laden eines Artikels:", error);
    res.status(500).json({ message: "Serverfehler", error: error.message });
  }
});



*/


/* =========================================================
   GET /api/rechnungen/:id  -> Rechnung + Positionen (voll)
   ========================================================= */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "❌ Ungültige ID." });
  }

  try {
    // Rechnung + Kunde (Anzeige)
    const [[r]] = await db.execute(
      `SELECT
        r.*,
        r.bemerkung_vor_pos    AS bemerkung1,
        r.bem_vor_pos_anzeigen AS bemerkung_anzeigen1,
        CONCAT(k.firma, ' (', k.vorname, ' ', k.nachname, ')') AS kunde_anzeige
       FROM rechnung r
       LEFT JOIN kunden k ON k.id = r.kunde_id
       WHERE r.id = ?
       LIMIT 1`,
      [id]
    );

    if (!r) return res.status(404).json({ message: "❌ Rechnung nicht gefunden." });

    // Positionen
    const [pos] = await db.execute(
      `SELECT
        rp.id,
        rp.rechnung_id,
        rp.pos,
        rp.artikel_id,
        rp.beschreibung,
        rp.menge,
        rp.einzelpreis,
        rp.bauseits,
        rp.mwst_satz,
        a.nummer       AS artikel_nummer,
        a.bezeichnung  AS artikel_bezeichnung,
        a.einheit AS artikel_einheit
      FROM rechnung_position rp
      LEFT JOIN artikel a ON a.id = rp.artikel_id
      WHERE rp.rechnung_id = ?
      ORDER BY rp.pos ASC`,
      [id]
    );


    return res.json({ rechnung: r, positionen: pos });
  } catch (err) {
    console.error("❌ Fehler GET /api/rechnungen/:id:", err);
    return res.status(500).json({ message: "Serverfehler beim Laden der Rechnung." });
  }
});


/* =========================================================
   PUT /api/rechnungen/:id  -> Rechnung + Positionen updaten
   (Positions werden ersetzt)
   ========================================================= */
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  const {
    typ,
    kunde_id,
    datum,
    faellig_am,
    bemerkung1,
    bemerkung_anzeigen1,
    bemerkung,
    bemerkung_anzeigen,
    skonto_hinzufuegen,
    skonto,
    skonto_tage,
    erstellt_von,
    status,
    summen,
    positionen
  } = req.body;

  if (!typ || !kunde_id || !datum || !Array.isArray(positionen) || positionen.length === 0) {
    return res.status(400).json({ message: "Pflichtfelder fehlen." });
  }

  const erlaubteStatus = new Set(["entwurf", "offen", "bezahlt", "storniert"]);
  const statusFinal = typ === "angebot" ? "entwurf" : (erlaubteStatus.has(status) ? status : "entwurf");

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[alt]] = await conn.execute(
      `SELECT id, typ, nummer
       FROM rechnung
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (!alt) {
      await conn.rollback();
      return res.status(404).json({ message: "Rechnung nicht gefunden." });
    }

    const alterTyp = String(alt.typ);
    const neuerTyp = String(typ);

    // Bei Typwechsel sofort aus uniq_typ_nummer und uniq_typ_rechnungsnummer raus
    if (alterTyp !== neuerTyp) {
      await conn.execute(
        `UPDATE rechnung
         SET nummer = -id,
             rechnungsnummer = CONCAT('TMP_', id)
         WHERE id = ?`,
        [id]
      );
    }

    // Hauptdaten updaten
    await conn.execute(
      `UPDATE rechnung
       SET typ = ?, kunde_id = ?, datum = ?, faellig_am = ?,
           bemerkung_vor_pos = ?, bem_vor_pos_anzeigen = ?, status = ?,
           netto_summe = ?, mwst_summe = ?, brutto_summe = ?,
           bemerkung = ?, bemerkung_anzeigen = ?,
           skonto_hinzufuegen = ?, skonto = ?, skonto_tage = ?,
           erstellt_von = ?
       WHERE id = ?`,
      [
        neuerTyp,
        Number(kunde_id),
        datum,
        faellig_am ?? null,
        bemerkung1 ?? null,
        Number(bemerkung_anzeigen1 ?? 0),
        statusFinal,
        summen?.netto ?? 0,
        summen?.mwst ?? 0,
        summen?.brutto ?? 0,
        bemerkung ?? null,
        Number(bemerkung_anzeigen ?? 0),
        Number(skonto_hinzufuegen ?? 0),
        Number(skonto_hinzufuegen ?? 0) ? Number(skonto ?? null) : null,
        Number(skonto_hinzufuegen ?? 0) ? Number(skonto_tage ?? null) : null,
        erstellt_von ? Number(erstellt_von) : null,
        id
      ]
    );

    // Positionen ersetzen
    await conn.execute(`DELETE FROM rechnung_position WHERE rechnung_id = ?`, [id]);

    for (const p of positionen) {
      await conn.execute(
        `INSERT INTO rechnung_position
          (rechnung_id, pos, artikel_id, beschreibung, menge, einzelpreis, bauseits, mwst_satz)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          p.pos,
          p.artikel_id ?? null,
          p.beschreibung,
          p.menge,
          p.einzelpreis,
          Number(p.bauseits ?? 0),
          p.mwst_satz ?? 20
        ]
      );
    }

    // Einmal rebuild, am Ende
    if (alterTyp !== neuerTyp) {
      await rebuildBeideTypen(conn);
    } else {
      await rebuildTypRechnungen(conn, neuerTyp);
    }

    const [[finalRow]] = await conn.execute(
      `SELECT typ, nummer, rechnungsnummer
       FROM rechnung
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    await conn.commit();
    return res.json({
      message: "Rechnung aktualisiert.",
      typ: finalRow.typ,
      nummer: finalRow.nummer,
      rechnungsnummer: finalRow.rechnungsnummer
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error("Fehler PUT /api/rechnungen/:id:", err);
    return res.status(500).json({ message: "Serverfehler beim Aktualisieren.", error: err.message });
  } finally {
    conn.release();
  }
});










/* =========================================================
   DELETE /api/rechnungen/:id  -> Rechnung + Positionen löschen
   ========================================================= */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "❌ Ungültige ID." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[r]] = await conn.execute(
      `SELECT typ, nummer
       FROM rechnung
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );
    if (!r) {
      await conn.rollback();
      return res.status(404).json({ message: "❌ Rechnung nicht gefunden." });
    }

    const typ = String(r.typ);
    const nummer = Number(r.nummer || 0);

    await conn.execute(`DELETE FROM rechnung_position WHERE rechnung_id = ?`, [id]);
    await conn.execute(`DELETE FROM rechnung WHERE id = ?`, [id]);

    // Lücke schließen
    await conn.execute(
      `UPDATE rechnung
       SET nummer = nummer - 1
       WHERE typ = ?
         AND nummer > ?`,
      [typ, nummer]
    );

    await conn.commit();
    return res.json({ message: "🗑️ Rechnung wurde erfolgreich gelöscht." });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error("❌ Fehler DELETE /api/rechnungen/:id:", err);
    return res.status(500).json({ message: "Serverfehler beim Löschen.", error: err.message });
  } finally {
    conn.release();
  }
});



export default router;
