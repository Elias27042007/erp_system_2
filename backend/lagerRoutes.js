import express from 'express';
import db from './db.js';
import { pruefeRecht } from "./rechtesystem.js";
//import { showToast } from '../alert.js';
const router = express.Router();


/* =========================================================
   POST /api/lager/material  -> neues Material + Bestandseintrag
   ========================================================= */
router.post('/material', async (req, res) => {
  const {
    bezeichnung,
    beschreibung,
    einheit,
    einkaufspreis_vorher,
    einkaufspreis,
    verkaufspreis_vorher,
    verkaufspreis,
    mwst_satz,
    mindestbestand,
    lagerort
  } = req.body || {};

  const einkaufVorherFinal =
  (einkaufspreis_vorher === null || einkaufspreis_vorher === "" || Number.isNaN(Number(einkaufspreis_vorher)))
    ? einkaufspreis
    : einkaufspreis_vorher;

  const verkaufVorherFinal =
    (verkaufspreis_vorher === null || verkaufspreis_vorher === "" || Number.isNaN(Number(verkaufspreis_vorher)))
      ? verkaufspreis
      : verkaufspreis_vorher;

  const mwstVal = Number.isFinite(Number(mwst_satz)) ? Number(mwst_satz) : 20.00;




  try {
    const erlaubt = await pruefeRecht(req.session.user.id, "lager", "hinzufügen");
    if (!erlaubt) return res.status(403).json({ message: "❌ Darfst du nicht!" });
    console.log('➕ Neues Material – Body:', req.body);

    // 1) letzte Artikelnummer finden
    const [rows] = await db.execute(
      'SELECT nummer FROM artikel WHERE nummer IS NOT NULL AND nummer <> "" ORDER BY id DESC LIMIT 1'
    );

    let neueNummer = 'A-0001';
    if (rows.length > 0) {
      const letzteNummer = rows[0].nummer;
      const zahl = parseInt(letzteNummer.split('-')[1], 10) + 1;
      neueNummer = `A-${String(zahl).padStart(4, '0')}`;
    }

    // 2) Artikel einfügen
    const [ins] = await db.execute(
      `INSERT INTO artikel 
        (nummer, bezeichnung, beschreibung, einheit, einkaufspreis_vorher, einkaufspreis, verkaufspreis_vorher, verkaufspreis, mwst_satz)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [neueNummer, bezeichnung, beschreibung, einheit, einkaufVorherFinal, einkaufspreis, verkaufVorherFinal, verkaufspreis, mwstVal]
    );


    const artikelId = ins.insertId;

    // 3) Anfangsbestand eintragen
    await db.execute(
      `INSERT INTO bestaende (artikel_id, lagerort, bestand, mindestbestand)
       VALUES (?, ?, 0, ?)`,
      [artikelId, lagerort ?? null, mindestbestand ?? 0]
    );

    res.status(201).json({
      message: `✅ Material gespeichert! Artikelnummer: ${neueNummer}, Lagerort: ${lagerort}, Mindestbestand: ${mindestbestand}`
    });
  } catch (error) {
    console.error('❌ Fehler beim Einfügen:', error);
    res.status(500).json({ message: '❌ Fehler beim Speichern in der DB', error: error.message });
  }
});

/* =========================================================
   POST /api/lager/bewegung  -> Wareneingang / -ausgang
   ========================================================= */
router.post('/bewegung', async (req, res) => {
  try {
    console.log('📦 Neue Lagerbuchung empfangen – Body:', req.body);
    const { artikel_id, menge, lagerort, bemerkung, typ } = req.body || {};

    // 1) Validierung
    if (!['wareneingang', 'warenausgang'].includes(typ)) {
      return res.status(400).json({ message: "❌ Typ muss 'wareneingang' oder 'warenausgang' sein." });
    }
    const artikelIdNum = Number(artikel_id);
    const mengeNum = Number(menge);
    if (!Number.isInteger(artikelIdNum) || artikelIdNum <= 0) {
      return res.status(400).json({ message: '❌ Ungültige Artikel-ID.' });
    }
    if (!Number.isFinite(mengeNum) || mengeNum <= 0) {
      return res.status(400).json({ message: '❌ Ungültige Menge (> 0 erforderlich).' });
    }

    const lagerortVal =
      typeof lagerort === 'string' && lagerort.trim() !== '' ? lagerort.trim() : null;
    const bemerkungVal =
      typeof bemerkung === 'string' && bemerkung.trim() !== '' ? bemerkung.trim() : null;

    console.log('🔧 Bind-Werte:', {
      artikelIdNum,
      typ,
      mengeNum,
      lagerortVal,
      bemerkungVal,
      anyUndefined: [artikelIdNum, typ, mengeNum, lagerortVal, bemerkungVal].some(
        v => v === undefined
      ),
    });

    // 2) aktuellen Bestand holen
    const [bestRows] = await db.execute(
      'SELECT bestand FROM bestaende WHERE artikel_id = ?',
      [artikelIdNum]
    );

    if (bestRows.length === 0) {
      return res.status(404).json({ message: '❌ Kein Bestand für diese Artikel-ID gefunden.' });
    }

    const aktuellerBestand = Number(bestRows[0].bestand);
    let neuerBestand = aktuellerBestand;

    // 3) neuen Bestand berechnen
    if (typ === 'wareneingang') {
      neuerBestand += mengeNum;
    } else {
      if (mengeNum > aktuellerBestand) {
        return res.status(400).json({
          message: `❌ Warenausgang (${mengeNum}) übersteigt aktuellen Bestand (${aktuellerBestand}).`,
        });
      }
      neuerBestand -= mengeNum;
    }

    console.log(`📊 Bestand: alt=${aktuellerBestand}, neu=${neuerBestand}`);

    // 4) Lagerbewegung eintragen
    await db.execute(
      `INSERT INTO lagerbewegungen
         (artikel_id, benutzer_id, typ, menge, lagerort, bemerkung)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [artikelIdNum, typ, mengeNum, lagerortVal, bemerkungVal]
    );

    // 5) Bestand aktualisieren
    await db.execute(
      'UPDATE bestaende SET bestand = ? WHERE artikel_id = ?',
      [neuerBestand, artikelIdNum]
    );

    console.log('✅ Lagerbewegung erfolgreich verbucht!');

    res.status(200).json({
      message: `✅ Buchung '${typ}' erfolgreich. Neuer Bestand: ${neuerBestand}`,
    });
  } catch (error) {
    console.error('❌ Fehler bei Lagerbuchung:', error);
    res.status(500).json({ message: 'Interner Fehler bei Lagerbuchung.' });
  }
});


