import db from './db.js';

// Definiere Rollenrechte
export const rechte = {
  admin: {
    lager: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
    mitarbeiter: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
    rechnungen: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
    kunden: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
  },
  buchhaltung: {
    lager: ["ansehen"],
    mitarbeiter: ["ansehen"],
    rechnungen: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
    kunden: ["ansehen", "hinzufügen", "bearbeiten", "löschen"],
  },
  lager: {
    lager: ["ansehen", "hinzufügen", "löschen"],
    mitarbeiter: [],
    rechnungen: [],
    kunden: [],
  },
  mitarbeiter: {
    lager: ["ansehen"],
    mitarbeiter: ["ansehen", "bearbeiten"],
    rechnungen: [],
    kunden: [],
  },
};


// Prüft, ob eine bestimmte Rolle Zugriff auf eine Aktion hat
export function darf(rollenName, modul, aktion) {
  const rolle = rechte[rollenName];
  if (!rolle) return false;
  const erlaubteAktionen = rolle[modul];
  if (!erlaubteAktionen) return false;
  return erlaubteAktionen.includes(aktion);
}


// Prüft anhand der Benutzer-ID, ob ein Benutzer eine bestimmte Aktion ausführen darf
export async function pruefeRecht(benutzerId, modul, aktion) {
  // Hole Rolle aus DB
  const [userRows] = await db.execute(
    "SELECT rolle_id FROM benutzer WHERE id = ?",
    [benutzerId]
  );
  const user = userRows[0];
  if (!user) return false;

  const [rolleRows] = await db.execute(
    "SELECT name FROM rollen WHERE id = ?",
    [user.rolle_id]
  );
  const rolle = rolleRows[0];
  if (!rolle) return false;

  // Verwende die oben definierte "darf"-Funktion
  return darf(rolle.name, modul, aktion);
}

export async function pruefeRechte(req, res) {
  try {
      if (!req.session.user) {
        return res.status(401).json({ erlaubt: false, message: "Nicht eingeloggt" });
      }

      const { modul, aktion } = req.body;

      const benutzerId = req.session.user.id;

      const erlaubt = await pruefeRecht(benutzerId, modul, aktion);

      res.json({ erlaubt });
    } catch (err) {
      console.error("Fehler bei Rechteprüfung:", err);
      res.status(500).json({ erlaubt: false, message: "Serverfehler" });
    }
}
