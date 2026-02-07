import express from "express";
import db from "./db.js";


function addMonthsToDate(dateStr, months) {
  if (!dateStr) return null;

  const m = parseInt(months, 10);
  if (!m || m <= 0) return null;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  // JS Trick: Monatsende korrekt behandeln
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + m);

  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTargetMonth));

  // YYYY-MM-DD für DATE Spalten
  return d.toISOString().slice(0, 10);
}



const router = express.Router();

router.get("/laden", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS gesamt,
        SUM(CASE WHEN firma IS NULL OR firma = '' THEN 1 ELSE 0 END) AS privat,
        SUM(CASE WHEN firma IS NOT NULL AND firma != '' THEN 1 ELSE 0 END) AS firma
      FROM kunden
    `);

    res.json({
      gesamt: rows[0].gesamt,
      privat: rows[0].privat,
      firma: rows[0].firma
    });
  } catch (err) {
    console.error("Fehler beim Laden der Kundenanzahl:", err);
    res.status(500).json({ error: "Fehler beim Laden der Kundenanzahl" });
  }
});




//*******************************************************
// für Rechnung schreiben
// ******************************************************
/* =========================================================
   GET /api/kunden?suche=
   ========================================================= */
router.get("/", async (req, res) => {
  const suche = req.query.suche || "";

  try {
    const like = `%${suche}%`;

    const [rows] = await db.execute(
      `SELECT 
          id,
          firma,
          vorname,
          nachname,
          kontakt,
          adresse,
          plz,
          ort,
          mail,
          telefon,
          notizen,
          heizung,
          DATE_FORMAT(heizung_datum, '%Y-%m-%d') AS heizung_datum,
          pruefungsintervall,
          DATE_FORMAT(vorletzte_pruefung, '%Y-%m-%d') AS vorletzte_pruefung,
          DATE_FORMAT(letzte_pruefung, '%Y-%m-%d') AS letzte_pruefung,
          DATE_FORMAT(naechste_pruefung, '%Y-%m-%d') AS naechste_pruefung,
          erstellt_am
      FROM kunden
      WHERE firma   LIKE ?
          OR vorname LIKE ?
          OR nachname LIKE ?
          OR kontakt LIKE ?
          OR adresse LIKE ?
          OR plz     LIKE ?
          OR ort     LIKE ?
          OR mail    LIKE ?
          OR telefon LIKE ?
      ORDER BY
        (firma IS NOT NULL AND firma != '') ASC,  
        nachname ASC,
        vorname ASC,
        firma ASC`,
      [like, like, like, like, like, like, like, like, like]
    );



    res.json(rows);
  } catch (err) {
    console.error("❌ SQL Fehler:", err);
    res.status(500).json({ message: "Fehler beim Laden der Kunden" });
  }
});


router.post("/", async (req, res) => {
  const {
    firma = "",
    vorname = "",
    nachname = "",
    kontakt = "",
    adresse = "",
    plz = "",
    ort = "",
    mail = "",
    telefon = "",
    notizen = "",
    heizung = "",
    heizung_datum = "",
    pruefungsintervall = "",
    vorletzte_pruefung = "",
    letzte_pruefung = "",
    naechste_pruefung = ""
  } = req.body || {};

  // ✅ Minimalregel: nicht komplett leer
  if (!firma && (!vorname || !nachname)) {
    return res.status(400).json({
      message: "Bitte entweder Firma oder Vorname + Nachname angeben.",
    });
  }
  // ❌ Kontakt nur für Firmen
  const finalKontakt = firma ? kontakt : "";


  
  // ✅ nächste Prüfung automatisch berechnen (wenn möglich)
  const berechnetNaechste = addMonthsToDate(letzte_pruefung, pruefungsintervall);

  const finalNaechste = addMonthsToDate(letzte_pruefung, pruefungsintervall);

  /*
  // Wenn Frontend nix schickt (oder leer) -> berechneten Wert verwenden
  const finalNaechste =
    (naechste_pruefung && String(naechste_pruefung).trim())
      ? naechste_pruefung
      : berechnetNaechste;
      */


  try {
    const [result] = await db.execute(
      `INSERT INTO kunden
        (firma, vorname, nachname, kontakt, adresse, plz, ort, mail, telefon, notizen, heizung, heizung_datum, pruefungsintervall, vorletzte_pruefung, letzte_pruefung, naechste_pruefung)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firma, vorname, nachname, finalKontakt, adresse, plz, ort, mail, telefon, notizen, heizung, heizung_datum, pruefungsintervall, vorletzte_pruefung, letzte_pruefung, finalNaechste]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("❌ SQL Fehler (Kunde anlegen):", err);
    res.status(500).json({ message: "Fehler beim Anlegen des Kunden" });
  }
});



