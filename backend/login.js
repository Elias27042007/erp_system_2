import bcrypt from "bcrypt";
import db from './db.js';


export async function loginHandler(req, res, next) {
  try {
    const { benutzername, passwort } = req.body;
    console.log("Empfangene Login-Daten:", benutzername);

    // Benutzer suchen
    const [rows] = await db.execute(
      "SELECT * FROM benutzer WHERE benutzername = ?",
      [benutzername]
    );


    if (rows.length === 0) {
      return res.json({ success: false, message: "Benutzer nicht gefunden." });
    }

    const benutzer = rows[0];

    // Prüfen, ob Benutzer aktiv ist
    if (benutzer.aktiv === 0) {
      return res.json({ success: false, message: "Konto ist gesperrt. Bitte wenden Sie sich an den Administrator." });
    }

    const gespeicherterHash = benutzer.passworthash;
    const istKorrekt = await bcrypt.compare(passwort, gespeicherterHash);

    if (istKorrekt) {
      await db.execute("UPDATE benutzer SET fehlversuche = 0 WHERE id = ?", [benutzer.id]);

    req.session.user = {
    	id: benutzer.id,
    	rolle_id: benutzer.rolle_id,
  	};

  	return res.json({
    	success: true,
    	message: "Login erfolgreich!",
  	});

    } else {
      const versuche = benutzer.fehlversuche + 1;

      if (versuche >= 5) {
        // Benutzer sperren
        await db.execute("UPDATE benutzer SET aktiv = 0, fehlversuche = ? WHERE id = ?", [versuche, benutzer.id]);
        return res.json({
          success: false,
          message: "Konto nach 5 Fehlversuchen gesperrt.",
        });
      } else {
        // Fehlversuch speichern
        await db.execute("UPDATE benutzer SET fehlversuche = ? WHERE id = ?", [versuche, benutzer.id]);
        return res.json({
          success: false,
          message: `Passwort falsch. (${versuche}/5 Versuche)`,
        });
      }
    }
  } catch (error) {
    next(error);
  }
}
