import bcrypt from "bcrypt";
import db from './db.js';
import { pruefeRecht } from "./rechtesystem.js";



export async function hinzufuegenMitarbeiter(req, res, next) {
  try {
    if (await pruefeRecht(req.session.user.id, "mitarbeiter", "hinzufügen")) {
      const { vorname, nachname, stadt, postleitzahl, strasse, email, telefonnummer, rolle_id, benutzername, passwort, iban, vs_nummer } = req.body;
      console.log(vs_nummer)
      // Prüfen ob Benutzername bereits existiert
      const [benutzerCheck] = await db.execute(
        "SELECT id FROM benutzer WHERE benutzername = ? LIMIT 1",
        [benutzername]
      );

      if (benutzerCheck.length > 0) {
        return res.json({ success: false, message: "Benutzername existiert bereits" });
      }

      // Passwort hashen
      const passworthash = await bcrypt.hash(passwort, 12);

      // Benutzer anlegen
      const [resultBenutzer] = await db.execute(
        `INSERT INTO benutzer (benutzername, rolle_id, passworthash, aktiv, fehlversuche)
         VALUES (?, ?, ?, ?, ?)`,
        [benutzername, rolle_id, passworthash, 1, 0]
      );

      const benutzerId = resultBenutzer.insertId;

      await db.execute(
        `INSERT INTO mitarbeiter (vorname, nachname, adresse, plz, ort, iban, vs_nummer, email, telefon, rolle_id, benutzer_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vorname || " ", 
          nachname || " ", 
          strasse, 
          postleitzahl || " ",
          stadt || " ",
          iban || " ",
          vs_nummer || " ",
          email || " ",
          telefonnummer || " ",
          rolle_id,
          benutzerId
        ]
      );


    
      res.json({ success: true, message: "Mitarbeiter " + vorname + " " + nachname + " hinzugefügt" })
    } else {
      res.json({ success: false, message: "Dafür hast du keine Rechte"})
    }

  } catch (error) {
  next(error);
  }
}

export async function hinzufuegenUrlaubMitarbeiter(req, res, next) {
  try {
    if (await pruefeRecht(req.session.user.id, "mitarbeiter", "hinzufügen")) {
      
      const { urlaubStart, urlaubEnde, urlaubBemerkung, mitarbeiter_id } = req.body;

      await db.execute(
        `INSERT INTO urlaube (mitarbeiter_id, startdatum, enddatum, bemerkung)
        VALUES (?, ?, ?, ?)`,
        [
          mitarbeiter_id,
          urlaubStart,
          urlaubEnde,
          urlaubBemerkung
        ]
      );

      res.json({ success: true, message: "Urlaub von " + urlaubStart + " bis " + urlaubEnde + " erfolgreich eingetragen!" })


    } else {
      res.json({ success: false, message: "Dafür hast du keine Rechte"})
    }
  } catch (error) {
  next(error);
  }
}


export async function hinzufuegenKrankenstandMitarbeiter(req, res, next) {
  try {
    if (await pruefeRecht(req.session.user.id, "mitarbeiter", "hinzufügen")) {
      
      const { krankenstandStart, krankenstandEnde, krankenstandBemerkung, mitarbeiter_id } = req.body;

      await db.execute(
        `INSERT INTO krankenstaende (mitarbeiter_id, startdatum, enddatum, bemerkung)
        VALUES (?, ?, ?, ?)`,
        [
          mitarbeiter_id,
          krankenstandStart,
          krankenstandEnde,
          krankenstandBemerkung
        ]
      );

      res.json({ success: true, message: "Krankenstand von " + krankenstandStart + " bis " + krankenstandEnde + " erfolgreich eingetragen!" })


    } else {
      res.json({ success: false, message: "Dafür hast du keine Rechte"})
    }
  } catch (error) {
  next(error);
  }
}



export async function ladeMitarbeiter(req, res) {
  try {
    const [mitarbeiter] = await db.execute(`
      SELECT
        m.id,
        m.vorname,
        m.nachname,
        m.iban,
        m.vs_nummer,
        m.email,
        m.telefon,
        m.ort,
        m.plz,
        m.adresse,
        m.rolle_id,
        m.benutzer_id,
        m.erstellt_am,
        r.name AS rolle_name,
        b.benutzername
      FROM mitarbeiter m
      LEFT JOIN rollen r ON m.rolle_id = r.id
      LEFT JOIN benutzer b ON m.benutzer_id = b.id
    `);

    res.json({
      anzahl: mitarbeiter.length,
      mitarbeiter: mitarbeiter
    });
  } catch (err) {
    console.error("Fehler beim Abrufen:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Mitarbeiter" });
  }
}


export async function updateMitarbeiter(req, res) {
  try {
    if (await pruefeRecht(req.session.user.id, "mitarbeiter", "bearbeiten")) {
      const { mitarbeiterId, vorname, nachname, adresse, stadt, plz, email, tel, rolle, benutzername, passwort } = req.body;
      
      console.log(req.body);


      const [[mitarbeiter]] = await db.execute(
        `SELECT benutzer_id FROM mitarbeiter WHERE id = ?`,
        [mitarbeiterId]
      );

      if (!mitarbeiter) {
        return res.json({ success: false, message: "Mitarbeiter nicht gefunden!" });
      }

      const benutzerId = mitarbeiter.benutzer_id;

      // Bereits vorhandene Benutzerdaten laden
      const [[benutzer]] = await db.execute(
        `SELECT benutzername, passworthash FROM benutzer WHERE id = ?`,
        [benutzerId]
      );

      if (!benutzer) {
        return res.json({ success: false, message: "Benutzer für Mitarbeiter nicht gefunden!" });
      }

      await db.execute(
        `UPDATE mitarbeiter
        SET vorname = ?, nachname = ?, adresse = ?, plz = ?, ort = ?, email = ?, telefon = ?, rolle_id = ?
        WHERE id = ?`,
        [
          vorname || " ",
          nachname || " ",
          adresse || " ",
          plz || " ",
          stadt || " ",
          email || " ",
          tel || " ",
          rolle,
          mitarbeiterId
        ]
      );

      await db.execute(
        `UPDATE benutzer SET rolle_id = ? WHERE id = ?`,
        [rolle, benutzerId]
      );

      // Benutzername aktualisieren
      if (benutzername && benutzername.trim() !== "") {
        const [checkUser] = await db.execute(
          "SELECT id FROM benutzer WHERE benutzername = ? AND id != ?",
          [benutzername, benutzerId]
        );

        if (checkUser.length > 0) {
          return res.json({ success: false, message: "Benutzername existiert bereits!" });
        }

        await db.execute(
          `UPDATE benutzer SET benutzername = ? WHERE id = ?`,
          [benutzername, benutzerId]
        );
      }

      // Passwort aktualisieren
      if (passwort && passwort.trim() !== "") {
        const neuerHash = await bcrypt.hash(passwort, 12);

        await db.execute(
          `UPDATE benutzer SET passworthash = ? WHERE id = ?`,
          [neuerHash, benutzerId]
        );
      }


      res.json({ success: true, message: "Mitarbeiter erfolgreich aktualisiert!" });
    } else {
      res.json({ success: false, message: "Keine Rechte!" })
    }

  } catch (err) {
    res.status(500).json({ error: "Fehler beim Bearbeiten des Mitarbeiters" });
  }
  
}





export async function loescheMitarbeiter(req, res) {
  try {
    if (await pruefeRecht(req.session.user.id, "mitarbeiter", "löschen")) {
      const { mitarbeiterId } = req.body;

      // Benutzer-ID holen
      const [[mitarbeiter]] = await db.execute(
        `SELECT benutzer_id FROM mitarbeiter WHERE id = ?`,
        [mitarbeiterId]
      );

      if (!mitarbeiter) {
        return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
      }

      const benutzerId = mitarbeiter.benutzer_id;

      // Mitarbeiter löschen
      await db.execute(
        `DELETE FROM mitarbeiter WHERE id = ?`,
        [mitarbeiterId]
      );

      // Benutzer löschen
      await db.execute(
        `DELETE FROM benutzer WHERE id = ?`,
        [benutzerId]
      );

      res.json({ success: true, message: "Mitarbeiter erfolgreich gelöscht!" });
  } else {
    res.json({ success: false, message: "Dafür hast du keine Rechte!"})
  }

  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Mitarbeiters" });
  }
}

//Aktiv überprüfen
export async function checkaktivMitarbeiter(req, res) {
  try {
    const { benutzer_id } = req.body;

    console.log(benutzer_id)

    const [rows] = await db.execute(
      "SELECT aktiv FROM benutzer WHERE id = ?",
      [benutzer_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    }

    res.json({ aktiv: rows[0].aktiv }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Abrufen des Aktiv-Status" });
  }
}

//Aktiv ändern
export async function updateaktivMitarbeiter(req, res) {
  try {
    const { benutzer_id } = req.body;

    const [rows] = await db.execute(
      "SELECT aktiv FROM benutzer WHERE id = ?",
      [benutzer_id]
    );

    
    if(rows[0].aktiv == 1){
      await db.execute(
        `UPDATE benutzer
        SET aktiv = ? WHERE id = ?`,
        [
          0,
          benutzer_id
        ]
      );
      res.json({ success: true, message: "Benutzer erfolgreich gesperrt!", aktiv: 0})
    } else {
      await db.execute(
        `UPDATE benutzer
        SET aktiv = ? WHERE id = ?`,
        [
          1,
          benutzer_id
        ]
      );
      res.json({ success: true, message: "Benutzer erfolgreich entsperrt!", aktiv: 1})
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Abrufen des Aktiv-Status" });
  }
}

// Urlaubsdaten laden
export async function ladeUrlaubMitarbeiter(req, res) {
  try {
    const { mitarbeiterId } = req.body;

    const [urlaub] = await db.execute(
      `
      SELECT
        id,
        mitarbeiter_id,
        startdatum,
        enddatum,
        bemerkung,
        erstellt_am
      FROM urlaube
      WHERE mitarbeiter_id = ?
      ORDER BY startdatum DESC
      `,
      [mitarbeiterId]
    );

    res.json(urlaub);
  } catch (err) {
    console.error("Fehler beim Abrufen:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Urlaubsdaten" });
  }
}

// Urlaubsdaten laden
export async function ladeKrankenstandMitarbeiter(req, res) {
  try {
    const { mitarbeiterId } = req.body;

    const [krankenstand] = await db.execute(
      `
      SELECT
        id,
        mitarbeiter_id,
        startdatum,
        enddatum,
        bemerkung,
        erstellt_am
      FROM krankenstaende
      WHERE mitarbeiter_id = ?
      ORDER BY startdatum DESC
      `,
      [mitarbeiterId]
    );

    res.json(krankenstand);
  } catch (err) {
    console.error("Fehler beim Abrufen:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Krankenstände" });
  }
}

export async function abwesend(req, res) {
  try {
    const [rows] = await db.execute(`
      SELECT COUNT(DISTINCT mitarbeiter_id) AS anzahl_abwesend
      FROM (
        SELECT mitarbeiter_id
        FROM urlaube
        WHERE startdatum <= CURDATE()
          AND (enddatum IS NULL OR enddatum >= CURDATE())

        UNION

        SELECT mitarbeiter_id
        FROM krankenstaende
        WHERE startdatum <= CURDATE()
          AND (enddatum IS NULL OR enddatum >= CURDATE())
      ) AS abw;
    `);

    res.json({
      success: true,
      datum: new Date().toLocaleDateString("sv-SE"), // nur fürs JSON hübsch
      anzahl_abwesend: rows[0]?.anzahl_abwesend ?? 0
    });
  } catch (err) {
    console.error("Fehler beim Zählen abwesender Mitarbeiter:", err);
    res.status(500).json({ success: false, message: "Fehler beim Zählen abwesender Mitarbeiter" });
  }
}