/* =========================================================
   DELETE /api/lager/delete/:id
   löscht Artikel + zugehörigen Bestand
   ========================================================= */
router.delete('/delete/:id', async (req, res) => {
  const artikelId = Number(req.params.id);

  console.log("🔥 DELETE-Route aufgerufen mit ID:", artikelId);

  if (!Number.isInteger(artikelId) || artikelId <= 0) {
    return res.status(400).json({ message: "❌ Ungültige ID." });
  }

  try {
    // 1) Existenz prüfen
    const [check] = await db.execute(
      "SELECT id FROM artikel WHERE id = ?",
      [artikelId]
    );

    if (check.length === 0) {
      return res.status(404).json({ message: "❌ Artikel nicht gefunden." });
    }
    const erlaubt = await pruefeRecht(req.session.user.id, "lager", "löschen");
    if (!erlaubt) return res.status(403).json({ message: "❌ Darfst du nicht!" });
    // 2) Bestand löschen
    await db.execute(
      "DELETE FROM bestaende WHERE artikel_id = ?",
      [artikelId]
    );

    // 3) Artikel löschen
    await db.execute(
      "DELETE FROM artikel WHERE id = ?",
      [artikelId]
    );

    return res.json({
      message: `🗑️ Artikel mit ID ${artikelId} wurde erfolgreich gelöscht.`
    });

  } catch (err) {
    console.error("❌ Fehler beim Löschen:", err);
    return res.status(500).json({
      message: "❌ Serverfehler beim Löschen.",
      error: err.message
    });
  }
});


/* =========================================================
   PUT /api/lager/update/:id  -> Material bearbeiten
   ========================================================= */