router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Ungültige Kunden-ID" });

  const {
    firma = "",
    vorname = "",
    nachname = "",
    kontakt = "",
    adresse = "",
    plz = "",
    ort = "",
    mail = "",
    telefon = "",
    notizen = "",
    heizung = "",
    heizung_datum = "",
    pruefungsintervall = "",
    vorletzte_pruefung = "",
    letzte_pruefung = "",
    naechste_pruefung = ""
  } = req.body || {};

  // minimale Regel (wie beim Erstellen)
  if (!firma && (!vorname || !nachname)) {
    return res.status(400).json({
      message: "Bitte entweder Firma oder Vorname + Nachname angeben.",
    });
  }
  // ❌ Kontakt nur für Firmen
  const finalKontakt = firma ? kontakt : "";


  // ✅ nächste Prüfung automatisch berechnen (wenn möglich)
  const berechnetNaechste = addMonthsToDate(letzte_pruefung, pruefungsintervall);

  // ✅ nächste Prüfung IMMER automatisch berechnen (wenn möglich)
  const finalNaechste = addMonthsToDate(letzte_pruefung, pruefungsintervall);

  /*
  // Wenn Frontend nix schickt (oder leer) -> berechneten Wert verwenden
  const finalNaechste =
    (naechste_pruefung && String(naechste_pruefung).trim())
      ? naechste_pruefung
      : berechnetNaechste;
      */


  try {
    const [result] = await db.execute(
      `UPDATE kunden
       SET firma = ?, vorname = ?, nachname = ?, kontakt = ?, adresse = ?, plz = ?, ort = ?, mail = ?, telefon = ?, notizen = ?, heizung = ?, heizung_datum = ?, pruefungsintervall = ?, vorletzte_pruefung = ?, letzte_pruefung = ?, naechste_pruefung = ?
       WHERE id = ?`,
      [firma, vorname, nachname, finalKontakt, adresse, plz, ort, mail, telefon, notizen, heizung, heizung_datum, pruefungsintervall, vorletzte_pruefung, letzte_pruefung, finalNaechste, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kunde nicht gefunden" });
    }

    res.json({ message: "Kunde aktualisiert" });
  } catch (err) {
    console.error("❌ SQL Fehler (Kunde bearbeiten):", err);
    res.status(500).json({ message: "Fehler beim Aktualisieren des Kunden" });
  }
});



router.put("/:id/service", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Ungültige Kunden-ID" });

  const { service_datum = "" } = req.body || {};
  const datum = String(service_datum).trim();

  if (!datum) {
    return res.status(400).json({ message: "Bitte ein Servicedatum angeben." });
  }

  try {
    // 1) Intervall aus DB holen
    const [rows] = await db.execute(
      "SELECT pruefungsintervall FROM kunden WHERE id = ?",
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Kunde nicht gefunden" });
    }

    const intervall = rows[0].pruefungsintervall;

    // 2) nächste Prüfung berechnen: neues Datum + Intervall (Monate)
    const naechste = addMonthsToDate(datum, intervall);

    // 3) Shift + Update in EINEM Statement
    const [result] = await db.execute(
      `UPDATE kunden
       SET
         vorletzte_pruefung = letzte_pruefung,
         letzte_pruefung = ?,
         naechste_pruefung = ?
       WHERE id = ?`,
      [datum, naechste, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kunde nicht gefunden" });
    }

    res.json({
      message: "Service gespeichert",
      vorletzte_pruefung: null, // optional weglassen
      letzte_pruefung: datum,
      naechste_pruefung: naechste,
    });
  } catch (err) {
    console.error("❌ SQL Fehler (Service speichern):", err);
    res.status(500).json({ message: "Fehler beim Speichern des Services" });
  }
});





router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ message: "Ungültige Kunden-ID" });
  }

  try {
    const [result] = await db.execute("DELETE FROM kunden WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kunde nicht gefunden" });
    }

    res.json({ message: "Kunde gelöscht" });
  } catch (err) {
    console.error("❌ SQL Fehler (Kunde löschen):", err);
    res.status(500).json({ message: "Fehler beim Löschen des Kunden" });
  }
});




export default router;