router.put('/update/:id', async (req, res) => {
  const artikelId = Number(req.params.id);
  const {
    bezeichnung,
    beschreibung,
    einheit,
    einkaufspreis,
    einkaufspreis_vorher,
    verkaufspreis,
    verkaufspreis_vorher,
    mwst_satz,
    mindestbestand,
    lagerort
  } = req.body || {};

  if (!Number.isInteger(artikelId) || artikelId <= 0) {
    return res.status(400).json({ message: "❌ Ungültige Artikel-ID." });
  }

  const mwstVal = Number.isFinite(Number(mwst_satz)) ? Number(mwst_satz) : 20.00;

  try {
    // Artikel updaten
    await db.execute(
      `UPDATE artikel 
        SET bezeichnung=?,
            beschreibung=?,
            einheit=?,
            einkaufspreis_vorher=?,
            einkaufspreis=?,
            verkaufspreis_vorher=?,
            verkaufspreis=?,
            mwst_satz=?
      WHERE id=?`,
      [
        bezeichnung,
        beschreibung,
        einheit,
        einkaufspreis_vorher,
        einkaufspreis,
        verkaufspreis_vorher,
        verkaufspreis,
        mwstVal,
        artikelId
      ]
    );


    // Bestand/Lagerort updaten
    await db.execute(
      `UPDATE bestaende 
         SET mindestbestand=?, lagerort=? 
       WHERE artikel_id=?`,
      [mindestbestand ?? 0, lagerort || null, artikelId]
    );

    res.json({ message: "✅ Artikel wurde erfolgreich aktualisiert." });

  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren:", error);
    res.status(500).json({ message: "❌ Fehler beim Aktualisieren.", error: error.message });
  }
});











/* =========================================================
   GET /api/lager  -> Artikelliste (Suche)
   ========================================================= */
router.get('/', async (req, res) => {
  const suchbegriff = req.query.suche || '';

  try {
    const [rows] = await db.execute(
      `SELECT 
         a.nummer,
         a.bezeichnung,
         a.einheit,
         a.einkaufspreis,
         a.verkaufspreis,
         b.bestand
       FROM artikel a
       LEFT JOIN bestaende b ON a.id = b.artikel_id
       WHERE a.bezeichnung LIKE ?
       ORDER BY a.nummer ASC`,
      [`%${suchbegriff}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ SQL-Fehler:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen der Artikeldaten' });
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







//*******************************************************
// für Rechnung schreiben
// ******************************************************

// =========================================================
// GET /api/lager/search?suche=xxx → Artikel per Suchbegriff laden
// =========================================================
/*
router.get('/search', async (req, res) => {
    const suchbegriff = req.query.suche || "";

    try {
        const [rows] = await db.execute(
            `SELECT 
                id,
                nummer,
                bezeichnung,
                beschreibung,
                verkaufspreis,
                einheit,
                mwst_satz
             FROM artikel
             WHERE nummer LIKE ? OR bezeichnung LIKE ?
             ORDER BY nummer ASC`,
            [`%${suchbegriff}%`, `%${suchbegriff}%`]
        );

        res.json(rows);
    } catch (err) {
        console.error("❌ SQL-Fehler bei Artikelsuche:", err);
        res.status(500).json({ message: "Fehler beim Artikelsuchen" });
    }
});
*/

// --------------------------------------
// Artikelsuche MUSS VOR /:nummer stehen
// --------------------------------------
router.get('/search', async (req, res) => {
    const suchbegriff = req.query.suche || "";

    try {
        const [rows] = await db.execute(
            `SELECT 
                id,
                nummer,
                bezeichnung,
                beschreibung,
                verkaufspreis,
                einheit,
                mwst_satz
             FROM artikel
             WHERE nummer LIKE ? OR bezeichnung LIKE ?
             ORDER BY nummer ASC`,
            [`%${suchbegriff}%`, `%${suchbegriff}%`]
        );

        res.json(rows);
    } catch (err) {
        console.error("❌ SQL-Fehler bei Artikelsuche:", err);
        res.status(500).json({ message: "Fehler beim Artikelsuchen" });
    }
});

// =========================================================
// GET /api/lager/preis/:id  -> Verkaufspreis für Artikel-ID holen
// MUSS VOR /:nummer stehen!
// =========================================================
router.get("/preis/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Ungültige Artikel-ID" });
  }

  try {
    const [[row]] = await db.execute(
      `SELECT verkaufspreis FROM artikel WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!row) return res.status(404).json({ message: "Artikel nicht gefunden" });

    res.json({ verkaufspreis: row.verkaufspreis });
  } catch (err) {
    console.error("❌ Fehler /api/lager/preis/:id", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});



// --------------------------------------
// Allgemeine Route → Artikel nach Nummer
// --------------------------------------
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
               a.einkaufspreis_vorher,
               a.verkaufspreis,
               a.verkaufspreis_vorher,
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



export default router;
